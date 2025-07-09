#!/usr/bin/env python3
"""
Script d'import intelligent amélioré pour les textes Breslov
Basé sur l'architecture avancée avec fragmentation optimisée
"""

import asyncio
import sys
import os
from pathlib import Path
import httpx
import json
from typing import Dict, List, Optional, Tuple
import hashlib
from datetime import datetime
import time

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from app.database import get_db_session
from app.models.book import Book, BookCategory
from app.models.text import Text
from app.services.cache_service import cache_service
from app.utils.logger import logger
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert

# Configuration des livres Breslov avec nombres corrects de sections
BRESLOV_BOOKS_ENHANCED = {
    "Likutei_Moharan": {
        "title": "Likutei Moharan",
        "title_en": "Likutei Moharan",
        "he_title": "ליקוטי מוהר\"ן",
        "author": "Rabbi Nachman of Breslov",
        "category": BookCategory.CHASIDUT,
        "sections": 280,  # Nombre correct selon vos indications
        "parts": 2,
        "priority": 1
    },
    "Likutei_Moharan_II": {
        "title": "Likutei Moharan II",
        "title_en": "Likutei Moharan II",
        "he_title": "ליקוטי מוהר\"ן תנינא",
        "author": "Rabbi Nachman of Breslov",
        "category": BookCategory.CHASIDUT,
        "sections": 140,  # Nombre correct selon vos indications
        "parts": 1,
        "priority": 2
    },
    "Chayei_Moharan": {
        "title": "Chayei Moharan",
        "title_en": "Chayei Moharan",
        "he_title": "חיי מוהר\"ן",
        "author": "Rabbi Nathan of Breslov",
        "category": BookCategory.CHASIDUT,
        "sections": 50,
        "parts": 1,
        "priority": 3
    },
    "Likutei_Tefilot": {
        "title": "Likutei Tefilot",
        "title_en": "Likutei Tefilot",
        "he_title": "ליקוטי תפילות",
        "author": "Rabbi Nathan of Breslov",
        "category": BookCategory.CHASIDUT,
        "sections": 35,
        "parts": 1,
        "priority": 4
    },
    "Sippurei_Maasiyot": {
        "title": "Sippurei Maasiyot",
        "title_en": "Sippurei Maasiyot",
        "he_title": "סיפורי מעשיות",
        "author": "Rabbi Nachman of Breslov",
        "category": BookCategory.CHASIDUT,
        "sections": 13,
        "parts": 1,
        "priority": 5
    },
    "Sefer_HaMidot": {
        "title": "Sefer HaMidot",
        "title_en": "Sefer HaMidot",
        "he_title": "ספר המידות",
        "author": "Rabbi Nachman of Breslov",
        "category": BookCategory.CHASIDUT,
        "sections": 100,
        "parts": 1,
        "priority": 6
    },
    "Likutei_Etzot": {
        "title": "Likutei Etzot",
        "title_en": "Likutei Etzot",
        "he_title": "ליקוטי עצות",
        "author": "Rabbi Nathan of Breslov",
        "category": BookCategory.CHASIDUT,
        "sections": 80,
        "parts": 1,
        "priority": 7
    }
}

class EnhancedSefariaImporter:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.base_url = "https://www.sefaria.org/api"
        self.rate_limit_delay = 0.1  # 100ms entre les requêtes
        self.max_retries = 3
        self.fragment_size = 40000  # 40k tokens max par fragment
        self.stats = {
            'books_processed': 0,
            'texts_imported': 0,
            'errors': 0,
            'cache_hits': 0,
            'fragments_created': 0
        }
    
    async def close(self):
        """Ferme le client HTTP"""
        await self.client.aclose()
    
    def estimate_tokens(self, text: str) -> int:
        """Estimation du nombre de tokens (4 caractères ≈ 1 token)"""
        return len(text) // 4
    
    def create_fragment_id(self, book_slug: str, ref: str, fragment_index: int) -> str:
        """Crée un ID unique pour un fragment"""
        content = f"{book_slug}:{ref}:{fragment_index}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def fragment_text(self, text: str, he_text: str, max_tokens: int = 40000) -> List[Tuple[str, str]]:
        """
        Fragmente le texte en chunks intelligents
        Retourne une liste de tuples (text, he_text)
        """
        if not text or not he_text:
            return [(text or "", he_text or "")]
        
        # Si le texte est petit, pas besoin de fragmenter
        if self.estimate_tokens(text) <= max_tokens:
            return [(text, he_text)]
        
        # Divise par paragraphes d'abord
        paragraphs = text.split('\n\n')
        he_paragraphs = he_text.split('\n\n')
        
        # Assure-toi que les deux listes ont la même longueur
        min_length = min(len(paragraphs), len(he_paragraphs))
        paragraphs = paragraphs[:min_length]
        he_paragraphs = he_paragraphs[:min_length]
        
        fragments = []
        current_text = ""
        current_he_text = ""
        current_tokens = 0
        
        for i, (para, he_para) in enumerate(zip(paragraphs, he_paragraphs)):
            para_tokens = self.estimate_tokens(para)
            
            # Si ajouter ce paragraphe dépasse la limite
            if current_tokens + para_tokens > max_tokens and current_text:
                fragments.append((current_text.strip(), current_he_text.strip()))
                current_text = para
                current_he_text = he_para
                current_tokens = para_tokens
            else:
                current_text += "\n\n" + para if current_text else para
                current_he_text += "\n\n" + he_para if current_he_text else he_para
                current_tokens += para_tokens
        
        # Ajoute le dernier fragment
        if current_text:
            fragments.append((current_text.strip(), current_he_text.strip()))
        
        self.stats['fragments_created'] += len(fragments)
        return fragments
    
    async def get_text_with_retry(self, ref: str) -> Optional[Dict]:
        """Récupère un texte avec retry automatique"""
        for attempt in range(self.max_retries):
            try:
                await asyncio.sleep(self.rate_limit_delay)
                
                # Vérifie le cache Redis d'abord
                cache_key = f"sefaria_text:{ref}"
                cached = await cache_service.get("texts", cache_key)
                if cached:
                    self.stats['cache_hits'] += 1
                    return cached
                
                # Récupère depuis Sefaria
                response = await self.client.get(
                    f"{self.base_url}/texts/{ref}",
                    params={'commentary': 0, 'context': 0}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Cache pendant 24h
                    await cache_service.set("texts", cache_key, data, ttl=86400)
                    
                    return data
                elif response.status_code == 429:
                    # Rate limited, attendre plus longtemps
                    await asyncio.sleep(2 ** attempt)
                    continue
                else:
                    logger.warning(f"Erreur {response.status_code} pour {ref}")
                    
            except Exception as e:
                logger.error(f"Erreur lors de la récupération de {ref}: {e}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    self.stats['errors'] += 1
                    
        return None
    
    async def import_book_sections(self, book_slug: str, book_config: Dict) -> bool:
        """Importe toutes les sections d'un livre"""
        logger.info(f"Début de l'import du livre {book_slug}")
        
        async with get_db_session() as db:
            # Vérifie si le livre existe
            book_result = await db.execute(
                select(Book).where(Book.slug == book_slug)
            )
            book = book_result.scalar_one_or_none()
            
            if not book:
                # Crée le livre
                book = Book(
                    slug=book_slug,
                    title=book_config['title'],
                    title_en=book_config['title_en'],
                    he_title=book_config['he_title'],
                    author=book_config['author'],
                    category=book_config['category'],
                    parts=book_config['parts'],
                    order_index=book_config['priority']
                )
                db.add(book)
                await db.commit()
                await db.refresh(book)
                logger.info(f"Livre créé: {book.title}")
            
            # Compte les textes existants
            existing_count = await db.execute(
                select(func.count(Text.id)).where(Text.book_id == book.id)
            )
            existing_count = existing_count.scalar()
            
            logger.info(f"Textes existants: {existing_count}")
            
            # Importe les sections manquantes
            imported_count = 0
            total_sections = book_config['sections']
            
            for section_num in range(1, total_sections + 1):
                try:
                    # Construit la référence Sefaria
                    if book_config['parts'] > 1:
                        # Pour les livres avec plusieurs parties (comme Likutei Moharan)
                        if section_num <= 280:  # Partie 1
                            ref = f"{book_config['title']} {section_num}"
                        else:  # Partie 2
                            ref = f"{book_config['title']}, Part II {section_num - 280}"
                    else:
                        ref = f"{book_config['title']} {section_num}"
                    
                    # Vérifie si le texte existe déjà
                    existing_text = await db.execute(
                        select(Text).where(
                            Text.book_id == book.id,
                            Text.ref == ref
                        )
                    )
                    
                    if existing_text.scalar_one_or_none():
                        continue  # Texte déjà existant
                    
                    # Récupère le texte
                    text_data = await self.get_text_with_retry(ref)
                    if not text_data:
                        logger.warning(f"Impossible de récupérer {ref}")
                        continue
                    
                    # Extrait le contenu
                    text_content = text_data.get('text', '')
                    he_content = text_data.get('he', '')
                    
                    # Convertit en string si c'est une liste
                    if isinstance(text_content, list):
                        text_content = ' '.join(text_content)
                    if isinstance(he_content, list):
                        he_content = ' '.join(he_content)
                    
                    if not text_content and not he_content:
                        logger.warning(f"Contenu vide pour {ref}")
                        continue
                    
                    # Fragmente le texte
                    fragments = self.fragment_text(text_content, he_content)
                    
                    # Sauvegarde chaque fragment
                    for fragment_index, (fragment_text, fragment_he) in enumerate(fragments):
                        fragment_id = self.create_fragment_id(book_slug, ref, fragment_index)
                        
                        text_record = Text(
                            id=fragment_id,
                            book_id=book.id,
                            ref=f"{ref}_{fragment_index}" if len(fragments) > 1 else ref,
                            chapter=section_num,
                            verse=fragment_index + 1,
                            hebrew=fragment_he,
                            english=fragment_text,
                            french="",  # À traduire plus tard
                            language="mixed",
                            version="Sefaria",
                            is_active=True
                        )
                        
                        db.add(text_record)
                        imported_count += 1
                    
                    # Commit périodique pour éviter les transactions trop longues
                    if imported_count % 50 == 0:
                        await db.commit()
                        logger.info(f"Progression: {imported_count} textes importés pour {book_slug}")
                
                except Exception as e:
                    logger.error(f"Erreur lors de l'import de {ref}: {e}")
                    self.stats['errors'] += 1
                    continue
            
            # Commit final
            await db.commit()
            self.stats['texts_imported'] += imported_count
            logger.info(f"Import terminé pour {book_slug}: {imported_count} textes ajoutés")
            
            return imported_count > 0
    
    async def run_import(self):
        """Lance l'import complet"""
        logger.info("Début de l'import intelligent amélioré")
        start_time = time.time()
        
        try:
            # Trie les livres par priorité
            sorted_books = sorted(
                BRESLOV_BOOKS_ENHANCED.items(),
                key=lambda x: x[1]['priority']
            )
            
            for book_slug, book_config in sorted_books:
                try:
                    await self.import_book_sections(book_slug, book_config)
                    self.stats['books_processed'] += 1
                    
                    # Petite pause entre les livres
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"Erreur lors de l'import du livre {book_slug}: {e}")
                    self.stats['errors'] += 1
                    continue
            
            # Statistiques finales
            duration = time.time() - start_time
            logger.info(f"""
            Import terminé en {duration:.2f} secondes
            Livres traités: {self.stats['books_processed']}
            Textes importés: {self.stats['texts_imported']}
            Fragments créés: {self.stats['fragments_created']}
            Cache hits: {self.stats['cache_hits']}
            Erreurs: {self.stats['errors']}
            """)
            
        except Exception as e:
            logger.error(f"Erreur fatale lors de l'import: {e}")
            raise
        
        finally:
            await self.close()

async def main():
    """Fonction principale"""
    importer = EnhancedSefariaImporter()
    
    try:
        await importer.run_import()
        print("✅ Import terminé avec succès!")
    except Exception as e:
        print(f"❌ Erreur lors de l'import: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())