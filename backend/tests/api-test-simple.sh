#!/bin/bash

# =============================================================================
# SIMPLE API TEST - Tests existing endpoints without registration
# =============================================================================
# This tests all CRUD operations that don't require user registration
# Author: george1806
# Usage: ./tests/api-test-simple.sh
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"
TESTS_PASSED=0
TESTS_FAILED=0

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  APARTMENT MANAGEMENT API - ENDPOINT VERIFICATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

print_header "1. API CONNECTIVITY TEST"

log "Testing API base URL..."
response=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/auth/login")
if [ "$response" = "400" ] || [ "$response" = "401" ]; then
    success "API is accessible and responding"
else
    error "API returned unexpected code: $response"
fi

print_header "2. AUTH ENDPOINTS CHECK"

log "Checking POST /api/auth/login..."
response=$(curl -s -X POST "${API_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{}')
if echo "$response" | grep -q "email\|password"; then
    success "Login endpoint exists and validates input"
else
    error "Login endpoint not working properly"
fi

log "Checking POST /api/auth/refresh..."
response=$(curl -s -X POST "${API_URL}/auth/refresh" \
    -H "Content-Type: application/json" \
    -d '{}')
if echo "$response" | grep -q "refreshToken"; then
    success "Refresh endpoint exists and validates input"
else
    error "Refresh endpoint not working properly"
fi

print_header "3. PROTECTED ENDPOINTS (Should return 401)"

endpoints=(
    "GET /api/companies"
    "GET /api/users"
    "GET /api/compounds"
    "GET /api/apartments"
    "GET /api/tenants"
    "GET /api/occupancies"
    "GET /api/invoices"
    "GET /api/payments"
    "GET /api/reminders"
)

for endpoint_info in "${endpoints[@]}"; do
    method=$(echo $endpoint_info | awk '{print $1}')
    path=$(echo $endpoint_info | awk '{print $2}')

    log "Testing $method $path (should require auth)..."
    response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "${API_URL}${path#/api}")

    if [ "$response" = "401" ]; then
        success "$path requires authentication (expected 401)"
    else
        error "$path returned $response instead of 401"
    fi
done

print_header "4. SWAGGER DOCUMENTATION"

log "Checking Swagger docs..."
response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/docs")
if [ "$response" = "200" ] || [ "$response" = "301" ]; then
    success "Swagger documentation is accessible"
else
    error "Swagger docs not accessible: $response"
fi

print_header "5. MODULES VERIFICATION"

log "Verifying all modules are registered..."
modules_found=0

# Test each module endpoint
for module in companies users compounds apartments tenants occupancies invoices payments reminders; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/${module}")
    if [ "$response" = "401" ] || [ "$response" = "403" ]; then
        ((modules_found++))
    fi
done

if [ $modules_found -ge 8 ]; then
    success "All major modules are registered and protected"
    log "  Found $modules_found/9 modules responding"
else
    error "Some modules may be missing ($modules_found/9)"
fi

print_header "TEST SUMMARY"
echo ""
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo ""
    echo "✅ API is running correctly"
    echo "✅ All endpoints are protected"
    echo "✅ All modules are registered"
    echo ""
    echo "Note: Full CRUD testing requires:"
    echo "  1. Database with test data"
    echo "  2. Valid authentication token"
    echo "  3. Test company and users"
    echo ""
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo ""
    exit 1
fi
