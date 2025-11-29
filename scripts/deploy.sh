#!/bin/bash

# =================================================================
# Deployment Script for Ternant App
# Usage: ./scripts/deploy.sh [dev|prod]
# =================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default environment
ENV=${1:-dev}

# Validate environment
if [[ ! "$ENV" =~ ^(dev|prod)$ ]]; then
    echo -e "${RED}Error: Invalid environment. Use 'dev' or 'prod'${NC}"
    exit 1
fi

echo -e "${YELLOW}=== Deploying Ternant App ($ENV) ===${NC}"

# Load environment variables
if [ "$ENV" = "dev" ]; then
    ENV_FILE=".env.local"
    COMPOSE_FILE="docker-compose.yml"
else
    ENV_FILE=".env.production"
    COMPOSE_FILE="docker-compose.prod.yml"
fi

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found${NC}"
    exit 1
fi

echo -e "${YELLOW}Loading environment from $ENV_FILE${NC}"
export $(cat "$ENV_FILE" | grep -v '^#' | xargs)

# Build images
echo -e "${YELLOW}Building Docker images...${NC}"
docker-compose -f "$COMPOSE_FILE" build

# Pull latest images
echo -e "${YELLOW}Pulling latest images...${NC}"
docker-compose -f "$COMPOSE_FILE" pull || true

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose -f "$COMPOSE_FILE" down || true

# Create necessary directories
mkdir -p db-backup uploads logs

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker-compose -f "$COMPOSE_FILE" run --rm backend pnpm run migration:run || true

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 30

# Check health status
echo -e "${YELLOW}Checking service health...${NC}"
docker-compose -f "$COMPOSE_FILE" ps

echo -e "${GREEN}=== Deployment completed successfully ===${NC}"
echo ""
if [ "$ENV" = "dev" ]; then
    echo "Development URLs:"
    echo "  Frontend: http://localhost:3001"
    echo "  Backend:  http://localhost:3000"
    echo "  Database: http://localhost:8082 (phpMyAdmin)"
    echo "  Redis:    http://localhost:8081 (Redis Commander)"
    echo "  Email:    http://localhost:8025 (Mailpit)"
else
    echo "Production URLs:"
    echo "  Frontend:  https://your-domain.com"
    echo "  Backend:   https://api.your-domain.com"
fi
