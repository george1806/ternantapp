#!/bin/bash
# ================================================================
# Master Deployment Script
# ================================================================
# Purpose: Orchestrates complete deployment process
# Usage: ./deploy.sh [dev|prod] [options]
# Options:
#   --no-backup    Skip database backup
#   --no-cache     Build images without cache
#   --clean        Clean install (removes volumes)
# ================================================================

set -e

ENVIRONMENT=${1:-dev}
SKIP_BACKUP=false
NO_CACHE=""
CLEAN=false

# Parse arguments
shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "========================================"
echo "  Apartment Management System"
echo "  Automated Deployment"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo "Clean install: $CLEAN"
echo "========================================"
echo ""

# Make all scripts executable
chmod +x "$SCRIPT_DIR"/*.sh

# Clean install if requested
if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}Performing clean install (removing volumes)...${NC}"
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker compose -f docker-compose.prod.yml down -v
    else
        docker compose down -v
    fi
    echo ""
fi

# Step 1: Validate environment
echo -e "${BLUE}[1/7] Validating environment...${NC}"
"$SCRIPT_DIR/01-validate-environment.sh" "$ENVIRONMENT"
echo ""

# Step 2: Backup database (unless skipped or clean install)
if [ "$SKIP_BACKUP" = false ] && [ "$CLEAN" = false ]; then
    echo -e "${BLUE}[2/7] Backing up database...${NC}"
    "$SCRIPT_DIR/02-backup-database.sh" "$ENVIRONMENT" || echo "Backup skipped (no existing database)"
    echo ""
else
    echo -e "${YELLOW}[2/7] Skipping backup${NC}"
    echo ""
fi

# Step 3: Build images
echo -e "${BLUE}[3/7] Building Docker images...${NC}"
"$SCRIPT_DIR/03-build-images.sh" "$ENVIRONMENT" $NO_CACHE
echo ""

# Step 4: Deploy database
echo -e "${BLUE}[4/7] Deploying database services...${NC}"
"$SCRIPT_DIR/04-deploy-database.sh" "$ENVIRONMENT"
echo ""

# Step 5: Deploy backend
echo -e "${BLUE}[5/7] Deploying backend API...${NC}"
"$SCRIPT_DIR/05-deploy-backend.sh" "$ENVIRONMENT"
echo ""

# Step 6: Deploy frontend
echo -e "${BLUE}[6/7] Deploying frontend application...${NC}"
"$SCRIPT_DIR/06-deploy-frontend.sh" "$ENVIRONMENT"
echo ""

# Step 7: Verify deployment
echo -e "${BLUE}[7/7] Verifying deployment...${NC}"
"$SCRIPT_DIR/07-verify-deployment.sh" "$ENVIRONMENT"
echo ""

# Success
echo ""
echo "========================================"
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Access the application at http://localhost:3001"
echo "  2. Run seed data (if needed):"
echo "     docker exec apartment-backend npm run seed:super-admin"
echo "  3. Monitor logs:"
echo "     docker compose logs -f"
echo ""
