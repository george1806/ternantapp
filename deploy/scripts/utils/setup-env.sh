#!/bin/bash
# ================================================================
# Utility Script: Environment Setup
# ================================================================
# Purpose: Sets up environment files for dev and prod
# Usage: ./setup-env.sh [dev|prod]
# ================================================================

set -e

ENVIRONMENT=${1:-dev}

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo ""
echo "========================================"
echo "  Environment Configuration Setup"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo "========================================"
echo ""

# Determine which env file to work with
if [ "$ENVIRONMENT" = "prod" ]; then
    ENV_FILE="$PROJECT_ROOT/.env.production"
    ENV_EXAMPLE="$PROJECT_ROOT/.env.production.example"
else
    ENV_FILE="$PROJECT_ROOT/.env"
    ENV_EXAMPLE="$PROJECT_ROOT/.env.example"
fi

# Check if env file already exists
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Environment file already exists: $ENV_FILE${NC}"
    read -p "Do you want to overwrite it? (yes/no): " OVERWRITE
    if [ "$OVERWRITE" != "yes" ]; then
        echo "Keeping existing environment file."
        exit 0
    fi
fi

# Check if example file exists
if [ ! -f "$ENV_EXAMPLE" ]; then
    echo -e "${RED}Error: Example file not found: $ENV_EXAMPLE${NC}"
    echo "Please ensure .env.example exists in the project root"
    exit 1
fi

echo -e "${BLUE}Copying from example file...${NC}"
cp "$ENV_EXAMPLE" "$ENV_FILE"

# Generate secure secrets
echo ""
echo -e "${BLUE}Generating secure secrets...${NC}"

JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
DB_ROOT_PASSWORD=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Update the env file with generated secrets
if command -v sed &> /dev/null; then
    # macOS and Linux compatible sed
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" "$ENV_FILE"
        sed -i '' "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|g" "$ENV_FILE"
        sed -i '' "s|DB_ROOT_PASSWORD=.*|DB_ROOT_PASSWORD=$DB_ROOT_PASSWORD|g" "$ENV_FILE"
        sed -i '' "s|DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|g" "$ENV_FILE"
        sed -i '' "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|g" "$ENV_FILE"
    else
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" "$ENV_FILE"
        sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|g" "$ENV_FILE"
        sed -i "s|DB_ROOT_PASSWORD=.*|DB_ROOT_PASSWORD=$DB_ROOT_PASSWORD|g" "$ENV_FILE"
        sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|g" "$ENV_FILE"
        sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|g" "$ENV_FILE"
    fi
fi

echo -e "${GREEN}✓ Secrets generated${NC}"

# Set environment-specific values
if [ "$ENVIRONMENT" = "prod" ]; then
    echo ""
    echo -e "${BLUE}Configuring for PRODUCTION environment...${NC}"

    # Set production-specific values
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|NODE_ENV=.*|NODE_ENV=production|g" "$ENV_FILE"
        sed -i '' "s|FRONTEND_PORT=.*|FRONTEND_PORT=3001|g" "$ENV_FILE"
    else
        sed -i "s|NODE_ENV=.*|NODE_ENV=production|g" "$ENV_FILE"
        sed -i "s|FRONTEND_PORT=.*|FRONTEND_PORT=3001|g" "$ENV_FILE"
    fi

    echo -e "${YELLOW}⚠ IMPORTANT: Update the following in $ENV_FILE:${NC}"
    echo "  - APP_DOMAIN (set your production domain)"
    echo "  - CORS_ORIGINS (set allowed origins)"
    echo "  - Email configuration (SMTP settings)"
    echo "  - Any other production-specific settings"
else
    echo ""
    echo -e "${BLUE}Configuring for DEVELOPMENT environment...${NC}"

    # Set development-specific values
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|NODE_ENV=.*|NODE_ENV=development|g" "$ENV_FILE"
        sed -i '' "s|FRONTEND_PORT=.*|FRONTEND_PORT=3001|g" "$ENV_FILE"
    else
        sed -i "s|NODE_ENV=.*|NODE_ENV=development|g" "$ENV_FILE"
        sed -i "s|FRONTEND_PORT=.*|FRONTEND_PORT=3001|g" "$ENV_FILE"
    fi
fi

echo ""
echo "========================================"
echo -e "${GREEN}✓ Environment configuration complete${NC}"
echo "========================================"
echo ""
echo "Environment file created: $ENV_FILE"
echo ""
echo "Next steps:"
echo "  1. Review and update $ENV_FILE as needed"
echo "  2. Run deployment: ../deploy.sh $ENVIRONMENT"
echo ""
