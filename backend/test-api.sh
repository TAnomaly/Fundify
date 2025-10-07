#!/bin/bash

# Fundify API Test Script
# Tests all major endpoints and functionality

BASE_URL="http://localhost:4000"
API_URL="$BASE_URL/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to print test results
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5

    echo -e "\n${YELLOW}Testing: $name${NC}"

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $http_code)"
        echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $http_code)"
        echo "Response: $body"
        ((FAILED++))
    fi
}

test_endpoint_with_token() {
    local name=$1
    local method=$2
    local endpoint=$3
    local token=$4
    local data=$5
    local expected_status=$6

    echo -e "\n${YELLOW}Testing: $name${NC}"

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Authorization: Bearer $token")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $http_code)"
        echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $http_code)"
        echo "Response: $body"
        ((FAILED++))
    fi
}

echo "========================================="
echo "   Fundify API Test Suite"
echo "========================================="
echo "Testing API at: $API_URL"
echo ""

# Test 1: Health Check
test_endpoint "Health Check" "GET" "/health" "" "200"

# Test 2: Register User
TIMESTAMP=$(date +%s)
TEST_EMAIL="test$TIMESTAMP@example.com"
TEST_PASSWORD="Test123456!"
REGISTER_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Test User\",\"username\":\"testuser$TIMESTAMP\"}"

echo -e "\n${YELLOW}=== Authentication Tests ===${NC}"
test_endpoint "Register User" "POST" "/auth/register" "$REGISTER_DATA" "201"

# Test 3: Login User
LOGIN_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
echo -e "\n${YELLOW}Testing: Login User${NC}"
login_response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_DATA")

echo "$login_response" | jq '.'

# Extract token
TOKEN=$(echo "$login_response" | jq -r '.data.token // empty')

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful, token received${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Login failed, no token received${NC}"
    ((FAILED++))
    echo "Exiting tests - authentication required for remaining tests"
    exit 1
fi

# Test 4: Get Current User
echo -e "\n${YELLOW}=== User Tests ===${NC}"
test_endpoint_with_token "Get Current User" "GET" "/users/me" "$TOKEN" "" "200"

# Test 5: Create Campaign
echo -e "\n${YELLOW}=== Campaign Tests ===${NC}"
CAMPAIGN_DATA="{\"title\":\"Test Campaign $TIMESTAMP\",\"description\":\"Test campaign description\",\"story\":\"This is a comprehensive test campaign story that describes the project goals, objectives, and expected outcomes. We are building an innovative solution that will help many people achieve their dreams and make a positive impact on the community.\",\"goalAmount\":10000,\"category\":\"TECHNOLOGY\",\"coverImage\":\"https://images.unsplash.com/photo-1488590528505-98d2b5aba04b\",\"endDate\":\"2025-12-31T23:59:59Z\"}"

echo -e "\n${YELLOW}Testing: Create Campaign${NC}"
create_campaign_response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/campaigns" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$CAMPAIGN_DATA")

campaign_http_code=$(echo "$create_campaign_response" | tail -n1)
campaign_body=$(echo "$create_campaign_response" | sed '$d')

if [ "$campaign_http_code" == "201" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (Status: $campaign_http_code)"
    echo "$campaign_body" | jq '.'
    ((PASSED++))

    # Extract campaign ID
    CAMPAIGN_ID=$(echo "$campaign_body" | jq -r '.data.id // empty')
    CAMPAIGN_SLUG=$(echo "$campaign_body" | jq -r '.data.slug // empty')
else
    echo -e "${RED}✗ FAILED${NC} (Expected: 201, Got: $campaign_http_code)"
    echo "$campaign_body"
    ((FAILED++))
fi

# Test 6: Get All Campaigns
test_endpoint "Get All Campaigns" "GET" "/campaigns" "" "200"

# Test 7: Get Campaign by Slug
if [ -n "$CAMPAIGN_SLUG" ]; then
    test_endpoint "Get Campaign by Slug" "GET" "/campaigns/$CAMPAIGN_SLUG" "" "200"
fi

# Test 8: Update Campaign
if [ -n "$CAMPAIGN_ID" ]; then
    UPDATE_DATA="{\"title\":\"Updated Test Campaign $TIMESTAMP\"}"
    test_endpoint_with_token "Update Campaign" "PUT" "/campaigns/$CAMPAIGN_ID" "$TOKEN" "$UPDATE_DATA" "200"
fi

# Test 9: Get User's Campaigns
echo -e "\n${YELLOW}Testing: Get User's Campaigns${NC}"
me_response=$(curl -s -X GET "$API_URL/users/me" -H "Authorization: Bearer $TOKEN")
USER_ID=$(echo "$me_response" | jq -r '.data.id // empty')

if [ -n "$USER_ID" ]; then
    test_endpoint "Get User's Campaigns" "GET" "/users/$USER_ID/campaigns" "" "200"
fi

# Test 10: Search Campaigns
test_endpoint "Search Campaigns" "GET" "/campaigns?search=Test" "" "200"

# Test 11: Filter by Category
test_endpoint "Filter Campaigns by Category" "GET" "/campaigns?category=TECHNOLOGY" "" "200"

# Test 12: Delete Campaign
if [ -n "$CAMPAIGN_ID" ]; then
    test_endpoint_with_token "Delete Campaign" "DELETE" "/campaigns/$CAMPAIGN_ID" "$TOKEN" "" "200"
fi

# Test 13: Test Invalid Endpoints
echo -e "\n${YELLOW}=== Error Handling Tests ===${NC}"
test_endpoint "Invalid Route (404)" "GET" "/invalid-route" "" "404"

# Test 14: Unauthorized Access
test_endpoint "Unauthorized Access to Protected Route" "GET" "/users/me" "" "401"

# Test 15: Invalid Login
INVALID_LOGIN="{\"email\":\"invalid@example.com\",\"password\":\"wrongpassword\"}"
test_endpoint "Invalid Login Credentials" "POST" "/auth/login" "$INVALID_LOGIN" "401"

# Summary
echo ""
echo "========================================="
echo "   Test Summary"
echo "========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed! ✗${NC}"
    exit 1
fi
