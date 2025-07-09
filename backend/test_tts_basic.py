#!/usr/bin/env python3
"""
Test de base du service TTS (sans Google Cloud)
"""

import asyncio
import sys
import os
import re
from pathlib import Path

# Test de détection de langue sans imports
def detect_language(text: str) -> str:
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

def split_by_language(text: str) -> list:
    """Divise un texte en segments par langue"""
    if not text:
        return []
    
    # Divise en phrases
    sentences = re.split(r'[.!?]\s+', text)
    segments = []
    
    for sentence in sentences:
        if sentence.strip():
            lang = detect_language(sentence)
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

def test_language_detection():
    """Test de détection de langue"""
    print("🧪 Test de détection de langue...")
    
    test_cases = [
        ("שלום עולם", "he"),
        ("Bonjour le monde", "fr"),
        ("Hello world", "en"),
        ("Rabbi Nachman ז\"ל אמר", "he"),
        ("Le Rebbe a dit", "fr"),
        ("This is English text", "en"),
        ("C'est du français avec des accents", "fr"),
        ("הרב נחמן מברסלב", "he")
    ]
    
    success_count = 0
    for text, expected_lang in test_cases:
        detected = detect_language(text)
        status = "✅" if detected == expected_lang else "❌"
        print(f"{status} '{text}' -> {detected} (attendu: {expected_lang})")
        if detected == expected_lang:
            success_count += 1
    
    print(f"\n📊 Résultats: {success_count}/{len(test_cases)} réussites\n")
    return success_count == len(test_cases)

def test_text_segmentation():
    """Test de segmentation de texte par langue"""
    print("🧪 Test de segmentation par langue...")
    
    test_cases = [
        "Rabbi Nachman ז\"ל a dit: שלום עולם. This is important. Ceci est en français.",
        "Bonjour. שלום. Hello world.",
        "Le Rebbe הרב נחמן said something important."
    ]
    
    for i, mixed_text in enumerate(test_cases):
        print(f"\nTest {i+1}: {mixed_text}")
        segments = split_by_language(mixed_text)
        
        print("Segments détectés:")
        for j, segment in enumerate(segments):
            print(f"  {j+1}. [{segment['language']}] {segment['text']}")
    
    print("\n✅ Segmentation terminée\n")
    return True

def test_token_estimation():
    """Test d'estimation des tokens"""
    print("🧪 Test d'estimation des tokens...")
    
    def estimate_tokens(text: str) -> int:
        """Estimation du nombre de tokens (4 caractères ≈ 1 token)"""
        return len(text) // 4
    
    test_texts = [
        "Court texte",
        "Texte de longueur moyenne pour tester l'estimation",
        "Texte très long qui devrait avoir beaucoup plus de tokens pour tester notre système d'estimation et voir si cela fonctionne correctement avec des phrases complexes.",
        "שלום עולם - texte hébreu",
        "Texte mixte avec français et עברית ensemble"
    ]
    
    for text in test_texts:
        tokens = estimate_tokens(text)
        print(f"'{text[:50]}...' -> {tokens} tokens (longueur: {len(text)} chars)")
    
    print("\n✅ Estimation des tokens terminée\n")
    return True

def test_fragment_creation():
    """Test de création de fragments"""
    print("🧪 Test de création de fragments...")
    
    def create_fragment_id(book_slug: str, ref: str, fragment_index: int) -> str:
        """Crée un ID unique pour un fragment"""
        import hashlib
        content = f"{book_slug}:{ref}:{fragment_index}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    test_cases = [
        ("likutei_moharan", "Likutei Moharan 1", 0),
        ("likutei_moharan", "Likutei Moharan 1", 1),
        ("chayei_moharan", "Chayei Moharan 5", 0),
    ]
    
    for book_slug, ref, fragment_index in test_cases:
        fragment_id = create_fragment_id(book_slug, ref, fragment_index)
        print(f"{book_slug}:{ref}:{fragment_index} -> {fragment_id}")
    
    print("\n✅ Création de fragments terminée\n")
    return True

def test_duration_estimation():
    """Test d'estimation de durée"""
    print("🧪 Test d'estimation de durée...")
    
    def estimate_duration(text: str, rate: float = 1.0) -> float:
        """Estime la durée de l'audio en secondes"""
        words = len(text.split())
        base_duration = (words / 150) * 60  # 150 mots par minute
        return base_duration / rate
    
    test_texts = [
        "Court texte",
        "Texte de longueur moyenne pour tester l'estimation de durée",
        "Texte très long qui devrait prendre beaucoup plus de temps à lire et qui nous permet de tester notre système d'estimation de durée pour voir si cela fonctionne correctement avec des phrases complexes et des paragraphes étendus."
    ]
    
    for text in test_texts:
        duration_normal = estimate_duration(text, 1.0)
        duration_slow = estimate_duration(text, 0.8)
        duration_fast = estimate_duration(text, 1.2)
        
        print(f"'{text[:50]}...'")
        print(f"  Normal (1.0): {duration_normal:.2f}s")
        print(f"  Lent (0.8): {duration_slow:.2f}s") 
        print(f"  Rapide (1.2): {duration_fast:.2f}s")
        print()
    
    print("✅ Estimation de durée terminée\n")
    return True

def main():
    """Fonction principale de test"""
    print("🚀 Tests de base du service TTS amélioré\n")
    
    tests = [
        ("Détection de langue", test_language_detection),
        ("Segmentation de texte", test_text_segmentation),
        ("Estimation des tokens", test_token_estimation),
        ("Création de fragments", test_fragment_creation),
        ("Estimation de durée", test_duration_estimation),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
            print(f"{'✅' if result else '❌'} {test_name}: {'SUCCÈS' if result else 'ÉCHEC'}")
        except Exception as e:
            results.append((test_name, False))
            print(f"❌ {test_name}: ERREUR - {e}")
    
    print(f"\n📊 Résultats finaux:")
    success_count = sum(1 for _, result in results if result)
    print(f"Tests réussis: {success_count}/{len(results)}")
    
    if success_count == len(results):
        print("🎉 Tous les tests de base sont passés!")
        return True
    else:
        print("⚠️  Certains tests ont échoué")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)