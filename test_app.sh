#!/bin/bash

echo "🚀 TESTING BRESLEV TORAH APPLICATION"
echo "===================================="

# Test Backend
echo "📊 Testing Backend..."
BACKEND_STATUS=$(curl -s http://localhost:8000/health 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$BACKEND_STATUS" = "healthy" ]; then
    echo "✅ Backend: HEALTHY"
else
    echo "❌ Backend: OFFLINE or ERROR"
fi

# Test Backend Root
BACKEND_MSG=$(curl -s http://localhost:8000/ 2>/dev/null | grep -o '"message":"[^"]*"')
if [[ $BACKEND_MSG == *"Ready"* ]]; then
    echo "✅ Backend API: RESPONDING"
else
    echo "❌ Backend API: NOT RESPONDING"
fi

# Test Frontend
echo ""
echo "🎨 Testing Frontend..."
FRONTEND_HTML=$(curl -s http://localhost:3000 2>/dev/null | head -1)

if [[ $FRONTEND_HTML == "<!DOCTYPE html>"* ]]; then
    echo "✅ Frontend: LOADING"
else
    echo "❌ Frontend: ERROR"
fi

# Check for errors in frontend
FRONTEND_ERROR=$(curl -s http://localhost:3000 2>/dev/null | grep -o '_error')
if [ -z "$FRONTEND_ERROR" ]; then
    echo "✅ Frontend: NO ERRORS"
else
    echo "❌ Frontend: HAS ERRORS"
fi

echo ""
echo "📁 Testing Files..."

# Check key files
if [ -f "/Users/codenolimits-dreamai-nanach/BRESLEV-TORAH-ONLINE/backend/app/main.py" ]; then
    echo "✅ Backend main.py: EXISTS"
else
    echo "❌ Backend main.py: MISSING"
fi

if [ -f "/Users/codenolimits-dreamai-nanach/BRESLEV-TORAH-ONLINE/frontend/app/page.tsx" ]; then
    echo "✅ Frontend page.tsx: EXISTS"
else
    echo "❌ Frontend page.tsx: MISSING"
fi

if [ -f "/Users/codenolimits-dreamai-nanach/BRESLEV-TORAH-ONLINE/frontend/lib/api.ts" ]; then
    echo "✅ API Client: EXISTS"
else
    echo "❌ API Client: MISSING"
fi

echo ""
echo "🎯 SUMMARY:"
echo "- Backend FastAPI: $([[ $BACKEND_STATUS == "healthy" ]] && echo "✅ WORKING" || echo "❌ ISSUE")"
echo "- Frontend Next.js: $([[ $FRONTEND_HTML == "<!DOCTYPE html>"* ]] && echo "✅ WORKING" || echo "❌ ISSUE")"
echo "- Interface: $([[ -z $FRONTEND_ERROR ]] && echo "✅ CLEAN" || echo "❌ ERRORS")"
echo ""

if [[ $BACKEND_STATUS == "healthy" ]] && [[ $FRONTEND_HTML == "<!DOCTYPE html>"* ]] && [[ -z $FRONTEND_ERROR ]]; then
    echo "🎉 APPLICATION STATUS: READY FOR PRODUCTION!"
    echo ""
    echo "📱 Access your app:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:8000"
    echo ""
    echo "🙏 Na Naḥ Naḥma Naḥman Méouman!"
else
    echo "⚠️  APPLICATION STATUS: NEEDS ATTENTION"
    echo ""
    echo "🔧 Check the issues above and restart services if needed."
fi

echo "===================================="