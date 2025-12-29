#!/bin/bash
# ================================================================
# Migration Script: Check Migration Status
# ================================================================
# Purpose: Shows which migrations have been executed
# Usage: ./status.sh [environment]
# Example: ./status.sh dev
# ================================================================

set -e

ENVIRONMENT=${1:-dev}

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  Database Migration Status"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo "========================================"
echo ""

# Determine environment file
if [ "$ENVIRONMENT" = "prod" ]; then
    ENV_FILE="../../.env.production"
else
    ENV_FILE="../../.env"
fi

# Load environment variables to get DB credentials
set -a
source "$ENV_FILE"
set +a

# Check if running in Docker or local
if docker ps | grep -q apartment-backend; then
    echo -e "${BLUE}Checking migration status in Docker...${NC}"
    echo ""

    # Get executed migrations from database
    echo "Executed migrations:"
    echo "--------------------"
    docker exec apartment-mysql mysql -u"${DB_USERNAME}" -p"${DB_PASSWORD}" "${DB_DATABASE}" \
        -e "SELECT id, timestamp, name FROM migrations ORDER BY timestamp DESC;" 2>/dev/null || \
        echo "No migrations table found or no migrations executed yet"

    echo ""
    echo "Available migration files:"
    echo "-------------------------"
    docker exec apartment-backend ls -1 src/database/migrations/*.ts 2>/dev/null | \
        sed 's/src\/database\/migrations\///' || \
        echo "No migration files found"
else
    echo -e "${BLUE}Checking migration status locally...${NC}"
    echo ""

    # Check if database is accessible
    if command -v mysql &> /dev/null; then
        echo "Executed migrations:"
        echo "--------------------"
        mysql -h "${DB_HOST}" -P "${DB_PORT}" -u"${DB_USERNAME}" -p"${DB_PASSWORD}" "${DB_DATABASE}" \
            -e "SELECT id, timestamp, name FROM migrations ORDER BY timestamp DESC;" 2>/dev/null || \
            echo "Cannot connect to database or no migrations table found"
    else
        echo -e "${YELLOW}MySQL client not installed locally${NC}"
        echo "Please use Docker environment to check status"
    fi

    echo ""
    echo "Available migration files:"
    echo "-------------------------"
    cd ../..
    ls -1 src/database/migrations/*.ts 2>/dev/null | \
        sed 's/src\/database\/migrations\///' || \
        echo "No migration files found"
fi

echo ""
echo "========================================"
echo ""
