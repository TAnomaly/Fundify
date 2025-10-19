#!/bin/bash

# Database migration script for Fundify Rust backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-fundify}
DB_USER=${DB_USER:-fundify}
DB_PASSWORD=${DB_PASSWORD:-fundify123}

# Check if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
    echo -e "${GREEN}Using DATABASE_URL from environment${NC}"
    DB_URL="$DATABASE_URL"
else
    echo -e "${YELLOW}Using individual database parameters${NC}"
    DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
fi

echo -e "${GREEN}Connecting to database: $DB_URL${NC}"

# Check if database exists
echo -e "${YELLOW}Checking if database exists...${NC}"
if psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}Database connection successful${NC}"
else
    echo -e "${RED}Database connection failed${NC}"
    echo -e "${YELLOW}Please check your database configuration${NC}"
    exit 1
fi

# Run migrations
echo -e "${YELLOW}Running migrations...${NC}"

# Check if migrations directory exists
if [ ! -d "migrations" ]; then
    echo -e "${RED}Migrations directory not found${NC}"
    exit 1
fi

# Run each migration file
for migration in migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo -e "${YELLOW}Running migration: $(basename "$migration")${NC}"
        psql "$DB_URL" -f "$migration"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Migration $(basename "$migration") completed successfully${NC}"
        else
            echo -e "${RED}Migration $(basename "$migration") failed${NC}"
            exit 1
        fi
    fi
done

echo -e "${GREEN}All migrations completed successfully!${NC}"
