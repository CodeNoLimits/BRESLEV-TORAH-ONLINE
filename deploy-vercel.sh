#!/bin/bash

# Deploy Breslev Torah Online Frontend to Vercel
# Usage: ./deploy-vercel.sh

set -e

echo "🚀 Deploying Breslev Torah Online Frontend to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Please install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ frontend directory not found. Please run this script from the project root."
    exit 1
fi

# Change to frontend directory
cd frontend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in frontend directory."
    exit 1
fi

echo "✅ Pre-deployment checks passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🏗️ Building the application..."
npm run build

# Deploy to Vercel
echo "🚢 Starting deployment to Vercel..."
vercel --prod --yes

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Visit your deployed application"
echo "2. Configure environment variables in Vercel dashboard"
echo "3. Set up custom domain (optional)"
echo ""
echo "🔗 Useful commands:"
echo "  vercel --prod     - Deploy to production"
echo "  vercel dev        - Start development server"
echo "  vercel logs       - View deployment logs"
echo "  vercel domains    - Manage custom domains"
echo ""
echo "🎯 Environment variables to set in Vercel:"
echo "  - NEXT_PUBLIC_API_URL"
echo "  - NEXT_PUBLIC_ENVIRONMENT"
echo ""
echo "🔗 Backend API should be deployed to Railway first!"
echo "   Update NEXT_PUBLIC_API_URL with your Railway backend URL"

echo "🔥 Frontend deployment completed!"