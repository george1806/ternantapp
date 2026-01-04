#!/bin/bash
# ================================================================
# Quick Health Check Script
# ================================================================
# Purpose: Quick health status check for all services
# Usage: ./health-check.sh
# ================================================================

set -e

# ================================
# Color Definitions
# ================================
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ================================
# Helper Functions
# ================================

print_header() {
    echo ""
    echo "=== $1 ==="
    echo ""
}

check_service_health() {
    local container_name=$1
    local service_label=$2
    local check_type=${3:-healthy}

    echo -n "$service_label: "

    if [ "$check_type" = "healthy" ]; then
        if docker ps --filter "name=$container_name" --filter "health=healthy" | grep -q "$container_name" || false; then
            echo -e "${GREEN}✅ Healthy${NC}"
            return 0
        else
            echo -e "${RED}❌ Unhealthy${NC}"
            return 1
        fi
    else
        if docker ps --filter "name=$container_name" | grep -q "$container_name" || false; then
            echo -e "${GREEN}✅ Running${NC}"
            return 0
        else
            echo -e "${RED}❌ Not Running${NC}"
            return 1
        fi
    fi
}

show_detailed_status() {
    echo ""
    echo "=== Detailed Status ==="
    docker ps --filter "name=apartment-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# ================================
# Main Health Check Function
# ================================

check_all_services() {
    print_header "Apartment Management System Health Check"

    check_service_health "apartment-mysql" "MySQL" "healthy"
    check_service_health "apartment-redis" "Redis" "healthy"
    check_service_health "apartment-backend" "Backend" "healthy"
    check_service_health "apartment-frontend" "Frontend" "running"

    show_detailed_status

    echo ""
}

# ================================
# Script Entry Point
# ================================

check_all_services
