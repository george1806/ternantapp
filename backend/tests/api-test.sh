#!/bin/bash

# =============================================================================
# API ENDPOINT TEST SCRIPT
# =============================================================================
# Complete test suite for all API endpoints
# Author: george1806
# Usage: ./tests/api-test.sh [BASE_URL]
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-http://localhost:3000}"
API_URL="${BASE_URL}/api/v1"
RESULTS_FILE="test-results-$(date +%Y%m%d-%H%M%S).log"
TESTS_PASSED=0
TESTS_FAILED=0

# Test data
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="Test1234!"
TEST_COMPANY="Test Company $(date +%s)"
ACCESS_TOKEN=""
REFRESH_TOKEN=""
COMPANY_ID=""
USER_ID=""
COMPOUND_ID=""
APARTMENT_ID=""
TENANT_ID=""
OCCUPANCY_ID=""
INVOICE_ID=""
PAYMENT_ID=""
REMINDER_ID=""

# =============================================================================
# Helper Functions
# =============================================================================

log() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$RESULTS_FILE"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1" | tee -a "$RESULTS_FILE"
    ((TESTS_PASSED++))
}

error() {
    echo -e "${RED}[FAIL]${NC} $1" | tee -a "$RESULTS_FILE"
    ((TESTS_FAILED++))
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$RESULTS_FILE"
}

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo "" | tee -a "$RESULTS_FILE"
}

make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=$4

    if [ -n "$auth_header" ]; then
        curl -s -X "$method" "${API_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $auth_header" \
            -d "$data"
    else
        curl -s -X "$method" "${API_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data"
    fi
}

extract_field() {
    echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | cut -d'"' -f4
}

extract_id() {
    echo "$1" | grep -o "\"id\":\"[^\"]*\"" | head -1 | cut -d'"' -f4
}

# =============================================================================
# Test Functions
# =============================================================================

test_health_check() {
    print_header "1. HEALTH CHECK TESTS"

    log "Testing API connectivity..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/auth/login")
    if [ "$response" = "400" ] || [ "$response" = "401" ]; then
        success "API is accessible (expected auth error without credentials)"
    else
        warn "API response code: $response (API may not be ready)"
    fi
}

test_auth_register() {
    print_header "2. AUTHENTICATION - REGISTER"

    log "Registering new company: $TEST_COMPANY"
    response=$(make_request POST "/auth/register-company" "{
        \"companyName\": \"$TEST_COMPANY\",
        \"slug\": \"test-$(date +%s)\",
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"firstName\": \"Test\",
        \"lastName\": \"User\"
    }")

    ACCESS_TOKEN=$(extract_field "$response" "accessToken")
    REFRESH_TOKEN=$(extract_field "$response" "refreshToken")
    COMPANY_ID=$(echo "$response" | grep -o "\"companyId\":\"[^\"]*\"" | cut -d'"' -f4)
    USER_ID=$(echo "$response" | grep -o "\"userId\":\"[^\"]*\"" | cut -d'"' -f4)

    if [ -n "$ACCESS_TOKEN" ] && [ -n "$COMPANY_ID" ]; then
        success "Company registration successful"
        log "Company ID: $COMPANY_ID"
        log "User ID: $USER_ID"
    else
        error "Company registration failed: $response"
        exit 1
    fi
}

test_auth_login() {
    print_header "3. AUTHENTICATION - LOGIN"

    log "Testing login with credentials..."
    response=$(make_request POST "/auth/login" "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }")

    login_token=$(extract_field "$response" "accessToken")

    if [ -n "$login_token" ]; then
        success "Login successful"
    else
        error "Login failed: $response"
    fi
}

test_auth_refresh() {
    print_header "4. AUTHENTICATION - REFRESH TOKEN"

    log "Testing token refresh..."
    response=$(make_request POST "/auth/refresh" "{
        \"refreshToken\": \"$REFRESH_TOKEN\"
    }")

    new_token=$(extract_field "$response" "accessToken")

    if [ -n "$new_token" ]; then
        ACCESS_TOKEN="$new_token"
        success "Token refresh successful"
    else
        error "Token refresh failed: $response"
    fi
}

test_companies() {
    print_header "5. COMPANIES MODULE"

    log "Testing GET /companies..."
    response=$(make_request GET "/companies" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "$COMPANY_ID"; then
        success "Get companies successful"
    else
        error "Get companies failed: $response"
    fi

    log "Testing GET /companies/:id..."
    response=$(make_request GET "/companies/$COMPANY_ID" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "$TEST_COMPANY"; then
        success "Get company by ID successful"
    else
        error "Get company by ID failed: $response"
    fi
}

test_users() {
    print_header "6. USERS MODULE"

    log "Testing GET /users..."
    response=$(make_request GET "/users" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "$TEST_EMAIL"; then
        success "Get users successful"
    else
        error "Get users failed: $response"
    fi

    log "Testing GET /users/:id..."
    response=$(make_request GET "/users/$USER_ID" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "$TEST_EMAIL"; then
        success "Get user by ID successful"
    else
        error "Get user by ID failed: $response"
    fi
}

test_compounds_crud() {
    print_header "7. COMPOUNDS MODULE - CRUD"

    log "Testing POST /compounds (Create)..."
    response=$(make_request POST "/compounds" "{
        \"name\": \"Test Compound\",
        \"addressLine\": \"123 Test Street\",
        \"city\": \"Test City\",
        \"country\": \"Test Country\",
        \"region\": \"Test Region\"
    }" "$ACCESS_TOKEN")

    COMPOUND_ID=$(extract_id "$response")

    if [ -n "$COMPOUND_ID" ]; then
        success "Create compound successful - ID: $COMPOUND_ID"
    else
        error "Create compound failed: $response"
        return
    fi

    log "Testing GET /compounds (Read all)..."
    response=$(make_request GET "/compounds" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "$COMPOUND_ID"; then
        success "Get compounds successful"
    else
        error "Get compounds failed"
    fi

    log "Testing GET /compounds/:id (Read one)..."
    response=$(make_request GET "/compounds/$COMPOUND_ID" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "Test Compound"; then
        success "Get compound by ID successful"
    else
        error "Get compound by ID failed"
    fi

    log "Testing PATCH /compounds/:id (Update)..."
    response=$(make_request PATCH "/compounds/$COMPOUND_ID" "{
        \"name\": \"Updated Test Compound\"
    }" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "Updated Test Compound"; then
        success "Update compound successful"
    else
        error "Update compound failed"
    fi
}

test_apartments_crud() {
    print_header "8. APARTMENTS MODULE - CRUD"

    if [ -z "$COMPOUND_ID" ]; then
        error "Cannot test apartments - no compound ID"
        return
    fi

    log "Testing POST /apartments (Create)..."
    response=$(make_request POST "/apartments" "{
        \"compoundId\": \"$COMPOUND_ID\",
        \"unitNumber\": \"101\",
        \"floor\": 1,
        \"bedrooms\": 2,
        \"bathrooms\": 1,
        \"monthlyRent\": 1500,
        \"status\": \"available\"
    }" "$ACCESS_TOKEN")

    APARTMENT_ID=$(extract_id "$response")

    if [ -n "$APARTMENT_ID" ]; then
        success "Create apartment successful - ID: $APARTMENT_ID"
    else
        error "Create apartment failed: $response"
        return
    fi

    log "Testing GET /apartments..."
    response=$(make_request GET "/apartments" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "$APARTMENT_ID"; then
        success "Get apartments successful"
    else
        error "Get apartments failed"
    fi

    log "Testing GET /apartments/:id..."
    response=$(make_request GET "/apartments/$APARTMENT_ID" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "101"; then
        success "Get apartment by ID successful"
    else
        error "Get apartment by ID failed"
    fi

    log "Testing PATCH /apartments/:id..."
    response=$(make_request PATCH "/apartments/$APARTMENT_ID" "{
        \"monthlyRent\": 1600
    }" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "1600"; then
        success "Update apartment successful"
    else
        error "Update apartment failed"
    fi
}

test_tenants_crud() {
    print_header "9. TENANTS MODULE - CRUD"

    log "Testing POST /tenants (Create)..."
    response=$(make_request POST "/tenants" "{
        \"firstName\": \"John\",
        \"lastName\": \"Doe\",
        \"email\": \"john.doe@example.com\",
        \"phone\": \"+1234567890\",
        \"status\": \"active\"
    }" "$ACCESS_TOKEN")

    TENANT_ID=$(extract_id "$response")

    if [ -n "$TENANT_ID" ]; then
        success "Create tenant successful - ID: $TENANT_ID"
    else
        error "Create tenant failed: $response"
        return
    fi

    log "Testing GET /tenants..."
    response=$(make_request GET "/tenants" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "$TENANT_ID"; then
        success "Get tenants successful"
    else
        error "Get tenants failed"
    fi

    log "Testing GET /tenants/:id..."
    response=$(make_request GET "/tenants/$TENANT_ID" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "john.doe"; then
        success "Get tenant by ID successful"
    else
        error "Get tenant by ID failed"
    fi

    log "Testing PATCH /tenants/:id..."
    response=$(make_request PATCH "/tenants/$TENANT_ID" "{
        \"phone\": \"+9876543210\"
    }" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "9876543210"; then
        success "Update tenant successful"
    else
        error "Update tenant failed"
    fi
}

test_occupancies_crud() {
    print_header "10. OCCUPANCIES MODULE - CRUD"

    if [ -z "$APARTMENT_ID" ] || [ -z "$TENANT_ID" ]; then
        error "Cannot test occupancies - missing apartment or tenant ID"
        return
    fi

    log "Testing POST /occupancies (Create)..."
    response=$(make_request POST "/occupancies" "{
        \"apartmentId\": \"$APARTMENT_ID\",
        \"tenantId\": \"$TENANT_ID\",
        \"startDate\": \"2025-01-01\",
        \"depositAmount\": 3000,
        \"status\": \"active\"
    }" "$ACCESS_TOKEN")

    OCCUPANCY_ID=$(extract_id "$response")

    if [ -n "$OCCUPANCY_ID" ]; then
        success "Create occupancy successful - ID: $OCCUPANCY_ID"
    else
        error "Create occupancy failed: $response"
        return
    fi

    log "Testing GET /occupancies..."
    response=$(make_request GET "/occupancies" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "$OCCUPANCY_ID"; then
        success "Get occupancies successful"
    else
        error "Get occupancies failed"
    fi

    log "Testing GET /occupancies/:id..."
    response=$(make_request GET "/occupancies/$OCCUPANCY_ID" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "active"; then
        success "Get occupancy by ID successful"
    else
        error "Get occupancy by ID failed"
    fi
}

test_invoices_crud() {
    print_header "11. INVOICES MODULE - CRUD"

    if [ -z "$OCCUPANCY_ID" ]; then
        error "Cannot test invoices - no occupancy ID"
        return
    fi

    log "Testing POST /invoices/generate-rent..."
    response=$(make_request POST "/invoices/generate-rent" "{
        \"occupancyId\": \"$OCCUPANCY_ID\",
        \"month\": \"2025-01\",
        \"dueDay\": 5
    }" "$ACCESS_TOKEN")

    INVOICE_ID=$(extract_id "$response")

    if [ -n "$INVOICE_ID" ]; then
        success "Generate invoice successful - ID: $INVOICE_ID"
    else
        error "Generate invoice failed: $response"
        return
    fi

    log "Testing GET /invoices..."
    response=$(make_request GET "/invoices" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "$INVOICE_ID"; then
        success "Get invoices successful"
    else
        error "Get invoices failed"
    fi

    log "Testing GET /invoices/:id..."
    response=$(make_request GET "/invoices/$INVOICE_ID" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "$INVOICE_ID"; then
        success "Get invoice by ID successful"
    else
        error "Get invoice by ID failed"
    fi

    log "Testing GET /invoices/stats..."
    response=$(make_request GET "/invoices/stats" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "total"; then
        success "Get invoice stats successful"
    else
        error "Get invoice stats failed"
    fi
}

test_payments_crud() {
    print_header "12. PAYMENTS MODULE - CRUD"

    if [ -z "$INVOICE_ID" ]; then
        error "Cannot test payments - no invoice ID"
        return
    fi

    log "Testing POST /payments (Create)..."
    response=$(make_request POST "/payments" "{
        \"invoiceId\": \"$INVOICE_ID\",
        \"amount\": 1600,
        \"method\": \"bank\",
        \"reference\": \"TEST-REF-001\",
        \"paidAt\": \"2025-01-05T10:00:00Z\"
    }" "$ACCESS_TOKEN")

    PAYMENT_ID=$(extract_id "$response")

    if [ -n "$PAYMENT_ID" ]; then
        success "Create payment successful - ID: $PAYMENT_ID"
    else
        error "Create payment failed: $response"
        return
    fi

    log "Testing GET /payments..."
    response=$(make_request GET "/payments" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "$PAYMENT_ID"; then
        success "Get payments successful"
    else
        error "Get payments failed"
    fi

    log "Testing GET /payments/:id..."
    response=$(make_request GET "/payments/$PAYMENT_ID" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "TEST-REF-001"; then
        success "Get payment by ID successful"
    else
        error "Get payment by ID failed"
    fi

    log "Testing GET /payments/stats..."
    response=$(make_request GET "/payments/stats" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "total"; then
        success "Get payment stats successful"
    else
        error "Get payment stats failed"
    fi
}

test_reminders_crud() {
    print_header "13. REMINDERS MODULE - CRUD"

    if [ -z "$TENANT_ID" ]; then
        error "Cannot test reminders - no tenant ID"
        return
    fi

    log "Testing POST /reminders (Create)..."
    response=$(make_request POST "/reminders" "{
        \"type\": \"WELCOME\",
        \"tenantId\": \"$TENANT_ID\",
        \"subject\": \"Welcome Test\",
        \"message\": \"Welcome to our property!\",
        \"scheduledFor\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" "$ACCESS_TOKEN")

    REMINDER_ID=$(extract_id "$response")

    if [ -n "$REMINDER_ID" ]; then
        success "Create reminder successful - ID: $REMINDER_ID"
    else
        error "Create reminder failed: $response"
        return
    fi

    log "Testing GET /reminders..."
    response=$(make_request GET "/reminders" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "$REMINDER_ID"; then
        success "Get reminders successful"
    else
        error "Get reminders failed"
    fi

    log "Testing GET /reminders/:id..."
    response=$(make_request GET "/reminders/$REMINDER_ID" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "Welcome Test"; then
        success "Get reminder by ID successful"
    else
        error "Get reminder by ID failed"
    fi
}

test_auth_logout() {
    print_header "14. AUTHENTICATION - LOGOUT"

    log "Testing logout..."
    response=$(make_request POST "/auth/logout" "" "$ACCESS_TOKEN")
    if echo "$response" | grep -q "success\|message"; then
        success "Logout successful"
    else
        warn "Logout response: $response"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  APARTMENT MANAGEMENT API - COMPREHENSIVE TEST SUITE"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "Base URL: $BASE_URL"
    echo "API URL:  $API_URL"
    echo "Results:  $RESULTS_FILE"
    echo ""

    # Run all tests
    test_health_check
    test_auth_register
    test_auth_login
    test_auth_refresh
    test_companies
    test_users
    test_compounds_crud
    test_apartments_crud
    test_tenants_crud
    test_occupancies_crud
    test_invoices_crud
    test_payments_crud
    test_reminders_crud
    test_auth_logout

    # Print summary
    print_header "TEST SUMMARY"
    echo ""
    echo "Total Tests Run: $((TESTS_PASSED + TESTS_FAILED))"
    echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
        echo ""
        exit 0
    else
        echo -e "${RED}✗ SOME TESTS FAILED${NC}"
        echo ""
        exit 1
    fi
}

# Run main function
main
