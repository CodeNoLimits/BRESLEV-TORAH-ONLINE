from fastapi import APIRouter, HTTPException
from typing import List, Dict
import json
from pathlib import Path
import sys

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent.parent.parent
sys.path.append(str(backend_path))

from app.services.sefaria_client import SefariaClient

router = APIRouter()
client = SefariaClient()

@router.get("/all")
async def get_all_books():
    """Récupère la liste de tous les livres disponibles"""
    try:
        books_info = []
        
        for book_key, book_meta in client.BRESLOV_BOOKS.items():
            # Vérifier si le livre existe localement
            book_file = client.data_dir / f"{book_key}.json"
            
            book_info = {
                "id": book_key,
                "title_en": book_key.replace('_', ' '),
                "title_he": book_meta.get('he', ''),
                "available": book_file.exists(),
                "sections": 0
            }
            
            # Si disponible, ajouter info sur les sections
            if book_file.exists():
                try:
                    with open(book_file, 'r', encoding='utf-8') as f:
                        book_data = json.load(f)
                        book_info["sections"] = len(book_data.get('sections', {}))
                        book_info["title_en"] = book_data.get('title_en', book_info["title_en"])
                except:
                    pass
            
            books_info.append(book_info)
        
        return {
            "books": books_info,
            "total": len(books_info),
            "available": len([b for b in books_info if b["available"]])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{book_id}")
async def get_book_details(book_id: str):
    """Récupère les détails d'un livre spécifique"""
    try:
        book_file = client.data_dir / f"{book_id}.json"
        
        if not book_file.exists():
            raise HTTPException(status_code=404, detail=f"Book not found: {book_id}")
        
        with open(book_file, 'r', encoding='utf-8') as f:
            book_data = json.load(f)
        
        # Préparer la structure de retour
        sections_list = []
        for ref, section in book_data.get('sections', {}).items():
            sections_list.append({
                "ref": ref,
                "hebrew_preview": section.get('hebrew', '')[:100] + "...",
                "english_preview": section.get('english', '')[:100] + "...",
                "has_hebrew": bool(section.get('hebrew')),
                "has_english": bool(section.get('english'))
            })
        
        return {
            "id": book_id,
            "title": book_data.get('title', book_id),
            "title_en": book_data.get('title_en', book_id),
            "sections": sections_list,
            "total_sections": len(sections_list)
        }
        
    except Exception as e:
        if "not found" in str(e):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fetch")
async def fetch_books():
    """Lance le téléchargement de tous les livres"""
    try:
        results = await client.fetch_all_books()
        
        return {
            "message": "Téléchargement terminé",
            "results": results,
            "total_books": len(results),
            "successful": len([r for r in results.values() if r > 0])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))