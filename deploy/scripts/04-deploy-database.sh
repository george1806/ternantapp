#!/bin/bash
# ================================================================
# Script 04: Deploy Database (MySQL & Redis)
# ================================================================
# Purpose: Starts database services and waits for health
# Usage: ./04-deploy-database.sh [dev|prod]
# ================================================================

set -e

ENVIRONMENT=${1:-dev}

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "Deploying Database Services"
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

# Start MySQL
echo -e "${BLUE}Starting MySQL...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d mysql

# Start Redis
echo -e "${BLUE}Starting Redis...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d redis

# Wait for MySQL to be healthy
echo ""
echo "Waiting for MySQL to be ready..."
RETRIES=30
COUNT=0
while [ $COUNT -lt $RETRIES ]; do
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps mysql | grep -q "healthy"; then
        echo -e "${GREEN}✓ MySQL is ready${NC}"
        break
    fi
    ((COUNT++))
    echo -n "."
    sleep 2
done

if [ $COUNT -eq $RETRIES ]; then
    echo ""
    echo "Error: MySQL failed to become healthy"
    exit 1
fi

# Wait for Redis to be healthy
echo ""
echo "Waiting for Redis to be ready..."
COUNT=0
while [ $COUNT -lt $RETRIES ]; do
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps redis | grep -q "healthy"; then
        echo -e "${GREEN}✓ Redis is ready${NC}"
        break
    fi
    ((COUNT++))
    echo -n "."
    sleep 2
done

if [ $COUNT -eq $RETRIES ]; then
    echo ""
    echo "Error: Redis failed to become healthy"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}✓ Database services deployed${NC}"
echo "========================================"
