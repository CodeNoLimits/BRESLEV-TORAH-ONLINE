"""
Text-to-Speech service using Google Cloud TTS API.
"""
import asyncio
import io
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List
from google.cloud import texttospeech
from google.api_core import exceptions as gcp_exceptions

from app.core.config import settings
from app.utils.logger import setup_logger
from app.services.cache_service import cache_service

logger = setup_logger(__name__)


class TTSManager:
    """
    Text-to-Speech manager using Google Cloud TTS API.
    """
    
    def __init__(self):
        """Initialize TTS manager with Google Cloud client."""
        self.client = None
        self._voices_cache: Dict[str, List[Dict[str, Any]]] = {}
        
    async def initialize(self):
        """Initialize Google Cloud TTS client."""
        try:
            # Initialize the client in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            self.client = await loop.run_in_executor(
                None, 
                lambda: texttospeech.TextToSpeechClient()
            )
            logger.info("Google Cloud TTS client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Google Cloud TTS client: {e}")
            raise
    
    def _get_cache_key(self, text: str, language: str, voice_name: str, 
                       speaking_rate: float, pitch: float) -> str:
        """Generate cache key for TTS audio."""
        content = f"{text}|{language}|{voice_name}|{speaking_rate}|{pitch}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _get_voice_settings(self, language: str) -> Dict[str, Any]:
        """Get voice settings for a specific language."""
        voice_settings = {
            'he': {
                'language_code': settings.GOOGLE_TTS_LANGUAGE_CODE_HE,
                'name': settings.GOOGLE_TTS_VOICE_NAME_HE,
            },
            'en': {
                'language_code': settings.GOOGLE_TTS_LANGUAGE_CODE_EN,
                'name': settings.GOOGLE_TTS_VOICE_NAME_EN,
            },
            'fr': {
                'language_code': settings.GOOGLE_TTS_LANGUAGE_CODE_FR,
                'name': settings.GOOGLE_TTS_VOICE_NAME_FR,
            }
        }
        
        return voice_settings.get(language, voice_settings['en'])
    
    async def synthesize_speech(
        self,
        text: str,
        language: str = 'he',
        voice_name: Optional[str] = None,
        speaking_rate: float = 1.0,
        pitch: float = 0.0,
        use_cache: bool = True
    ) -> bytes:
        """
        Synthesize speech from text.
        
        Args:
            text: Text to synthesize
            language: Language code (he, en, fr)
            voice_name: Specific voice name (optional)
            speaking_rate: Speaking rate (0.25 to 4.0)
            pitch: Pitch (-20.0 to 20.0)
            use_cache: Whether to use cached audio
            
        Returns:
            Audio data in MP3 format
            
        Raises:
            Exception: If synthesis fails
        """
        if not self.client:
            await self.initialize()
        
        # Get voice settings
        voice_settings = self._get_voice_settings(language)
        if voice_name:
            voice_settings['name'] = voice_name
        
        # Check cache first
        cache_key = self._get_cache_key(
            text, language, voice_settings['name'], speaking_rate, pitch
        )
        
        if use_cache:
            cached_audio = await cache_service.get(f"tts_audio:{cache_key}")
            if cached_audio:
                logger.info(f"TTS audio cache hit for key: {cache_key}")
                return cached_audio
        
        try:
            # Prepare synthesis input
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            # Voice selection
            voice = texttospeech.VoiceSelectionParams(
                language_code=voice_settings['language_code'],
                name=voice_settings['name']
            )
            
            # Audio config
            audio_config = texttospeech.AudioConfig(
                audio_encoding=getattr(
                    texttospeech.AudioEncoding,
                    settings.GOOGLE_TTS_AUDIO_ENCODING
                ),
                speaking_rate=max(0.25, min(4.0, speaking_rate)),
                pitch=max(-20.0, min(20.0, pitch))
            )
            
            # Perform synthesis
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.synthesize_speech(
                    input=synthesis_input,
                    voice=voice,
                    audio_config=audio_config
                )
            )
            
            audio_data = response.audio_content
            
            # Cache the audio
            if use_cache:
                await cache_service.set(
                    f"tts_audio:{cache_key}",
                    audio_data,
                    ttl=settings.CACHE_TTL_AUDIO
                )
            
            logger.info(f"TTS synthesis successful for language: {language}")
            return audio_data
            
        except gcp_exceptions.GoogleAPIError as e:
            logger.error(f"Google Cloud TTS API error: {e}")
            raise Exception(f"TTS synthesis failed: {e}")
        except Exception as e:
            logger.error(f"TTS synthesis error: {e}")
            raise Exception(f"TTS synthesis failed: {e}")
    
    async def get_available_voices(self, language_code: str) -> List[Dict[str, Any]]:
        """
        Get available voices for a language.
        
        Args:
            language_code: Language code (e.g., 'he-IL', 'en-US')
            
        Returns:
            List of available voices
        """
        if not self.client:
            await self.initialize()
        
        # Check cache first
        if language_code in self._voices_cache:
            return self._voices_cache[language_code]
        
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.list_voices()
            )
            
            voices = []
            for voice in response.voices:
                if language_code in voice.language_codes:
                    voices.append({
                        'name': voice.name,
                        'language_codes': list(voice.language_codes),
                        'gender': voice.ssml_gender.name,
                        'natural_sample_rate': voice.natural_sample_rate_hertz
                    })
            
            # Cache the voices
            self._voices_cache[language_code] = voices
            
            logger.info(f"Retrieved {len(voices)} voices for {language_code}")
            return voices
            
        except gcp_exceptions.GoogleAPIError as e:
            logger.error(f"Google Cloud TTS API error: {e}")
            raise Exception(f"Failed to get voices: {e}")
        except Exception as e:
            logger.error(f"Error getting voices: {e}")
            raise Exception(f"Failed to get voices: {e}")
    
    async def save_audio_file(
        self,
        audio_data: bytes,
        filename: str,
        directory: Optional[Path] = None
    ) -> Path:
        """
        Save audio data to file.
        
        Args:
            audio_data: Audio data bytes
            filename: Filename (without extension)
            directory: Directory to save file (optional)
            
        Returns:
            Path to saved file
        """
        if directory is None:
            directory = settings.AUDIO_CACHE_DIR
        
        directory.mkdir(parents=True, exist_ok=True)
        
        # Ensure MP3 extension
        if not filename.endswith('.mp3'):
            filename += '.mp3'
        
        file_path = directory / filename
        
        try:
            with open(file_path, 'wb') as f:
                f.write(audio_data)
            
            logger.info(f"Audio saved to: {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Error saving audio file: {e}")
            raise Exception(f"Failed to save audio file: {e}")
    
    async def synthesize_and_save(
        self,
        text: str,
        filename: str,
        language: str = 'he',
        voice_name: Optional[str] = None,
        speaking_rate: float = 1.0,
        pitch: float = 0.0,
        directory: Optional[Path] = None
    ) -> Path:
        """
        Synthesize speech and save to file.
        
        Args:
            text: Text to synthesize
            filename: Filename (without extension)
            language: Language code (he, en, fr)
            voice_name: Specific voice name (optional)
            speaking_rate: Speaking rate (0.25 to 4.0)
            pitch: Pitch (-20.0 to 20.0)
            directory: Directory to save file (optional)
            
        Returns:
            Path to saved audio file
        """
        audio_data = await self.synthesize_speech(
            text=text,
            language=language,
            voice_name=voice_name,
            speaking_rate=speaking_rate,
            pitch=pitch
        )
        
        return await self.save_audio_file(
            audio_data=audio_data,
            filename=filename,
            directory=directory
        )
    
    async def batch_synthesize(
        self,
        texts: List[str],
        language: str = 'he',
        voice_name: Optional[str] = None,
        speaking_rate: float = 1.0,
        pitch: float = 0.0
    ) -> List[bytes]:
        """
        Synthesize multiple texts in batch.
        
        Args:
            texts: List of texts to synthesize
            language: Language code (he, en, fr)
            voice_name: Specific voice name (optional)
            speaking_rate: Speaking rate (0.25 to 4.0)
            pitch: Pitch (-20.0 to 20.0)
            
        Returns:
            List of audio data bytes
        """
        tasks = [
            self.synthesize_speech(
                text=text,
                language=language,
                voice_name=voice_name,
                speaking_rate=speaking_rate,
                pitch=pitch
            )
            for text in texts
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        audio_data_list = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Batch synthesis failed for text {i}: {result}")
                audio_data_list.append(b'')  # Empty audio for failed synthesis
            else:
                audio_data_list.append(result)
        
        return audio_data_list
    
    async def cleanup_cache(self, max_age_hours: int = 24):
        """
        Clean up old cached audio files.
        
        Args:
            max_age_hours: Maximum age in hours for cached files
        """
        try:
            audio_dir = settings.AUDIO_CACHE_DIR
            if not audio_dir.exists():
                return
            
            import time
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            for file_path in audio_dir.glob("*.mp3"):
                file_age = current_time - file_path.stat().st_mtime
                if file_age > max_age_seconds:
                    file_path.unlink()
                    logger.info(f"Removed old cached audio file: {file_path}")
            
            logger.info("Audio cache cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during cache cleanup: {e}")


# Global TTS manager instance
tts_manager = TTSManager()