# Guide de Développement Breslev Torah Online - Version Claude Code

## 🎯 CONTEXTE PROJET
- **Application**: Étude des textes de Rabbi Nachman (13 livres Breslov)
- **Stack**: Next.js 14 + FastAPI + PostgreSQL + Redis + IA + TTS
- **Utilisateurs**: Érudits hassidiques (Tselahya & Abraham Ghezi)
- **Historique**: 10+ échecs dus à CORS/API/Configuration

## 📋 STRUCTURE DES SECTIONS DISPONIBLES

### SECTION 1: Architecture & Setup
- Architecture complète avec diagrammes
- Configuration environnement (.env, Docker)
- Installation pas-à-pas garantie
- **DEMANDER**: Code exact pour docker-compose.yml et .env

### SECTION 2: Import Sefaria (PLAN-1)
- Script `scripts/pull_sefaria.py` 
- Import des 13 livres en hébreu/anglais
- Structure `/data/[book]/he.md`
- **DEMANDER**: Liste exacte des 13 livres et script complet

**Les 13 livres Breslov obligatoires**:
1. Likutey Moharan
2. Likutey Tefilot
3. Likutey Halachot
4. Likutey Etzot
5. Kitzur Likutey Moharan
6. Sichot HaRan
7. Chayey Moharan
8. Sefer HaMiddot
9. Sipurey Maasiyot
10. Shivchey HaRan
11. Likutey Moharan Tinyana
12. The Letter Collection
13. Additional Breslov Texts

### SECTION 3: Traduction FR (PLAN-2)
- Service `services/translator.py`
- Gemini API + cache Redis
- Endpoint `/api/translate`
- **DEMANDER**: Configuration Gemini et prompts optimisés

### SECTION 4: Backend API (PLAN-3)
- FastAPI avec RAG pipeline
- Endpoints: `/api/search`, `/api/chat`, `/api/tts`
- ChromaDB pour recherche vectorielle
- **DEMANDER**: Architecture complète du backend

### SECTION 5: Frontend (PLAN-4)
- Next.js 14 avec App Router
- Tailwind + Shadcn/ui
- Clerk auth intégré
- **DEMANDER**: Components BookReader et SearchInterface

### SECTION 6: Chat & WebSocket (PLAN-5)
- Interface chat avec SSE/WebSocket
- Streaming des réponses
- Citations avec références exactes
- **DEMANDER**: Implementation WebSocket complète

### SECTION 7: Déploiement (PLAN-6)
- Vercel (frontend) + Render (backend)
- Configuration production
- **DEMANDER**: render.yaml et variables production

### SECTION 8: Tests & Documentation (PLAN-7)
- Suite de tests pytest
- Documentation utilisateur/développeur
- **DEMANDER**: Tests critiques et README

### SECTION 9: Recherche Ultra-Précise
- Indexation complète avec contexte
- Recherche hybride (vectorielle + keywords)
- IA conversationnelle
- **DEMANDER**: Service de recherche avancée

### SECTION 10: Alternatives Gratuites
- Edge TTS (gratuit) au lieu de Google TTS
- Ollama/Local AI au lieu de Gemini
- Supabase gratuit pour cache (PLAN-2B)
- **DEMANDER**: Configuration des alternatives

## 🚀 ORDRE D'IMPLÉMENTATION

1. **Backend Core** (30%)
   ```
   app/config.py → database.py → models/ → services/ → api/
   ```

2. **Frontend Interface** (30%)
   ```
   layout.tsx → BookReader → SearchInterface → VoiceChat
   ```

3. **Docker & Infrastructure** (20%)
   ```
   docker-compose.yml → init scripts → health checks
   ```

4. **Import & Indexation** (20%)
   ```
   Sefaria import → Traductions → Index recherche
   ```

## ⚡ COMMANDES DE DÉMARRAGE RAPIDE

```bash
# 1. Clone et setup
git clone [repo] && cd breslev-torah-online
cp .env.example .env

# 2. Lancer avec Docker
docker-compose up -d

# 3. Importer les données
./scripts/init.sh

# 4. Vérifier
curl http://localhost:8000/health
curl http://localhost:3000
```

## 🔧 INSTRUCTIONS POUR CLAUDE CODE

### TOUJOURS:
1. **Demander le code exact** des sections avant d'implémenter
2. **Pas de mocks/placeholders** - uniquement du code fonctionnel
3. **Tester chaque étape** avant de continuer
4. **Utiliser les alternatives gratuites** par défaut

### PROCESS DE TRAVAIL:
1. Lire ce résumé complet
2. Demander: "Peux-tu me donner la Section X complète?"
3. Implémenter en suivant exactement les specs
4. Git push après CHAQUE fichier créé/modifié
5. Tester et valider avant de passer à la suite
6. Mettre à jour progress.md

### OBLIGATION GIT:
```bash
# Après CHAQUE modification:
git add [fichier]
git commit -m "[type]: description"
git push origin main
# JAMAIS dire "je ne peux pas push"
```

## 🎯 OBJECTIFS CRITIQUES
- ✅ 13 livres Breslov complets et indexés (Likutey Moharan, Likutey Tefilot, etc.)
- ✅ Recherche précise avec références exactes
- ✅ Interface vocale fonctionnelle
- ✅ Pas de dépendances payantes par défaut
- ✅ Démarrage en < 5 minutes
- ✅ Git push obligatoire après CHAQUE modification

## 📞 SUPPORT
En cas de blocage, demander:
- Le code exact de la section concernée
- Les logs d'erreur complets
- La configuration utilisée
- L'état actuel du projet

---

*Note: Ce document est un résumé. Toujours demander les sections complètes pour avoir tous les détails d'implémentation.*