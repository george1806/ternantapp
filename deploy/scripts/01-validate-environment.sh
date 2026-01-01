#!/bin/bash
# ================================================================
# Script 01: Validate Environment & Prerequisites
# ================================================================
# Purpose: Checks all requirements before deployment
# Usage: ./01-validate-environment.sh [dev|prod]
# ================================================================

set -e

ENVIRONMENT=${1:-dev}
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "Environment Validation"
echo "Environment: $ENVIRONMENT"
echo "========================================"
echo ""

# Track errors
ERRORS=0

# Check Docker
echo -n "Checking Docker... "
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    echo -e "${GREEN}✓ Found (v$DOCKER_VERSION)${NC}"
else
    echo -e "${RED}✗ Docker not found${NC}"
    ((ERRORS++))
fi

# Check Docker Compose
echo -n "Checking Docker Compose... "
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version --short)
    echo -e "${GREEN}✓ Found (v$COMPOSE_VERSION)${NC}"
else
    echo -e "${RED}✗ Docker Compose not found${NC}"
    ((ERRORS++))
fi

# Check environment file
echo -n "Checking environment file... "
if [ "$ENVIRONMENT" = "prod" ]; then
    ENV_FILE=".env.production"
else
    ENV_FILE=".env"
fi

if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}✓ Found ($ENV_FILE)${NC}"
else
    echo -e "${RED}✗ Missing ($ENV_FILE)${NC}"
    ((ERRORS++))
fi

# Check required environment variables
echo ""
echo "Validating environment variables..."

# Different required vars for dev vs prod
if [ "$ENVIRONMENT" = "prod" ]; then
    required_vars=(
        "DATABASE_NAME"
        "DATABASE_USER"
        "DATABASE_PASSWORD"
        "MYSQL_ROOT_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "NETWORK_NAME"
        "MYSQL_CONTAINER_NAME"
        "REDIS_CONTAINER_NAME"
        "BACKEND_CONTAINER_NAME"
        "FRONTEND_CONTAINER_NAME"
    )
else
    required_vars=(
        "DB_DATABASE"
        "DB_USERNAME"
        "DB_PASSWORD"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
    )
fi

if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
    for var in "${required_vars[@]}"; do
        echo -n "  $var: "
        varval="${!var}"
        if [ -n "$varval" ]; then
            # Check if secret is strong enough (at least 32 chars for JWT)
            if [[ "$var" == *"SECRET"* ]]; then
                if [ ${#varval} -ge 32 ]; then
                    echo -e "${GREEN}✓${NC}"
                else
                    echo -e "${YELLOW}⚠ Too short (< 32 chars)${NC}"
                fi
            else
                echo -e "${GREEN}✓${NC}"
            fi
        else
            echo -e "${RED}✗ Missing${NC}"
            ((ERRORS++))
        fi
    done
fi

# Check disk space
echo ""
echo -n "Checking disk space... "
AVAILABLE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAILABLE" -gt 10 ]; then
    echo -e "${GREEN}✓ ${AVAILABLE}GB available${NC}"
else
    echo -e "${YELLOW}⚠ Only ${AVAILABLE}GB available (recommend 10GB+)${NC}"
fi

# Check if containers are already running
echo ""
echo -n "Checking for running containers... "
RUNNING=$(docker ps --filter "name=apartment-" --format "{{.Names}}" | wc -l)
if [ "$RUNNING" -gt 0 ]; then
    echo -e "${YELLOW}⚠ $RUNNING apartment containers running${NC}"
    echo "  Containers will be recreated during deployment"
else
    echo -e "${GREEN}✓ No conflicts${NC}"
fi

# Summary
echo ""
echo "========================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Validation passed!${NC}"
    echo "Ready to deploy to $ENVIRONMENT"
    exit 0
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s)${NC}"
    echo "Please fix the issues above before deploying"
    exit 1
fi
