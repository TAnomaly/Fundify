#!/bin/bash
echo "🔧 Fixing database tables..."
cd backend
DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)
echo "Connecting to database..."
psql "$DATABASE_URL" -f ../fix-db-now.sql
echo "✅ Done! Tables created."
