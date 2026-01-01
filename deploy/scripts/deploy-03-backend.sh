#!/bin/bash
# ================================================================
# Deploy Backend API Service
# ================================================================
# Purpose: Deploys NestJS backend API using separate compose file
# Deploy order: 3 (Third - depends on MySQL and Redis)
# Usage: ./deploy-03-backend.sh [prod|dev]
# ================================================================

set -e

ENVIRONMENT=${1:-prod}

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "Deploying Backend API Service"
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
COMPOSE_FILE="deploy/compose/03-backend.yml"

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

# Check if MySQL is healthy
echo "Checking MySQL dependency..."
MYSQL_CONTAINER=$(grep "^MYSQL_CONTAINER_NAME=" "$ENV_FILE" | cut -d'=' -f2 || echo "apartment-mysql")
if ! docker ps --filter "name=$MYSQL_CONTAINER" --filter "health=healthy" | grep -q "$MYSQL_CONTAINER" || false; then
    echo -e "${RED}Error: MySQL is not healthy${NC}"
    echo "Please ensure MySQL is running: ./deploy-01-mysql.sh $ENVIRONMENT"
    exit 1
fi
echo -e "${GREEN}✓ MySQL is healthy${NC}"

# Check if Redis is healthy
echo "Checking Redis dependency..."
REDIS_CONTAINER=$(grep "^REDIS_CONTAINER_NAME=" "$ENV_FILE" | cut -d'=' -f2 || echo "apartment-redis")
if ! docker ps --filter "name=$REDIS_CONTAINER" --filter "health=healthy" | grep -q "$REDIS_CONTAINER" || false; then
    echo -e "${RED}Error: Redis is not healthy${NC}"
    echo "Please ensure Redis is running: ./deploy-02-redis.sh $ENVIRONMENT"
    exit 1
fi
echo -e "${GREEN}✓ Redis is healthy${NC}"

# Deploy Backend
echo ""
echo -e "${BLUE}Starting Backend service...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

# Wait for Backend to be healthy
echo ""
echo "Waiting for Backend to be ready..."
RETRIES=${BACKEND_HEALTH_RETRIES:-60}
COUNT=0

while [ $COUNT -lt $RETRIES ]; do
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps backend 2>/dev/null | grep -q "healthy" || false; then
        echo -e "${GREEN}✓ Backend is ready and healthy${NC}"
        break
    fi

    # Check if container is running but not healthy yet
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps backend 2>/dev/null | grep -q "Up" || false; then
        echo -n "."
    else
        echo -e "${RED}✗ Backend container is not running${NC}"
        echo "Showing logs:"
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100 backend
        exit 1
    fi

    ((COUNT++))
    sleep 2
done

if [ $COUNT -eq $RETRIES ]; then
    echo ""
    echo -e "${RED}Error: Backend failed to become healthy after ${RETRIES} retries${NC}"
    echo "Showing logs:"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100 backend
    exit 1
fi

# Test health endpoint
echo ""
echo "Testing health endpoint..."
BACKEND_CONTAINER=$(grep "^BACKEND_CONTAINER_NAME=" "$ENV_FILE" | cut -d'=' -f2 || echo "apartment-backend")
BACKEND_PORT=$(grep "^BACKEND_INTERNAL_PORT=" "$ENV_FILE" | cut -d'=' -f2 || echo "3000")
API_PREFIX=$(grep "^API_PREFIX=" "$ENV_FILE" | cut -d'=' -f2 || echo "api/v1")

sleep 2
if docker exec "$BACKEND_CONTAINER" wget -q -O- "http://localhost:${BACKEND_PORT}/${API_PREFIX}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health endpoint responding${NC}"
else
    echo -e "${YELLOW}⚠ Health endpoint not responding yet (may still be initializing)${NC}"
fi

# Show Backend status
echo ""
echo "Backend Status:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps backend

echo ""
echo "========================================"
echo -e "${GREEN}✓ Backend deployed successfully${NC}"
echo "========================================"
