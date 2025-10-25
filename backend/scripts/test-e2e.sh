#!/bin/bash

# End-to-End Test Suite for TernantApp
# Tests complete application flow from authentication to data management

set -e

BASE_URL="http://localhost:3000/api/v1"
SUPER_ADMIN_EMAIL="superadmin@ternantapp.com"
SUPER_ADMIN_PASSWORD="SuperAdmin@2025"

TESTS_PASSED=0
TESTS_FAILED=0

echo "=========================================="
echo "   TernantApp End-to-End Test Suite"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

log_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Test 1: Super Admin Login
echo "Test 1: Super Admin Authentication"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SUPER_ADMIN_EMAIL\",\"password\":\"$SUPER_ADMIN_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
    log_error "Failed to login as super admin"
    exit 1
else
    log_success "Super admin login successful"
    IS_SUPER_ADMIN=$(echo "$LOGIN_RESPONSE" | jq -r '.user.isSuperAdmin')
    if [ "$IS_SUPER_ADMIN" == "true" ]; then
        log_success "User has super admin privileges"
    else
        log_error "User does not have super admin privileges"
    fi
fi
echo ""

# Test 2: Verify Super Admin Status
echo "Test 2: Verify Super Admin Status via /auth/me"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

IS_SUPER_ADMIN=$(echo "$ME_RESPONSE" | jq -r '.isSuperAdmin')
if [ "$IS_SUPER_ADMIN" == "true" ]; then
    log_success "Auth /me confirms super admin status"
else
    log_error "Auth /me does not confirm super admin status"
fi
echo ""

# Test 3: List All Companies
echo "Test 3: List All Companies"
COMPANIES_LIST=$(curl -s -X GET "$BASE_URL/super-admin/companies?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

TOTAL_COMPANIES=$(echo "$COMPANIES_LIST" | jq -r '.meta.total // 0')
if [ "$TOTAL_COMPANIES" -ge 0 ]; then
    log_success "Retrieved companies list ($TOTAL_COMPANIES companies)"
else
    log_error "Failed to retrieve companies list"
fi
echo ""

# Test 4: Create New Company
echo "Test 4: Create New Company with Owner"
RANDOM_SUFFIX=$((RANDOM % 10000))
NEW_COMPANY=$(curl -s -X POST "$BASE_URL/super-admin/companies" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"E2E Test Company $RANDOM_SUFFIX\",
    \"slug\": \"e2e-test-$RANDOM_SUFFIX\",
    \"email\": \"test-$RANDOM_SUFFIX@e2etest.com\",
    \"phone\": \"+2547000$RANDOM_SUFFIX\",
    \"currency\": \"KES\",
    \"timezone\": \"Africa/Nairobi\",
    \"ownerFirstName\": \"Test\",
    \"ownerLastName\": \"Owner\",
    \"ownerEmail\": \"owner-$RANDOM_SUFFIX@e2etest.com\",
    \"ownerPassword\": \"TestOwner@2025\",
    \"ownerPhone\": \"+2547000$RANDOM_SUFFIX\"
  }")

COMPANY_ID=$(echo "$NEW_COMPANY" | jq -r '.company.id // empty')
OWNER_ID=$(echo "$NEW_COMPANY" | jq -r '.owner.id // empty')

if [ -z "$COMPANY_ID" ] || [ "$COMPANY_ID" == "null" ]; then
    log_error "Failed to create company"
else
    log_success "Company created successfully (ID: ${COMPANY_ID:0:8}...)"
    if [ ! -z "$OWNER_ID" ] && [ "$OWNER_ID" != "null" ]; then
        log_success "Owner account created (ID: ${OWNER_ID:0:8}...)"
    else
        log_error "Owner account not created"
    fi
fi
echo ""

# Test 5: Login as Company Owner
echo "Test 5: Login as Company Owner"
OWNER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"owner-$RANDOM_SUFFIX@e2etest.com\",\"password\":\"TestOwner@2025\"}")

OWNER_TOKEN=$(echo "$OWNER_LOGIN" | jq -r '.tokens.accessToken // empty')
if [ ! -z "$OWNER_TOKEN" ] && [ "$OWNER_TOKEN" != "null" ]; then
    log_success "Owner login successful"
else
    log_error "Owner login failed"
fi
echo ""

# Test 6: Get Company Statistics
echo "Test 6: Get Company Statistics"
COMPANY_STATS=$(curl -s -X GET "$BASE_URL/super-admin/companies/$COMPANY_ID/stats" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

TOTAL_USERS=$(echo "$COMPANY_STATS" | jq -r '.totalUsers // -1')
if [ "$TOTAL_USERS" -ge 0 ]; then
    log_success "Retrieved company statistics (Users: $TOTAL_USERS)"
else
    log_error "Failed to retrieve company statistics"
fi
echo ""

# Test 7: Suspend Company
echo "Test 7: Suspend and Activate Company"
SUSPEND_RESPONSE=$(curl -s -X PATCH "$BASE_URL/super-admin/companies/$COMPANY_ID/suspend" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

IS_ACTIVE=$(echo "$SUSPEND_RESPONSE" | jq -r '.isActive')
if [ "$IS_ACTIVE" == "false" ]; then
    log_success "Company suspended successfully"
else
    log_error "Company suspension failed"
fi

ACTIVATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/super-admin/companies/$COMPANY_ID/activate" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

IS_ACTIVE=$(echo "$ACTIVATE_RESPONSE" | jq -r '.isActive')
if [ "$IS_ACTIVE" == "true" ]; then
    log_success "Company activated successfully"
else
    log_error "Company activation failed"
fi
echo ""

# Summary
echo "=========================================="
echo "           Test Summary"
echo "=========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "=========================================="

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
