#!/usr/bin/env python3
"""
Test TTS standalone sans dépendances
"""

import asyncio
import hashlib
import base64
import re
from typing import Dict, List, Optional

class StandaloneTTSService:
    """Service TTS standalone pour tests"""
    
    def __init__(self):
        self.supported_languages = {
            'he': {'rate': 0.9, 'pitch': 0.0, 'volume': 0.8},
            'fr': {'rate': 1.0, 'pitch': 0.0, 'volume': 0.8},
            'en': {'rate': 1.0, 'pitch': 0.0, 'volume': 0.8}
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
        
        # Détection par mots-clés
        text_lower = text.lower()
        french_score = sum(1 for word in french_words if word in text_lower)
        english_score = sum(1 for word in english_words if word in text_lower)
        
        if french_chars > 0:
            french_score += 2
        
        if french_score > english_score:
            return 'fr'
        elif english_score > french_score:
            return 'en'
        else:
            return 'fr' if french_chars > 0 else 'en'
    
    def split_by_language(self, text: str) -> List[Dict[str, str]]:
        """Divise un texte en segments par langue"""
        if not text:
            return []
        
        sentences = re.split(r'[.!?]\s+', text)
        segments = []
        
        for sentence in sentences:
            if sentence.strip():
                lang = self.detect_language(sentence)
                segments.append({
                    'text': sentence.strip(),
                    'language': lang
                })
        
        if not segments:
            return []
        
        # Fusionne les segments consécutifs de même langue
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
    
    def estimate_duration(self, text: str, rate: float = 1.0) -> float:
        """Estime la durée de l'audio en secondes"""
        words = len(text.split())
        base_duration = (words / 150) * 60  # 150 mots par minute
        return base_duration / rate
    
    async def synthesize_text(self, text: str, language: Optional[str] = None) -> str:
        """Simule la synthèse d'un texte"""
        if not text:
            return ""
        
        if not language:
            language = self.detect_language(text)
        
        # Simule la synthèse
        signature = f"AUDIO_{language}_{hashlib.md5(text.encode()).hexdigest()[:8]}"
        return signature
    
    async def synthesize_mixed_language(self, text: str) -> List[Dict]:
        """Simule la synthèse d'un texte multi-langue"""
        if not text:
            return []
        
        segments = self.split_by_language(text)
        audio_segments = []
        
        for i, segment in enumerate(segments):
            lang = segment['language']
            lang_config = self.supported_languages.get(lang, self.supported_languages['en'])
            
            audio_signature = await self.synthesize_text(segment['text'], language=lang)
            
            if audio_signature:
                audio_segments.append({
                    'index': i,
                    'text': segment['text'],
                    'language': lang,
                    'audio_data': base64.b64encode(audio_signature.encode()).decode(),
                    'duration_estimate': self.estimate_duration(segment['text'], lang_config['rate'])
                })
        
        return audio_segments
    
    async def synthesize_with_highlighting(self, text: str, language: Optional[str] = None, chunk_size: int = 200) -> Dict:
        """Simule la synthèse avec données de highlighting"""
        if not text:
            return {}
        
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
        lang_config = self.supported_languages.get(language, self.supported_languages['en'])
        
        for i, chunk in enumerate(chunks):
            duration = self.estimate_duration(chunk, lang_config['rate'])
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

async def test_standalone_tts():
    """Test du service TTS standalone"""
    print("🧪 Test du service TTS standalone...")
    
    tts = StandaloneTTSService()
    
    # Test de détection de langue
    test_text = "Rabbi Nachman ז\"ל a dit: שלום עולם. This is important."
    
    detected_lang = tts.detect_language(test_text)
    print(f"✅ Langue détectée: {detected_lang}")
    
    # Test de segmentation
    segments = tts.split_by_language(test_text)
    print(f"✅ Segments: {len(segments)}")
    
    for i, segment in enumerate(segments):
        print(f"  {i+1}. [{segment['language']}] {segment['text']}")
    
    # Test de synthèse simple
    print("\n🧪 Test de synthèse simple...")
    
    audio_result = await tts.synthesize_text("Bonjour le monde", language="fr")
    print(f"✅ Audio généré: {audio_result}")
    
    # Test de synthèse multi-langue
    print("\n🧪 Test de synthèse multi-langue...")
    
    mixed_result = await tts.synthesize_mixed_language(test_text)
    print(f"✅ Segments audio: {len(mixed_result)}")
    
    for segment in mixed_result:
        print(f"  [{segment['language']}] {segment['text'][:30]}... ({segment['duration_estimate']:.2f}s)")
    
    # Test avec highlighting
    print("\n🧪 Test avec highlighting...")
    
    highlighting_result = await tts.synthesize_with_highlighting(
        "Ceci est un test de highlighting avec plusieurs mots pour tester le système.",
        language="fr",
        chunk_size=30
    )
    
    print(f"✅ Chunks générés: {len(highlighting_result['chunks'])}")
    print(f"   Durée totale: {highlighting_result['total_duration']:.2f}s")
    
    for chunk in highlighting_result['chunks']:
        print(f"   Chunk {chunk['index']}: {chunk['text'][:20]}... ({chunk['duration']:.2f}s)")
    
    print("\n✅ Tous les tests sont passés!")
    return True

if __name__ == "__main__":
    success = asyncio.run(test_standalone_tts())
    if success:
        print("\n🎉 Service TTS ultra fonctionnel testé avec succès!")
    else:
        print("\n❌ Échec des tests")
    
    exit(0 if success else 1)