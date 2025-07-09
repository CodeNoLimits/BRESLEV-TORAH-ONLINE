#!/usr/bin/env python3
"""
Script pour importer les 13 livres Breslov depuis Sefaria.
"""
import asyncio
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional
import httpx
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.database import get_db_session
from app.models.book import Book, BookCreate
from app.models.text import Text, TextCreate
from app.utils.logger import logger


# Les 13 livres Breslov à importer EXACTEMENT
BRESLOV_BOOKS = [
    "Likutey Moharan",
    "Likutey Tefilot", 
    "Likutey Halachot",
    "Likutey Etzot",
    "Kitzur Likutey Moharan",
    "Sichot HaRan",
    "Chayey Moharan",
    "Sefer HaMiddot",
    "Sipurey Maasiyot",
    "Shivchey HaRan",
    "Likutey Moharan Tinyana",
    "The Letter Collection",
    "Additional Breslov Texts"
]


class SefariaImporter:
    """Importateur pour les livres Breslov depuis Sefaria."""
    
    def __init__(self):
        self.base_url = settings.sefaria_base_url
        self.session = None
        self.imported_books = []
        self.failed_imports = []
        
    async def __aenter__(self):
        """Contexte d'entrée async."""
        self.session = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "User-Agent": "Breslev-Torah-Online/1.0",
                "Accept": "application/json"
            }
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Contexte de sortie async."""
        if self.session:
            await self.session.aclose()
    
    async def search_book(self, book_title: str) -> Optional[Dict]:
        """
        Recherche un livre sur Sefaria.
        
        Args:
            book_title: Titre du livre à rechercher
            
        Returns:
            Données du livre ou None si non trouvé
        """
        try:
            # Recherche par titre
            search_url = f"{self.base_url}/search-wrapper"
            params = {
                "q": book_title,
                "type": "text",
                "sort": "relevance"
            }
            
            response = await self.session.get(search_url, params=params)
            response.raise_for_status()
            
            search_data = response.json()
            results = search_data.get("texts", [])
            
            # Cherche une correspondance exacte ou proche
            for result in results:
                if any(keyword in result.get("title", "").lower() 
                      for keyword in book_title.lower().split()):
                    return result
                    
            logger.warning(f"Livre non trouvé sur Sefaria: {book_title}")
            return None
            
        except Exception as e:
            logger.error(f"Erreur lors de la recherche de {book_title}: {e}")
            return None
    
    async def get_book_index(self, book_title: str) -> Optional[Dict]:
        """
        Récupère l'index d'un livre depuis Sefaria.
        
        Args:
            book_title: Titre du livre
            
        Returns:
            Index du livre ou None si erreur
        """
        try:
            # Encode le titre pour l'URL
            encoded_title = book_title.replace(" ", "_")
            index_url = f"{self.base_url}/index/{encoded_title}"
            
            response = await self.session.get(index_url)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de l'index pour {book_title}: {e}")
            return None
    
    async def get_book_text(self, book_title: str, section: str = None) -> Optional[Dict]:
        """
        Récupère le texte d'un livre depuis Sefaria.
        
        Args:
            book_title: Titre du livre
            section: Section spécifique (optionnel)
            
        Returns:
            Texte du livre ou None si erreur
        """
        try:
            # Encode le titre pour l'URL
            encoded_title = book_title.replace(" ", "_")
            
            if section:
                text_url = f"{self.base_url}/texts/{encoded_title}.{section}"
            else:
                text_url = f"{self.base_url}/texts/{encoded_title}"
            
            response = await self.session.get(text_url)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du texte pour {book_title}: {e}")
            return None
    
    async def import_book(self, book_title: str, db_session) -> bool:
        """
        Importe un livre complet dans la base de données.
        
        Args:
            book_title: Titre du livre à importer
            db_session: Session de base de données
            
        Returns:
            True si importé avec succès, False sinon
        """
        try:
            logger.info(f"Début de l'importation: {book_title}")
            
            # 1. Recherche du livre
            book_data = await self.search_book(book_title)
            if not book_data:
                # Essai avec l'index direct
                book_data = await self.get_book_index(book_title)
                if not book_data:
                    logger.error(f"Impossible de trouver {book_title}")
                    return False
            
            # 2. Récupération de l'index détaillé
            index_data = await self.get_book_index(book_title)
            if not index_data:
                logger.error(f"Impossible de récupérer l'index pour {book_title}")
                return False
            
            # 3. Création du livre en base
            book_create = BookCreate(
                title=book_title,
                hebrew_title=index_data.get("heTitle", book_title),
                author=index_data.get("authors", ["Rabbi Nachman of Breslov"])[0],
                category="breslov",
                language="he",
                description=index_data.get("enShortDesc", f"Livre Breslov: {book_title}"),
                total_chapters=len(index_data.get("schema", {}).get("nodes", [])) or 1,
                metadata={
                    "sefaria_title": index_data.get("title"),
                    "sefaria_categories": index_data.get("categories", []),
                    "composition_place": index_data.get("compPlace"),
                    "composition_time": index_data.get("compDate"),
                    "publication_info": index_data.get("pubPlace"),
                    "era": index_data.get("era"),
                    "imported_from": "sefaria",
                    "imported_at": datetime.utcnow().isoformat()
                }
            )
            
            # Vérifier si le livre existe déjà
            existing_book = await db_session.execute(
                Book.__table__.select().where(Book.title == book_title)
            )
            if existing_book.first():
                logger.warning(f"Livre {book_title} déjà importé")
                return True
            
            # Insérer le livre
            book = Book(**book_create.dict())
            db_session.add(book)
            await db_session.flush()  # Pour obtenir l'ID
            
            # 4. Récupération et importation des textes
            text_data = await self.get_book_text(book_title)
            if text_data:
                await self.import_book_texts(book, text_data, db_session)
            
            await db_session.commit()
            logger.info(f"✅ Livre {book_title} importé avec succès")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de l'importation de {book_title}: {e}")
            await db_session.rollback()
            return False
    
    async def import_book_texts(self, book: Book, text_data: Dict, db_session):
        """
        Importe les textes d'un livre.
        
        Args:
            book: Livre en base de données
            text_data: Données textuelles depuis Sefaria
            db_session: Session de base de données
        """
        try:
            hebrew_text = text_data.get("he", [])
            english_text = text_data.get("text", [])
            
            # Si c'est une structure imbriquée, l'aplatir
            if isinstance(hebrew_text, list) and hebrew_text:
                if isinstance(hebrew_text[0], list):
                    hebrew_text = [item for sublist in hebrew_text for item in sublist]
            
            if isinstance(english_text, list) and english_text:
                if isinstance(english_text[0], list):
                    english_text = [item for sublist in english_text for item in sublist]
            
            # Créer les textes
            max_texts = max(len(hebrew_text), len(english_text))
            
            for i in range(max_texts):
                hebrew_content = hebrew_text[i] if i < len(hebrew_text) else ""
                english_content = english_text[i] if i < len(english_text) else ""
                
                if hebrew_content or english_content:
                    text_create = TextCreate(
                        book_id=book.id,
                        chapter=1,  # Sera ajusté selon la structure
                        verse=i + 1,
                        hebrew_text=hebrew_content,
                        english_text=english_content,
                        french_text="",  # À traduire plus tard
                        metadata={
                            "section": text_data.get("sectionNames", []),
                            "verse_number": i + 1,
                            "imported_from": "sefaria"
                        }
                    )
                    
                    text = Text(**text_create.dict())
                    db_session.add(text)
            
            logger.info(f"Importé {max_texts} textes pour {book.title}")
            
        except Exception as e:
            logger.error(f"Erreur lors de l'importation des textes: {e}")
    
    async def import_all_books(self):
        """Importe tous les livres Breslov."""
        logger.info("🚀 Début de l'importation des 13 livres Breslov")
        
        async with get_db_session() as db_session:
            try:
                for book_title in BRESLOV_BOOKS:
                    success = await self.import_book(book_title, db_session)
                    
                    if success:
                        self.imported_books.append(book_title)
                    else:
                        self.failed_imports.append(book_title)
                    
                    # Petite pause entre les imports
                    await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"Erreur générale: {e}")
                await db_session.rollback()
                
        # Rapport final
        logger.info(f"✅ Importation terminée:")
        logger.info(f"   - Livres importés: {len(self.imported_books)}")
        logger.info(f"   - Échecs: {len(self.failed_imports)}")
        
        if self.imported_books:
            logger.info(f"   - Succès: {', '.join(self.imported_books)}")
        
        if self.failed_imports:
            logger.error(f"   - Échecs: {', '.join(self.failed_imports)}")
    
    async def save_backup(self):
        """Sauvegarde les livres importés en JSON."""
        backup_dir = Path("./data/backup")
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        backup_file = backup_dir / f"breslov_import_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        backup_data = {
            "imported_at": datetime.utcnow().isoformat(),
            "total_books": len(BRESLOV_BOOKS),
            "imported_books": self.imported_books,
            "failed_imports": self.failed_imports,
            "books_data": BRESLOV_BOOKS
        }
        
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"💾 Sauvegarde créée: {backup_file}")


async def main():
    """Fonction principale."""
    print("🔥 IMPORTATION DES 13 LIVRES BRESLOV 🔥")
    print("=" * 50)
    
    async with SefariaImporter() as importer:
        await importer.import_all_books()
        await importer.save_backup()
    
    print("\n🎯 Importation terminée !")


if __name__ == "__main__":
    asyncio.run(main())