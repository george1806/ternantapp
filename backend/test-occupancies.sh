#!/bin/bash

# Test script for Occupancies Module
# Author: george1806

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API base URL
BASE_URL="http://localhost:3000/api"
VERSION="v1"

# Test variables
TIMESTAMP=$(date +%s)
COMPANY_SLUG="test-occupancies-$TIMESTAMP"
USER_EMAIL="john$TIMESTAMP@testoccupancies.com"
USER_PASSWORD="SecurePass123!"
ACCESS_TOKEN=""
COMPANY_ID=""
COMPOUND_ID=""
APARTMENT_ID=""
TENANT_ID=""
OCCUPANCY_ID=""

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=""

    if [ -n "$ACCESS_TOKEN" ]; then
        auth_header="-H \"Authorization: Bearer $ACCESS_TOKEN\""
    fi

    if [ -n "$data" ]; then
        eval curl -s -X "$method" "$BASE_URL/$VERSION/$endpoint" \
            -H \"Content-Type: application/json\" \
            $auth_header \
            -d "'$data'"
    else
        eval curl -s -X "$method" "$BASE_URL/$VERSION/$endpoint" \
            -H \"Content-Type: application/json\" \
            $auth_header
    fi
}

echo "========================================="
echo "  Occupancies Module Test Suite"
echo "========================================="
echo ""

# 1. Register company and owner
print_info "1. Registering company and owner..."
REGISTER_RESPONSE=$(api_call "POST" "companies/register" '{
  "company": {
    "name": "Test Occupancies Inc",
    "slug": "'"$COMPANY_SLUG"'",
    "email": "admin@testoccupancies.com",
    "phone": "+1234567890",
    "currency": "USD",
    "timezone": "America/New_York"
  },
  "owner": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "'"$USER_EMAIL"'",
    "password": "'"$USER_PASSWORD"'",
    "phone": "+1234567890"
  }
}')

if echo "$REGISTER_RESPONSE" | grep -q "company"; then
    COMPANY_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Company registered successfully (ID: ${COMPANY_ID:0:8}...)"
else
    print_error "Failed to register company"
    echo "$REGISTER_RESPONSE"
    exit 1
fi

# 2. Login
print_info "2. Logging in..."
LOGIN_RESPONSE=$(api_call "POST" "auth/login" '{
  "email": "'"$USER_EMAIL"'",
  "password": "'"$USER_PASSWORD"'"
}')

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    print_success "Login successful"
else
    print_error "Login failed"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

# 3. Create a compound
print_info "3. Creating compound..."
COMPOUND_RESPONSE=$(api_call "POST" "compounds" '{
  "name": "Test Compound",
  "addressLine": "123 Test St",
  "city": "New York",
  "region": "NY",
  "country": "USA",
  "notes": "Test compound for occupancies"
}')

if echo "$COMPOUND_RESPONSE" | grep -q '"id"'; then
    COMPOUND_ID=$(echo "$COMPOUND_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Compound created (ID: ${COMPOUND_ID:0:8}...)"
else
    print_error "Failed to create compound"
    echo "$COMPOUND_RESPONSE"
    exit 1
fi

# 4. Create an apartment
print_info "4. Creating apartment..."
APARTMENT_RESPONSE=$(api_call "POST" "apartments" '{
  "compoundId": "'"$COMPOUND_ID"'",
  "unitNumber": "A101",
  "floor": 1,
  "bedrooms": 2,
  "bathrooms": 2,
  "areaSqm": 85.5,
  "monthlyRent": 1500.00,
  "status": "available"
}')

if echo "$APARTMENT_RESPONSE" | grep -q '"id"'; then
    APARTMENT_ID=$(echo "$APARTMENT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Apartment created (ID: ${APARTMENT_ID:0:8}...)"
else
    print_error "Failed to create apartment"
    echo "$APARTMENT_RESPONSE"
    exit 1
fi

# 5. Create a tenant
print_info "5. Creating tenant..."
TENANT_RESPONSE=$(api_call "POST" "tenants" '{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice.johnson@example.com",
  "phone": "+15551234567",
  "monthlyIncome": 5000.00,
  "status": "active"
}')

if echo "$TENANT_RESPONSE" | grep -q '"id"'; then
    TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Tenant created (ID: ${TENANT_ID:0:8}...)"
else
    print_error "Failed to create tenant"
    echo "$TENANT_RESPONSE"
    exit 1
fi

# 6. Create an occupancy (lease)
print_info "6. Creating occupancy..."
CREATE_RESPONSE=$(api_call "POST" "occupancies" '{
  "tenantId": "'"$TENANT_ID"'",
  "apartmentId": "'"$APARTMENT_ID"'",
  "leaseStartDate": "2024-01-01",
  "leaseEndDate": "2024-12-31",
  "monthlyRent": 1500.00,
  "securityDeposit": 3000.00,
  "depositPaid": 1500.00,
  "moveInDate": "2024-01-01",
  "status": "active",
  "notes": "First occupancy for testing"
}')

if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
    OCCUPANCY_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Occupancy created (ID: ${OCCUPANCY_ID:0:8}...)"
else
    print_error "Failed to create occupancy"
    echo "$CREATE_RESPONSE"
    exit 1
fi

# 7. Get occupancy by ID
print_info "7. Fetching occupancy by ID..."
GET_RESPONSE=$(api_call "GET" "occupancies/$OCCUPANCY_ID")

if echo "$GET_RESPONSE" | grep -q '"tenant"'; then
    print_success "Occupancy retrieved with tenant and apartment details"
else
    print_error "Failed to retrieve occupancy"
    echo "$GET_RESPONSE"
fi

# 8. Get all occupancies
print_info "8. Fetching all occupancies..."
LIST_RESPONSE=$(api_call "GET" "occupancies")

if echo "$LIST_RESPONSE" | grep -q '"id"'; then
    COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)
    print_success "Found $COUNT occupancy(ies)"
else
    print_error "Failed to list occupancies"
fi

# 9. Get active occupancies
print_info "9. Fetching active occupancies..."
ACTIVE_RESPONSE=$(api_call "GET" "occupancies/active")

if echo "$ACTIVE_RESPONSE" | grep -q '"status":"active"' || echo "$ACTIVE_RESPONSE" | grep -q "\[\]"; then
    print_success "Active occupancies retrieved"
else
    print_error "Failed to get active occupancies"
fi

# 10. Get occupancies by tenant
print_info "10. Fetching occupancies by tenant..."
BY_TENANT=$(api_call "GET" "occupancies/tenant/$TENANT_ID")

if echo "$BY_TENANT" | grep -q '"tenantId"' || echo "$BY_TENANT" | grep -q "\[\]"; then
    print_success "Tenant occupancies retrieved"
else
    print_error "Failed to get tenant occupancies"
fi

# 11. Get occupancies by apartment
print_info "11. Fetching occupancies by apartment..."
BY_APARTMENT=$(api_call "GET" "occupancies/apartment/$APARTMENT_ID")

if echo "$BY_APARTMENT" | grep -q '"apartmentId"' || echo "$BY_APARTMENT" | grep -q "\[\]"; then
    print_success "Apartment occupancies retrieved"
else
    print_error "Failed to get apartment occupancies"
fi

# 12. Get expiring occupancies
print_info "12. Fetching expiring occupancies (next 365 days)..."
EXPIRING=$(api_call "GET" "occupancies/expiring?days=365")

if echo "$EXPIRING" | grep -q '"id"' || echo "$EXPIRING" | grep -q "\[\]"; then
    print_success "Expiring occupancies retrieved"
else
    print_error "Failed to get expiring occupancies"
fi

# 13. Get occupancy statistics
print_info "13. Getting occupancy statistics..."
STATS_RESPONSE=$(api_call "GET" "occupancies/stats")

if echo "$STATS_RESPONSE" | grep -q '"total"'; then
    TOTAL=$(echo "$STATS_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    ACTIVE=$(echo "$STATS_RESPONSE" | grep -o '"active":[0-9]*' | cut -d':' -f2)
    print_success "Stats: $TOTAL total, $ACTIVE active"
else
    print_error "Failed to get stats"
fi

# 14. Update occupancy
print_info "14. Updating occupancy..."
UPDATE_RESPONSE=$(api_call "PATCH" "occupancies/$OCCUPANCY_ID" '{
  "monthlyRent": 1600.00,
  "notes": "Rent increased after negotiation"
}')

if echo "$UPDATE_RESPONSE" | grep -q '"monthlyRent":1600'; then
    print_success "Occupancy updated successfully"
else
    print_error "Failed to update occupancy"
    echo "$UPDATE_RESPONSE"
fi

# 15. Record deposit payment
print_info "15. Recording deposit payment..."
DEPOSIT_RESPONSE=$(api_call "POST" "occupancies/$OCCUPANCY_ID/deposit-payment" '{
  "amount": 1500.00
}')

if echo "$DEPOSIT_RESPONSE" | grep -q '"depositPaid":3000' || echo "$DEPOSIT_RESPONSE" | grep -q '"depositPaid":"3000"'; then
    print_success "Deposit payment recorded"
else
    print_error "Failed to record deposit payment"
    echo "$DEPOSIT_RESPONSE"
fi

# 16. Update occupancy status
print_info "16. Updating occupancy status..."
STATUS_UPDATE=$(api_call "PATCH" "occupancies/$OCCUPANCY_ID/status" '{
  "status": "ended"
}')

if echo "$STATUS_UPDATE" | grep -q '"status":"ended"'; then
    print_success "Status updated to ended"
else
    print_error "Failed to update status"
    echo "$STATUS_UPDATE"
fi

# 17. Create another tenant for conflict testing
print_info "17. Creating second tenant..."
TENANT2_RESPONSE=$(api_call "POST" "tenants" '{
  "firstName": "Bob",
  "lastName": "Smith",
  "email": "bob.smith@example.com",
  "phone": "+15559876543",
  "monthlyIncome": 4500.00
}')

TENANT2_ID=$(echo "$TENANT2_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
print_success "Second tenant created"

# 18. Test apartment availability conflict
print_info "18. Testing apartment availability conflict..."
CONFLICT_RESPONSE=$(api_call "POST" "occupancies" '{
  "tenantId": "'"$TENANT2_ID"'",
  "apartmentId": "'"$APARTMENT_ID"'",
  "leaseStartDate": "2024-06-01",
  "leaseEndDate": "2024-12-31",
  "monthlyRent": 1500.00,
  "status": "active"
}')

# This should succeed since we ended the previous occupancy
if echo "$CONFLICT_RESPONSE" | grep -q '"id"'; then
    OCCUPANCY2_ID=$(echo "$CONFLICT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Second occupancy created (previous was ended)"
else
    print_info "Conflict detected or other error"
    echo "$CONFLICT_RESPONSE"
fi

# 19. End occupancy with move-out date
if [ -n "$OCCUPANCY2_ID" ]; then
    print_info "19. Ending occupancy with move-out date..."
    END_RESPONSE=$(api_call "POST" "occupancies/$OCCUPANCY2_ID/end" '{
      "moveOutDate": "2024-12-31"
    }')

    if echo "$END_RESPONSE" | grep -q '"status":"ended"'; then
        print_success "Occupancy ended with move-out date"
    else
        print_error "Failed to end occupancy"
    fi
else
    print_info "19. Skipping end occupancy test (no second occupancy)"
fi

# 20. Test date validation (end date before start date)
print_info "20. Testing date validation (should fail)..."
INVALID_DATE=$(api_call "POST" "occupancies" '{
  "tenantId": "'"$TENANT_ID"'",
  "apartmentId": "'"$APARTMENT_ID"'",
  "leaseStartDate": "2024-12-31",
  "leaseEndDate": "2024-01-01",
  "monthlyRent": 1500.00
}')

if echo "$INVALID_DATE" | grep -q "after start date" || echo "$INVALID_DATE" | grep -q "Bad Request"; then
    print_success "Correctly validated date range"
else
    print_error "Should have rejected invalid dates"
fi

# 21. Test filtering by status
print_info "21. Filtering occupancies by status (ended)..."
FILTER_RESPONSE=$(api_call "GET" "occupancies?status=ended")

if echo "$FILTER_RESPONSE" | grep -q '"status":"ended"' || echo "$FILTER_RESPONSE" | grep -q "\[\]"; then
    print_success "Filtered by status successfully"
else
    print_error "Failed to filter by status"
fi

# 22. Test includeInactive parameter
print_info "22. Testing includeInactive parameter..."
INACTIVE_RESPONSE=$(api_call "GET" "occupancies?includeInactive=true")

if echo "$INACTIVE_RESPONSE" | grep -q '"id"' || echo "$INACTIVE_RESPONSE" | grep -q "\[\]"; then
    print_success "Listed occupancies with includeInactive"
else
    print_error "Failed to list with inactive"
fi

echo ""
echo "========================================="
echo "  Test Summary"
echo "========================================="
print_success "All Occupancies module tests completed!"
print_info "Company ID: ${COMPANY_ID:0:12}..."
print_info "Compound ID: ${COMPOUND_ID:0:12}..."
print_info "Apartment ID: ${APARTMENT_ID:0:12}..."
print_info "Tenant ID: ${TENANT_ID:0:12}..."
print_info "Occupancy ID: ${OCCUPANCY_ID:0:12}..."
echo ""
print_info "You can view all endpoints at: http://localhost:3000/api/docs"
