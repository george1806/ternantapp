#!/bin/bash
# ================================================================
# Script 07: Verify Deployment
# ================================================================
# Purpose: Runs comprehensive checks to verify deployment
# Usage: ./07-verify-deployment.sh [dev|prod]
# ================================================================

set -e

ENVIRONMENT=${1:-dev}

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "Deployment Verification"
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

ERRORS=0

# Check all containers are running
echo "Checking container status..."
SERVICES=("mysql" "redis" "backend" "frontend")

for service in "${SERVICES[@]}"; do
    echo -n "  $service: "
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
        echo -e "${GREEN}✓ Running${NC}"
    else
        echo -e "${RED}✗ Not running${NC}"
        ((ERRORS++))
    fi
done

# Check container health
echo ""
echo "Checking container health..."
HEALTH_SERVICES=("mysql" "redis" "backend")

for service in "${HEALTH_SERVICES[@]}"; do
    echo -n "  $service: "
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps "$service" | grep -q "healthy"; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        STATUS=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps "$service" | tail -1 | awk '{print $(NF-1)}')
        echo -e "${YELLOW}⚠ ${STATUS}${NC}"
    fi
done

# Check database tables
echo ""
echo "Checking database schema..."
source "$ENV_FILE"

TABLES=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql \
    mysql -u"${DB_USERNAME}" -p"${DB_PASSWORD}" "${DB_DATABASE}" \
    -e "SHOW TABLES;" 2>/dev/null | wc -l)

if [ "$TABLES" -gt 10 ]; then
    echo -e "  ${GREEN}✓ Found $((TABLES-1)) tables${NC}"
else
    echo -e "  ${RED}✗ Only $((TABLES-1)) tables found${NC}"
    ((ERRORS++))
fi

# Test backend API
echo ""
echo "Testing backend API..."
BACKEND_CONTAINER=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q backend)

if [ -n "$BACKEND_CONTAINER" ]; then
    HEALTH_CHECK=$(docker exec "$BACKEND_CONTAINER" wget -q -O- http://localhost:3000/api/v1/health 2>/dev/null || echo "failed")
    if [[ "$HEALTH_CHECK" == *"success"* ]]; then
        echo -e "  ${GREEN}✓ Health endpoint responding${NC}"
    else
        echo -e "  ${RED}✗ Health endpoint not responding${NC}"
        ((ERRORS++))
    fi
fi

# Test frontend
echo ""
echo "Testing frontend..."
FRONTEND_CONTAINER=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q frontend)

if [ -n "$FRONTEND_CONTAINER" ]; then
    if docker exec "$FRONTEND_CONTAINER" sh -c "nc -z localhost 3001" 2>/dev/null; then
        echo -e "  ${GREEN}✓ Frontend port accessible${NC}"
    else
        echo -e "  ${YELLOW}⚠ Frontend port check inconclusive${NC}"
    fi
fi

# Check logs for errors
echo ""
echo "Checking recent logs for errors..."
ERROR_COUNT=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100 backend 2>&1 | grep -i "error\|exception\|failed" | wc -l)

if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "  ${GREEN}✓ No errors in recent logs${NC}"
else
    echo -e "  ${YELLOW}⚠ Found $ERROR_COUNT error messages in logs${NC}"
fi

# Summary
echo ""
echo "========================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment verification passed!${NC}"
    echo ""
    echo "Access your application:"
    if [ "$ENVIRONMENT" = "prod" ]; then
        echo "  Frontend: http://your-domain:3001"
        echo "  Backend:  http://your-domain:3000/api/v1"
    else
        echo "  Frontend: http://localhost:3001"
        echo "  Backend:  http://localhost:3000/api/v1"
    fi
    exit 0
else
    echo -e "${RED}✗ Deployment verification failed with $ERRORS error(s)${NC}"
    echo ""
    echo "Check logs with:"
    echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs"
    exit 1
fi
