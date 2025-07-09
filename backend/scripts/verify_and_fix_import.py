#!/usr/bin/env python3
"""
Vérifie et corrige l'import des 13 livres Breslov
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.sefaria_smart_import import import_missing_books
from app.database import get_db_session
from sqlmodel import select, func
from app.models.book import Book
from app.models.text import Text
from app.utils.logger import logger


async def check_book_status():
    """Vérifie le statut de chaque livre"""
    print("🔍 Vérification de l'import des livres Breslov...")
    
    # Liste des 13 livres attendus
    expected_books = [
        "Likutey Moharan",
        "Likutey Moharan II", 
        "Likutey Tefilot",
        "Likutey Halachot",
        "Likutey Etzot",
        "Sichot HaRan",
        "Chayey Moharan",
        "Sefer HaMiddot",
        "Sipurey Maasiyot",
        "Shivchey HaRan",
        "Kitzur Likutey Moharan",
        "Tikkun HaKlali",
        "Meshivat Nefesh"
    ]
    
    async with get_db_session() as session:
        # Récupérer tous les livres
        result = await session.execute(select(Book))
        books = result.scalars().all()
        book_titles = {book.title for book in books}
        
        print(f"\n📚 Livres actuellement dans la DB: {len(books)}")
        
        # Afficher les livres présents
        for book in books:
            # Compter les textes pour ce livre
            count_result = await session.execute(
                select(func.count(Text.id)).where(Text.book_id == book.id)
            )
            text_count = count_result.scalar()
            print(f"  ✅ {book.title} ({text_count} sections)")
            
        # Vérifier les livres manquants
        missing_books = [book for book in expected_books if book not in book_titles]
        
        if missing_books:
            print(f"\n⚠️ Il manque {len(missing_books)} livre(s):")
            for book in missing_books:
                print(f"  ❌ {book}")
            return False
        else:
            print(f"\n✅ Tous les {len(expected_books)} livres sont présents!")
            return True


async def main():
    """Fonction principale"""
    print("🔥 VÉRIFICATION ET CORRECTION DES LIVRES BRESLOV 🔥")
    print("=" * 60)
    
    try:
        # Vérifier le statut actuel
        all_books_present = await check_book_status()
        
        if not all_books_present:
            print("\n🚀 Lancement de l'import intelligent...")
            print("   - Détection automatique API/Crawling")
            print("   - Import incrémental des livres manquants")
            print("   - Aucune donnée mock utilisée\n")
            
            # Lancer l'import des livres manquants
            await import_missing_books()
            
            # Vérifier à nouveau
            print("\n" + "="*60)
            print("🔍 VÉRIFICATION POST-IMPORT")
            print("="*60)
            
            final_status = await check_book_status()
            
            if final_status:
                print("\n🎉 SUCCÈS! Tous les livres Breslov sont maintenant importés.")
            else:
                print("\n⚠️ Certains livres n'ont pas pu être importés.")
                print("   Vérifiez les logs pour plus de détails.")
        
        # Statistiques finales
        print("\n" + "="*60)
        print("📊 STATISTIQUES FINALES")
        print("="*60)
        
        async with get_db_session() as session:
            books_result = await session.execute(select(func.count(Book.id)))
            total_books = books_result.scalar()
            
            texts_result = await session.execute(select(func.count(Text.id)))
            total_texts = texts_result.scalar()
            
            print(f"📚 Total des livres: {total_books}")
            print(f"📖 Total des sections: {total_texts}")
            print(f"📊 Moyenne par livre: {total_texts / total_books if total_books > 0 else 0:.1f}")
            
    except Exception as e:
        logger.error(f"Erreur lors de la vérification: {str(e)}")
        print(f"\n❌ Erreur: {str(e)}")
        return False
    
    print("\n✅ Processus terminé!")
    return True


if __name__ == "__main__":
    asyncio.run(main())