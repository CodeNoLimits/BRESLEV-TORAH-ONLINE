#!/bin/bash

# Deploy Breslev Torah Online Backend to Railway
# Usage: ./deploy-railway.sh

set -e

echo "🚀 Deploying Breslev Torah Online Backend to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "❌ You are not logged in to Railway. Please login first:"
    echo "railway login"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "railway.toml" ]; then
    echo "❌ railway.toml not found. Please run this script from the project root."
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p backend/logs

# Create data directory if it doesn't exist
mkdir -p backend/data

echo "✅ Pre-deployment checks passed"

# Deploy to Railway
echo "🚢 Starting deployment to Railway..."
cd backend && railway up --detach

echo "✅ Deployment initiated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Check deployment status: railway status"
echo "2. View logs: railway logs"
echo "3. Configure environment variables in Railway dashboard"
echo "4. Set up domain (optional): railway domain"
echo ""
echo "🔗 Useful commands:"
echo "  railway status   - Check deployment status"
echo "  railway logs     - View application logs"
echo "  railway shell    - Connect to running container"
echo "  railway open     - Open Railway dashboard"
echo ""
echo "🎯 Don't forget to:"
echo "  - Set JWT_SECRET_KEY in Railway environment variables"
echo "  - Set GEMINI_API_KEY in Railway environment variables"
echo "  - Configure Google Cloud credentials if using TTS"
echo "  - Update CORS_ORIGINS with your frontend URL"

echo "🔥 Deployment completed!"