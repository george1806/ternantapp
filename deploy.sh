#!/bin/bash
# ================================================================
# TernantApp - Dynamic Deployment Script
# ================================================================
# A flexible deployment script supporting multiple deployment profiles
#
# Usage:
#   ./deploy.sh [profile] [environment] [options]
#
# Profiles:
#   full-stack  - Deploy ALL services (MySQL, Redis, Mailpit, Backend, Frontend)
#   apps-only   - Deploy ONLY applications (Backend, Frontend) - external DB/Redis
#   infra       - Deploy ONLY infrastructure (MySQL, Redis, Mailpit)
#
# Environments:
#   dev         - Development environment (default)
#   prod        - Production environment
#
# Options:
#   --build     - Force rebuild images
#   --no-cache  - Build without cache
#   --clean     - Remove volumes and start fresh (WARNING: destroys data)
#   --tools     - Include admin tools (phpMyAdmin, Redis Commander)
#   --down      - Stop and remove containers
#   --logs      - Follow logs after deployment
#   --help      - Show this help message
#
# Examples:
#   ./deploy.sh full-stack dev                  # Full development deployment
#   ./deploy.sh apps-only prod                  # Deploy apps only (production)
#   ./deploy.sh full-stack dev --tools          # Full deployment with admin tools
#   ./deploy.sh full-stack prod --build         # Production with rebuild
#   ./deploy.sh full-stack dev --clean          # Fresh install (WARNING: destroys data)
#   ./deploy.sh --down                          # Stop all services
# ================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default values
PROFILE="full-stack"
ENV="dev"
BUILD_FLAG=""
NO_CACHE=""
CLEAN=false
TOOLS=false
DOWN=false
FOLLOW_LOGS=false

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "========================================================"
    echo "   TernantApp - Dynamic Deployment System"
    echo "========================================================"
    echo -e "${NC}"
}

# Print help
print_help() {
    cat << 'EOF'
TernantApp Dynamic Deployment Script

Usage:
  ./deploy.sh [profile] [environment] [options]

Profiles:
  full-stack   Deploy ALL services (MySQL, Redis, Mailpit, Backend, Frontend)
  apps-only    Deploy ONLY applications (assumes external MySQL/Redis are running)
  infra        Deploy ONLY infrastructure (MySQL, Redis, Mailpit)

Environments:
  dev          Development environment (default) - uses .env
  prod         Production environment - uses .env.production

Options:
  --build      Force rebuild Docker images
  --no-cache   Build images without using cache
  --clean      Remove volumes and start fresh (WARNING: destroys ALL data!)
  --tools      Include admin tools (phpMyAdmin, Redis Commander)
  --down       Stop and remove all containers
  --logs       Follow logs after deployment
  --help       Show this help message

Examples:
  # Full deployment for development
  ./deploy.sh full-stack dev

  # Deploy only apps (external MySQL/Redis)
  ./deploy.sh apps-only prod

  # Full deployment with admin tools
  ./deploy.sh full-stack dev --tools

  # Production deployment with forced rebuild
  ./deploy.sh full-stack prod --build --no-cache

  # Fresh install (removes all data)
  ./deploy.sh full-stack dev --clean

  # Stop all services
  ./deploy.sh --down

Requirements for apps-only profile:
  - DB_HOST: External MySQL host (e.g., your-mysql-server.com)
  - REDIS_HOST: External Redis host (e.g., your-redis-server.com)
  - Ensure these are configured in your .env file

EOF
}

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            full-stack|apps-only|infra)
                PROFILE="$1"
                shift
                ;;
            dev|prod)
                ENV="$1"
                shift
                ;;
            --build)
                BUILD_FLAG="--build"
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
            --tools)
                TOOLS=true
                shift
                ;;
            --down)
                DOWN=true
                shift
                ;;
            --logs)
                FOLLOW_LOGS=true
                shift
                ;;
            --help|-h)
                print_help
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                print_help
                exit 1
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        exit 1
    fi

    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}Error: Docker Compose is not installed${NC}"
        exit 1
    fi

    # Check Docker daemon is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}Error: Docker daemon is not running${NC}"
        exit 1
    fi

    echo -e "${GREEN}Prerequisites check passed${NC}"
}

# Load environment file
load_env() {
    local env_file=".env"

    if [[ "$ENV" == "prod" ]]; then
        env_file=".env.production"
    fi

    if [[ ! -f "$env_file" ]]; then
        echo -e "${YELLOW}Warning: $env_file not found, using defaults${NC}"

        if [[ "$ENV" == "prod" ]]; then
            echo -e "${RED}Error: Production environment requires .env.production${NC}"
            echo -e "Create it by copying: cp .env.production.example .env.production"
            exit 1
        fi
    else
        echo -e "${GREEN}Using environment file: $env_file${NC}"
        # Export env file for docker compose
        export COMPOSE_ENV_FILE="$env_file"
    fi
}

# Validate apps-only profile
validate_apps_only() {
    if [[ "$PROFILE" == "apps-only" ]]; then
        echo -e "${BLUE}Validating external service configuration...${NC}"

        # Source env file
        local env_file=".env"
        [[ "$ENV" == "prod" ]] && env_file=".env.production"

        if [[ -f "$env_file" ]]; then
            source "$env_file"
        fi

        # Check if DB_HOST is set to something other than mysql (docker service)
        if [[ "${DB_HOST:-mysql}" == "mysql" ]]; then
            echo -e "${YELLOW}Warning: DB_HOST is set to 'mysql' (Docker service name)${NC}"
            echo -e "${YELLOW}For apps-only profile, set DB_HOST to your external MySQL server${NC}"
            read -p "Continue anyway? [y/N] " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi

        # Check if REDIS_HOST is set to something other than redis (docker service)
        if [[ "${REDIS_HOST:-redis}" == "redis" ]]; then
            echo -e "${YELLOW}Warning: REDIS_HOST is set to 'redis' (Docker service name)${NC}"
            echo -e "${YELLOW}For apps-only profile, set REDIS_HOST to your external Redis server${NC}"
            read -p "Continue anyway? [y/N] " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi

        echo -e "${GREEN}External service configuration validated${NC}"
    fi
}

# Build compose command
build_compose_cmd() {
    local cmd="docker compose"

    # Add env file
    local env_file=".env"
    [[ "$ENV" == "prod" ]] && env_file=".env.production"

    if [[ -f "$env_file" ]]; then
        cmd="$cmd --env-file $env_file"
    fi

    # Add compose files
    cmd="$cmd -f docker-compose.yml"

    if [[ "$ENV" == "prod" ]]; then
        cmd="$cmd -f docker-compose.prod.yml"
    fi

    # Add profile
    cmd="$cmd --profile $PROFILE"

    # Add tools profile if requested
    if [[ "$TOOLS" == true ]]; then
        cmd="$cmd --profile tools"
    fi

    echo "$cmd"
}

# Stop services
stop_services() {
    echo -e "${BLUE}Stopping services...${NC}"

    local cmd=$(build_compose_cmd)

    $cmd down --remove-orphans

    echo -e "${GREEN}Services stopped${NC}"
}

# Clean volumes
clean_volumes() {
    echo -e "${RED}WARNING: This will delete ALL data including databases!${NC}"
    read -p "Are you sure you want to continue? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted"
        exit 1
    fi

    echo -e "${BLUE}Removing volumes...${NC}"

    local cmd=$(build_compose_cmd)

    $cmd down -v --remove-orphans

    echo -e "${GREEN}Volumes removed${NC}"
}

# Deploy services
deploy_services() {
    echo -e "${BLUE}Deploying services with profile: ${CYAN}$PROFILE${NC}"
    echo -e "${BLUE}Environment: ${CYAN}$ENV${NC}"

    local cmd=$(build_compose_cmd)

    # Build command
    local up_cmd="$cmd up -d"

    if [[ -n "$BUILD_FLAG" ]]; then
        up_cmd="$up_cmd $BUILD_FLAG"
    fi

    if [[ -n "$NO_CACHE" ]]; then
        echo -e "${BLUE}Building images without cache...${NC}"
        $cmd build $NO_CACHE
    fi

    echo -e "${BLUE}Starting services...${NC}"
    $up_cmd

    echo -e "${GREEN}Services deployed successfully!${NC}"
}

# Wait for services to be healthy
wait_for_health() {
    echo -e "${BLUE}Waiting for services to be healthy...${NC}"

    local max_wait=120
    local wait_time=0
    local interval=5

    while [[ $wait_time -lt $max_wait ]]; do
        local all_healthy=true

        # Check backend
        if docker ps --filter "name=apartment-backend" --filter "health=healthy" | grep -q apartment-backend; then
            echo -e "${GREEN}Backend: healthy${NC}"
        elif docker ps --filter "name=apartment-backend" | grep -q apartment-backend; then
            echo -e "${YELLOW}Backend: starting...${NC}"
            all_healthy=false
        fi

        # Check frontend
        if docker ps --filter "name=apartment-frontend" --filter "health=healthy" | grep -q apartment-frontend; then
            echo -e "${GREEN}Frontend: healthy${NC}"
        elif docker ps --filter "name=apartment-frontend" | grep -q apartment-frontend; then
            echo -e "${YELLOW}Frontend: starting...${NC}"
            all_healthy=false
        fi

        # Check MySQL (only for full-stack/infra)
        if [[ "$PROFILE" != "apps-only" ]]; then
            if docker ps --filter "name=apartment-mysql" --filter "health=healthy" | grep -q apartment-mysql; then
                echo -e "${GREEN}MySQL: healthy${NC}"
            elif docker ps --filter "name=apartment-mysql" | grep -q apartment-mysql; then
                echo -e "${YELLOW}MySQL: starting...${NC}"
                all_healthy=false
            fi

            # Check Redis
            if docker ps --filter "name=apartment-redis" --filter "health=healthy" | grep -q apartment-redis; then
                echo -e "${GREEN}Redis: healthy${NC}"
            elif docker ps --filter "name=apartment-redis" | grep -q apartment-redis; then
                echo -e "${YELLOW}Redis: starting...${NC}"
                all_healthy=false
            fi
        fi

        if [[ "$all_healthy" == true ]]; then
            echo -e "${GREEN}All services are healthy!${NC}"
            return 0
        fi

        sleep $interval
        wait_time=$((wait_time + interval))
    done

    echo -e "${YELLOW}Warning: Some services may still be starting${NC}"
    return 0
}

# Print deployment summary
print_summary() {
    echo ""
    echo -e "${CYAN}========================================================"
    echo "   Deployment Summary"
    echo "========================================================${NC}"
    echo ""
    echo -e "${GREEN}Profile:${NC}     $PROFILE"
    echo -e "${GREEN}Environment:${NC} $ENV"
    echo ""

    echo -e "${BLUE}Running Services:${NC}"
    docker ps --filter "name=apartment-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true

    echo ""
    echo -e "${CYAN}Access URLs:${NC}"

    if [[ "$PROFILE" != "infra" ]]; then
        echo -e "  Frontend:       ${GREEN}http://localhost:${FRONTEND_PORT:-3001}${NC}"
        echo -e "  Backend API:    ${GREEN}http://localhost:${BACKEND_PORT:-3000}/api/v1${NC}"
        echo -e "  API Docs:       ${GREEN}http://localhost:${BACKEND_PORT:-3000}/api/docs${NC}"
        echo -e "  Health Check:   ${GREEN}http://localhost:${BACKEND_PORT:-3000}/api/v1/health${NC}"
    fi

    if [[ "$PROFILE" != "apps-only" ]]; then
        echo -e "  Mailpit UI:     ${GREEN}http://localhost:${MAILPIT_UI_PORT:-8025}${NC}"
    fi

    if [[ "$TOOLS" == true ]]; then
        echo -e "  phpMyAdmin:     ${GREEN}http://localhost:${PHPMYADMIN_PORT:-8082}${NC}"
        echo -e "  Redis Commander:${GREEN}http://localhost:${REDIS_COMMANDER_PORT:-8081}${NC}"
    fi

    echo ""
    echo -e "${CYAN}Useful Commands:${NC}"
    echo -e "  View logs:      ${YELLOW}docker compose --profile $PROFILE logs -f${NC}"
    echo -e "  Stop services:  ${YELLOW}./deploy.sh --down${NC}"
    echo -e "  Restart:        ${YELLOW}./deploy.sh $PROFILE $ENV${NC}"
    echo ""
}

# Follow logs
follow_logs() {
    echo -e "${BLUE}Following logs (Ctrl+C to exit)...${NC}"

    local cmd=$(build_compose_cmd)
    $cmd logs -f
}

# Main execution
main() {
    print_banner
    parse_args "$@"

    # Handle --down flag
    if [[ "$DOWN" == true ]]; then
        stop_services
        exit 0
    fi

    check_prerequisites
    load_env

    # Handle clean flag
    if [[ "$CLEAN" == true ]]; then
        clean_volumes
    fi

    validate_apps_only
    deploy_services
    wait_for_health
    print_summary

    # Follow logs if requested
    if [[ "$FOLLOW_LOGS" == true ]]; then
        follow_logs
    fi
}

# Run main
main "$@"
