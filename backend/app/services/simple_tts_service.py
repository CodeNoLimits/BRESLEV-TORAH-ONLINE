"""
Service TTS Simple pour tests immédiats
Sans dépendances Google Cloud
"""

import asyncio
import hashlib
import base64
import re
from typing import Dict, List, Optional, Tuple
from app.services.cache_service import cache_service
from app.utils.logger import logger


class SimpleTTSService:
    """Service TTS simple pour tests et développement"""
    
    def __init__(self):
        self.supported_languages = {
            'he': {
                'code': 'he-IL',
                'name': 'Hebrew',
                'rate': 0.9,
                'pitch': 0.0,
                'volume': 0.8
            },
            'fr': {
                'code': 'fr-FR',
                'name': 'French',
                'rate': 1.0,
                'pitch': 0.0,
                'volume': 0.8
            },
            'en': {
                'code': 'en-US',
                'name': 'English',
                'rate': 1.0,
                'pitch': 0.0,
                'volume': 0.8
            }
        }
    
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
    
    def _estimate_duration(self, text: str, rate: float = 1.0) -> float:
        """Estime la durée de l'audio en secondes"""
        words = len(text.split())
        base_duration = (words / 150) * 60  # 150 mots par minute
        return base_duration / rate
    
    def _get_voice_config(self, language: str, user_preferences: Optional[Dict] = None) -> Dict:
        """Récupère la configuration de voix pour une langue"""
        lang_config = self.supported_languages.get(language, self.supported_languages['en'])
        
        # Configuration par défaut
        voice_config = {
            'language': language,
            'rate': lang_config['rate'],
            'pitch': lang_config['pitch'],
            'volume': lang_config['volume']
        }
        
        # Applique les préférences utilisateur
        if user_preferences:
            if f'{language}_rate' in user_preferences:
                voice_config['rate'] = user_preferences[f'{language}_rate']
            if f'{language}_pitch' in user_preferences:
                voice_config['pitch'] = user_preferences[f'{language}_pitch']
            if f'{language}_volume' in user_preferences:
                voice_config['volume'] = user_preferences[f'{language}_volume']
        
        return voice_config
    
    async def synthesize_text(
        self,
        text: str,
        language: Optional[str] = None,
        **kwargs
    ) -> Optional[str]:
        """
        Simule la synthèse d'un texte
        
        Returns:
            Chaîne simulée représentant l'audio
        """
        if not text:
            return None
        
        # Détecte la langue si non fournie
        if not language:
            language = self.detect_language(text)
        
        # Simule la synthèse
        logger.info(f"Synthèse simulée: [{language}] {text[:50]}...")
        
        # Retourne une "signature" du texte comme simulation
        signature = f"AUDIO_{language}_{hashlib.md5(text.encode()).hexdigest()[:8]}"
        return signature
    
    async def synthesize_mixed_language(
        self,
        text: str,
        user_preferences: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Simule la synthèse d'un texte multi-langue
        """
        if not text:
            return []
        
        # Divise le texte par langue
        segments = self.split_by_language(text)
        audio_segments = []
        
        for i, segment in enumerate(segments):
            # Configuration de voix
            voice_config = self._get_voice_config(segment['language'], user_preferences)
            
            # Simule la synthèse
            audio_signature = await self.synthesize_text(
                segment['text'],
                language=segment['language']
            )
            
            if audio_signature:
                audio_segments.append({
                    'index': i,
                    'text': segment['text'],
                    'language': segment['language'],
                    'audio_data': base64.b64encode(audio_signature.encode()).decode(),
                    'voice_config': voice_config,
                    'duration_estimate': self._estimate_duration(segment['text'], voice_config['rate'])
                })
        
        return audio_segments
    
    async def synthesize_with_highlighting(
        self,
        text: str,
        language: Optional[str] = None,
        chunk_size: int = 200
    ) -> Dict:
        """
        Simule la synthèse avec données de highlighting
        """
        if not text:
            return {}
        
        # Détecte la langue
        if not language:
            language = self.detect_language(text)
        
        # Divise en chunks
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
        
        # Simule la synthèse de chaque chunk
        audio_chunks = []
        total_duration = 0
        
        for i, chunk in enumerate(chunks):
            duration = self._estimate_duration(chunk, self.supported_languages[language]['rate'])
            
            # Simule l'audio
            audio_signature = await self.synthesize_text(chunk, language=language)
            
            audio_chunks.append({
                'index': i,
                'text': chunk,
                'audio_data': base64.b64encode(audio_signature.encode()).decode(),
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
simple_tts_service = SimpleTTSService()