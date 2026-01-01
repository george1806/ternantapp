#!/bin/bash
# ================================================================
# Deploy MySQL Database Service
# ================================================================
# Purpose: Deploys MySQL database using separate compose file
# Deploy order: 1 (First - no dependencies)
# Usage: ./deploy-01-mysql.sh [prod|dev]
# ================================================================

set -e

ENVIRONMENT=${1:-prod}

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "Deploying MySQL Database Service"
echo "Environment: $ENVIRONMENT"
echo "========================================"
echo ""

# Determine environment file
if [ "$ENVIRONMENT" = "prod" ]; then
    ENV_FILE="${ENV_FILE:-.env.production}"
else
    ENV_FILE="${ENV_FILE:-.env}"
fi

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file not found: $ENV_FILE${NC}"
    exit 1
fi

# Compose file
COMPOSE_FILE="deploy/compose/01-mysql.yml"

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}Error: Compose file not found: $COMPOSE_FILE${NC}"
    exit 1
fi

# Deploy MySQL (compose will create network if needed)
echo -e "${BLUE}Starting MySQL service...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

# Wait for MySQL to be healthy
echo ""
echo "Waiting for MySQL to be ready..."
RETRIES=${MYSQL_HEALTH_RETRIES:-30}
COUNT=0

while [ $COUNT -lt $RETRIES ]; do
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps mysql 2>/dev/null | grep -q "healthy"; then
        echo -e "${GREEN}✓ MySQL is ready and healthy${NC}"
        break
    fi

    # Check if container is running but not healthy yet
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps mysql 2>/dev/null | grep -q "Up"; then
        echo -n "."
    else
        echo -e "${RED}✗ MySQL container is not running${NC}"
        echo "Showing logs:"
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=50 mysql
        exit 1
    fi

    ((COUNT++))
    sleep 2
done

if [ $COUNT -eq $RETRIES ]; then
    echo ""
    echo -e "${RED}Error: MySQL failed to become healthy after ${RETRIES} retries${NC}"
    echo "Showing logs:"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=50 mysql
    exit 1
fi

# Show MySQL status
echo ""
echo "MySQL Status:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps mysql

echo ""
echo "========================================"
echo -e "${GREEN}✓ MySQL deployed successfully${NC}"
echo "========================================"
