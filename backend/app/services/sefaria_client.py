import httpx
import asyncio
from typing import Dict, List, Optional
from bs4 import BeautifulSoup
import json
import time
from pathlib import Path
import os
import redis
import hashlib

class SefariaClient:
    """Client robuste pour Sefaria avec fallback scraping"""
    
    BRESLOV_BOOKS = {
        'Likutei_Moharan': {
            'he': 'ליקוטי מוהר"ן',
            'parts': ['Part_One', 'Part_Two'],
            'alt_refs': ['Likutei_Moharan,_Part_I', 'Likutei_Moharan,_Part_II']
        },
        'Chayei_Moharan': {'he': 'חיי מוהר"ן'},
        'Likutei_Etzot': {'he': 'ליקוטי עצות'},
        'Likutei_Tefilot': {'he': 'ליקוטי תפילות'},
        'Sippurei_Maasiyot': {'he': 'סיפורי מעשיות'},
        'Shivchey_HaRan': {'he': 'שבחי הר"ן'},
        'Sefer_HaMidot': {'he': 'ספר המדות'},
        'Sichot_HaRan': {'he': 'שיחות הר"ן'},
        'Tzavaat_HaRivash': {'he': 'צוואת הריב"ש'},
        'Tzofinat_Paneach': {'he': 'צפנת פענח'},
        'Likutei_Halakhot': {'he': 'ליקוטי הלכות'},
        'Tikkun_HaKlali': {'he': 'תיקון הכללי'}
    }
    
    def __init__(self):
        self.api_base = "https://www.sefaria.org/api/v3"
        self.web_base = "https://www.sefaria.org"
        self.data_dir = Path("data/breslov_texts")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Redis cache
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            self.redis_client = redis.from_url(redis_url)
            self.redis_client.ping()
            self.cache_enabled = True
            print("✅ Redis cache activé")
        except:
            self.cache_enabled = False
            print("⚠️ Redis non disponible - cache désactivé")
        
    def _get_cache_key(self, key: str) -> str:
        """Génère une clé de cache"""
        return f"sefaria:{hashlib.md5(key.encode()).hexdigest()}"
    
    def _get_from_cache(self, key: str) -> Optional[Dict]:
        """Récupère depuis le cache Redis"""
        if not self.cache_enabled:
            return None
        try:
            cached = self.redis_client.get(self._get_cache_key(key))
            if cached:
                return json.loads(cached)
        except:
            pass
        return None
    
    def _set_cache(self, key: str, data: Dict, ttl: int = 3600):
        """Sauvegarde dans le cache Redis"""
        if not self.cache_enabled:
            return
        try:
            self.redis_client.setex(
                self._get_cache_key(key),
                ttl,
                json.dumps(data, ensure_ascii=False)
            )
        except:
            pass
        
    async def fetch_all_books(self):
        """Récupère TOUS les livres avec stratégie robuste"""
        results = {}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for book_key, book_info in self.BRESLOV_BOOKS.items():
                print(f"\n📚 Fetching {book_info['he']} ({book_key})...")
                
                # Vérifier cache d'abord
                cached = self._get_from_cache(f"book:{book_key}")
                if cached:
                    print(f"💾 Trouvé en cache: {book_key}")
                    results[book_key] = len(cached.get('sections', {}))
                    continue
                
                # Essayer plusieurs variantes du nom
                book_data = await self._try_fetch_book(client, book_key, book_info)
                
                if book_data:
                    # Sauvegarder immédiatement
                    self._save_book(book_key, book_data)
                    self._set_cache(f"book:{book_key}", book_data, ttl=86400)  # 24h
                    results[book_key] = len(book_data.get('sections', {}))
                    print(f"✅ Saved {book_key}: {results[book_key]} sections")
                else:
                    print(f"❌ Failed to fetch {book_key}")
                
                # Rate limiting
                await asyncio.sleep(2)
        
        return results
    
    async def _try_fetch_book(self, client: httpx.AsyncClient, book_key: str, book_info: Dict):
        """Essaye plusieurs méthodes pour récupérer un livre"""
        
        # 1. Essayer l'API directe
        book_data = await self._fetch_via_api(client, book_key)
        if book_data:
            return book_data
        
        # 2. Essayer avec variantes de noms
        if 'alt_refs' in book_info:
            for alt_ref in book_info['alt_refs']:
                book_data = await self._fetch_via_api(client, alt_ref)
                if book_data:
                    return book_data
        
        # 3. Fallback au web scraping
        return await self._scrape_book(client, book_key)
    
    async def _fetch_via_api(self, client: httpx.AsyncClient, ref: str) -> Optional[Dict]:
        """Récupère via API v3"""
        try:
            # D'abord obtenir l'index
            index_resp = await client.get(f"{self.api_base}/index/{ref}")
            if index_resp.status_code != 200:
                return None
                
            index_data = index_resp.json()
            
            # Extraire toutes les sections
            sections = self._extract_sections_from_index(index_data)
            
            # Récupérer chaque section
            book_data = {
                'title': index_data.get('heTitle', ref),
                'title_en': index_data.get('title', ref),
                'sections': {}
            }
            
            for section_ref in sections[:10]:  # Limiter pour test
                await asyncio.sleep(1)  # Rate limit
                
                try:
                    text_resp = await client.get(
                        f"{self.api_base}/texts/{section_ref}",
                        params={'context': 0, 'pad': 0}
                    )
                    
                    if text_resp.status_code == 200:
                        text_data = text_resp.json()
                        book_data['sections'][section_ref] = {
                            'hebrew': text_data.get('he', ''),
                            'english': text_data.get('text', ''),
                            'ref': section_ref
                        }
                except:
                    continue
            
            return book_data if book_data['sections'] else None
            
        except Exception as e:
            print(f"API error: {e}")
            return None
    
    def _extract_sections_from_index(self, index_data: Dict) -> List[str]:
        """Extrait les références de sections depuis l'index"""
        sections = []
        
        # Stratégies différentes selon la structure
        if 'schema' in index_data:
            schema = index_data['schema']
            title = index_data.get('title', '')
            
            # Cas simple: livre avec sections numérotées
            if isinstance(schema.get('lengths'), list):
                max_sections = schema['lengths'][0] if schema['lengths'] else 100
                for i in range(1, min(max_sections + 1, 51)):  # Limiter à 50
                    sections.append(f"{title} {i}")
            
            # Cas complexe: structure hiérarchique
            elif 'nodes' in schema:
                for node in schema['nodes'][:10]:  # Limiter
                    if 'title' in node:
                        sections.append(f"{title}, {node['title']}")
        
        return sections
    
    async def _scrape_book(self, client: httpx.AsyncClient, book_key: str) -> Optional[Dict]:
        """Scrape le livre depuis le site web"""
        print(f"🕷️ Attempting web scrape for {book_key}...")
        
        try:
            # Page d'index du livre
            url = f"{self.web_base}/{book_key.replace('_', '%20')}"
            resp = await client.get(url)
            
            if resp.status_code != 200:
                return None
            
            # Parser avec BeautifulSoup
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Extraire les données JSON embarquées
            script_tags = soup.find_all('script', type='application/json')
            for script in script_tags:
                try:
                    data = json.loads(script.string)
                    if 'text' in data or 'he' in data:
                        return self._parse_scraped_data(data)
                except:
                    continue
                    
        except Exception as e:
            print(f"Scraping error: {e}")
            
        return None
    
    def _parse_scraped_data(self, data: Dict) -> Dict:
        """Parse les données scrapées"""
        parsed = {
            'title': data.get('heTitle', 'Unknown'),
            'title_en': data.get('title', 'Unknown'),
            'sections': {}
        }
        
        # Extraire le texte selon la structure
        if 'text' in data and 'he' in data:
            parsed['sections']['1'] = {
                'hebrew': data.get('he', ''),
                'english': data.get('text', ''),
                'ref': '1'
            }
        
        return parsed
    
    def _save_book(self, book_key: str, book_data: Dict):
        """Sauvegarde les données du livre"""
        # Fichier principal
        with open(self.data_dir / f"{book_key}.json", 'w', encoding='utf-8') as f:
            json.dump(book_data, f, ensure_ascii=False, indent=2)
        
        # Fichiers séparés pour Hebrew/English
        hebrew_texts = {ref: s['hebrew'] for ref, s in book_data.get('sections', {}).items()}
        english_texts = {ref: s['english'] for ref, s in book_data.get('sections', {}).items()}
        
        with open(self.data_dir / f"{book_key}_he.json", 'w', encoding='utf-8') as f:
            json.dump(hebrew_texts, f, ensure_ascii=False, indent=2)
            
        with open(self.data_dir / f"{book_key}_en.json", 'w', encoding='utf-8') as f:
            json.dump(english_texts, f, ensure_ascii=False, indent=2)
    
    async def get_text(self, ref: str) -> Optional[Dict]:
        """Récupère un texte spécifique par référence"""
        cache_key = f"text:{ref}"
        
        # Vérifier cache
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        # Récupérer depuis l'API
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.get(
                    f"{self.api_base}/texts/{ref}",
                    params={'context': 0, 'pad': 0}
                )
                
                if resp.status_code == 200:
                    data = resp.json()
                    result = {
                        'hebrew': data.get('he', ''),
                        'english': data.get('text', ''),
                        'ref': ref,
                        'title': data.get('title', ref)
                    }
                    
                    # Cache pour 1 heure
                    self._set_cache(cache_key, result, ttl=3600)
                    return result
                    
            except Exception as e:
                print(f"Error fetching text {ref}: {e}")
                
        return None
    
    async def search_texts(self, query: str, books: List[str] = None) -> List[Dict]:
        """Recherche dans les textes"""
        results = []
        
        # Si pas de livres spécifiés, chercher dans tous
        if not books:
            books = list(self.BRESLOV_BOOKS.keys())
        
        for book_key in books:
            book_file = self.data_dir / f"{book_key}.json"
            if book_file.exists():
                with open(book_file, 'r', encoding='utf-8') as f:
                    book_data = json.load(f)
                
                # Recherche simple dans le contenu
                for ref, section in book_data.get('sections', {}).items():
                    if (query.lower() in section.get('english', '').lower() or
                        query in section.get('hebrew', '')):
                        results.append({
                            'book': book_key,
                            'ref': ref,
                            'hebrew': section.get('hebrew', ''),
                            'english': section.get('english', ''),
                            'score': 1.0  # Score simple pour l'instant
                        })
        
        return results[:20]  # Limiter les résultats