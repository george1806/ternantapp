#!/bin/bash
# ================================================================
# Script 03: Build Docker Images
# ================================================================
# Purpose: Builds backend and frontend Docker images
# Usage: ./03-build-images.sh [dev|prod] [--no-cache]
# ================================================================

set -e

ENVIRONMENT=${1:-dev}
NO_CACHE=""

if [[ "$2" == "--no-cache" ]]; then
    NO_CACHE="--no-cache"
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "Building Docker Images"
echo "Environment: $ENVIRONMENT"
echo "========================================"
echo ""

# Determine compose file and target
if [ "$ENVIRONMENT" = "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    TARGET="production"
    ENV_FILE=".env.production"
else
    COMPOSE_FILE="docker-compose.yml"
    TARGET="development"
    ENV_FILE=".env"
fi

# Build backend
echo -e "${BLUE}Building backend ($TARGET)...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build $NO_CACHE backend

if [ $? -ne 0 ]; then
    echo "Error: Backend build failed"
    exit 1
fi

echo -e "${GREEN}✓ Backend built successfully${NC}"
echo ""

# Build frontend
echo -e "${BLUE}Building frontend ($TARGET)...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build $NO_CACHE frontend

if [ $? -ne 0 ]; then
    echo "Error: Frontend build failed"
    exit 1
fi

echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

# Show image sizes
echo "Image sizes:"
docker images | grep "apartment-" | head -2

echo ""
echo "========================================"
echo -e "${GREEN}✓ All images built successfully${NC}"
echo "========================================"
