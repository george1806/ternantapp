#!/bin/bash
# ================================================================
# Utility Script: Switch Environment
# ================================================================
# Purpose: Switches between dev and prod environments
# Usage: ./switch-env.sh <dev|prod>
# ================================================================

set -e

TARGET_ENV=$1

if [ -z "$TARGET_ENV" ]; then
    echo "Error: Target environment is required"
    echo "Usage: ./switch-env.sh <dev|prod>"
    exit 1
fi

if [ "$TARGET_ENV" != "dev" ] && [ "$TARGET_ENV" != "prod" ]; then
    echo "Error: Invalid environment. Must be 'dev' or 'prod'"
    exit 1
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo ""
echo "========================================"
echo "  Environment Switcher"
echo "========================================"
echo "Switching to: $TARGET_ENV"
echo "========================================"
echo ""

# Determine compose files
if [ "$TARGET_ENV" = "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    ENV_FILE=".env.production"
else
    COMPOSE_FILE="docker-compose.yml"
    ENV_FILE=".env"
fi

# Check if environment file exists
if [ ! -f "$PROJECT_ROOT/$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file not found: $ENV_FILE${NC}"
    echo ""
    echo "Please create it first:"
    echo "  ./utils/setup-env.sh $TARGET_ENV"
    exit 1
fi

# Stop current containers
echo -e "${BLUE}Stopping current containers...${NC}"
cd "$PROJECT_ROOT"

# Try to stop both dev and prod containers
docker compose down 2>/dev/null || true
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

echo ""
echo -e "${GREEN}✓ Current containers stopped${NC}"
echo ""
echo "You are now configured for: $TARGET_ENV"
echo "Environment file: $ENV_FILE"
echo "Compose file: $COMPOSE_FILE"
echo ""
echo "Next steps:"
echo "  1. Review environment configuration: $ENV_FILE"
echo "  2. Start services: cd deploy/scripts && ./deploy.sh $TARGET_ENV"
echo ""
