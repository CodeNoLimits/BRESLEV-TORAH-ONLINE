from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from typing import Optional, List
import sys
from pathlib import Path
from sqlmodel import Session, select, func

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent.parent.parent
sys.path.append(str(backend_path))

from app.services.sefaria_client import SefariaClient
from app.services.sefaria_smart_import import import_missing_books
from app.models.book import Book
from app.models.text import Text
from app.models.user import User, UserRole
from app.core.deps import get_current_user
from app.database import get_db_session

router = APIRouter()
client = SefariaClient()

@router.get("/{ref}")
async def get_text(ref: str):
    """Récupère un texte par référence"""
    try:
        result = await client.get_text(ref)
        if not result:
            raise HTTPException(status_code=404, detail=f"Text not found: {ref}")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search/")
async def search_texts(
    q: str = Query(..., description="Query to search for"),
    books: Optional[List[str]] = Query(None, description="Specific books to search in"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results")
):
    """Recherche dans les textes"""
    try:
        results = await client.search_texts(q, books)
        return {
            "query": q,
            "results": results[:limit],
            "total": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-breslov-books")
async def sync_breslov_books(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Synchronise les 13 livres Breslov (import intelligent)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    # Lancer en arrière-plan
    background_tasks.add_task(import_missing_books)
    
    return {
        "message": "Synchronisation démarrée",
        "info": "Utilise l'API Sefaria si disponible, sinon crawling automatique"
    }


@router.get("/books/{book_slug}/status")
async def get_book_import_status(book_slug: str):
    """Vérifie le statut d'import d'un livre"""
    # Convertir le slug en titre
    book_title = book_slug.replace('-', ' ').title()
    
    async with get_db_session() as db:
        # Chercher le livre
        book_result = await db.execute(
            select(Book).where(Book.title == book_title)
        )
        book = book_result.scalars().first()
        
        if not book:
            raise HTTPException(404, "Livre non trouvé")
            
        # Compter les textes
        count_result = await db.execute(
            select(func.count(Text.id)).where(Text.book_id == book.id)
        )
        text_count = count_result.scalar()
        
        return {
            "book": book.title,
            "imported_sections": text_count,
            "import_method": "smart_import",
            "complete": text_count > 0
        }