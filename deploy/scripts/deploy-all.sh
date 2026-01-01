#!/bin/bash
# ================================================================
# Master Deployment Script - Deploy All Services
# ================================================================
# Purpose: Orchestrates deployment of all services in correct order
# Services: MySQL → Redis → Backend → Frontend
# Usage: ./deploy-all.sh [prod|dev] [--skip-validation]
# ================================================================

set -e

ENVIRONMENT=${1:-prod}
SKIP_VALIDATION=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
    esac
done

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}========================================"
echo "  Apartment Management System"
echo "  Master Deployment Script"
echo "========================================${NC}"
echo ""
echo "Environment: $ENVIRONMENT"
echo "Skip Validation: $SKIP_VALIDATION"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine environment file
if [ "$ENVIRONMENT" = "prod" ]; then
    ENV_FILE=".env.production"
else
    ENV_FILE=".env"
fi

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file not found: $ENV_FILE${NC}"
    echo "Please create it from .env.example"
    exit 1
fi

# Run validation unless skipped
if [ "$SKIP_VALIDATION" = false ]; then
    echo -e "${BLUE}Step 0: Validating Environment${NC}"
    echo "----------------------------------------"
    if [ -f "$SCRIPT_DIR/01-validate-environment.sh" ]; then
        "$SCRIPT_DIR/01-validate-environment.sh" "$ENVIRONMENT"
        if [ $? -ne 0 ]; then
            echo -e "${RED}Validation failed. Aborting deployment.${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠ Validation script not found, skipping...${NC}"
    fi
    echo ""
fi

# Deployment steps
STEPS=(
    "01:MySQL Database:deploy-01-mysql.sh"
    "02:Redis Cache:deploy-02-redis.sh"
    "03:Backend API:deploy-03-backend.sh"
    "04:Frontend App:deploy-04-frontend.sh"
)

TOTAL_STEPS=${#STEPS[@]}
CURRENT_STEP=0

for step_info in "${STEPS[@]}"; do
    IFS=':' read -r step_num step_name script_name <<< "$step_info"
    ((CURRENT_STEP++))

    echo ""
    echo -e "${CYAN}========================================"
    echo "Step $CURRENT_STEP/$TOTAL_STEPS: Deploying $step_name"
    echo "========================================${NC}"

    if [ -f "$SCRIPT_DIR/$script_name" ]; then
        "$SCRIPT_DIR/$script_name" "$ENVIRONMENT"

        if [ $? -ne 0 ]; then
            echo ""
            echo -e "${RED}========================================${NC}"
            echo -e "${RED}✗ Deployment failed at step: $step_name${NC}"
            echo -e "${RED}========================================${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Error: Script not found: $script_name${NC}"
        exit 1
    fi

    # Brief pause between steps
    if [ $CURRENT_STEP -lt $TOTAL_STEPS ]; then
        echo ""
        echo -e "${BLUE}Waiting 3 seconds before next step...${NC}"
        sleep 3
    fi
done

# Final summary
echo ""
echo -e "${CYAN}========================================"
echo "  Deployment Summary"
echo "========================================${NC}"
echo ""

# Show all container statuses
echo "All Services Status:"
echo "----------------------------------------"
docker ps --filter "name=apartment-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${GREEN}========================================"
echo "✓ All services deployed successfully!"
echo "========================================${NC}"
echo ""
echo "Next steps:"
if [ "$ENVIRONMENT" = "prod" ]; then
    echo "1. Configure Nginx reverse proxy (optional)"
    echo "2. Set up SSL certificates with Certbot (optional)"
    echo "3. Configure monitoring stack (optional)"
    echo "4. Test the application"
else
    echo "1. Access frontend: http://localhost:3001"
    echo "2. Access backend API: http://localhost:3000/api/v1"
    echo "3. Access phpMyAdmin: http://localhost:8082 (if running)"
fi
echo ""
