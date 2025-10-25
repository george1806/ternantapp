#!/bin/bash

# ==========================================
# TernantApp Production Deployment Script
# ==========================================
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_NAME="ternantapp"
BACKUP_DIR="./backups"
LOG_FILE="./deploy-$(date +%Y%m%d-%H%M%S).log"

# Functions
log() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
  exit 1
}

warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
  echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Pre-flight checks
preflight_checks() {
  log "Running pre-flight checks..."

  # Check if running as root
  if [ "$EUID" -eq 0 ]; then
    warning "Running as root is not recommended"
  fi

  # Check if Docker is installed
  if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
  fi

  # Check if Docker Compose is installed
  if ! command -v docker compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
  fi

  # Check if .env.production exists
  if [ ! -f ".env.production" ]; then
    error ".env.production file not found. Please create it from .env.production.example"
  fi

  log "✅ Pre-flight checks passed"
}

# Backup database
backup_database() {
  log "Creating database backup..."

  mkdir -p "$BACKUP_DIR"

  BACKUP_FILE="$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).sql"

  docker exec ${PROJECT_NAME}-mysql-prod mysqldump \
    -u root -p"$MYSQL_ROOT_PASSWORD" \
    "$DATABASE_NAME" > "$BACKUP_FILE" 2>/dev/null || true

  if [ -f "$BACKUP_FILE" ]; then
    log "✅ Database backup created: $BACKUP_FILE"

    # Compress backup
    gzip "$BACKUP_FILE"
    log "✅ Backup compressed: ${BACKUP_FILE}.gz"

    # Remove old backups (keep last 30 days)
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
  fi
}

# Build and deploy
deploy() {
  log "Starting deployment for environment: $ENVIRONMENT"

  # Stop existing containers
  log "Stopping existing containers..."
  docker compose -f docker-compose.prod.yml down || true

  # Pull latest code (if using git)
  if [ -d ".git" ]; then
    log "Pulling latest code..."
    git pull origin main || warning "Failed to pull latest code"
  fi

  # Build images
  log "Building Docker images..."
  docker compose -f docker-compose.prod.yml build --no-cache

  # Start services
  log "Starting services..."
  docker compose -f docker-compose.prod.yml up -d

  # Wait for services to be healthy
  log "Waiting for services to be healthy..."
  sleep 10

  # Check health
  check_health
}

# Check service health
check_health() {
  log "Checking service health..."

  MAX_RETRIES=30
  RETRY_COUNT=0

  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
      log "✅ Services are healthy"
      return 0
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    info "Waiting for services... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
  done

  error "Services did not become healthy in time"
}

# Run database migrations
run_migrations() {
  log "Running database migrations..."

  docker exec ${PROJECT_NAME}-backend-prod npm run migration:run || error "Migration failed"

  log "✅ Migrations completed"
}

# Display deployment info
display_info() {
  log "=========================================="
  log "Deployment completed successfully!"
  log "=========================================="
  log ""
  log "Services:"
  docker compose -f docker-compose.prod.yml ps
  log ""
  log "To view logs:"
  log "  docker compose -f docker-compose.prod.yml logs -f"
  log ""
  log "To stop services:"
  log "  docker compose -f docker-compose.prod.yml down"
  log ""
  log "Backup location: $BACKUP_DIR"
  log "Log file: $LOG_FILE"
}

# Rollback function
rollback() {
  error "Deployment failed. Starting rollback..."

  # Stop new containers
  docker compose -f docker-compose.prod.yml down

  # You can add logic here to restore from backup
  warning "Please restore from backup manually if needed"

  exit 1
}

# Main deployment flow
main() {
  log "==========================================
"
  log "TernantApp Production Deployment"
  log "=========================================="
  log "Environment: $ENVIRONMENT"
  log "Started at: $(date)"
  log ""

  # Set trap for errors
  trap rollback ERR

  # Run deployment steps
  preflight_checks
  backup_database
  deploy
  run_migrations
  display_info

  log "Deployment completed at: $(date)"
}

# Run main function
main
