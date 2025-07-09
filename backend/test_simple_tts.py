#!/usr/bin/env python3
"""
Test du service TTS simple
"""

import asyncio
import sys
from pathlib import Path

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

async def test_simple_tts():
    """Test du service TTS simple"""
    print("🧪 Test du service TTS simple...")
    
    try:
        # Import du service
        from app.services.simple_tts_service import simple_tts_service
        
        # Test de détection de langue
        test_text = "Rabbi Nachman ז\"ל a dit: שלום עולם. This is important."
        
        detected_lang = simple_tts_service.detect_language(test_text)
        print(f"✅ Langue détectée: {detected_lang}")
        
        # Test de segmentation
        segments = simple_tts_service.split_by_language(test_text)
        print(f"✅ Segments: {len(segments)}")
        
        for i, segment in enumerate(segments):
            print(f"  {i+1}. [{segment['language']}] {segment['text']}")
        
        # Test de synthèse simple
        print("\n🧪 Test de synthèse simple...")
        
        audio_result = await simple_tts_service.synthesize_text(
            "Bonjour le monde",
            language="fr"
        )
        print(f"✅ Audio généré: {audio_result}")
        
        # Test de synthèse multi-langue
        print("\n🧪 Test de synthèse multi-langue...")
        
        mixed_result = await simple_tts_service.synthesize_mixed_language(test_text)
        print(f"✅ Segments audio: {len(mixed_result)}")
        
        for segment in mixed_result:
            print(f"  [{segment['language']}] {segment['text'][:30]}... ({segment['duration_estimate']:.2f}s)")
        
        # Test avec highlighting
        print("\n🧪 Test avec highlighting...")
        
        highlighting_result = await simple_tts_service.synthesize_with_highlighting(
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
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_simple_tts())
    sys.exit(0 if success else 1)