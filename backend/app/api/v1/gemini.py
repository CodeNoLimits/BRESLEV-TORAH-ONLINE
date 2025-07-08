from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import sys
from pathlib import Path
import json

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent.parent.parent
sys.path.append(str(backend_path))

try:
    from app.services.real_gemini_manager import get_real_gemini_manager
    REAL_GEMINI_AVAILABLE = True
except ImportError:
    REAL_GEMINI_AVAILABLE = False
from app.services.sefaria_client import SefariaClient

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    book_context: Optional[str] = None
    mode: str = "study"  # study, exploration, analysis, counsel

class InitializeRequest(BaseModel):
    books: Optional[list] = None  # Si None, initialise tous les livres

@router.post("/chat")
async def chat_with_gemini(request: ChatRequest):
    """Chat RÉEL avec Gemini AI - AUCUN MOCK"""
    
    if not REAL_GEMINI_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="❌ Gemini service not available. Install google-generativeai: pip install google-generativeai"
        )
    
    try:
        manager = await get_real_gemini_manager()
        
        # Chat RÉEL avec l'API
        result = await manager.real_chat(
            question=request.question,
            book_context=request.book_context,
            mode=request.mode
        )
        
        return result
        
    except ValueError as e:
        # Erreur de configuration (clé API manquante)
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        # Erreur générale
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")

@router.post("/initialize")
async def initialize_gemini_service():
    """Initialise le service Gemini RÉEL"""
    
    if not REAL_GEMINI_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="❌ Gemini service not available. Install google-generativeai: pip install google-generativeai"
        )
    
    try:
        manager = await get_real_gemini_manager()
        result = await manager.initialize_service()
        
        return result
        
    except ValueError as e:
        # Erreur de configuration (clé API manquante)
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        # Erreur générale
        raise HTTPException(status_code=500, detail=f"Initialization failed: {str(e)}")

@router.get("/status")
async def get_gemini_status():
    """Status RÉEL du service Gemini - AUCUN MOCK"""
    
    if not REAL_GEMINI_AVAILABLE:
        return {
            "status": "service_unavailable",
            "error": "google-generativeai package not installed",
            "available_books": [],
            "service": "none"
        }
    
    try:
        manager = await get_real_gemini_manager()
        return await manager.get_status()
        
    except ValueError as e:
        # Clé API manquante
        return {
            "status": "config_error",
            "error": str(e),
            "available_books": [],
            "service": "real_gemini_api"
        }
        
    except Exception as e:
        # Erreur générale
        return {
            "status": "error",
            "error": str(e),
            "available_books": [],
            "service": "real_gemini_api"
        }

@router.post("/translate")
async def translate_text(text: str, target_lang: str = "fr"):
    """Traduction de texte avec Gemini"""
    try:
        manager = await get_gemini_manager()
        
        prompt = f"""Traduis ce texte en {target_lang} avec précision et fluidité:

TEXTE: {text}

INSTRUCTIONS:
- Garde le sens spirituel et les nuances
- Utilise un français moderne et fluide
- Préserve les références bibliques
- Si hébreu, translittère les termes techniques

TRADUCTION {target_lang.upper()}:"""
        
        response = manager.flash_model.generate_content(prompt)
        
        return {
            "original": text,
            "translated": response.text,
            "target_language": target_lang,
            "method": "gemini_flash"
        }
        
    except Exception as e:
        print(f"❌ Erreur traduction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def initialize_books_task(manager: GeminiContextManager, client: SefariaClient, books: list):
    """Tâche d'initialisation des livres en arrière-plan"""
    print(f"🚀 Début initialisation de {len(books)} livres...")
    
    for book_key in books:
        try:
            # Charger les données du livre
            book_file = client.data_dir / f"{book_key}.json"
            
            if not book_file.exists():
                print(f"⚠️ {book_key}: fichier non trouvé, téléchargement...")
                # Tenter de télécharger
                book_info = client.BRESLOV_BOOKS.get(book_key, {})
                book_data = await client._try_fetch_book(None, book_key, book_info)
                if book_data:
                    client._save_book(book_key, book_data)
                else:
                    print(f"❌ {book_key}: échec du téléchargement")
                    continue
            
            # Charger et préparer
            with open(book_file, 'r', encoding='utf-8') as f:
                book_data = json.load(f)
            
            success = await manager.prepare_book(book_key, book_data)
            if success:
                print(f"✅ {book_key}: initialisé avec succès")
            else:
                print(f"❌ {book_key}: échec de l'initialisation")
                
        except Exception as e:
            print(f"❌ {book_key}: erreur - {e}")
    
    print(f"🎯 Initialisation terminée: {len(manager.initialized_books)} livres prêts")