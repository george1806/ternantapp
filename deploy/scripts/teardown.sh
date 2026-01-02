#!/bin/bash
# ================================================================
# Service Teardown Script
# ================================================================
# Purpose: Stop and optionally remove apartment management services
# Usage: ./teardown.sh [prod|dev] [service1 service2 ...] [--remove-volumes]
#
# Examples:
#   ./teardown.sh prod                    # Stop all production services
#   ./teardown.sh prod backend frontend   # Stop specific services
#   ./teardown.sh prod --remove-volumes   # Stop all and remove volumes
#   ./teardown.sh dev mysql               # Stop dev MySQL only
#
# Services: mysql, redis, backend, frontend, all (default)
# ================================================================

set -e

# ================================
# Color Definitions
# ================================
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ================================
# Global Variables
# ================================
ENVIRONMENT=${1:-prod}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE=""
REMOVE_VOLUMES=false
SERVICES_TO_STOP=()

# Service configuration
declare -A SERVICE_CONTAINERS=(
    ["mysql"]="apartment-mysql"
    ["redis"]="apartment-redis"
    ["backend"]="apartment-backend"
    ["frontend"]="apartment-frontend"
)

declare -A SERVICE_COMPOSE_FILES=(
    ["mysql"]="01-mysql.yml"
    ["redis"]="02-redis.yml"
    ["backend"]="03-backend.yml"
    ["frontend"]="04-frontend.yml"
)

# ================================
# Helper Functions
# ================================

print_header() {
    echo ""
    echo -e "${CYAN}========================================"
    echo "  $1"
    echo "========================================${NC}"
}

print_step() {
    echo ""
    echo -e "${CYAN}[$1] $2${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ================================
# Argument Parsing Functions
# ================================

parse_arguments() {
    local args=("$@")

    # Skip first argument (environment)
    for ((i=1; i<${#args[@]}; i++)); do
        case ${args[i]} in
            --remove-volumes)
                REMOVE_VOLUMES=true
                ;;
            mysql|redis|backend|frontend)
                SERVICES_TO_STOP+=("${args[i]}")
                ;;
            all)
                SERVICES_TO_STOP=(mysql redis backend frontend)
                ;;
            *)
                print_warning "Unknown argument: ${args[i]}"
                ;;
        esac
    done

    # If no services specified, stop all
    if [ ${#SERVICES_TO_STOP[@]} -eq 0 ]; then
        SERVICES_TO_STOP=(frontend backend redis mysql)
    fi
}

# ================================
# Validation Functions
# ================================

setup_environment() {
    if [ "$ENVIRONMENT" = "prod" ]; then
        ENV_FILE=".env.production"
    else
        ENV_FILE=".env"
    fi

    if [ ! -f "$ENV_FILE" ]; then
        print_warning "Environment file not found: $ENV_FILE"
        print_info "Proceeding with default container names"
    else
        source "$ENV_FILE"
    fi
}

get_container_name() {
    local service=$1
    local default_name="${SERVICE_CONTAINERS[$service]}"

    # Try to get from environment variable
    case $service in
        mysql)
            echo "${MYSQL_CONTAINER_NAME:-$default_name}"
            ;;
        redis)
            echo "${REDIS_CONTAINER_NAME:-$default_name}"
            ;;
        backend)
            echo "${BACKEND_CONTAINER_NAME:-$default_name}"
            ;;
        frontend)
            echo "${FRONTEND_CONTAINER_NAME:-$default_name}"
            ;;
        *)
            echo "$default_name"
            ;;
    esac
}

# ================================
# Status Functions
# ================================

show_current_status() {
    print_step "INFO" "Current Running Services"
    echo ""

    local running_count=0
    for service in "${SERVICES_TO_STOP[@]}"; do
        local container_name=$(get_container_name "$service")

        if docker ps --format "{{.Names}}" | grep -q "^${container_name}$" || false; then
            local status=$(docker ps --filter "name=$container_name" --format "{{.Status}}")
            echo -e "${GREEN}● ${NC}$service ($container_name): $status"
            ((running_count++))
        else
            echo -e "${RED}○ ${NC}$service ($container_name): Not running"
        fi
    done

    echo ""
    if [ $running_count -eq 0 ]; then
        print_info "No services are currently running"
        return 1
    else
        print_info "Found $running_count running service(s)"
        return 0
    fi
}

# ================================
# Teardown Functions
# ================================

stop_service() {
    local service=$1
    local container_name=$(get_container_name "$service")
    local compose_file="${SERVICE_COMPOSE_FILES[$service]}"

    print_step "STOP" "Stopping $service ($container_name)"

    # Check if container exists
    if ! docker ps -a --format "{{.Names}}" | grep -q "^${container_name}$" || false; then
        print_info "$service is not deployed"
        return 0
    fi

    # Stop using docker-compose if compose file exists
    local compose_path="$SCRIPT_DIR/../compose/$compose_file"
    if [ -f "$compose_path" ]; then
        if [ -f "$ENV_FILE" ]; then
            docker compose --env-file "$ENV_FILE" -f "$compose_path" down --remove-orphans
        else
            docker compose -f "$compose_path" down --remove-orphans
        fi
    else
        # Fallback to docker stop
        docker stop "$container_name" 2>/dev/null || true
        docker rm "$container_name" 2>/dev/null || true
    fi

    # Verify stopped
    if docker ps --format "{{.Names}}" | grep -q "^${container_name}$" || false; then
        print_error "Failed to stop $service"
        return 1
    else
        print_success "$service stopped successfully"
        return 0
    fi
}

stop_all_services() {
    local success_count=0
    local total_count=${#SERVICES_TO_STOP[@]}

    print_header "Stopping Services"

    # Stop in reverse dependency order
    for service in "${SERVICES_TO_STOP[@]}"; do
        if stop_service "$service"; then
            ((success_count++))
        fi
    done

    echo ""
    if [ $success_count -eq $total_count ]; then
        print_success "All $total_count service(s) stopped successfully"
    else
        print_warning "$success_count/$total_count service(s) stopped"
    fi
}

# ================================
# Volume Management Functions
# ================================

remove_volumes() {
    print_header "Removing Volumes"

    print_warning "This will delete all data in the volumes!"
    echo ""
    read -p "Are you sure you want to remove volumes? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        print_info "Volume removal cancelled"
        return 0
    fi

    echo ""

    # Get volume names from environment or use defaults
    local volumes=(
        "${MYSQL_VOLUME_NAME:-apartment_mysql_data}"
        "${REDIS_VOLUME_NAME:-apartment_redis_data}"
        "${BACKEND_LOGS_VOLUME_NAME:-apartment_backend_logs}"
        "${UPLOADS_VOLUME_NAME:-apartment_uploads}"
    )

    local removed_count=0
    for volume in "${volumes[@]}"; do
        if docker volume ls --format "{{.Name}}" | grep -q "^${volume}$" || false; then
            print_step "REMOVE" "Removing volume: $volume"
            if docker volume rm "$volume" 2>/dev/null; then
                print_success "Volume $volume removed"
                ((removed_count++))
            else
                print_warning "Could not remove volume $volume (may be in use)"
            fi
        else
            print_info "Volume $volume does not exist"
        fi
    done

    echo ""
    print_success "Removed $removed_count volume(s)"
}

# ================================
# Summary Functions
# ================================

show_final_status() {
    print_header "Final Status"

    echo ""
    local still_running=0

    for service in "${SERVICES_TO_STOP[@]}"; do
        local container_name=$(get_container_name "$service")

        if docker ps --format "{{.Names}}" | grep -q "^${container_name}$" || false; then
            echo -e "${RED}● ${NC}$service ($container_name): Still running"
            ((still_running++))
        else
            echo -e "${GREEN}○ ${NC}$service ($container_name): Stopped"
        fi
    done

    echo ""
    if [ $still_running -eq 0 ]; then
        print_success "All services stopped successfully"
    else
        print_warning "$still_running service(s) still running"
    fi
}

show_cleanup_info() {
    echo ""
    echo "Additional cleanup commands:"
    echo "  Remove all stopped containers: docker container prune -f"
    echo "  Remove unused networks:        docker network prune -f"
    echo "  Remove unused volumes:         docker volume prune -f"
    echo "  Remove all unused data:        docker system prune -a --volumes"
    echo ""
}

# ================================
# Main Function
# ================================

main() {
    print_header "Apartment Management System - Service Teardown"

    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Remove Volumes: $REMOVE_VOLUMES"
    echo ""

    parse_arguments "$@"
    setup_environment

    echo "Services to stop: ${SERVICES_TO_STOP[*]}"
    echo ""

    # Show current status
    if ! show_current_status; then
        print_info "Nothing to do"
        exit 0
    fi

    # Confirm teardown
    echo ""
    read -p "Proceed with teardown? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Teardown cancelled"
        exit 0
    fi

    # Stop services
    stop_all_services

    # Remove volumes if requested
    if [ "$REMOVE_VOLUMES" = true ]; then
        echo ""
        remove_volumes
    fi

    # Show final status
    show_final_status

    # Show cleanup info
    if [ "$REMOVE_VOLUMES" != true ]; then
        show_cleanup_info
    fi

    echo ""
    print_success "Teardown complete!"
    echo ""
}

# ================================
# Script Entry Point
# ================================

main "$@"
