#!/bin/bash
# ================================================================
# Migration Script: Revert Last Migration
# ================================================================
# Purpose: Reverts the most recently executed migration
# Usage: ./revert.sh [environment] [count]
# Example: ./revert.sh dev 1
# ================================================================

set -e

ENVIRONMENT=${1:-dev}
COUNT=${2:-1}

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  Reverting Database Migration(s)"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo "Count: $COUNT migration(s)"
echo "========================================"
echo ""

# Determine environment file
if [ "$ENVIRONMENT" = "prod" ]; then
    ENV_FILE="../../.env.production"
    echo -e "${RED}WARNING: You are reverting migrations in PRODUCTION!${NC}"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
else
    ENV_FILE="../../.env"
fi

# Check if running in Docker or local
if docker ps | grep -q apartment-backend; then
    echo -e "${YELLOW}Reverting migrations in Docker container...${NC}"

    # Copy current env to container
    docker cp "$ENV_FILE" apartment-backend:/app/.env

    # Revert migrations
    for ((i=1; i<=COUNT; i++)); do
        echo ""
        echo -e "${YELLOW}Reverting migration $i of $COUNT...${NC}"
        docker exec apartment-backend npm run migration:revert
    done

    echo ""
    echo -e "${GREEN}✓ Migration(s) reverted successfully${NC}"
else
    echo -e "${YELLOW}Reverting migrations locally...${NC}"

    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a

    # Revert migrations
    cd ../..
    for ((i=1; i<=COUNT; i++)); do
        echo ""
        echo -e "${YELLOW}Reverting migration $i of $COUNT...${NC}"
        npm run migration:revert
    done

    echo ""
    echo -e "${GREEN}✓ Migration(s) reverted successfully${NC}"
fi

echo ""
echo "Next steps:"
echo "  1. Verify the changes: ./status.sh $ENVIRONMENT"
echo "  2. Test your application"
echo "  3. Fix the migration and re-run: ./run.sh $ENVIRONMENT"
echo ""
