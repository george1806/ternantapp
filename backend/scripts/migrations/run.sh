#!/bin/bash
# ================================================================
# Migration Script: Run Migrations
# ================================================================
# Purpose: Executes pending database migrations
# Usage: ./run.sh [environment]
# Example: ./run.sh dev
# ================================================================

set -e

ENVIRONMENT=${1:-dev}

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  Running Database Migrations"
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

# Check if running in Docker or local
if docker ps | grep -q apartment-backend; then
    echo -e "${BLUE}Running migrations in Docker container...${NC}"

    # Copy current env to container
    docker cp "$ENV_FILE" apartment-backend:/app/.env

    # Run migrations
    docker exec apartment-backend npm run migration:run

    echo ""
    echo -e "${GREEN}✓ Migrations executed successfully${NC}"
else
    echo -e "${BLUE}Running migrations locally...${NC}"

    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a

    # Run migrations
    cd ../..
    npm run migration:run

    echo ""
    echo -e "${GREEN}✓ Migrations executed successfully${NC}"
fi

echo ""
echo "Next steps:"
echo "  1. Verify the changes: ./status.sh $ENVIRONMENT"
echo "  2. Test your application thoroughly"
echo "  3. If issues occur, revert: ./revert.sh $ENVIRONMENT"
echo ""
