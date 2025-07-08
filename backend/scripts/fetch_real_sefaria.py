#!/usr/bin/env python3

import asyncio
import httpx
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Add backend path to PYTHONPATH
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from app.services.sefaria_client import SefariaClient

class RealSefariaFetcher:
    """Téléchargeur RÉEL depuis API Sefaria - AUCUN MOCK"""
    
    def __init__(self):
        self.base_url = "https://www.sefaria.org/api"
        self.client = SefariaClient()
        self.data_dir = self.client.data_dir
        
        # VRAIE LISTE des livres Breslov disponibles sur Sefaria
        self.breslov_books = {
            "Likutei_Moharan": {
                "api_name": "Likutei Moharan",
                "hebrew_title": "ליקוטי מוהר\"ן",
                "description": "Primary teachings of Rabbi Nachman"
            },
            "Chayei_Moharan": {
                "api_name": "Chayei Moharan", 
                "hebrew_title": "חיי מוהר\"ן",
                "description": "Biography of Rabbi Nachman"
            },
            "Sippurei_Maasiyot": {
                "api_name": "Sippurei Maasiyot",
                "hebrew_title": "סיפורי מעשיות", 
                "description": "Mystical stories of Rabbi Nachman"
            },
            "Shivchey_HaRan": {
                "api_name": "Shivchey HaRan",
                "hebrew_title": "שבחי הר\"ן",
                "description": "Praises of Rabbi Nachman"
            },
            "Sichot_HaRan": {
                "api_name": "Sichot HaRan", 
                "hebrew_title": "שיחות הר\"ן",
                "description": "Conversations of Rabbi Nachman"
            },
            "Sefer_HaMidot": {
                "api_name": "Sefer HaMidot",
                "hebrew_title": "ספר המדות",
                "description": "Book of Traits"
            },
            "Likutei_Etzot": {
                "api_name": "Likutei Etzot",
                "hebrew_title": "ליקוטי עצות", 
                "description": "Collected Advice"
            },
            "Likutei_Tefilot": {
                "api_name": "Likutei Tefilot",
                "hebrew_title": "ליקוטי תפילות",
                "description": "Collected Prayers"
            }
        }

    async def fetch_book_from_sefaria(self, book_key: str, book_info: Dict) -> Optional[Dict]:
        """Télécharge un livre RÉEL depuis l'API Sefaria"""
        api_name = book_info["api_name"]
        
        print(f"📚 Fetching REAL data for {api_name}...")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Tentative 1: API texts endpoint
                url = f"{self.base_url}/texts/{api_name.replace(' ', '_')}"
                print(f"🔗 Trying URL: {url}")
                
                response = await client.get(url)
                
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_sefaria_response(book_key, book_info, data)
                
                # Tentative 2: Alternative endpoint
                url = f"{self.base_url}/v2/raw/text/{api_name.replace(' ', '_')}"
                print(f"🔗 Trying alternative URL: {url}")
                
                response = await client.get(url)
                
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_sefaria_response(book_key, book_info, data)
                
                # Tentative 3: Index endpoint pour structure
                url = f"{self.base_url}/index/{api_name.replace(' ', '_')}"
                print(f"🔗 Trying index URL: {url}")
                
                response = await client.get(url)
                
                if response.status_code == 200:
                    index_data = response.json()
                    # Utiliser l'index pour obtenir les sections
                    return await self._fetch_by_sections(client, api_name, book_key, book_info, index_data)
                
                print(f"❌ All API attempts failed for {api_name}")
                return None
                
            except Exception as e:
                print(f"❌ Error fetching {api_name}: {e}")
                return None

    def _parse_sefaria_response(self, book_key: str, book_info: Dict, data: Dict) -> Dict:
        """Parse la réponse de l'API Sefaria"""
        
        # Structure des données Sefaria
        hebrew_text = data.get("he", [])
        english_text = data.get("text", [])
        book_title = data.get("book", book_info["api_name"])
        
        sections = {}
        
        # Si les textes sont des listes (sections multiples)
        if isinstance(hebrew_text, list) and isinstance(english_text, list):
            max_sections = max(len(hebrew_text), len(english_text))
            
            for i in range(max_sections):
                section_ref = f"{i+1}"
                
                he_content = hebrew_text[i] if i < len(hebrew_text) else ""
                en_content = english_text[i] if i < len(english_text) else ""
                
                # Si le contenu est encore une liste (sous-sections)
                if isinstance(he_content, list):
                    he_content = " ".join(str(x) for x in he_content if x)
                if isinstance(en_content, list):
                    en_content = " ".join(str(x) for x in en_content if x)
                
                if he_content or en_content:
                    sections[section_ref] = {
                        "hebrew": str(he_content),
                        "english": str(en_content),
                        "ref": section_ref
                    }
        
        # Si c'est un texte simple
        elif isinstance(hebrew_text, str) or isinstance(english_text, str):
            sections["1"] = {
                "hebrew": str(hebrew_text) if hebrew_text else "",
                "english": str(english_text) if english_text else "",
                "ref": "1"
            }
        
        return {
            "title": book_info["hebrew_title"],
            "title_en": book_info["api_name"],
            "description": book_info["description"],
            "sections": sections,
            "source": "sefaria_api_real"
        }

    async def _fetch_by_sections(self, client: httpx.AsyncClient, api_name: str, book_key: str, book_info: Dict, index_data: Dict) -> Optional[Dict]:
        """Télécharge livre section par section"""
        
        sections = {}
        schema = index_data.get("schema", {})
        
        # Tentative de reconstruction à partir de l'index
        if "nodes" in schema:
            nodes = schema["nodes"]
            for i, node in enumerate(nodes[:10]):  # Limite à 10 sections pour éviter rate limiting
                section_name = node.get("title", f"Section {i+1}")
                
                # Fetch section individuelle
                section_url = f"{self.base_url}/texts/{api_name}/{i+1}"
                try:
                    response = await client.get(section_url)
                    if response.status_code == 200:
                        section_data = response.json()
                        
                        he_text = section_data.get("he", "")
                        en_text = section_data.get("text", "")
                        
                        if isinstance(he_text, list):
                            he_text = " ".join(str(x) for x in he_text if x)
                        if isinstance(en_text, list):
                            en_text = " ".join(str(x) for x in en_text if x)
                        
                        sections[str(i+1)] = {
                            "hebrew": str(he_text),
                            "english": str(en_text),
                            "ref": str(i+1)
                        }
                        
                        await asyncio.sleep(0.5)  # Rate limiting respectueux
                        
                except Exception as e:
                    print(f"⚠️ Failed to fetch section {i+1} for {api_name}: {e}")
                    continue
        
        if sections:
            return {
                "title": book_info["hebrew_title"],
                "title_en": book_info["api_name"], 
                "description": book_info["description"],
                "sections": sections,
                "source": "sefaria_api_sections"
            }
        
        return None

    async def download_all_real_books(self) -> Dict[str, int]:
        """Télécharge TOUS les vrais livres Breslov depuis Sefaria"""
        
        print("🚀 DOWNLOADING REAL BRESLOV BOOKS FROM SEFARIA API")
        print("=" * 60)
        print(f"📍 API Base: {self.base_url}")
        print(f"📂 Data directory: {self.data_dir}")
        print(f"📚 Books to fetch: {len(self.breslov_books)}")
        print("=" * 60)
        
        results = {}
        
        for book_key, book_info in self.breslov_books.items():
            try:
                book_data = await self.fetch_book_from_sefaria(book_key, book_info)
                
                if book_data and book_data.get("sections"):
                    # Sauvegarder le livre
                    book_file = self.data_dir / f"{book_key}.json"
                    
                    with open(book_file, 'w', encoding='utf-8') as f:
                        json.dump(book_data, f, ensure_ascii=False, indent=2)
                    
                    sections_count = len(book_data["sections"])
                    results[book_key] = sections_count
                    
                    print(f"✅ {book_info['api_name']}: {sections_count} sections downloaded")
                    
                else:
                    results[book_key] = 0
                    print(f"❌ {book_info['api_name']}: No data retrieved")
                
                # Rate limiting respectueux
                await asyncio.sleep(1.0)
                
            except Exception as e:
                results[book_key] = 0
                print(f"❌ {book_key}: Error - {e}")
        
        return results

async def main():
    """Script principal - téléchargement RÉEL"""
    
    fetcher = RealSefariaFetcher()
    
    try:
        results = await fetcher.download_all_real_books()
        
        print("\n" + "=" * 60)
        print("📊 RAPPORT FINAL - VRAIES DONNÉES SEFARIA")
        print("=" * 60)
        
        total_sections = sum(results.values())
        successful_books = len([count for count in results.values() if count > 0])
        
        for book_key, sections in results.items():
            book_info = fetcher.breslov_books[book_key]
            status = "✅" if sections > 0 else "❌"
            print(f"{status} {book_info['api_name']}: {sections} sections")
        
        print(f"\n🎯 TOTAL: {total_sections} sections récupérées")
        print(f"📚 Livres réussis: {successful_books}/{len(fetcher.breslov_books)}")
        
        if successful_books >= 4:
            print("\n🎉 Téléchargement RÉEL terminé avec succès !")
            print("📡 Source: API Sefaria officielle")
        else:
            print(f"\n⚠️ Seulement {successful_books} livres téléchargés")
            print("🔧 Vérifiez connectivité et disponibilité API Sefaria")
        
        return successful_books
        
    except Exception as e:
        print(f"\n❌ Erreur générale: {e}")
        return 0

if __name__ == "__main__":
    successful = asyncio.run(main())
    sys.exit(0 if successful >= 4 else 1)