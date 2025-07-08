from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import sys
from pathlib import Path
import json

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent.parent.parent
sys.path.append(str(backend_path))

from app.services.gemini_manager import GeminiContextManager
from app.services.sefaria_client import SefariaClient

router = APIRouter()

# Instances globales
gemini_manager = None
sefaria_client = None

async def get_gemini_manager():
    """Obtient l'instance du gestionnaire Gemini (singleton)"""
    global gemini_manager
    if gemini_manager is None:
        gemini_manager = GeminiContextManager()
    return gemini_manager

async def get_sefaria_client():
    """Obtient l'instance du client Sefaria (singleton)"""
    global sefaria_client
    if sefaria_client is None:
        sefaria_client = SefariaClient()
    return sefaria_client

class ChatRequest(BaseModel):
    question: str
    book_context: Optional[str] = None
    mode: str = "study"  # study, exploration, analysis, counsel

class InitializeRequest(BaseModel):
    books: Optional[list] = None  # Si None, initialise tous les livres

@router.post("/chat")
async def chat_with_gemini(request: ChatRequest):
    """Chat intelligent avec Gemini AI et contexte RAG"""
    try:
        manager = await get_gemini_manager()
        
        # Vérifier si on a des livres initialisés
        if not manager.initialized_books:
            return {
                "answer": "⚠️ Aucun livre n'est encore initialisé. Veuillez d'abord initialiser les livres avec /api/v1/gemini/initialize",
                "error": True,
                "strategy": "not_initialized"
            }
        
        # Répondre avec contexte intelligent
        result = await manager.answer_question(
            question=request.question,
            book_context=request.book_context,
            mode=request.mode
        )
        
        return result
        
    except Exception as e:
        print(f"❌ Erreur chat Gemini: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/initialize")
async def initialize_books(request: InitializeRequest, background_tasks: BackgroundTasks):
    """Initialise les livres pour l'IA RAG"""
    try:
        manager = await get_gemini_manager()
        client = await get_sefaria_client()
        
        # Déterminer quels livres initialiser
        books_to_init = request.books if request.books else list(client.BRESLOV_BOOKS.keys())
        
        # Lancer l'initialisation en arrière-plan
        background_tasks.add_task(initialize_books_task, manager, client, books_to_init)
        
        return {
            "message": f"Initialisation de {len(books_to_init)} livres lancée en arrière-plan",
            "books": books_to_init,
            "status": "started"
        }
        
    except Exception as e:
        print(f"❌ Erreur initialisation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_initialization_status():
    """Récupère le statut d'initialisation"""
    try:
        manager = await get_gemini_manager()
        client = await get_sefaria_client()
        
        # Vérifier quels livres sont disponibles
        available_books = []
        for book_key in client.BRESLOV_BOOKS.keys():
            book_file = client.data_dir / f"{book_key}.json"
            if book_file.exists():
                available_books.append(book_key)
        
        return {
            "initialized_books": list(manager.initialized_books),
            "available_books": available_books,
            "total_summaries": len(manager.summaries),
            "status": "ready" if manager.initialized_books else "not_initialized"
        }
        
    except Exception as e:
        print(f"❌ Erreur statut: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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