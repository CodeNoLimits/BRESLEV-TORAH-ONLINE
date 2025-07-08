#\!/usr/bin/env python3

import asyncio
import sys
import os
from pathlib import Path

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from app.services.sefaria_client import SefariaClient

async def main():
    """Script principal pour télécharger tous les livres Breslov"""
    print("🚀 Initialisation du téléchargement des 12 livres de Breslov...")
    print("=" * 60)
    
    client = SefariaClient()
    
    try:
        # Télécharger tous les livres
        results = await client.fetch_all_books()
        
        print("\n" + "=" * 60)
        print("📊 RAPPORT FINAL")
        print("=" * 60)
        
        total_sections = 0
        for book, sections in results.items():
            status = "✅" if sections > 0 else "❌"
            print(f"{status} {book}: {sections} sections")
            total_sections += sections
        
        print(f"\n🎯 TOTAL: {total_sections} sections récupérées")
        print(f"📚 Livres réussis: {len([s for s in results.values() if s > 0])}/12")
        
        if total_sections > 0:
            print("\n✨ Téléchargement terminé avec succès !")
        else:
            print("\n⚠️ Aucune section récupérée - vérifiez la connectivité")
            
    except Exception as e:
        print(f"\n❌ Erreur lors du téléchargement: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)