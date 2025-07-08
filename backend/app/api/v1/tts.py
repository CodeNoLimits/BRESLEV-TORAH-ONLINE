from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
import sys
from pathlib import Path
import base64

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent.parent.parent
sys.path.append(str(backend_path))

try:
    from app.services.tts_manager import TTSManager
except ImportError:
    # Mock TTS manager si le service n'existe pas
    class TTSManager:
        def __init__(self):
            self.available = False
            
        async def synthesize_speech(self, text: str, language: str = "he", voice: str = None):
            return {
                "audio_data": b'',
                "format": "mp3",
                "voice_used": "mock_voice",
                "language": language,
                "status": "mock_mode"
            }
            
        async def get_available_voices(self, language: str = None):
            return {
                "voices": [
                    {"name": "mock_hebrew", "language": "he", "gender": "NEUTRAL"},
                    {"name": "mock_english", "language": "en", "gender": "NEUTRAL"},
                    {"name": "mock_french", "language": "fr", "gender": "NEUTRAL"}
                ],
                "status": "mock_mode",
                "message": "TTS service not configured"
            }

router = APIRouter()

# Models
class TTSRequest(BaseModel):
    text: str
    language: str = "he"  # he, en, fr
    voice: Optional[str] = None
    speed: float = 1.0

# Initialize TTS manager
try:
    tts_manager = TTSManager()
except:
    tts_manager = TTSManager()  # Mock manager

@router.post("/synthesize")
async def synthesize_text(request: TTSRequest):
    """Convert text to speech"""
    try:
        result = await tts_manager.synthesize_speech(
            text=request.text,
            language=request.language,
            voice=request.voice
        )
        
        if result.get("audio_data"):
            audio_base64 = base64.b64encode(result["audio_data"]).decode('utf-8')
            return {
                "audio_data": audio_base64,
                "format": result.get("format", "mp3"),
                "voice_used": result.get("voice_used"),
                "language": result.get("language"),
                "status": "success"
            }
        else:
            return {
                "audio_data": "",
                "format": "mp3",
                "voice_used": "mock_voice",
                "language": request.language,
                "status": "mock_mode",
                "message": "TTS service in mock mode"
            }
            
    except Exception as e:
        return {
            "audio_data": "",
            "format": "mp3", 
            "voice_used": "error",
            "language": request.language,
            "status": "error",
            "message": f"TTS synthesis failed: {str(e)}"
        }

@router.get("/voices")
async def get_available_voices(language: Optional[str] = None):
    """Get list of available TTS voices"""
    try:
        result = await tts_manager.get_available_voices(language=language)
        return result
    except Exception as e:
        return {
            "voices": [
                {"name": "mock_hebrew", "language": "he", "gender": "NEUTRAL"},
                {"name": "mock_english", "language": "en", "gender": "NEUTRAL"},
                {"name": "mock_french", "language": "fr", "gender": "NEUTRAL"}
            ],
            "status": "mock_mode",
            "message": f"TTS service not configured: {str(e)}"
        }

@router.get("/status")
async def get_tts_status():
    """Get TTS service status"""
    try:
        return {
            "status": "mock_mode",
            "available": False,
            "supported_languages": ["he", "en", "fr"],
            "message": "TTS service in mock mode - configure Google Cloud TTS for full functionality"
        }
    except Exception as e:
        return {
            "status": "error",
            "available": False,
            "supported_languages": [],
            "message": f"TTS service error: {str(e)}"
        }