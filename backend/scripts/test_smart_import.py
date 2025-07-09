#!/usr/bin/env python3
"""
Script de test pour le système d'import intelligent
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.sefaria_smart_import import SefariaSmartImporter
from app.utils.logger import logger


async def test_api_availability():
    """Test si l'API Sefaria est disponible"""
    print("🧪 Test de disponibilité de l'API Sefaria...")
    
    async with SefariaSmartImporter() as importer:
        api_available = await importer.test_api_availability()
        
        if api_available:
            print("✅ API Sefaria disponible")
        else:
            print("⚠️ API Sefaria indisponible - le système utilisera le crawling")
            
        return api_available


async def test_single_import():
    """Test d'import d'un seul texte"""
    print("\n🧪 Test d'import d'un texte simple...")
    
    async with SefariaSmartImporter() as importer:
        # Tester avec un texte connu
        result = await importer.import_text("Likutey Moharan", "1")
        
        if result:
            print(f"✅ Import réussi avec la méthode: {result['method']}")
            print(f"   Titre: {result['title']}")
            print(f"   Référence: {result['ref']}")
            print(f"   Texte hébreu: {len(result['he'])} segments")
            print(f"   Texte anglais: {len(result['text'])} segments")
        else:
            print("❌ Import échoué")
            
        return result is not None


async def test_fallback_mechanism():
    """Test le mécanisme de fallback API -> Crawling"""
    print("\n🧪 Test du mécanisme de fallback...")
    
    async with SefariaSmartImporter() as importer:
        # Tester avec un livre moins connu pour forcer le fallback
        result = await importer.import_text("Meshivat Nefesh", "1")
        
        if result:
            print(f"✅ Fallback réussi avec la méthode: {result['method']}")
            if result['method'] == 'crawling':
                print("   Le système a correctement utilisé le crawling")
            elif result['method'] == 'api':
                print("   L'API a fonctionné")
        else:
            print("❌ Fallback échoué - aucune méthode n'a fonctionné")
            
        return result is not None


async def test_multiple_books():
    """Test d'import de plusieurs livres"""
    print("\n🧪 Test d'import de plusieurs livres...")
    
    test_books = [
        "Likutey Moharan",
        "Sichot HaRan",
        "Chayey Moharan"
    ]
    
    results = {}
    
    async with SefariaSmartImporter() as importer:
        for book in test_books:
            print(f"   Tentative d'import: {book}")
            result = await importer.import_text(book, "1")
            results[book] = result is not None
            
            if result:
                print(f"   ✅ {book} - méthode: {result['method']}")
            else:
                print(f"   ❌ {book} - échec")
                
    success_count = sum(results.values())
    total_count = len(test_books)
    
    print(f"\n📊 Résultats: {success_count}/{total_count} livres importés avec succès")
    
    return success_count == total_count


async def run_all_tests():
    """Exécute tous les tests"""
    print("🚀 TESTS DU SYSTÈME D'IMPORT INTELLIGENT")
    print("=" * 50)
    
    tests = [
        ("API Availability", test_api_availability),
        ("Single Import", test_single_import),
        ("Fallback Mechanism", test_fallback_mechanism),
        ("Multiple Books", test_multiple_books)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results[test_name] = result
            print(f"✅ {test_name}: {'PASS' if result else 'FAIL'}")
        except Exception as e:
            results[test_name] = False
            print(f"❌ {test_name}: ERROR - {str(e)}")
            logger.error(f"Test {test_name} failed: {str(e)}")
    
    # Rapport final
    print("\n" + "=" * 50)
    print("📊 RAPPORT FINAL")
    print("=" * 50)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    print(f"\nRésultat global: {passed}/{total} tests réussis")
    
    if passed == total:
        print("🎉 Tous les tests sont passés! Le système est prêt.")
    else:
        print("⚠️ Certains tests ont échoué. Vérifiez les logs.")
    
    return passed == total


if __name__ == "__main__":
    asyncio.run(run_all_tests())