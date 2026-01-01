#!/bin/bash
# ================================================================
# Deploy Frontend Application Service
# ================================================================
# Purpose: Deploys Next.js frontend using separate compose file
# Deploy order: 4 (Fourth - depends on Backend)
# Usage: ./deploy-04-frontend.sh [prod|dev]
# ================================================================

set -e

ENVIRONMENT=${1:-prod}

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "Deploying Frontend Application Service"
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
COMPOSE_FILE="deploy/compose/04-frontend.yml"

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

# Check if Backend is healthy
echo "Checking Backend dependency..."
BACKEND_CONTAINER=$(grep "^BACKEND_CONTAINER_NAME=" "$ENV_FILE" | cut -d'=' -f2 || echo "apartment-backend")
if ! docker ps --filter "name=$BACKEND_CONTAINER" --filter "health=healthy" | grep -q "$BACKEND_CONTAINER"; then
    echo -e "${YELLOW}⚠ Backend is not healthy${NC}"
    echo "Frontend can start but may not function properly without Backend"
    echo "Recommended: ensure Backend is running: ./deploy-03-backend.sh $ENVIRONMENT"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ Backend is healthy${NC}"
fi

# Deploy Frontend
echo ""
echo -e "${BLUE}Starting Frontend service...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

# Wait for Frontend to be healthy
echo ""
echo "Waiting for Frontend to be ready..."
RETRIES=${FRONTEND_HEALTH_RETRIES:-60}
COUNT=0

while [ $COUNT -lt $RETRIES ]; do
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps frontend 2>/dev/null | grep -q "healthy"; then
        echo -e "${GREEN}✓ Frontend is ready and healthy${NC}"
        break
    fi

    # Check if container is running but not healthy yet
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps frontend 2>/dev/null | grep -q "Up"; then
        echo -n "."
    else
        echo -e "${RED}✗ Frontend container is not running${NC}"
        echo "Showing logs:"
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100 frontend
        exit 1
    fi

    ((COUNT++))
    sleep 2
done

if [ $COUNT -eq $RETRIES ]; then
    echo ""
    echo -e "${RED}Error: Frontend failed to become healthy after ${RETRIES} retries${NC}"
    echo "Showing logs:"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100 frontend
    exit 1
fi

# Show Frontend status
echo ""
echo "Frontend Status:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps frontend

echo ""
echo "========================================"
echo -e "${GREEN}✓ Frontend deployed successfully${NC}"
echo "========================================"
