#!/bin/bash
# ================================================================
# Deploy Backend API Service
# ================================================================
# Purpose: Deploys NestJS backend API using separate compose file
# Deploy order: 3 (Third - depends on MySQL and Redis)
# Usage: ./deploy-03-backend.sh [prod|dev]
# ================================================================

set -e

# ================================
# Color Definitions
# ================================
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ================================
# Global Variables
# ================================
ENVIRONMENT=${1:-prod}
ENV_FILE=""
COMPOSE_FILE="deploy/compose/03-backend.yml"
SERVICE_NAME="backend"

# ================================
# Helper Functions
# ================================

print_header() {
    echo "========================================"
    echo "$1"
    echo "Environment: $ENVIRONMENT"
    echo "========================================"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# ================================
# Validation Functions
# ================================

validate_environment_file() {
    if [ "$ENVIRONMENT" = "prod" ]; then
        ENV_FILE="${ENV_FILE:-.env.production}"
    else
        ENV_FILE="${ENV_FILE:-.env}"
    fi

    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file not found: $ENV_FILE"
        exit 1
    fi
}

validate_compose_file() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
}

get_container_name_from_env() {
    local var_name=$1
    local default_value=$2
    grep "^${var_name}=" "$ENV_FILE" | cut -d'=' -f2 || echo "$default_value"
}

check_dependency_healthy() {
    local container_name=$1
    local service_label=$2

    echo "Checking $service_label dependency..."

    if ! docker ps --filter "name=$container_name" --filter "health=healthy" | grep -q "$container_name" || false; then
        print_error "$service_label is not healthy"
        echo "Please ensure $service_label is running first"
        return 1
    fi

    print_success "$service_label is healthy"
    return 0
}

validate_dependencies() {
    local mysql_container
    local redis_container

    mysql_container=$(get_container_name_from_env "MYSQL_CONTAINER_NAME" "apartment-mysql")
    redis_container=$(get_container_name_from_env "REDIS_CONTAINER_NAME" "apartment-redis")

    if ! check_dependency_healthy "$mysql_container" "MySQL"; then
        echo "Deploy MySQL first: ./deploy-01-mysql.sh $ENVIRONMENT"
        exit 1
    fi

    if ! check_dependency_healthy "$redis_container" "Redis"; then
        echo "Deploy Redis first: ./deploy-02-redis.sh $ENVIRONMENT"
        exit 1
    fi
}

# ================================
# Deployment Functions
# ================================

start_service() {
    print_info "Starting Backend service..."
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
}

wait_for_healthy() {
    local service=$1
    local retries=${2:-60}
    local count=0

    echo ""
    echo "Waiting for $service to be ready..."

    while [ $count -lt $retries ]; do
        if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "healthy" || false; then
            print_success "$service is ready and healthy"
            return 0
        fi

        # Check if container is running but not healthy yet
        if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "Up" || false; then
            echo -n "."
        else
            print_error "$service container is not running"
            show_logs "$service"
            return 1
        fi

        ((count++))
        sleep 2
    done

    # Timeout reached
    echo ""
    print_error "$service failed to become healthy after $retries retries"
    show_logs "$service"
    return 1
}

show_logs() {
    local service=$1
    echo "Showing logs:"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100 "$service"
}

show_status() {
    local service=$1
    echo ""
    echo "$service Status:"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps "$service"
}

test_health_endpoint() {
    echo ""
    echo "Testing health endpoint..."

    if curl -sf http://localhost:3000/api/v1/health >/dev/null 2>&1; then
        print_success "Health endpoint responding"
    else
        print_warning "Health endpoint not responding yet (may still be initializing)"
    fi
}

# ================================
# Main Deployment Function
# ================================

deploy_backend() {
    print_header "Deploying Backend API Service"

    validate_environment_file
    validate_compose_file
    validate_dependencies

    start_service

    if ! wait_for_healthy "$SERVICE_NAME" "${BACKEND_HEALTH_RETRIES:-60}"; then
        exit 1
    fi

    test_health_endpoint
    show_status "$SERVICE_NAME"

    echo ""
    echo "========================================"
    print_success "Backend deployed successfully"
    echo "========================================"
}

# ================================
# Script Entry Point
# ================================

deploy_backend
