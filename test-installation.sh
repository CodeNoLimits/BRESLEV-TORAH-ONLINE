#!/bin/bash

echo "🧪 Test de l'installation Breslev-Torah-Online"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test functions
test_endpoint() {
    local url=$1
    local expected=$2
    local description=$3
    
    response=$(curl -s -o /dev/null -w "%{http_code}" $url)
    
    if [ "$response" = "$expected" ]; then
        echo -e "${GREEN}✅ $description${NC}"
    else
        echo -e "${RED}❌ $description (HTTP $response)${NC}"
        exit 1
    fi
}

# Test backend
test_endpoint "http://localhost:8000/health" "200" "Backend health check"
test_endpoint "http://localhost:8000/docs" "200" "API documentation"
test_endpoint "http://localhost:8000/api/v1/books" "200" "Books endpoint"

# Test frontend
test_endpoint "http://localhost:3000" "200" "Frontend home page"
test_endpoint "http://localhost:3000/books" "200" "Books page"

# Test database
if docker exec breslev-postgres psql -U postgres -d breslev_db -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL connection${NC}"
else
    echo -e "${RED}❌ PostgreSQL connection failed${NC}"
    exit 1
fi

# Test Redis
if docker exec breslev-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis connection${NC}"
else
    echo -e "${RED}❌ Redis connection failed${NC}"
    exit 1
fi

# Test ChromaDB
if curl -s http://localhost:8001/api/v1/heartbeat | grep -q "nanosecond"; then
    echo -e "${GREEN}✅ ChromaDB connection${NC}"
else
    echo -e "${RED}❌ ChromaDB connection failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 Installation réussie! L'application est prête.${NC}"
echo "📖 Documentation API: http://localhost:8000/docs"
echo "🌐 Application: http://localhost:3000"