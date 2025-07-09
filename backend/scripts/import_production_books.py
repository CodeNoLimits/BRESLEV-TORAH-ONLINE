#!/usr/bin/env python3
"""
Script d'import progressif pour la production
Importe les livres Breslov par batch avec vraies sections
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.sefaria_smart_import import SefariaSmartImporter, BRESLOV_BOOKS_COMPLETE
from app.database import get_db_session
from sqlmodel import select, func
from app.models.book import Book, BookCategory
from app.models.text import Text
from app.utils.logger import logger


async def import_book_progressive(book_config: dict, batch_size: int = 50):
    """Import progressif d'un livre par batch"""
    book_name = book_config["name"]
    total_sections = book_config["sections"]
    
    async with SefariaSmartImporter() as importer:
        async with get_db_session() as session:
            # Vérifier si le livre existe
            result = await session.execute(
                select(Book).where(Book.title == book_name)
            )
            book = result.scalars().first()
            
            if not book:
                # Créer le livre
                book = Book(
                    title=book_name,
                    title_en=book_name,
                    author="Rabbi Nachman of Breslov",
                    category=BookCategory.CHASIDUT,
                    slug=book_name.lower().replace(' ', '-')
                )
                session.add(book)
                await session.commit()
                await session.refresh(book)
                logger.info(f"📖 Livre créé: {book_name}")
            
            # Vérifier les sections existantes
            count_result = await session.execute(
                select(func.count(Text.id)).where(Text.book_id == book.id)
            )
            existing_sections = count_result.scalar()
            
            logger.info(f"📊 {book_name}: {existing_sections}/{total_sections} sections existantes")
            
            if existing_sections >= total_sections:
                logger.info(f"✅ {book_name} déjà complet")
                return True
            
            # Import par batch
            success_count = 0
            for batch_start in range(existing_sections + 1, total_sections + 1, batch_size):
                batch_end = min(batch_start + batch_size - 1, total_sections)
                
                logger.info(f"🔄 {book_name}: Import batch {batch_start}-{batch_end}")
                
                for section in range(batch_start, batch_end + 1):
                    result = await importer.import_text(book_name, str(section))
                    
                    if result:
                        # Sauvegarder dans la DB
                        text = Text(
                            ref=result['ref'],
                            book_slug=book.slug,
                            book_id=book.id,
                            chapter=section,
                            verse=1,
                            hebrew=" ".join(result['he']),
                            english=" ".join(result['text']),
                            full_text=" ".join(result['he']) + " " + " ".join(result['text']),
                            language="he"
                        )
                        session.add(text)
                        success_count += 1
                    else:
                        logger.warning(f"  ✗ Section {section} échouée")
                        
                    await asyncio.sleep(0.3)  # Rate limiting réduit
                
                # Commit du batch
                await session.commit()
                logger.info(f"💾 Batch {batch_start}-{batch_end} sauvegardé")
                
                # Pause entre les batches
                await asyncio.sleep(2)
            
            logger.info(f"📊 {book_name}: {success_count} nouvelles sections importées")
            return success_count > 0


async def main():
    """Import progressif de tous les livres"""
    print("🚀 IMPORT PRODUCTION PROGRESSIF")
    print("=" * 50)
    
    # Livres prioritaires (plus importants)
    priority_books = [
        "Likutey Moharan",
        "Likutey Moharan II", 
        "Likutey Tefilot",
        "Sichot HaRan"
    ]
    
    # Import des livres prioritaires d'abord
    for book_name in priority_books:
        book_config = next((b for b in BRESLOV_BOOKS_COMPLETE if b["name"] == book_name), None)
        if book_config:
            logger.info(f"\n🎯 Import prioritaire: {book_name}")
            await import_book_progressive(book_config, batch_size=30)
    
    # Import des autres livres
    for book_config in BRESLOV_BOOKS_COMPLETE:
        if book_config["name"] not in priority_books:
            logger.info(f"\n📚 Import standard: {book_config['name']}")
            await import_book_progressive(book_config, batch_size=50)
    
    # Rapport final
    async with get_db_session() as session:
        books_result = await session.execute(select(func.count(Book.id)))
        total_books = books_result.scalar()
        
        texts_result = await session.execute(select(func.count(Text.id)))
        total_texts = texts_result.scalar()
        
        print(f"\n✅ IMPORT TERMINÉ!")
        print(f"📚 Total des livres: {total_books}")
        print(f"📖 Total des sections: {total_texts}")


if __name__ == "__main__":
    asyncio.run(main())