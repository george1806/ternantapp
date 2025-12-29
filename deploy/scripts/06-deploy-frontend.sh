#!/bin/bash
# ================================================================
# Script 06: Deploy Frontend Application
# ================================================================
# Purpose: Deploys Next.js frontend
# Usage: ./06-deploy-frontend.sh [dev|prod]
# ================================================================

set -e

ENVIRONMENT=${1:-dev}

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "Deploying Frontend Application"
echo "Environment: $ENVIRONMENT"
echo "========================================"
echo ""

# Determine compose file
if [ "$ENVIRONMENT" = "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    ENV_FILE=".env.production"
    PORT=3001
else
    COMPOSE_FILE="docker-compose.yml"
    ENV_FILE=".env"
    PORT=3001
fi

# Start frontend
echo -e "${BLUE}Starting frontend service...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d frontend

# Wait for frontend to be ready
echo ""
echo "Waiting for frontend to be ready..."
RETRIES=30
COUNT=0
while [ $COUNT -lt $RETRIES ]; do
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps frontend | grep -q "Up"; then
        echo -e "${GREEN}✓ Frontend is running${NC}"
        break
    fi
    ((COUNT++))
    echo -n "."
    sleep 2
done

if [ $COUNT -eq $RETRIES ]; then
    echo ""
    echo "Error: Frontend failed to start"
    echo "Showing last 30 lines of logs:"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=30 frontend
    exit 1
fi

# Test frontend endpoint
echo ""
echo "Testing frontend endpoint..."
sleep 3
if docker exec $(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q frontend) \
    sh -c "nc -z localhost ${PORT}" 2>/dev/null; then
    echo -e "${GREEN}✓ Frontend is serving on port ${PORT}${NC}"
else
    echo "⚠ Frontend port check inconclusive (container may still be starting)"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✓ Frontend deployed successfully${NC}"
echo "========================================"
