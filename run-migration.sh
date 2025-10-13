#!/bin/bash

# Simple script to run the database migration
# Usage: ./run-migration.sh

echo "🚀 Running database migration for EventRSVP ticket columns..."
echo ""

cd backend

# Check if Railway CLI is installed
if command -v railway &> /dev/null; then
    echo "✓ Railway CLI found"
    echo "Running migration on Railway..."
    railway run node add-ticket-columns.js
else
    echo "⚠️  Railway CLI not found"
    echo ""
    echo "Install it with: npm i -g @railway/cli"
    echo "Then run: railway login && railway link"
    echo "Then run this script again"
    echo ""
    echo "Or run manually:"
    echo "  cd backend"
    echo "  railway run node add-ticket-columns.js"
fi
