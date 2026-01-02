#!/bin/bash
# ================================================================
# Master Deployment Script - Deploy All Services
# ================================================================
# Purpose: Orchestrates deployment of all services in correct order
# Services: MySQL → Redis → Backend → Frontend
# Usage: ./deploy-all.sh [prod|dev] [--skip-validation]
# ================================================================

set -e

# ================================
# Color Definitions
# ================================
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# ================================
# Global Variables
# ================================
ENVIRONMENT=${1:-prod}
SKIP_VALIDATION=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE=""

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
    local current=$1
    local total=$2
    local name=$3

    echo ""
    echo -e "${CYAN}========================================"
    echo "Step $current/$total: $name"
    echo "========================================${NC}"
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
# Argument Parsing
# ================================

parse_arguments() {
    for arg in "$@"; do
        case $arg in
            --skip-validation)
                SKIP_VALIDATION=true
                ;;
        esac
    done
}

# ================================
# Validation Functions
# ================================

validate_environment_file() {
    if [ "$ENVIRONMENT" = "prod" ]; then
        ENV_FILE=".env.production"
    else
        ENV_FILE=".env"
    fi

    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file not found: $ENV_FILE"
        echo "Please create it from .env.example"
        exit 1
    fi
}

run_validation_script() {
    if [ "$SKIP_VALIDATION" = true ]; then
        print_warning "Skipping environment validation (--skip-validation flag)"
        return 0
    fi

    print_step 0 4 "Validating Environment"

    if [ -f "$SCRIPT_DIR/01-validate-environment.sh" ]; then
        "$SCRIPT_DIR/01-validate-environment.sh" "$ENVIRONMENT"

        if [ $? -ne 0 ]; then
            print_error "Validation failed. Aborting deployment."
            exit 1
        fi
    else
        print_warning "Validation script not found, skipping..."
    fi
}

# ================================
# Deployment Functions
# ================================

deploy_service() {
    local step_num=$1
    local step_name=$2
    local script_name=$3
    local current_step=$4
    local total_steps=$5

    print_step "$current_step" "$total_steps" "Deploying $step_name"

    if [ ! -f "$SCRIPT_DIR/$script_name" ]; then
        print_error "Script not found: $script_name"
        exit 1
    fi

    if ! "$SCRIPT_DIR/$script_name" "$ENVIRONMENT"; then
        echo ""
        echo -e "${RED}========================================${NC}"
        print_error "Deployment failed at step: $step_name"
        echo -e "${RED}========================================${NC}"
        exit 1
    fi

    return 0
}

pause_between_steps() {
    local current=$1
    local total=$2

    if [ $current -lt $total ]; then
        echo ""
        print_info "Waiting 3 seconds before next step..."
        sleep 3
    fi
}

# ================================
# Summary Functions
# ================================

show_deployment_summary() {
    print_header "Deployment Summary"

    echo ""
    echo "All Services Status:"
    echo "----------------------------------------"
    docker ps --filter "name=apartment-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    echo ""
    echo -e "${GREEN}========================================"
    print_success "All services deployed successfully!"
    echo -e "${GREEN}========================================${NC}"
}

show_next_steps() {
    echo ""
    echo "Next steps:"

    if [ "$ENVIRONMENT" = "prod" ]; then
        echo "1. Create admin user: ./create-default-admin.sh prod"
        echo "2. Configure Nginx reverse proxy (optional)"
        echo "3. Set up SSL certificates with Certbot (optional)"
        echo "4. Configure monitoring stack (optional)"
        echo "5. Test the application"
    else
        echo "1. Create admin user: ./create-default-admin.sh dev"
        echo "2. Access frontend: http://localhost:3001"
        echo "3. Access backend API: http://localhost:3000/api/v1"
        echo "4. Access phpMyAdmin: http://localhost:8082 (if running)"
    fi

    echo ""
}

# ================================
# Main Deployment Function
# ================================

deploy_all_services() {
    # Deployment steps configuration
    local -a steps=(
        "01:MySQL Database:deploy-01-mysql.sh"
        "02:Redis Cache:deploy-02-redis.sh"
        "03:Backend API:deploy-03-backend.sh"
        "04:Frontend App:deploy-04-frontend.sh"
    )

    local total_steps=${#steps[@]}
    local current_step=0

    # Deploy each service
    for step_info in "${steps[@]}"; do
        IFS=':' read -r step_num step_name script_name <<< "$step_info"
        ((current_step++))

        deploy_service "$step_num" "$step_name" "$script_name" "$current_step" "$total_steps"
        pause_between_steps "$current_step" "$total_steps"
    done
}

# ================================
# Main Orchestration Function
# ================================

main() {
    print_header "Apartment Management System - Master Deployment Script"

    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Skip Validation: $SKIP_VALIDATION"
    echo ""

    parse_arguments "$@"
    validate_environment_file
    run_validation_script
    deploy_all_services
    show_deployment_summary
    show_next_steps
}

# ================================
# Script Entry Point
# ================================

main "$@"
