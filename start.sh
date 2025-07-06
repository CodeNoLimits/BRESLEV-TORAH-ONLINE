#!/bin/bash

echo "🚀 Démarrage de l'application Breslev sur Replit..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trouvé"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Vérifier les variables d'environnement critiques
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️ GEMINI_API_KEY non configurée dans les Secrets Replit"
    echo "👉 Ajoutez votre clé API Gemini dans les Secrets (🔒)"
else
    echo "✅ GEMINI_API_KEY configurée"
fi

# Installation des dépendances si nécessaire
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.installed" ]; then
    echo "📦 Installation des dépendances..."
    npm ci --production=false --silent
    if [ $? -eq 0 ]; then
        touch node_modules/.installed
        echo "✅ Dépendances installées"
    else
        echo "❌ Erreur installation dépendances"
        exit 1
    fi
else
    echo "✅ Dépendances déjà installées"
fi

# Build si nécessaire ou en mode développement
if [ ! -d "dist" ] || [ "$NODE_ENV" = "development" ]; then
    echo "🔨 Build de l'application..."
    npm run build
    if [ $? -eq 0 ]; then
        echo "✅ Build réussi"
    else
        echo "❌ Erreur de build"
        exit 1
    fi
else
    echo "✅ Build existant trouvé"
fi

# Vérifier les fichiers critiques
if [ ! -f "dist/index.js" ]; then
    echo "❌ Fichier de build manquant"
    exit 1
fi

# Démarrer le serveur
echo "🎯 Lancement du serveur..."
echo "📍 Port: ${PORT:-3001}"
echo "🌐 URL: https://$REPL_SLUG.$REPL_OWNER.repl.co"

# Export des variables pour le runtime
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3001}

# Démarrage avec gestion d'erreur
npm run start

# Si le serveur s'arrête, afficher les informations de debug
if [ $? -ne 0 ]; then
    echo "❌ Le serveur s'est arrêté avec une erreur"
    echo "🔍 Vérifiez les logs ci-dessus pour plus d'informations"
    exit 1
fi