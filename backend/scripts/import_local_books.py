#!/usr/bin/env python3
"""
Script to import local Breslov books from JSON files.
"""
import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models.book import Book, BookCategory
from app.models.text import Text
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

# Book metadata mapping
BOOK_METADATA = {
    "Chayei_Moharan": {
        "slug": "chayei_moharan",
        "title": "חיי מוהרן",
        "title_en": "Chayei Moharan",
        "title_fr": "Vie de Rabbi Nachman",
        "category": BookCategory.BIOGRAPHY,
        "description": "Biography of Rabbi Nachman of Breslov",
        "order_index": 1
    },
    "Likutei_Etzot": {
        "slug": "likutei_etzot",
        "title": "ליקוטי עצות",
        "title_en": "Likutei Etzot",
        "title_fr": "Conseils Collectés",
        "category": BookCategory.CHASIDUT,
        "description": "Collection of advice and teachings",
        "order_index": 2
    },
    "Likutei_Halakhot": {
        "slug": "likutei_halakhot",
        "title": "ליקוטי הלכות",
        "title_en": "Likutei Halakhot",
        "title_fr": "Lois Collectées",
        "category": BookCategory.CHASIDUT,
        "description": "Collection of laws and teachings",
        "order_index": 3
    },
    "Likutei_Moharan": {
        "slug": "likutei_moharan",
        "title": "ליקוטי מוהרן",
        "title_en": "Likutei Moharan",
        "title_fr": "Enseignements de Rabbi Nachman",
        "category": BookCategory.CHASIDUT,
        "description": "Main teachings of Rabbi Nachman",
        "order_index": 4
    },
    "Likutei_Tefilot": {
        "slug": "likutei_tefilot",
        "title": "ליקוטי תפילות",
        "title_en": "Likutei Tefilot",
        "title_fr": "Prières Collectées",
        "category": BookCategory.LITURGY,
        "description": "Collection of prayers",
        "order_index": 5
    },
    "Sefer_HaMidot": {
        "slug": "sefer_hamidot",
        "title": "ספר המידות",
        "title_en": "Sefer HaMidot",
        "title_fr": "Livre des Traits",
        "category": BookCategory.CHASIDUT,
        "description": "Book of character traits",
        "order_index": 6
    },
    "Shivchey_HaRan": {
        "slug": "shivchey_haran",
        "title": "שבחי הרן",
        "title_en": "Shivchey HaRan",
        "title_fr": "Louanges du Ran",
        "category": BookCategory.BIOGRAPHY,
        "description": "Praises and stories of Rabbi Nachman",
        "order_index": 7
    },
    "Sichot_HaRan": {
        "slug": "sichot_haran",
        "title": "שיחות הרן",
        "title_en": "Sichot HaRan",
        "title_fr": "Conversations du Ran",
        "category": BookCategory.CHASIDUT,
        "description": "Conversations of Rabbi Nachman",
        "order_index": 8
    },
    "Sippurei_Maasiyot": {
        "slug": "sippurei_maasiyot",
        "title": "סיפורי מעשיות",
        "title_en": "Sippurei Maasiyot",
        "title_fr": "Contes Mystiques",
        "category": BookCategory.STORIES,
        "description": "Mystical stories",
        "order_index": 9
    },
    "Tikkun_HaKlali": {
        "slug": "tikkun_haklali",
        "title": "תיקון הכללי",
        "title_en": "Tikkun HaKlali",
        "title_fr": "Réparation Générale",
        "category": BookCategory.LITURGY,
        "description": "General rectification prayers",
        "order_index": 10
    },
    "Tzavaat_HaRivash": {
        "slug": "tzavaat_harivash",
        "title": "צוואת הריבש",
        "title_en": "Tzavaat HaRivash",
        "title_fr": "Testament du Rivash",
        "category": BookCategory.CHASIDUT,
        "description": "Testament of the Rivash",
        "order_index": 11
    },
    "Tzofinat_Paneach": {
        "slug": "tzofinat_paneach",
        "title": "צופנת פענח",
        "title_en": "Tzofinat Paneach",
        "title_fr": "Révélateur de Secrets",
        "category": BookCategory.KABBALAH,
        "description": "Kabbalistic teachings",
        "order_index": 12
    }
}


async def import_local_books():
    """Import all local Breslov books from JSON files."""
    logger.info("🚀 Starting import of local Breslov books")
    
    data_dir = Path(__file__).parent.parent / "data" / "breslov_texts"
    imported_count = 0
    
    async with get_db_session() as session:
        try:
            for json_file in data_dir.glob("*.json"):
                book_key = json_file.stem
                
                if book_key not in BOOK_METADATA:
                    logger.warning(f"No metadata found for {book_key}")
                    continue
                
                logger.info(f"Processing {book_key}")
                
                # Load JSON data
                with open(json_file, 'r', encoding='utf-8') as f:
                    book_data = json.load(f)
                
                # Get book metadata
                metadata = BOOK_METADATA[book_key]
                
                # Create book record
                book = Book(
                    slug=metadata["slug"],
                    title=metadata["title"],
                    title_en=metadata["title_en"],
                    title_fr=metadata["title_fr"],
                    category=metadata["category"],
                    description=metadata["description"],
                    order_index=metadata["order_index"],
                    is_active=True,
                    is_featured=True
                )
                
                session.add(book)
                await session.flush()  # Get the book ID
                
                # Process texts
                text_count = 0
                for chapter_key, chapter_data in book_data.items():
                    if isinstance(chapter_data, dict):
                        for section_key, section_data in chapter_data.items():
                            if isinstance(section_data, dict) and "hebrew" in section_data:
                                text = Text(
                                    ref=f"{book_key}.{chapter_key}.{section_key}",
                                    book_slug=metadata["slug"],
                                    book_id=book.id,
                                    chapter=int(chapter_key) if chapter_key.isdigit() else 1,
                                    section=section_key,
                                    hebrew=section_data.get("hebrew", ""),
                                    english=section_data.get("english", ""),
                                    french=section_data.get("french", ""),
                                    language="he",
                                    is_active=True
                                )
                                session.add(text)
                                text_count += 1
                
                await session.commit()
                logger.info(f"✅ Imported {book_key}: {text_count} texts")
                imported_count += 1
                
        except Exception as e:
            logger.error(f"Error importing books: {e}")
            await session.rollback()
            raise
    
    logger.info(f"🎉 Successfully imported {imported_count} books")
    return imported_count


if __name__ == "__main__":
    asyncio.run(import_local_books())