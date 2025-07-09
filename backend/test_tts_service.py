#!/usr/bin/env python3
"""
Test direct du service TTS (sans API)
"""

import asyncio
import sys
from pathlib import Path

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

async def test_tts_service():
    """Test direct du service TTS"""
    print("🧪 Test du service TTS amélioré...")
    
    try:
        # Import du service
        from app.services.enhanced_tts_service import enhanced_tts_service
        
        # Test de détection de langue
        test_text = "Rabbi Nachman ז\"ל a dit: שלום עולם. This is important."
        
        detected_lang = enhanced_tts_service.detect_language(test_text)
        print(f"✅ Langue détectée: {detected_lang}")
        
        # Test de segmentation
        segments = enhanced_tts_service.split_by_language(test_text)
        print(f"✅ Segments: {len(segments)}")
        
        for i, segment in enumerate(segments):
            print(f"  {i+1}. [{segment['language']}] {segment['text']}")
        
        # Test de synthèse (sans Google Cloud)
        print("\n🧪 Test de synthèse (simulation)...")
        
        # Simule la synthèse
        for segment in segments:
            print(f"Synthèse simulée: [{segment['language']}] {segment['text'][:50]}...")
            
            # Estimation de durée
            duration = enhanced_tts_service._estimate_duration(segment['text'], 1.0)
            print(f"  Durée estimée: {duration:.2f}s")
        
        print("\n✅ Tous les tests sont passés!")
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test_tts_service())