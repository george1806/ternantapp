#!/bin/bash
# ================================================================
# Script 02: Backup Database Before Deployment
# ================================================================
# Purpose: Creates database backup before deployment
# Usage: ./02-backup-database.sh [dev|prod]
# ================================================================

set -e

ENVIRONMENT=${1:-dev}
BACKUP_DIR="./deploy/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "Database Backup"
echo "Environment: $ENVIRONMENT"
echo "========================================"
echo ""

# Load environment
if [ "$ENVIRONMENT" = "prod" ]; then
    ENV_FILE=".env.production"
    COMPOSE_FILE="docker-compose.prod.yml"
    CONTAINER_NAME="apartment-mysql"
else
    ENV_FILE=".env"
    COMPOSE_FILE="docker-compose.yml"
    CONTAINER_NAME="apartment-mysql-dev"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found"
    exit 1
fi

source "$ENV_FILE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if database container is running
echo "Checking database container..."
if ! docker ps --format '{{.Names}}' | grep -q "$CONTAINER_NAME"; then
    echo -e "${YELLOW}⚠ Database container not running${NC}"
    echo "Skipping backup (fresh install)"
    exit 0
fi

# Create backup
BACKUP_FILE="$BACKUP_DIR/${ENVIRONMENT}_${DB_DATABASE}_${TIMESTAMP}.sql"

echo "Creating backup: $BACKUP_FILE"
docker exec "$CONTAINER_NAME" mysqldump \
    -u"${DB_USERNAME}" \
    -p"${DB_PASSWORD}" \
    "${DB_DATABASE}" \
    > "$BACKUP_FILE" 2>/dev/null

if [ $? -eq 0 ]; then
    # Compress backup
    gzip "$BACKUP_FILE"
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)

    echo -e "${GREEN}✓ Backup created successfully${NC}"
    echo "  File: ${BACKUP_FILE}.gz"
    echo "  Size: $BACKUP_SIZE"

    # Keep only last 7 backups
    echo ""
    echo "Cleaning old backups (keeping last 7)..."
    ls -t "$BACKUP_DIR"/${ENVIRONMENT}_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm

    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/${ENVIRONMENT}_*.sql.gz 2>/dev/null | wc -l)
    echo "Total backups: $BACKUP_COUNT"
else
    echo "Error: Backup failed"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}✓ Backup completed${NC}"
echo "========================================"
