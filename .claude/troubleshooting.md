# Troubleshooting Guide - Breslev Torah Online

## Problèmes Récurrents et Solutions

### CORS Issues (Historique de 10+ échecs)

**PROBLÈME**: `Failed to fetch` entre frontend et backend
**SOLUTION**: 
```python
# FastAPI backend - main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
**PRÉVENTION**: Configurer CORS dès le premier endpoint

### Docker Services Not Starting

**PROBLÈME**: PostgreSQL/Redis/ChromaDB ne démarrent pas
**SOLUTION**:
```bash
docker-compose down
docker system prune -f
docker-compose up -d --force-recreate
```
**PRÉVENTION**: Health checks dans docker-compose.yml

### Database Connection Issues

**PROBLÈME**: SQLModel ne peut pas se connecter à PostgreSQL
**SOLUTION**:
```python
# Vérifier les variables d'environnement
DATABASE_URL=postgresql://user:password@localhost:5432/breslev_db
```
**PRÉVENTION**: Tester la connexion avant le démarrage de l'app

### Sefaria API Rate Limiting

**PROBLÈME**: 429 Too Many Requests lors de l'import
**SOLUTION**:
```python
import asyncio
await asyncio.sleep(1)  # Entre chaque requête
```
**PRÉVENTION**: Implémenter un cache Redis pour les réponses

### Next.js Build Errors

**PROBLÈME**: TypeScript compilation errors
**SOLUTION**:
```bash
npm run type-check
# Corriger les erreurs avant build
npm run build
```
**PRÉVENTION**: Types stricts dès le début

### Edge TTS Not Working

**PROBLÈME**: TTS ne fonctionne pas sur mobile
**SOLUTION**:
```javascript
// Fallback Web Speech API
if (!edgeTTS.available) {
  useWebSpeechAPI();
}
```
**PRÉVENTION**: Toujours implémenter des fallbacks

### Git Push Failures

**PROBLÈME**: "Can't push to repository"
**SOLUTION**:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git push origin main
```
**PRÉVENTION**: Configuration git dès le début

### Performance Issues

**PROBLÈME**: Temps de chargement > 5 secondes
**SOLUTION**:
- Lazy loading des composants
- Cache Redis pour les requêtes fréquentes
- Pagination des résultats de recherche
**PRÉVENTION**: Metrics de performance dès le développement

### ChromaDB Connection Failed

**PROBLÈME**: Vector database inaccessible
**SOLUTION**:
```python
# Vérifier le port et la connectivité
client = chromadb.HttpClient(host="localhost", port=8001)
```
**PRÉVENTION**: Health check ChromaDB dans docker-compose

### Missing Environment Variables

**PROBLÈME**: Application crash au démarrage
**SOLUTION**:
```bash
cp .env.example .env
# Remplir toutes les variables requises
```
**PRÉVENTION**: Validation des env vars au démarrage

## Commandes de Debug Utiles

```bash
# Vérifier les services Docker
docker-compose ps

# Logs des services
docker-compose logs backend
docker-compose logs postgres

# Test des endpoints
curl http://localhost:8000/health
curl http://localhost:3000/api/health

# Rebuild complet
docker-compose down && docker-compose up --build

# Reset de la base de données
docker-compose down -v
docker-compose up -d
```

## Métriques de Succès

- ✅ Démarrage en < 5 minutes
- ✅ Tous les services Docker up
- ✅ 0 erreurs CORS
- ✅ Les 13 livres importés
- ✅ Recherche fonctionnelle
- ✅ TTS opérationnel
- ✅ Git push après chaque modification

---

*Note: Ce guide sera mis à jour avec chaque problème rencontré*