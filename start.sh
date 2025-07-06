#!/bin/bash

# Script de démarrage pour Le Compagnon du Cœur
echo "🚀 Démarrage de Le Compagnon du Cœur..."

# Nettoyer les processus existants
pkill -f "tsx server/index.ts" 2>/dev/null || true

# Attendre un moment
sleep 2

# Démarrer le serveur
cd "$(dirname "$0")"
PORT=5000 NODE_ENV=development tsx server/index.ts
