#!/usr/bin/env python3
"""
Test du service TTS amélioré
"""

import asyncio
import sys
import os
from pathlib import Path

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

from app.services.enhanced_tts_service import enhanced_tts_service
from app.utils.logger import logger

async def test_language_detection():
    """Test de détection de langue"""
    print("🧪 Test de détection de langue...")
    
    test_cases = [
        ("שלום עולם", "he"),
        ("Bonjour le monde", "fr"),
        ("Hello world", "en"),
        ("Rabbi Nachman ז\"ל אמר", "he"),
        ("Le Rebbe a dit", "fr")
    ]
    
    for text, expected_lang in test_cases:
        detected = enhanced_tts_service.detect_language(text)
        status = "✅" if detected == expected_lang else "❌"
        print(f"{status} '{text}' -> {detected} (attendu: {expected_lang})")
    
    print()

async def test_text_segmentation():
    """Test de segmentation de texte par langue"""
    print("🧪 Test de segmentation par langue...")
    
    mixed_text = "Rabbi Nachman ז\"ל a dit: שלום עולם. This is important. Ceci est en français."
    
    segments = enhanced_tts_service.split_by_language(mixed_text)
    
    print(f"Texte original: {mixed_text}")
    print("Segments détectés:")
    for i, segment in enumerate(segments):
        print(f"  {i+1}. [{segment['language']}] {segment['text']}")
    
    print()

async def test_voice_availability():
    """Test des voix disponibles"""
    print("🧪 Test des voix disponibles...")
    
    try:
        voices = await enhanced_tts_service.get_available_voices()
        
        if voices:
            print("Voix disponibles par langue:")
            for lang, voice_list in voices.items():
                if lang in ['he', 'fr', 'en']:
                    print(f"  {lang}: {len(voice_list)} voix")
                    for voice in voice_list[:2]:  # Montre les 2 premières
                        print(f"    - {voice['name']} ({voice['gender']})")
        else:
            print("❌ Aucune voix disponible (vérifiez la configuration Google Cloud)")
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des voix: {e}")
    
    print()

async def test_audio_synthesis():
    """Test de synthèse audio"""
    print("🧪 Test de synthèse audio...")
    
    test_texts = [
        ("שלום", "he"),
        ("Bonjour", "fr"),
        ("Hello", "en")
    ]
    
    for text, language in test_texts:
        try:
            print(f"Synthèse de '{text}' en {language}...")
            audio_data = await enhanced_tts_service.synthesize_text(
                text=text,
                language=language
            )
            
            if audio_data:
                print(f"✅ Audio généré: {len(audio_data)} bytes")
            else:
                print(f"❌ Échec de la synthèse pour '{text}'")
                
        except Exception as e:
            print(f"❌ Erreur lors de la synthèse de '{text}': {e}")
    
    print()

async def test_mixed_language_synthesis():
    """Test de synthèse multi-langue"""
    print("🧪 Test de synthèse multi-langue...")
    
    mixed_text = "Rabbi Nachman a dit: שלום עולם. Ceci est important."
    
    try:
        audio_segments = await enhanced_tts_service.synthesize_mixed_language(mixed_text)
        
        if audio_segments:
            print(f"✅ {len(audio_segments)} segments audio générés:")
            for segment in audio_segments:
                duration = segment.get('duration_estimate', 0)
                print(f"  - [{segment['language']}] {segment['text'][:50]}... ({duration:.2f}s)")
        else:
            print("❌ Aucun segment audio généré")
            
    except Exception as e:
        print(f"❌ Erreur lors de la synthèse multi-langue: {e}")
    
    print()

async def test_highlighting_data():
    """Test des données pour highlighting"""
    print("🧪 Test des données pour highlighting...")
    
    text = "Ceci est un texte pour tester le highlighting synchronisé avec l'audio."
    
    try:
        highlighting_data = await enhanced_tts_service.synthesize_with_highlighting(
            text=text,
            language="fr",
            chunk_size=50
        )
        
        if highlighting_data and 'chunks' in highlighting_data:
            print(f"✅ {len(highlighting_data['chunks'])} chunks générés:")
            print(f"   Durée totale: {highlighting_data['total_duration']:.2f}s")
            
            for chunk in highlighting_data['chunks']:
                print(f"   - Chunk {chunk['index']}: {chunk['text'][:30]}... ({chunk['duration']:.2f}s)")
        else:
            print("❌ Aucune donnée de highlighting générée")
            
    except Exception as e:
        print(f"❌ Erreur lors de la génération des données de highlighting: {e}")
    
    print()

async def main():
    """Fonction principale de test"""
    print("🚀 Début des tests du service TTS amélioré\n")
    
    # Tests de base
    await test_language_detection()
    await test_text_segmentation()
    
    # Tests avec Google Cloud (peuvent échouer si pas configuré)
    await test_voice_availability()
    await test_audio_synthesis()
    await test_mixed_language_synthesis()
    await test_highlighting_data()
    
    print("✅ Tests terminés!")

if __name__ == "__main__":
    asyncio.run(main())