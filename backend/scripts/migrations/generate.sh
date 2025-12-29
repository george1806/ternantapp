#!/bin/bash
# ================================================================
# Migration Script: Generate New Migration
# ================================================================
# Purpose: Creates a new TypeORM migration file
# Usage: ./generate.sh <migration-name> [environment]
# Example: ./generate.sh AddUserPreferences dev
# ================================================================

set -e

MIGRATION_NAME=$1
ENVIRONMENT=${2:-dev}

if [ -z "$MIGRATION_NAME" ]; then
    echo "Error: Migration name is required"
    echo "Usage: ./generate.sh <migration-name> [environment]"
    echo "Example: ./generate.sh AddUserPreferences dev"
    exit 1
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  Generating Database Migration"
echo "========================================"
echo "Migration: $MIGRATION_NAME"
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
    echo -e "${BLUE}Generating migration in Docker container...${NC}"

    # Copy current env to container
    docker cp "$ENV_FILE" apartment-backend:/app/.env

    # Generate migration
    docker exec apartment-backend npm run migration:generate -- "src/database/migrations/$MIGRATION_NAME"

    # Copy generated migration back to host
    MIGRATION_FILE=$(docker exec apartment-backend sh -c "ls -t src/database/migrations/*.ts | head -1")
    docker cp "apartment-backend:/app/$MIGRATION_FILE" "../../$MIGRATION_FILE"

    echo ""
    echo -e "${GREEN}✓ Migration generated successfully${NC}"
    echo "File: $MIGRATION_FILE"
else
    echo -e "${BLUE}Generating migration locally...${NC}"

    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a

    # Generate migration
    cd ../..
    npm run migration:generate -- "src/database/migrations/$MIGRATION_NAME"

    MIGRATION_FILE=$(ls -t src/database/migrations/*.ts | head -1)

    echo ""
    echo -e "${GREEN}✓ Migration generated successfully${NC}"
    echo "File: $MIGRATION_FILE"
fi

echo ""
echo "Next steps:"
echo "  1. Review the generated migration file"
echo "  2. Run the migration: ./run.sh $ENVIRONMENT"
echo "  3. Verify the changes: ./status.sh $ENVIRONMENT"
echo ""
