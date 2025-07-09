"""
Service d'import intelligent Sefaria
Détecte automatiquement si l'API fonctionne ou utilise le crawling
"""
import httpx
import asyncio
from typing import Dict, List, Optional, Tuple
import json
import os
from datetime import datetime
from bs4 import BeautifulSoup
import re
from sqlmodel import select
from app.database import get_db_session
from app.models.book import Book, BookCategory
from app.models.text import Text
from app.utils.logger import logger


class SefariaSmartImporter:
    """Import intelligent avec détection automatique API vs Crawling"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
        self.api_base = "https://www.sefaria.org/api/texts"
        self.web_base = "https://www.sefaria.org"
        self.method_used = None
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
        
    async def test_api_availability(self) -> bool:
        """Teste si l'API Sefaria est accessible"""
        try:
            # Test avec un texte connu
            response = await self.client.get(f"{self.api_base}/Genesis.1")
            if response.status_code == 200:
                data = response.json()
                return 'text' in data and 'he' in data
        except:
            pass
        return False
        
    async def import_text(self, book_name: str, section: str) -> Optional[Dict]:
        """
        Import intelligent : essaie l'API d'abord, puis crawling si échec
        AUCUNE donnée mock - échec si aucune méthode ne fonctionne
        """
        # 1. Essayer l'API d'abord
        api_result = await self._try_api_import(book_name, section)
        if api_result and api_result.get('success'):
            self.method_used = 'api'
            logger.info(f"✅ API réussie pour {book_name}.{section}")
            return api_result
            
        # 2. Si l'API échoue, essayer le crawling
        logger.warning(f"⚠️ API échouée pour {book_name}.{section}, tentative crawling...")
        crawl_result = await self._try_crawling_import(book_name, section)
        if crawl_result and crawl_result.get('success'):
            self.method_used = 'crawling'
            logger.info(f"✅ Crawling réussi pour {book_name}.{section}")
            return crawl_result
            
        # 3. Si tout échoue, retourner l'échec (PAS de mock)
        logger.error(f"❌ Impossible d'importer {book_name}.{section}")
        return None
        
    async def _try_api_import(self, book_name: str, section: str) -> Optional[Dict]:
        """Tentative d'import via l'API"""
        # Mapping des noms pour l'API
        api_names = {
            "Likutey Moharan": "Likutei_Moharan",
            "Likutey Moharan II": "Likutei_Moharan_II",
            "Sichot HaRan": "Sichot_HaRan",
            "Chayey Moharan": "Chayei_Moharan",
            "Sipurey Maasiyot": "Sippurei_Maasiyot",
            "Shivchey HaRan": "Shivchei_HaRan",
            "Sefer HaMiddot": "Sefer_HaMiddot",
            "Likutey Tefilot": "Likutei_Tefilot",
            "Kitzur Likutey Moharan": "Kitzur_Likutei_Moharan",
            "Likutey Etzot": "Likutei_Etzot",
            "Likutey Halachot": "Likutei_Halakhot",
            "Tikkun HaKlali": "Tikkun_HaKlali",
            "Meshivat Nefesh": "Meshivat_Nefesh"
        }
        
        api_name = api_names.get(book_name, book_name)
        
        # Essayer plusieurs formats
        attempts = [
            f"{api_name}.{section}",
            f"{api_name}_{section}",
            f"{api_name},{section}",
            f"{api_name}%20{section}"
        ]
        
        for attempt in attempts:
            try:
                url = f"{self.api_base}/{attempt}?lang=both&context=0"
                response = await self.client.get(url)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'text' in data or 'he' in data:
                        return {
                            'success': True,
                            'method': 'api',
                            'ref': data.get('ref', f"{book_name} {section}"),
                            'text': self._clean_array(data.get('text', [])),
                            'he': self._clean_array(data.get('he', [])),
                            'title': data.get('title', ''),
                            'heTitle': data.get('heTitle', '')
                        }
            except Exception as e:
                logger.debug(f"API attempt failed for {attempt}: {str(e)}")
                
        return None
        
    async def _try_crawling_import(self, book_name: str, section: str) -> Optional[Dict]:
        """Tentative d'import via crawling web"""
        # Mapping pour les URLs web
        web_names = {
            "Likutey Moharan": "Likutei_Moharan",
            "Likutey Moharan II": "Likutei_Moharan_II",
            "Sichot HaRan": "Sichot_HaRan",
            "Chayey Moharan": "Chayei_Moharan",
            "Sipurey Maasiyot": "Sippurei_Maasiyot",
            "Shivchey HaRan": "Shivchei_HaRan",
            "Sefer HaMiddot": "Sefer_HaMiddot",
            "Likutey Tefilot": "Likutei_Tefilot",
            "Kitzur Likutey Moharan": "Kitzur_Likutei_Moharan",
            "Likutey Etzot": "Likutei_Etzot",
            "Likutey Halachot": "Likutei_Halakhot",
            "Tikkun HaKlali": "Tikkun_HaKlali",
            "Meshivat Nefesh": "Meshivat_Nefesh"
        }
        
        web_name = web_names.get(book_name, book_name.replace(' ', '_'))
        url = f"{self.web_base}/{web_name}.{section}?lang=bi"
        
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None
                
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extraire le JSON embarqué
            for script in soup.find_all('script'):
                if script.string and 'SEFARIA_DATA' in script.string:
                    match = re.search(r'window\.SEFARIA_DATA\s*=\s*({[\s\S]*?});', 
                                    script.string, re.DOTALL)
                    if match:
                        try:
                            data = json.loads(match.group(1))
                            return {
                                'success': True,
                                'method': 'crawling',
                                'ref': f"{book_name} {section}",
                                'text': self._clean_array(data.get('text', [])),
                                'he': self._clean_array(data.get('he', [])),
                                'title': data.get('title', ''),
                                'heTitle': data.get('heTitle', '')
                            }
                        except:
                            pass
                            
            # Fallback : parser le HTML directement
            hebrew_segments = []
            english_segments = []
            
            # Chercher les segments
            for elem in soup.select('.he .segment, .he .segmentText'):
                text = elem.get_text(strip=True)
                if text:
                    hebrew_segments.append(text)
                    
            for elem in soup.select('.en .segment, .en .segmentText'):
                text = elem.get_text(strip=True)
                if text:
                    english_segments.append(text)
                    
            if hebrew_segments or english_segments:
                return {
                    'success': True,
                    'method': 'crawling_html',
                    'ref': f"{book_name} {section}",
                    'text': english_segments,
                    'he': hebrew_segments,
                    'title': f"{book_name} {section}",
                    'heTitle': f"{book_name} {section}"
                }
                
        except Exception as e:
            logger.error(f"Crawling failed for {book_name}.{section}: {str(e)}")
            
        return None
        
    def _clean_array(self, arr) -> List[str]:
        """Nettoie un array de textes"""
        if isinstance(arr, str):
            return [arr]
            
        cleaned = []
        for item in arr:
            if isinstance(item, str):
                # Enlever les tags HTML
                clean = re.sub(r'<[^>]+>', '', item)
                if clean.strip():
                    cleaned.append(clean.strip())
            elif isinstance(item, list):
                cleaned.extend(self._clean_array(item))
                
        return cleaned


# Les 13 livres Breslov COMPLETS avec vrais nombres de sections
BRESLOV_BOOKS_COMPLETE = [
    {"name": "Likutey Moharan", "sections": 286},
    {"name": "Likutey Moharan II", "sections": 125},
    {"name": "Likutey Tefilot", "sections": 210},  # Corriger selon les vraies données
    {"name": "Likutey Halachot", "sections": 300},  # Multi-volume avec beaucoup de sections
    {"name": "Likutey Etzot", "sections": 50},
    {"name": "Sichot HaRan", "sections": 308},
    {"name": "Chayey Moharan", "sections": 600},
    {"name": "Sefer HaMiddot", "sections": 100},
    {"name": "Sipurey Maasiyot", "sections": 13},
    {"name": "Shivchey HaRan", "sections": 100},
    {"name": "Kitzur Likutey Moharan", "sections": 200},
    {"name": "Tikkun HaKlali", "sections": 10},
    {"name": "Meshivat Nefesh", "sections": 50}
]


async def import_missing_books():
    """Importe UNIQUEMENT les livres manquants"""
    async with SefariaSmartImporter() as importer:
        # Vérifier l'API
        api_available = await importer.test_api_availability()
        logger.info(f"API Sefaria disponible: {api_available}")
        
        async with get_db_session() as session:
            # Vérifier les livres existants
            result = await session.execute(select(Book))
            existing_books = result.scalars().all()
            existing_titles = {book.title for book in existing_books}
            
            logger.info(f"📚 Livres existants: {len(existing_books)}")
            
            for book_config in BRESLOV_BOOKS_COMPLETE:
                book_name = book_config["name"]
                
                if book_name in existing_titles:
                    logger.info(f"✓ {book_name} déjà importé")
                    continue
                    
                logger.info(f"\n📖 Import de {book_name}")
                
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
                
                # Importer les sections
                success_count = 0
                for section in range(1, book_config["sections"] + 1):  # Import complet sans limitation
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
                        logger.info(f"  ✓ Section {section} importée (méthode: {result['method']})")
                    else:
                        logger.warning(f"  ✗ Section {section} échouée")
                        
                    await asyncio.sleep(0.5)  # Rate limiting
                    
                await session.commit()
                logger.info(f"📊 {book_name}: {success_count} sections importées")
                
        logger.info("\n✅ Import terminé!")


# Script d'exécution
if __name__ == "__main__":
    asyncio.run(import_missing_books())