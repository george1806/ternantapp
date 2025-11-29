#!/bin/bash

# =================================================================
# Database Backup Script
# Usage: ./scripts/backup.sh [dev|prod]
# =================================================================

set -e

ENV=${1:-dev}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./db-backup"

if [ "$ENV" = "dev" ]; then
    COMPOSE_FILE="docker-compose.yml"
    CONTAINER="apartment-mysql"
else
    COMPOSE_FILE="docker-compose.prod.yml"
    CONTAINER="apartment-mysql-prod"
fi

mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
docker-compose -f "$COMPOSE_FILE" exec -T mysql mysqldump \
    -u apartment_user -papartment_pass_dev \
    apartment_management > "$BACKUP_DIR/backup_${TIMESTAMP}.sql"

echo "Backup completed: $BACKUP_DIR/backup_${TIMESTAMP}.sql"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "backup_*.sql" -mtime +30 -delete
