#!/bin/bash

# Test script for creators API
echo "Testing Creators API..."

# Test 1: Get all creators
echo "1. Testing GET /api/creators"
curl -X GET "http://localhost:4000/api/creators" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n\n"

# Test 2: Get creators with pagination
echo "2. Testing GET /api/creators with pagination"
curl -X GET "http://localhost:4000/api/creators?limit=5&offset=0" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n\n"

# Test 3: Get creator by username
echo "3. Testing GET /api/creators/johncreator"
curl -X GET "http://localhost:4000/api/creators/johncreator" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n\n"

# Test 4: Get non-existent creator
echo "4. Testing GET /api/creators/nonexistent"
curl -X GET "http://localhost:4000/api/creators/nonexistent" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "Creators API tests completed!"
