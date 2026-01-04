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

# Load environment
if [ "$ENVIRONMENT" = "prod" ]; then
    ENV_FILE=".env.production"
else
    ENV_FILE=".env"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found"
    exit 1
fi

source "$ENV_FILE"

# Set container name prefix and variable names based on environment
if [ "$ENVIRONMENT" = "prod" ]; then
    MYSQL_CONTAINER="${MYSQL_CONTAINER_NAME:-apartment-mysql}"
    REDIS_CONTAINER="${REDIS_CONTAINER_NAME:-apartment-redis}"
    BACKEND_CONTAINER="${BACKEND_CONTAINER_NAME:-apartment-backend}"
    FRONTEND_CONTAINER="${FRONTEND_CONTAINER_NAME:-apartment-frontend}"
    DB_NAME="${DATABASE_NAME}"
    DB_USER="${DATABASE_USER}"
    DB_PASS="${DATABASE_PASSWORD}"
else
    MYSQL_CONTAINER="apartment-mysql-dev"
    REDIS_CONTAINER="apartment-redis-dev"
    BACKEND_CONTAINER="apartment-backend-dev"
    FRONTEND_CONTAINER="apartment-frontend-dev"
    DB_NAME="${DB_DATABASE}"
    DB_USER="${DB_USERNAME}"
    DB_PASS="${DB_PASSWORD}"
fi

ERRORS=0

# Check all containers are running
echo "Checking container status..."

declare -A CONTAINERS=(
    ["mysql"]="$MYSQL_CONTAINER"
    ["redis"]="$REDIS_CONTAINER"
    ["backend"]="$BACKEND_CONTAINER"
    ["frontend"]="$FRONTEND_CONTAINER"
)

for service in mysql redis backend frontend; do
    container_name="${CONTAINERS[$service]}"
    echo -n "  $service: "
    if docker ps --filter "name=$container_name" --format "{{.Status}}" | grep -q "Up"; then
        echo -e "${GREEN}✓ Running${NC}"
    else
        echo -e "${RED}✗ Not running${NC}"
        ((ERRORS++))
    fi
done

# Check container health
echo ""
echo "Checking container health..."

for service in mysql redis backend; do
    container_name="${CONTAINERS[$service]}"
    echo -n "  $service: "

    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-healthcheck")

    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}✓ Healthy${NC}"
    elif [ "$HEALTH_STATUS" = "no-healthcheck" ]; then
        # Container has no health check defined
        if docker ps --filter "name=$container_name" --format "{{.Status}}" | grep -q "Up"; then
            echo -e "${GREEN}✓ Running (no healthcheck)${NC}"
        else
            echo -e "${RED}✗ Not running${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ ${HEALTH_STATUS}${NC}"
    fi
done

# Check database tables
echo ""
echo "Checking database schema..."

if docker ps --filter "name=$MYSQL_CONTAINER" --format "{{.Names}}" | grep -q "$MYSQL_CONTAINER"; then
    TABLES=$(docker exec "$MYSQL_CONTAINER" \
        mysql -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" \
        -e "SHOW TABLES;" 2>/dev/null | wc -l)

    if [ "$TABLES" -gt 10 ]; then
        echo -e "  ${GREEN}✓ Found $((TABLES-1)) tables${NC}"
    else
        echo -e "  ${YELLOW}⚠ Found $((TABLES-1)) tables${NC}"
    fi
else
    echo -e "  ${RED}✗ MySQL container not running${NC}"
    ((ERRORS++))
fi

# Test backend API
echo ""
echo "Testing backend API..."

if docker ps --filter "name=$BACKEND_CONTAINER" --format "{{.Names}}" | grep -q "$BACKEND_CONTAINER"; then
    HEALTH_CHECK=$(docker exec "$BACKEND_CONTAINER" wget -q -O- http://localhost:3000/api/v1/health 2>/dev/null || echo "failed")
    if [[ "$HEALTH_CHECK" == *"ok"* ]] || [[ "$HEALTH_CHECK" == *"success"* ]]; then
        echo -e "  ${GREEN}✓ Health endpoint responding${NC}"
    else
        echo -e "  ${RED}✗ Health endpoint not responding${NC}"
        ((ERRORS++))
    fi
else
    echo -e "  ${RED}✗ Backend container not running${NC}"
    ((ERRORS++))
fi

# Test frontend
echo ""
echo "Testing frontend..."

if docker ps --filter "name=$FRONTEND_CONTAINER" --format "{{.Names}}" | grep -q "$FRONTEND_CONTAINER"; then
    if docker exec "$FRONTEND_CONTAINER" sh -c "nc -z localhost 3001" 2>/dev/null; then
        echo -e "  ${GREEN}✓ Frontend port accessible${NC}"
    else
        echo -e "  ${YELLOW}⚠ Frontend port check inconclusive${NC}"
    fi
else
    echo -e "  ${RED}✗ Frontend container not running${NC}"
fi

# Check logs for errors
echo ""
echo "Checking recent logs for errors..."

if docker ps --filter "name=$BACKEND_CONTAINER" --format "{{.Names}}" | grep -q "$BACKEND_CONTAINER"; then
    ERROR_COUNT=$(docker logs "$BACKEND_CONTAINER" --tail=100 2>&1 | grep -i "error\|exception\|failed" | wc -l)

    if [ "$ERROR_COUNT" -eq 0 ]; then
        echo -e "  ${GREEN}✓ No errors in recent logs${NC}"
    else
        echo -e "  ${YELLOW}⚠ Found $ERROR_COUNT error messages in logs${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠ Backend container not available for log check${NC}"
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
    echo "  docker logs $BACKEND_CONTAINER"
    echo "  docker logs $MYSQL_CONTAINER"
    echo "  docker logs $REDIS_CONTAINER"
    exit 1
fi
