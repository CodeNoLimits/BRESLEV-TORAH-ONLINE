"""
VRAI Gestionnaire Gemini API - AUCUN MOCK
Nécessite clé API Gemini obligatoire
"""

import os
import json
import asyncio
from typing import Dict, List, Optional, Any
from pathlib import Path
import logging

# Configuration logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    logger.error("❌ google-generativeai not installed. Run: pip install google-generativeai")
    GEMINI_AVAILABLE = False

class RealGeminiManager:
    """Gestionnaire RÉEL Gemini API - pas de mock"""
    
    def __init__(self):
        """Initialise avec VRAIE clé API Gemini obligatoire"""
        
        if not GEMINI_AVAILABLE:
            raise ImportError("google-generativeai package required. Install with: pip install google-generativeai")
        
        # Clé API OBLIGATOIRE
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "❌ GEMINI_API_KEY manquante!\n"
                "Obtenez votre clé gratuite sur: https://makersuite.google.com/app/apikey\n"
                "Puis ajoutez: export GEMINI_API_KEY=your_key"
            )
        
        # Configuration Gemini RÉELLE
        genai.configure(api_key=self.api_key)
        
        # Modèles RÉELS disponibles
        self.model = genai.GenerativeModel('gemini-pro')
        self.flash_model = genai.GenerativeModel('gemini-flash')
        
        # Base de connaissances Breslov
        self.breslov_context = {}
        self.initialized_books = set()
        
        # Chemin vers les données
        self.data_dir = Path(__file__).parent.parent.parent / "data" / "breslov_texts"
        
        logger.info("✅ RealGeminiManager initialized with API key")
    
    async def load_breslov_books(self) -> int:
        """Charge TOUS les livres Breslov en mémoire pour contexte IA"""
        
        if not self.data_dir.exists():
            logger.error(f"❌ Data directory not found: {self.data_dir}")
            return 0
        
        books_loaded = 0
        
        for book_file in self.data_dir.glob("*.json"):
            try:
                with open(book_file, 'r', encoding='utf-8') as f:
                    book_data = json.load(f)
                
                book_id = book_file.stem
                
                # Extraire tout le texte du livre pour le contexte
                book_context = {
                    "title": book_data.get("title", book_id),
                    "title_en": book_data.get("title_en", book_id),
                    "description": book_data.get("description", ""),
                    "sections": book_data.get("sections", {}),
                    "full_text_he": "",
                    "full_text_en": ""
                }
                
                # Concaténer tout le texte hébreu et anglais
                for section_ref, section_data in book_data.get("sections", {}).items():
                    he_text = section_data.get("hebrew", "")
                    en_text = section_data.get("english", "")
                    
                    book_context["full_text_he"] += f"[{section_ref}] {he_text}\n"
                    book_context["full_text_en"] += f"[{section_ref}] {en_text}\n"
                
                self.breslov_context[book_id] = book_context
                self.initialized_books.add(book_id)
                books_loaded += 1
                
                logger.info(f"✅ Loaded {book_data.get('title_en', book_id)}")
                
            except Exception as e:
                logger.error(f"❌ Failed to load {book_file}: {e}")
        
        logger.info(f"📚 Total books loaded: {books_loaded}")
        return books_loaded
    
    async def real_chat(self, question: str, book_context: str = None, mode: str = "study") -> Dict[str, Any]:
        """Chat RÉEL avec Gemini API - pas de mock"""
        
        try:
            # Construire le contexte pour l'IA
            context_text = ""
            
            if book_context and book_context in self.breslov_context:
                book_data = self.breslov_context[book_context]
                context_text = f"""
LIVRE ÉTUDIÉ: {book_data['title']} ({book_data['title_en']})
DESCRIPTION: {book_data['description']}

EXTRAITS PERTINENTS (Hébreu):
{book_data['full_text_he'][:2000]}...

EXTRAITS PERTINENTS (Anglais):
{book_data['full_text_en'][:2000]}...
"""
            else:
                # Contexte général Breslov
                all_titles = [data['title_en'] for data in self.breslov_context.values()]
                context_text = f"""
BIBLIOTHÈQUE BRESLOV DISPONIBLE:
{', '.join(all_titles)}

CONTEXTE GÉNÉRAL: Enseignements de Rabbi Nachman de Breslev (1772-1810)
"""
            
            # Prompt adapté au mode
            mode_prompts = {
                "study": "Tu es un expert érudit en enseignements hassidiques de Breslev. Réponds avec précision académique et références textuelles.",
                "exploration": "Tu es un guide spirituel bienveillant qui explore les enseignements de Rabbi Nachman avec ouverture et créativité.", 
                "analysis": "Tu es un analyste critique qui examine les enseignements de Breslev avec profondeur philosophique et nuance.",
                "counsel": "Tu es un conseiller spirituel qui applique la sagesse de Rabbi Nachman aux situations personnelles avec compassion."
            }
            
            prompt = f"""
{mode_prompts.get(mode, mode_prompts['study'])}

{context_text}

QUESTION DE L'UTILISATEUR: {question}

INSTRUCTIONS:
- Réponds en français sauf si demandé autrement
- Cite des références précises quand possible
- Reste fidèle à l'esprit des enseignements
- Adapte ta réponse au mode: {mode}
- Sois concis mais complet

RÉPONSE:
"""
            
            # Appel RÉEL à l'API Gemini
            logger.info(f"🤖 Sending real request to Gemini API...")
            
            response = await self._call_gemini_api(prompt)
            
            return {
                "answer": response,
                "book": book_context,
                "mode": mode,
                "error": False,
                "strategy": "real_gemini_api",
                "model": "gemini-pro",
                "context_used": bool(book_context)
            }
            
        except Exception as e:
            logger.error(f"❌ Gemini API call failed: {e}")
            
            # En cas d'erreur, on REFUSE de faire du mock
            return {
                "answer": f"❌ Erreur Gemini API: {str(e)}. Vérifiez votre clé API et quota.",
                "book": book_context,
                "mode": mode,
                "error": True,
                "strategy": "api_error",
                "model": "none"
            }
    
    async def _call_gemini_api(self, prompt: str) -> str:
        """Appel direct à l'API Gemini RÉELLE"""
        
        try:
            # Utilisation du modèle flash pour rapidité et économie
            response = self.flash_model.generate_content(prompt)
            
            if response.text:
                return response.text
            else:
                raise Exception("Empty response from Gemini API")
                
        except Exception as e:
            # Fallback sur le modèle principal si flash échoue
            logger.warning(f"Flash model failed, trying main model: {e}")
            
            response = self.model.generate_content(prompt)
            
            if response.text:
                return response.text
            else:
                raise Exception(f"Both Gemini models failed: {e}")
    
    async def get_status(self) -> Dict[str, Any]:
        """Status RÉEL du service Gemini"""
        
        try:
            # Test simple pour vérifier que l'API fonctionne
            test_response = self.flash_model.generate_content("Say hello")
            api_working = bool(test_response.text)
            
        except Exception as e:
            logger.error(f"API test failed: {e}")
            api_working = False
        
        return {
            "status": "ready" if api_working else "api_error",
            "api_key_configured": bool(self.api_key),
            "books_loaded": len(self.initialized_books),
            "available_books": list(self.initialized_books),
            "model": "gemini-pro",
            "service": "real_gemini_api",
            "no_mock": True
        }
    
    async def initialize_service(self) -> Dict[str, Any]:
        """Initialise le service complètement"""
        
        logger.info("🚀 Initializing REAL Gemini service...")
        
        # Charger tous les livres
        books_count = await self.load_breslov_books()
        
        # Vérifier API
        status = await self.get_status()
        
        return {
            "service": "real_gemini_manager",
            "books_loaded": books_count,
            "api_status": status["status"],
            "ready": books_count > 0 and status["status"] == "ready",
            "message": f"Loaded {books_count} Breslov books with real Gemini API"
        }

# Instance globale
_gemini_manager = None

async def get_real_gemini_manager() -> RealGeminiManager:
    """Singleton pour gestionnaire Gemini RÉEL"""
    global _gemini_manager
    
    if _gemini_manager is None:
        _gemini_manager = RealGeminiManager()
        await _gemini_manager.load_breslov_books()
    
    return _gemini_manager