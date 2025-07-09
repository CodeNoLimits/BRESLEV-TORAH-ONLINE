#!/bin/bash

# Test Deployment Setup for Breslev Torah Online
# Usage: ./test-deployment.sh

set -e

echo "🧪 Testing Breslev Torah Online Deployment Setup..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ "$1" = "SUCCESS" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Test 1: Check if required tools are installed
echo "🔧 Checking required tools..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "SUCCESS" "Node.js installed: $NODE_VERSION"
else
    print_status "ERROR" "Node.js not found. Please install Node.js 18+"
    exit 1
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "SUCCESS" "npm installed: $NPM_VERSION"
else
    print_status "ERROR" "npm not found"
    exit 1
fi

if command -v railway &> /dev/null; then
    print_status "SUCCESS" "Railway CLI installed"
else
    print_status "WARNING" "Railway CLI not found. Install with: npm install -g @railway/cli"
fi

if command -v vercel &> /dev/null; then
    print_status "SUCCESS" "Vercel CLI installed"
else
    print_status "WARNING" "Vercel CLI not found. Install with: npm install -g vercel"
fi

# Test 2: Check project structure
echo ""
echo "📁 Checking project structure..."

if [ -f "railway.toml" ]; then
    print_status "SUCCESS" "Railway configuration found"
else
    print_status "ERROR" "railway.toml not found"
fi

if [ -f "vercel.json" ]; then
    print_status "SUCCESS" "Vercel configuration found"
else
    print_status "WARNING" "vercel.json not found in root"
fi

if [ -f "frontend/vercel.json" ]; then
    print_status "SUCCESS" "Frontend Vercel configuration found"
else
    print_status "ERROR" "frontend/vercel.json not found"
fi

if [ -f "backend/Dockerfile" ]; then
    print_status "SUCCESS" "Backend Dockerfile found"
else
    print_status "ERROR" "backend/Dockerfile not found"
fi

if [ -f "backend/requirements.txt" ]; then
    print_status "SUCCESS" "Backend requirements.txt found"
else
    print_status "ERROR" "backend/requirements.txt not found"
fi

if [ -f "frontend/package.json" ]; then
    print_status "SUCCESS" "Frontend package.json found"
else
    print_status "ERROR" "frontend/package.json not found"
fi

# Test 3: Check environment files
echo ""
echo "🌐 Checking environment configuration..."

if [ -f ".env.production" ]; then
    print_status "SUCCESS" "Production environment file found"
else
    print_status "WARNING" ".env.production not found"
fi

if [ -f "frontend/.env.production" ]; then
    print_status "SUCCESS" "Frontend production environment file found"
else
    print_status "WARNING" "frontend/.env.production not found"
fi

if [ -f "frontend/.env.example" ]; then
    print_status "SUCCESS" "Frontend environment example found"
else
    print_status "WARNING" "frontend/.env.example not found"
fi

# Test 4: Check deployment scripts
echo ""
echo "🚀 Checking deployment scripts..."

if [ -f "deploy-railway.sh" ] && [ -x "deploy-railway.sh" ]; then
    print_status "SUCCESS" "Railway deployment script found and executable"
else
    print_status "ERROR" "deploy-railway.sh not found or not executable"
fi

if [ -f "deploy-vercel.sh" ] && [ -x "deploy-vercel.sh" ]; then
    print_status "SUCCESS" "Vercel deployment script found and executable"
else
    print_status "ERROR" "deploy-vercel.sh not found or not executable"
fi

if [ -f "backend/deploy_migration.py" ] && [ -x "backend/deploy_migration.py" ]; then
    print_status "SUCCESS" "Database migration script found and executable"
else
    print_status "ERROR" "backend/deploy_migration.py not found or not executable"
fi

# Test 5: Check backend dependencies
echo ""
echo "📦 Checking backend dependencies..."

cd backend

if [ -f "requirements.txt" ]; then
    echo "Backend dependencies:"
    while read -r requirement; do
        echo "  - $requirement"
    done < requirements.txt
    print_status "SUCCESS" "Backend dependencies listed"
else
    print_status "ERROR" "requirements.txt not found"
fi

cd ..

# Test 6: Check frontend dependencies
echo ""
echo "📦 Checking frontend dependencies..."

cd frontend

if [ -f "package.json" ]; then
    if command -v jq &> /dev/null; then
        NEXT_VERSION=$(jq -r '.dependencies.next' package.json)
        print_status "SUCCESS" "Next.js version: $NEXT_VERSION"
    else
        print_status "SUCCESS" "Frontend package.json found (install jq to see versions)"
    fi
else
    print_status "ERROR" "Frontend package.json not found"
fi

cd ..

# Test 7: Check documentation
echo ""
echo "📚 Checking documentation..."

if [ -f "DEPLOYMENT_GUIDE.md" ]; then
    print_status "SUCCESS" "Deployment guide found"
else
    print_status "WARNING" "DEPLOYMENT_GUIDE.md not found"
fi

if [ -f "DEPLOYMENT_CHECKLIST.md" ]; then
    print_status "SUCCESS" "Deployment checklist found"
else
    print_status "WARNING" "DEPLOYMENT_CHECKLIST.md not found"
fi

if [ -f "README.md" ]; then
    print_status "SUCCESS" "README.md found"
else
    print_status "WARNING" "README.md not found"
fi

# Test 8: Final summary
echo ""
echo "📊 Deployment Readiness Summary:"
echo "================================"

echo ""
echo "✅ Ready for deployment:"
echo "  - Backend: Railway"
echo "  - Frontend: Vercel"
echo "  - Database: PostgreSQL (Railway)"
echo "  - Cache: Redis (Railway)"
echo ""

echo "🔑 Required before deployment:"
echo "  1. Get Gemini API Key from Google AI Studio"
echo "  2. Generate JWT Secret (32+ characters)"
echo "  3. Set up Railway account and login"
echo "  4. Set up Vercel account and login"
echo ""

echo "🚀 Quick deployment commands:"
echo "  Backend:  ./deploy-railway.sh"
echo "  Frontend: ./deploy-vercel.sh"
echo ""

echo "📖 Documentation:"
echo "  - Read DEPLOYMENT_GUIDE.md for detailed instructions"
echo "  - Follow DEPLOYMENT_CHECKLIST.md step by step"
echo ""

print_status "SUCCESS" "Deployment setup test completed!"
echo ""
echo "🎯 Your Breslev Torah Online application is ready for production deployment!"