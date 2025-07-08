# SECTION 1 : ARCHITECTURE & SETUP FONDATION

## 1.1 ARCHITECTURE TECHNIQUE DÉTAILLÉE

### Stack Technologique avec Versions Exactes

**Frontend:**
- **Next.js**: 14.2.5 (App Router)
- **React**: 18.3.1
- **TypeScript**: 5.5.4
- **Tailwind CSS**: 3.4.7
- **@tanstack/react-query**: 5.51.11 (gestion état serveur)
- **zustand**: 4.5.4 (état global)
- **framer-motion**: 11.3.19 (animations)

**Backend:**
- **Python**: 3.11.9
- **FastAPI**: 0.112.0
- **Uvicorn**: 0.30.5 (serveur ASGI)
- **SQLModel**: 0.0.21 (ORM)
- **PostgreSQL**: 15.4
- **Redis**: 7.2.5
- **chromadb**: 0.5.5 (vector DB)
- **google-generativeai**: 0.7.2 (Gemini)

### Versions Logicielles Requises
- **Node.js**: 20.15.0 LTS (EXACT)
- **Python**: 3.11.9 (EXACT)
- **PostgreSQL**: 15.4
- **Redis**: 7.2.5
- **Docker**: 24.0.7

### Structure de Dossiers Exacte
```
breslev-torah-online/
├── .claude/                      # Guidance files (créé)
├── frontend/                     # Application Next.js 14
├── backend/                      # Application FastAPI  
├── infrastructure/               # Configuration déploiement
├── data/                        # Données locales
├── docs/                        # Documentation
├── .env.example                 # Variables environnement
├── docker-compose.yml           # Orchestration locale
└── Makefile                     # Commandes raccourcies
```

### Variables .env Obligatoires

#### .env.development (Développement local):
```bash
# Application
NODE_ENV=development
APP_NAME="Breslev Torah Online"
APP_URL=http://localhost:3000
API_URL=http://localhost:8000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/breslev_db

# Redis
REDIS_URL=redis://localhost:6379/0

# Authentication
JWT_SECRET_KEY=dev-secret-key-change-in-production-minimum-32-chars
JWT_ALGORITHM=HS256

# Google APIs
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-pro

# ChromaDB
CHROMADB_HOST=localhost
CHROMADB_PORT=8001
CHROMADB_COLLECTION_NAME=breslev_texts

# Cache Settings
CACHE_TTL_DEFAULT=3600
ENABLE_CACHE=true
```

### Configuration Docker Complète (docker-compose.yml)
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15.4-alpine
    container_name: breslev-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: breslev_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.2.5-alpine
    container_name: breslev-redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  chromadb:
    image: chromadb/chroma:0.5.5
    container_name: breslev-chromadb
    ports:
      - "8001:8000"
    volumes:
      - chromadb_data:/chroma/chroma
    environment:
      ANONYMIZED_TELEMETRY: "false"

volumes:
  postgres_data:
  redis_data:
  chromadb_data:
```

### Makefile (Commandes simplifiées)
```makefile
.PHONY: help install dev prod test clean

install: ## Installation complète du projet
	cd backend && poetry install
	cd frontend && pnpm install

dev: ## Lance l'environnement de développement
	docker-compose up -d postgres redis chromadb
	sleep 5
	cd backend && poetry run alembic upgrade head

clean: ## Nettoie l'environnement
	docker-compose down -v
```

### Points de Vérification Installation
1. **PostgreSQL**: `docker exec breslev-postgres pg_isready`
2. **Redis**: `docker exec breslev-redis redis-cli ping`
3. **ChromaDB**: `curl http://localhost:8001/api/v1/heartbeat`
4. **Backend**: `curl http://localhost:8000/health`
5. **Frontend**: `curl http://localhost:3000`

---

*Note: Cette architecture suit exactement les spécifications pour éviter les 10+ échecs précédents dus à CORS/API/Configuration*