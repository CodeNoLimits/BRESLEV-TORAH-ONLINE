.PHONY: help install dev prod test clean

# Variables
PYTHON := python3.11
POETRY := poetry
PNPM := pnpm
DOCKER_COMPOSE := docker-compose
BACKEND_DIR := backend
FRONTEND_DIR := frontend

# Default target
.DEFAULT_GOAL := help

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $1, $2}'

install: ## Installation complète du projet
	@echo "🔧 Installation des dépendances..."
	cd $(BACKEND_DIR) && $(POETRY) install
	cd $(FRONTEND_DIR) && $(PNPM) install
	@echo "✅ Installation terminée!"

dev: ## Lance l'environnement de développement
	@echo "🚀 Démarrage de l'environnement de développement..."
	$(DOCKER_COMPOSE) up -d postgres redis chromadb
	@echo "⏳ Attente du démarrage des services..."
	@sleep 5
	@echo "🔄 Application des migrations..."
	cd $(BACKEND_DIR) && $(POETRY) run alembic upgrade head
	@echo "🌱 Chargement des données initiales..."
	cd $(BACKEND_DIR) && $(POETRY) run python scripts/seed_data.py
	@echo "🎯 Démarrage des serveurs..."
	@tmux new-session -d -s backend 'cd $(BACKEND_DIR) && $(POETRY) run uvicorn app.main:app --reload'
	@tmux new-session -d -s frontend 'cd $(FRONTEND_DIR) && $(PNPM) dev'
	@echo "✅ Application disponible sur http://localhost:3000"
	@echo "📖 API documentation: http://localhost:8000/docs"

dev-docker: ## Lance tout en Docker
	$(DOCKER_COMPOSE) up -d
	@echo "✅ Application disponible sur http://localhost:3000"

prod: ## Build pour production
	@echo "🏗️ Build de production..."
	cd $(FRONTEND_DIR) && $(PNPM) build
	cd $(BACKEND_DIR) && $(POETRY) build
	@echo "✅ Build terminé!"

test: ## Lance tous les tests
	@echo "🧪 Lancement des tests backend..."
	cd $(BACKEND_DIR) && $(POETRY) run pytest -v
	@echo "🧪 Lancement des tests frontend..."
	cd $(FRONTEND_DIR) && $(PNPM) test
	@echo "✅ Tous les tests passent!"

lint: ## Vérifie le code
	@echo "🔍 Vérification du code Python..."
	cd $(BACKEND_DIR) && $(POETRY) run ruff check .
	cd $(BACKEND_DIR) && $(POETRY) run black --check .
	@echo "🔍 Vérification du code TypeScript..."
	cd $(FRONTEND_DIR) && $(PNPM) lint
	@echo "✅ Code conforme!"

format: ## Formate le code
	@echo "✨ Formatage du code Python..."
	cd $(BACKEND_DIR) && $(POETRY) run black .
	cd $(BACKEND_DIR) && $(POETRY) run ruff check --fix .
	@echo "✨ Formatage du code TypeScript..."
	cd $(FRONTEND_DIR) && $(PNPM) format
	@echo "✅ Code formaté!"

migrate: ## Crée une nouvelle migration
	@read -p "Nom de la migration: " name; \
	cd $(BACKEND_DIR) && $(POETRY) run alembic revision --autogenerate -m "$name"

db-upgrade: ## Applique les migrations
	cd $(BACKEND_DIR) && $(POETRY) run alembic upgrade head

db-downgrade: ## Annule la dernière migration
	cd $(BACKEND_DIR) && $(POETRY) run alembic downgrade -1

clean: ## Nettoie l'environnement
	@echo "🧹 Nettoyage..."
	$(DOCKER_COMPOSE) down -v
	@tmux kill-session -t backend 2>/dev/null || true
	@tmux kill-session -t frontend 2>/dev/null || true
	rm -rf $(FRONTEND_DIR)/.next
	rm -rf $(FRONTEND_DIR)/node_modules
	rm -rf $(BACKEND_DIR)/.pytest_cache
	rm -rf $(BACKEND_DIR)/__pycache__
	find . -name "*.pyc" -delete
	find . -name ".DS_Store" -delete
	@echo "✅ Nettoyage terminé!"

logs-backend: ## Affiche les logs backend
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend: ## Affiche les logs frontend
	$(DOCKER_COMPOSE) logs -f frontend

logs-all: ## Affiche tous les logs
	$(DOCKER_COMPOSE) logs -f

shell-backend: ## Ouvre un shell dans le container backend
	$(DOCKER_COMPOSE) exec backend bash

shell-db: ## Ouvre psql
	$(DOCKER_COMPOSE) exec postgres psql -U postgres breslev_db

redis-cli: ## Ouvre redis-cli
	$(DOCKER_COMPOSE) exec redis redis-cli

status: ## Affiche le statut des services
	@echo "📊 Statut des services:"
	@$(DOCKER_COMPOSE) ps
	@echo "\n🔌 Ports utilisés:"
	@lsof -i :3000,8000,5432,6379 2>/dev/null | grep LISTEN || echo "Aucun service local détecté"

backup: ## Sauvegarde la base de données
	@mkdir -p backups
	@timestamp=$$(date +%Y%m%d_%H%M%S); \
	$(DOCKER_COMPOSE) exec -T postgres pg_dump -U postgres breslev_db > backups/backup_$$timestamp.sql
	@echo "✅ Backup créé: backups/backup_$$timestamp.sql"

restore: ## Restaure la base de données
	@read -p "Fichier de backup (ex: backups/backup_20240101_120000.sql): " file; \
	$(DOCKER_COMPOSE) exec -T postgres psql -U postgres breslev_db < $$file
	@echo "✅ Base de données restaurée!"