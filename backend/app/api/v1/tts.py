from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    language: str = "he"  # he, en, fr
    voice: Optional[str] = None

@router.post("/")
async def text_to_speech(request: TTSRequest):
    """Text-to-Speech (placeholder pour Phase 5)"""
    return {
        "message": f"TTS placeholder pour: {request.text[:50]}...",
        "language": request.language,
        "voice": request.voice,
        "audio_url": "placeholder_audio.mp3"
    }