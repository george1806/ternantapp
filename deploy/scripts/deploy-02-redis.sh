#!/bin/bash
# ================================================================
# Deploy Redis Cache Service
# ================================================================
# Purpose: Deploys Redis cache using separate compose file
# Deploy order: 2 (Second - no dependencies)
# Usage: ./deploy-02-redis.sh [prod|dev]
# ================================================================

set -e

ENVIRONMENT=${1:-prod}

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "Deploying Redis Cache Service"
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
COMPOSE_FILE="deploy/compose/02-redis.yml"

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}Error: Compose file not found: $COMPOSE_FILE${NC}"
    exit 1
fi

# Check if network exists
NETWORK_NAME=$(grep "^NETWORK_NAME=" "$ENV_FILE" | cut -d'=' -f2 || echo "apartment_network")
if ! docker network inspect "$NETWORK_NAME" &>/dev/null; then
    echo -e "${RED}Error: Network $NETWORK_NAME does not exist${NC}"
    echo "Please deploy MySQL first (deploy-01-mysql.sh)"
    exit 1
fi

# Deploy Redis
echo -e "${BLUE}Starting Redis service...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

# Wait for Redis to be healthy
echo ""
echo "Waiting for Redis to be ready..."
RETRIES=${REDIS_HEALTH_RETRIES:-30}
COUNT=0

while [ $COUNT -lt $RETRIES ]; do
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps redis 2>/dev/null | grep -q "healthy"; then
        echo -e "${GREEN}✓ Redis is ready and healthy${NC}"
        break
    fi

    # Check if container is running but not healthy yet
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps redis 2>/dev/null | grep -q "Up"; then
        echo -n "."
    else
        echo -e "${RED}✗ Redis container is not running${NC}"
        echo "Showing logs:"
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=50 redis
        exit 1
    fi

    ((COUNT++))
    sleep 2
done

if [ $COUNT -eq $RETRIES ]; then
    echo ""
    echo -e "${RED}Error: Redis failed to become healthy after ${RETRIES} retries${NC}"
    echo "Showing logs:"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=50 redis
    exit 1
fi

# Show Redis status
echo ""
echo "Redis Status:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps redis

echo ""
echo "========================================"
echo -e "${GREEN}✓ Redis deployed successfully${NC}"
echo "========================================"
