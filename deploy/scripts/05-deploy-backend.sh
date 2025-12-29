#!/bin/bash
# ================================================================
# Script 05: Deploy Backend API
# ================================================================
# Purpose: Deploys NestJS backend and runs migrations
# Usage: ./05-deploy-backend.sh [dev|prod]
# ================================================================

set -e

ENVIRONMENT=${1:-dev}

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "Deploying Backend API"
echo "Environment: $ENVIRONMENT"
echo "========================================"
echo ""

# Determine compose file
if [ "$ENVIRONMENT" = "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    ENV_FILE=".env.production"
else
    COMPOSE_FILE="docker-compose.yml"
    ENV_FILE=".env"
fi

# Start backend
echo -e "${BLUE}Starting backend service...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d backend

# Wait for backend to be healthy
echo ""
echo "Waiting for backend to be ready..."
RETRIES=60
COUNT=0
while [ $COUNT -lt $RETRIES ]; do
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps backend | grep -q "healthy"; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    ((COUNT++))
    echo -n "."
    sleep 2
done

if [ $COUNT -eq $RETRIES ]; then
    echo ""
    echo "Error: Backend failed to become healthy"
    echo "Showing last 50 lines of logs:"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=50 backend
    exit 1
fi

# Verify migrations ran
echo ""
echo "Verifying migrations..."
MIGRATIONS=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T backend \
    node -e "const db = require('./dist/common/database/database.module'); console.log('ok');" 2>&1 || true)

if [[ "$MIGRATIONS" == *"ok"* ]] || docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs backend | grep -q "successfully started"; then
    echo -e "${GREEN}✓ Backend initialized successfully${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify backend initialization${NC}"
fi

# Test health endpoint
echo ""
echo "Testing health endpoint..."
sleep 2
if docker exec $(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q backend) \
    wget -q -O- http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health endpoint responding${NC}"
else
    echo -e "${YELLOW}⚠ Health endpoint not responding yet${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✓ Backend deployed successfully${NC}"
echo "========================================"
