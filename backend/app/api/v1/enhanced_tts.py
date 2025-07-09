"""
API endpoints pour le TTS amélioré
"""

from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field

from app.services.enhanced_tts_service import enhanced_tts_service
from app.models.user import User
from app.core.deps import get_current_user
from app.utils.logger import logger
from app.utils.monitoring import monitor_endpoint

router = APIRouter(prefix="/tts", tags=["tts"])


class TTSRequest(BaseModel):
    """Requête de synthèse TTS"""
    text: str = Field(..., description="Texte à synthétiser")
    language: Optional[str] = Field(None, description="Code de langue (he, fr, en)")
    voice_name: Optional[str] = Field(None, description="Nom de la voix spécifique")
    rate: float = Field(1.0, ge=0.25, le=4.0, description="Vitesse de parole")
    pitch: float = Field(0.0, ge=-20.0, le=20.0, description="Hauteur de la voix")
    volume: float = Field(0.8, ge=0.0, le=1.0, description="Volume")


class TTSResponse(BaseModel):
    """Réponse de synthèse TTS"""
    success: bool
    audio_data: Optional[str] = Field(None, description="Audio encodé en base64")
    detected_language: Optional[str] = Field(None, description="Langue détectée")
    voice_config: Optional[Dict] = Field(None, description="Configuration de voix utilisée")
    duration_estimate: Optional[float] = Field(None, description="Durée estimée en secondes")
    error: Optional[str] = Field(None, description="Message d'erreur")


class MultiLanguageTTSResponse(BaseModel):
    """Réponse de synthèse multi-langue"""
    success: bool
    segments: List[Dict] = Field(default_factory=list, description="Segments audio")
    total_duration: Optional[float] = Field(None, description="Durée totale estimée")
    error: Optional[str] = Field(None, description="Message d'erreur")


class HighlightingTTSResponse(BaseModel):
    """Réponse de synthèse avec données de highlighting"""
    success: bool
    chunks: List[Dict] = Field(default_factory=list, description="Chunks audio avec timing")
    total_duration: Optional[float] = Field(None, description="Durée totale")
    full_text: Optional[str] = Field(None, description="Texte complet")
    language: Optional[str] = Field(None, description="Langue détectée")
    error: Optional[str] = Field(None, description="Message d'erreur")


class VoicePreferences(BaseModel):
    """Préférences de voix utilisateur"""
    he_voice: Optional[str] = Field(None, description="Voix hébraïque préférée")
    fr_voice: Optional[str] = Field(None, description="Voix française préférée")
    en_voice: Optional[str] = Field(None, description="Voix anglaise préférée")
    he_rate: float = Field(0.9, description="Vitesse pour l'hébreu")
    fr_rate: float = Field(1.0, description="Vitesse pour le français")
    en_rate: float = Field(1.0, description="Vitesse pour l'anglais")


@router.post("/synthesize", response_model=TTSResponse)
@monitor_endpoint("/tts/synthesize")
async def synthesize_text(
    request: TTSRequest,
    current_user: User = Depends(get_current_user)
) -> TTSResponse:
    """
    Synthétise un texte en audio
    
    Args:
        request: Requête de synthèse
        current_user: Utilisateur actuel
        
    Returns:
        Réponse avec audio ou erreur
    """
    try:
        # Détecte la langue si non fournie
        detected_language = request.language
        if not detected_language:
            detected_language = enhanced_tts_service.detect_language(request.text)
        
        # Synthétise l'audio
        audio_data = await enhanced_tts_service.synthesize_text(
            text=request.text,
            language=detected_language,
            voice_name=request.voice_name,
            rate=request.rate,
            pitch=request.pitch,
            volume=request.volume
        )
        
        if audio_data:
            # Encode en base64
            import base64
            audio_b64 = base64.b64encode(audio_data).decode()
            
            # Estime la durée
            duration = enhanced_tts_service._estimate_duration(request.text, request.rate)
            
            # Configuration de voix utilisée
            voice_config = enhanced_tts_service._get_voice_config(detected_language)
            
            return TTSResponse(
                success=True,
                audio_data=audio_b64,
                detected_language=detected_language,
                voice_config=voice_config,
                duration_estimate=duration
            )
        else:
            return TTSResponse(
                success=False,
                error="Échec de la synthèse audio"
            )
            
    except Exception as e:
        logger.error(f"Erreur lors de la synthèse TTS: {e}")
        return TTSResponse(
            success=False,
            error=str(e)
        )


@router.post("/synthesize-mixed", response_model=MultiLanguageTTSResponse)
@monitor_endpoint("/tts/synthesize-mixed")
async def synthesize_mixed_language(
    request: TTSRequest,
    preferences: Optional[VoicePreferences] = None,
    current_user: User = Depends(get_current_user)
) -> MultiLanguageTTSResponse:
    """
    Synthétise un texte multi-langue en segments
    
    Args:
        request: Requête de synthèse
        preferences: Préférences de voix utilisateur
        current_user: Utilisateur actuel
        
    Returns:
        Réponse avec segments audio
    """
    try:
        # Convertit les préférences en dictionnaire
        user_preferences = None
        if preferences:
            user_preferences = preferences.dict()
        
        # Synthétise les segments
        segments = await enhanced_tts_service.synthesize_mixed_language(
            text=request.text,
            user_preferences=user_preferences
        )
        
        if segments:
            # Calcule la durée totale
            total_duration = sum(segment.get('duration_estimate', 0) for segment in segments)
            
            return MultiLanguageTTSResponse(
                success=True,
                segments=segments,
                total_duration=total_duration
            )
        else:
            return MultiLanguageTTSResponse(
                success=False,
                error="Aucun segment audio généré"
            )
            
    except Exception as e:
        logger.error(f"Erreur lors de la synthèse multi-langue: {e}")
        return MultiLanguageTTSResponse(
            success=False,
            error=str(e)
        )


@router.post("/synthesize-with-highlighting", response_model=HighlightingTTSResponse)
@monitor_endpoint("/tts/synthesize-with-highlighting")
async def synthesize_with_highlighting(
    request: TTSRequest,
    chunk_size: int = 200,
    current_user: User = Depends(get_current_user)
) -> HighlightingTTSResponse:
    """
    Synthétise un texte avec données pour highlighting synchronisé
    
    Args:
        request: Requête de synthèse
        chunk_size: Taille des chunks pour highlighting
        current_user: Utilisateur actuel
        
    Returns:
        Réponse avec chunks audio et timing
    """
    try:
        # Synthétise avec highlighting
        highlighting_data = await enhanced_tts_service.synthesize_with_highlighting(
            text=request.text,
            language=request.language,
            chunk_size=chunk_size
        )
        
        if highlighting_data:
            return HighlightingTTSResponse(
                success=True,
                chunks=highlighting_data.get('chunks', []),
                total_duration=highlighting_data.get('total_duration', 0),
                full_text=highlighting_data.get('full_text', ''),
                language=highlighting_data.get('language', 'en')
            )
        else:
            return HighlightingTTSResponse(
                success=False,
                error="Échec de la génération des données de highlighting"
            )
            
    except Exception as e:
        logger.error(f"Erreur lors de la synthèse avec highlighting: {e}")
        return HighlightingTTSResponse(
            success=False,
            error=str(e)
        )


@router.get("/voices")
@monitor_endpoint("/tts/voices")
async def get_available_voices(
    language: Optional[str] = None,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Récupère les voix disponibles
    
    Args:
        language: Code de langue optionnel (he, fr, en)
        current_user: Utilisateur actuel
        
    Returns:
        Dictionnaire des voix disponibles
    """
    try:
        voices = await enhanced_tts_service.get_available_voices(language)
        return {
            "success": True,
            "voices": voices,
            "supported_languages": list(enhanced_tts_service.supported_languages.keys())
        }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des voix: {e}")
        return {
            "success": False,
            "error": str(e)
        }


class LanguageDetectionRequest(BaseModel):
    """Requête de détection de langue"""
    text: str = Field(..., description="Texte à analyser")


@router.post("/detect-language")
@monitor_endpoint("/tts/detect-language")
async def detect_language(
    request: LanguageDetectionRequest,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Détecte la langue d'un texte
    
    Args:
        request: Requête de détection
        current_user: Utilisateur actuel
        
    Returns:
        Langue détectée et segments
    """
    try:
        # Détecte la langue
        detected_language = enhanced_tts_service.detect_language(request.text)
        
        # Divise en segments
        segments = enhanced_tts_service.split_by_language(request.text)
        
        return {
            "success": True,
            "detected_language": detected_language,
            "segments": segments,
            "mixed_language": len(segments) > 1
        }
    except Exception as e:
        logger.error(f"Erreur lors de la détection de langue: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/health")
async def tts_health():
    """
    Vérifie la santé du service TTS
    
    Returns:
        Statut du service
    """
    try:
        # Vérifie si le client Google TTS est initialisé
        has_client = enhanced_tts_service.client is not None
        
        return {
            "status": "healthy" if has_client else "degraded",
            "google_tts_available": has_client,
            "supported_languages": list(enhanced_tts_service.supported_languages.keys()),
            "features": {
                "multi_language": True,
                "highlighting": True,
                "voice_selection": True,
                "language_detection": True
            }
        }
    except Exception as e:
        logger.error(f"Erreur lors de la vérification de santé TTS: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }