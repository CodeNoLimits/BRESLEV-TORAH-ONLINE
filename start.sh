#!/bin/bash
echo "🚀 Démarrage de Le Compagnon du Cœur..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trouvé"
    exit 1
fi

# Vérifier npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm non trouvé"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Vérifier les variables d'environnement critiques
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️ GEMINI_API_KEY manquante - Configurez dans Secrets"
    echo "👉 Ajoutez votre clé API Gemini dans les Secrets (🔒)"
else
    echo "✅ GEMINI_API_KEY configurée"
fi

# Build si nécessaire
if [ ! -d "dist" ] ; then
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

# Démarrer l'application
echo "🔥 Lancement de l'application..."
echo "📍 Port: ${PORT:-5000}"
echo "🌐 URL: https://$REPL_SLUG.$REPL_OWNER.repl.co"
NODE_ENV=production PORT=${PORT:-5000} node dist/index.js

# Si le serveur s'arrête, afficher les informations de debug
if [ $? -ne 0 ]; then
    echo "❌ Le serveur s'est arrêté avec une erreur"
    echo "🔍 Vérifiez les logs ci-dessus pour plus d'informations"
    exit 1
fi