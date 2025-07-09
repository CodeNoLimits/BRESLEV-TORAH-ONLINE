"""
Service TTS Ultra Fonctionnel pour Breslev Torah Online
Basé sur l'architecture avancée avec support multi-langue et streaming
"""

import asyncio
import hashlib
import json
import tempfile
import os
from typing import Dict, List, Optional, Tuple, Union
from pathlib import Path
from datetime import datetime, timedelta
import base64
import re

import google.cloud.texttospeech as tts
from google.cloud import texttospeech
from google.oauth2 import service_account

from app.core.config import settings
from app.services.cache_service import cache_service
from app.utils.logger import logger


class EnhancedTTSService:
    """Service TTS amélioré avec support multi-langue et streaming"""
    
    def __init__(self):
        self.client = None
        self.voice_cache = {}
        self.supported_languages = {
            'he': {
                'code': 'he-IL',
                'name': 'Hebrew',
                'voices': ['he-IL-Wavenet-A', 'he-IL-Wavenet-B', 'he-IL-Wavenet-C', 'he-IL-Wavenet-D'],
                'default_voice': 'he-IL-Wavenet-A',
                'rate': 0.9,  # Hébreu plus lent pour la compréhension
                'pitch': 0.0,
                'volume': 0.8
            },
            'fr': {
                'code': 'fr-FR',
                'name': 'French',
                'voices': ['fr-FR-Wavenet-A', 'fr-FR-Wavenet-B', 'fr-FR-Wavenet-C', 'fr-FR-Wavenet-D'],
                'default_voice': 'fr-FR-Wavenet-A',
                'rate': 1.0,
                'pitch': 0.0,
                'volume': 0.8
            },
            'en': {
                'code': 'en-US',
                'name': 'English',
                'voices': ['en-US-Wavenet-A', 'en-US-Wavenet-B', 'en-US-Wavenet-C', 'en-US-Wavenet-D'],
                'default_voice': 'en-US-Wavenet-A',
                'rate': 1.0,
                'pitch': 0.0,
                'volume': 0.8
            }
        }
        
        # Initialise le client Google TTS
        self._init_google_tts()
    
    def _init_google_tts(self):
        """Initialise le client Google Cloud TTS"""
        try:
            if settings.GOOGLE_APPLICATION_CREDENTIALS:
                # Charge les credentials depuis le fichier
                credentials = service_account.Credentials.from_service_account_file(
                    settings.GOOGLE_APPLICATION_CREDENTIALS
                )
                self.client = texttospeech.TextToSpeechClient(credentials=credentials)
            else:
                # Utilise les credentials par défaut
                self.client = texttospeech.TextToSpeechClient()
                
            logger.info("Client Google TTS initialisé avec succès")
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation du client TTS: {e}")
            self.client = None
    
    def detect_language(self, text: str) -> str:
        """Détecte la langue d'un texte"""
        if not text:
            return 'en'
        
        # Mots-clés par langue
        french_words = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'est', 'avec', 'dans', 'pour', 'sur', 'par', 'ce', 'qui', 'que', 'une', 'un', 'dit', 'rebbe', 'rabbi', 'bonjour', 'ceci', 'français']
        english_words = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with', 'for', 'as', 'was', 'on', 'are', 'he', 'said', 'this', 'rabbi', 'important', 'world', 'hello']
        
        # Détection par caractères
        hebrew_chars = len(re.findall(r'[\u0590-\u05FF]', text))
        french_chars = len(re.findall(r'[àâäçéèêëïîôöùûüÿ]', text))
        total_chars = len(text)
        
        # Si beaucoup de caractères hébreux
        if hebrew_chars > total_chars * 0.2:
            return 'he'
        
        # Détection par mots-clés (insensible à la casse)
        text_lower = text.lower()
        french_score = sum(1 for word in french_words if word in text_lower)
        english_score = sum(1 for word in english_words if word in text_lower)
        
        # Score par accents français
        if french_chars > 0:
            french_score += 2
        
        # Décision finale
        if french_score > english_score:
            return 'fr'
        elif english_score > french_score:
            return 'en'
        else:
            # Fallback sur les caractères spéciaux
            if french_chars > 0:
                return 'fr'
            else:
                return 'en'
    
    def split_by_language(self, text: str) -> List[Dict[str, str]]:
        """Divise un texte en segments par langue"""
        if not text:
            return []
        
        # Divise en phrases
        sentences = re.split(r'[.!?]\s+', text)
        segments = []
        
        for sentence in sentences:
            if sentence.strip():
                lang = self.detect_language(sentence)
                segments.append({
                    'text': sentence.strip(),
                    'language': lang
                })
        
        # Fusionne les segments consécutifs de même langue
        if not segments:
            return []
        
        merged_segments = []
        current_segment = segments[0]
        
        for segment in segments[1:]:
            if segment['language'] == current_segment['language']:
                current_segment['text'] += '. ' + segment['text']
            else:
                merged_segments.append(current_segment)
                current_segment = segment
        
        merged_segments.append(current_segment)
        return merged_segments
    
    def create_audio_cache_key(self, text: str, voice_config: Dict) -> str:
        """Crée une clé de cache pour l'audio"""
        content = f"{text}:{voice_config['voice']}:{voice_config['rate']}:{voice_config['pitch']}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def synthesize_text(
        self,
        text: str,
        language: Optional[str] = None,
        voice_name: Optional[str] = None,
        rate: float = 1.0,
        pitch: float = 0.0,
        volume: float = 0.8
    ) -> Optional[bytes]:
        """
        Synthétise un texte en audio
        
        Args:
            text: Texte à synthétiser
            language: Code de langue (he, fr, en)
            voice_name: Nom de la voix spécifique
            rate: Vitesse de parole (0.25 à 4.0)
            pitch: Hauteur de la voix (-20.0 à 20.0)
            volume: Volume (0.0 à 1.0)
            
        Returns:
            Données audio en bytes ou None en cas d'erreur
        """
        if not self.client:
            logger.error("Client TTS non initialisé")
            return None
        
        if not text or not text.strip():
            logger.warning("Texte vide fourni pour la synthèse")
            return None
        
        try:
            # Détecte la langue si non fournie
            if not language:
                language = self.detect_language(text)
            
            # Utilise la configuration par défaut pour la langue
            lang_config = self.supported_languages.get(language, self.supported_languages['en'])
            
            # Configuration de la voix
            voice_config = {
                'voice': voice_name or lang_config['default_voice'],
                'language_code': lang_config['code'],
                'rate': rate or lang_config['rate'],
                'pitch': pitch or lang_config['pitch'],
                'volume': volume or lang_config['volume']
            }
            
            # Vérifie le cache
            cache_key = self.create_audio_cache_key(text, voice_config)
            cached_audio = await cache_service.get("audio", cache_key)
            
            if cached_audio:
                logger.info(f"Audio récupéré depuis le cache pour: {text[:50]}...")
                return base64.b64decode(cached_audio)
            
            # Prépare la requête TTS
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            voice = texttospeech.VoiceSelectionParams(
                language_code=voice_config['language_code'],
                name=voice_config['voice']
            )
            
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=voice_config['rate'],
                pitch=voice_config['pitch'],
                volume_gain_db=voice_config['volume'] * 6 - 6  # Convertit 0-1 en dB
            )
            
            # Synthétise l'audio
            response = self.client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            
            # Met en cache l'audio (7 jours)
            audio_b64 = base64.b64encode(response.audio_content).decode()
            await cache_service.set("audio", cache_key, audio_b64, ttl=604800)
            
            logger.info(f"Audio synthétisé avec succès pour: {text[:50]}...")
            return response.audio_content
            
        except Exception as e:
            logger.error(f"Erreur lors de la synthèse TTS: {e}")
            return None
    
    async def synthesize_mixed_language(
        self,
        text: str,
        user_preferences: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Synthétise un texte multi-langue en segments
        
        Args:
            text: Texte avec plusieurs langues
            user_preferences: Préférences utilisateur pour les voix
            
        Returns:
            Liste de segments audio avec métadonnées
        """
        if not text:
            return []
        
        # Divise le texte par langue
        segments = self.split_by_language(text)
        audio_segments = []
        
        for i, segment in enumerate(segments):
            try:
                # Applique les préférences utilisateur
                voice_config = self._get_voice_config(segment['language'], user_preferences)
                
                # Synthétise l'audio
                audio_data = await self.synthesize_text(
                    segment['text'],
                    language=segment['language'],
                    voice_name=voice_config['voice'],
                    rate=voice_config['rate'],
                    pitch=voice_config['pitch'],
                    volume=voice_config['volume']
                )
                
                if audio_data:
                    # Encode en base64 pour le transport
                    audio_b64 = base64.b64encode(audio_data).decode()
                    
                    audio_segments.append({
                        'index': i,
                        'text': segment['text'],
                        'language': segment['language'],
                        'audio_data': audio_b64,
                        'voice_config': voice_config,
                        'duration_estimate': self._estimate_duration(segment['text'], voice_config['rate'])
                    })
                else:
                    logger.warning(f"Échec de la synthèse pour le segment {i}: {segment['text'][:50]}...")
                    
            except Exception as e:
                logger.error(f"Erreur lors de la synthèse du segment {i}: {e}")
                continue
        
        return audio_segments
    
    def _get_voice_config(self, language: str, user_preferences: Optional[Dict] = None) -> Dict:
        """Récupère la configuration de voix pour une langue"""
        lang_config = self.supported_languages.get(language, self.supported_languages['en'])
        
        # Configuration par défaut
        voice_config = {
            'voice': lang_config['default_voice'],
            'rate': lang_config['rate'],
            'pitch': lang_config['pitch'],
            'volume': lang_config['volume']
        }
        
        # Applique les préférences utilisateur
        if user_preferences:
            if f'{language}_voice' in user_preferences:
                voice_config['voice'] = user_preferences[f'{language}_voice']
            if f'{language}_rate' in user_preferences:
                voice_config['rate'] = user_preferences[f'{language}_rate']
            if f'{language}_pitch' in user_preferences:
                voice_config['pitch'] = user_preferences[f'{language}_pitch']
            if f'{language}_volume' in user_preferences:
                voice_config['volume'] = user_preferences[f'{language}_volume']
        
        return voice_config
    
    def _estimate_duration(self, text: str, rate: float) -> float:
        """Estime la durée de l'audio en secondes"""
        # Estimation basée sur ~150 mots par minute à vitesse normale
        words = len(text.split())
        base_duration = (words / 150) * 60  # en secondes
        return base_duration / rate
    
    async def get_available_voices(self, language: Optional[str] = None) -> Dict:
        """Récupère les voix disponibles"""
        if not self.client:
            return {}
        
        try:
            # Utilise le cache pour éviter les appels répétés
            cache_key = f"voices_{language or 'all'}"
            cached_voices = await cache_service.get("voices", cache_key)
            
            if cached_voices:
                return cached_voices
            
            # Récupère les voix depuis Google Cloud
            response = self.client.list_voices()
            voices_by_lang = {}
            
            for voice in response.voices:
                for lang_code in voice.language_codes:
                    # Extrait le code de langue (ex: 'he' depuis 'he-IL')
                    lang = lang_code.split('-')[0]
                    
                    if language and lang != language:
                        continue
                    
                    if lang not in voices_by_lang:
                        voices_by_lang[lang] = []
                    
                    voices_by_lang[lang].append({
                        'name': voice.name,
                        'gender': voice.ssml_gender.name,
                        'language_code': lang_code,
                        'natural_sample_rate': voice.natural_sample_rate_hertz
                    })
            
            # Met en cache pendant 24h
            await cache_service.set("voices", cache_key, voices_by_lang, ttl=86400)
            
            return voices_by_lang
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des voix: {e}")
            return {}
    
    async def create_ssml_text(
        self,
        text: str,
        language: str,
        emphasis_words: Optional[List[str]] = None,
        pause_positions: Optional[List[int]] = None
    ) -> str:
        """
        Crée un texte SSML pour un contrôle avancé
        
        Args:
            text: Texte de base
            language: Code de langue
            emphasis_words: Mots à accentuer
            pause_positions: Positions des pauses (en caractères)
            
        Returns:
            Texte SSML formaté
        """
        # Base SSML
        lang_code = self.supported_languages.get(language, self.supported_languages['en'])['code']
        ssml = f'<speak xml:lang="{lang_code}">'
        
        # Traite le texte
        processed_text = text
        
        # Ajoute les emphases
        if emphasis_words:
            for word in emphasis_words:
                processed_text = processed_text.replace(
                    word,
                    f'<emphasis level="strong">{word}</emphasis>'
                )
        
        # Ajoute les pauses
        if pause_positions:
            for pos in sorted(pause_positions, reverse=True):
                if pos < len(processed_text):
                    processed_text = (
                        processed_text[:pos] + 
                        '<break time="500ms"/>' + 
                        processed_text[pos:]
                    )
        
        ssml += processed_text + '</speak>'
        return ssml
    
    async def synthesize_with_highlighting(
        self,
        text: str,
        language: Optional[str] = None,
        chunk_size: int = 200
    ) -> Dict:
        """
        Synthétise avec information pour highlighting synchronisé
        
        Args:
            text: Texte à synthétiser
            language: Code de langue
            chunk_size: Taille des chunks pour le highlighting
            
        Returns:
            Dictionnaire avec audio et métadonnées pour highlighting
        """
        if not text:
            return {}
        
        # Détecte la langue
        if not language:
            language = self.detect_language(text)
        
        # Divise en chunks pour le highlighting
        words = text.split()
        chunks = []
        current_chunk = []
        current_length = 0
        
        for word in words:
            if current_length + len(word) > chunk_size and current_chunk:
                chunks.append(' '.join(current_chunk))
                current_chunk = [word]
                current_length = len(word)
            else:
                current_chunk.append(word)
                current_length += len(word) + 1
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        # Synthétise chaque chunk
        audio_chunks = []
        total_duration = 0
        
        for i, chunk in enumerate(chunks):
            audio_data = await self.synthesize_text(chunk, language=language)
            
            if audio_data:
                duration = self._estimate_duration(chunk, self.supported_languages[language]['rate'])
                
                audio_chunks.append({
                    'index': i,
                    'text': chunk,
                    'audio_data': base64.b64encode(audio_data).decode(),
                    'start_time': total_duration,
                    'duration': duration,
                    'word_count': len(chunk.split())
                })
                
                total_duration += duration
        
        return {
            'chunks': audio_chunks,
            'total_duration': total_duration,
            'language': language,
            'full_text': text
        }

# Instance singleton
enhanced_tts_service = EnhancedTTSService()