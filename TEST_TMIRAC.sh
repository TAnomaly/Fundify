#!/bin/bash

echo "🔍 TESTING TMIRAC CREATOR PROFILE"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="https://fundify-backend-production.up.railway.app"

echo "📡 Testing Backend Endpoint..."
echo "GET ${API_URL}/api/users/creator/tmirac"
echo ""

# Test the endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/api/users/creator/tmirac")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ SUCCESS!${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    echo -e "${GREEN}✅ Creator profile loaded successfully!${NC}"
    echo ""
    echo "🌐 Frontend Test:"
    echo "   https://funify.vercel.app/creators/tmirac"
    echo ""
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${YELLOW}⚠️  User not found or not a creator${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    echo "💡 SOLUTION:"
    echo "   1. Login as 'tmirac' user"
    echo "   2. Go to: https://funify.vercel.app/creator-dashboard"
    echo "   3. Click 'Become Creator' button"
    echo ""
    echo "   OR use Browser Console:"
    echo "   =========================================="
    echo "   fetch('${API_URL}/api/users/become-creator', {"
    echo "     method: 'POST',"
    echo "     headers: {"
    echo "       'Authorization': 'Bearer ' + localStorage.getItem('authToken')"
    echo "     }"
    echo "   }).then(r => r.json()).then(console.log);"
    echo "   =========================================="
    echo ""
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}❌ BACKEND NOT RESPONDING${NC}"
    echo ""
    echo "Possible reasons:"
    echo "  - Backend is still deploying"
    echo "  - Railway deployment failed"
    echo "  - Network issue"
    echo ""
    echo "Check Railway Dashboard:"
    echo "  https://railway.app/dashboard"
    echo ""
else
    echo -e "${RED}❌ ERROR${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
fi

echo ""
echo "📊 DEPLOYMENT STATUS:"
echo "===================="
echo ""
echo "Backend (Railway):"
echo "  URL: ${API_URL}"
echo "  Endpoint: /api/users/creator/:username"
echo "  Status: Check https://railway.app/dashboard"
echo ""
echo "Frontend (Vercel):"
echo "  URL: https://funify.vercel.app"
echo "  Page: /creators/tmirac"
echo "  Status: Check https://vercel.com/dashboard"
echo ""
echo "🔄 If backend is still deploying, wait 2-3 minutes and run this script again:"
echo "   bash TEST_TMIRAC.sh"
echo ""

