from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import sys
from pathlib import Path

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent.parent.parent
sys.path.append(str(backend_path))

from app.services.sefaria_client import SefariaClient

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