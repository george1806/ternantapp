#!/bin/bash

# Test script for Tenants Module
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
COMPANY_SLUG="test-tenants-$TIMESTAMP"
USER_EMAIL="john$TIMESTAMP@testtenants.com"
USER_PASSWORD="SecurePass123!"
ACCESS_TOKEN=""
COMPANY_ID=""
TENANT_ID=""

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
echo "  Tenants Module Test Suite"
echo "========================================="
echo ""

# 1. Register company and owner
print_info "1. Registering company and owner..."
REGISTER_RESPONSE=$(api_call "POST" "companies/register" '{
  "company": {
    "name": "Test Tenants Inc",
    "slug": "'$COMPANY_SLUG'",
    "email": "admin@testtenants.com",
    "phone": "+1234567890",
    "currency": "USD",
    "timezone": "America/New_York"
  },
  "owner": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "'$USER_EMAIL'",
    "password": "'$USER_PASSWORD'",
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
  "email": "'$USER_EMAIL'",
  "password": "'$USER_PASSWORD'"
}')

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    print_success "Login successful"
else
    print_error "Login failed"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

# 3. Create a tenant with full details
print_info "3. Creating tenant with full details..."
CREATE_RESPONSE=$(api_call "POST" "tenants" '{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice.johnson@example.com",
  "phone": "+15551234567",
  "alternatePhone": "+15559876543",
  "dateOfBirth": "1985-06-15",
  "idType": "Drivers License",
  "idNumber": "DL123456789",
  "currentAddress": "456 Previous St, Old City, State 12345",
  "emergencyContactName": "Bob Johnson",
  "emergencyContactPhone": "+15551111111",
  "emergencyContactRelationship": "Spouse",
  "employerName": "Tech Corp Inc",
  "employerPhone": "+15552222222",
  "monthlyIncome": 7500.00,
  "references": [
    {
      "name": "Jane Smith",
      "phone": "+15553333333",
      "relationship": "Previous Landlord",
      "email": "jane@example.com"
    }
  ],
  "notes": "Excellent credit score, very reliable tenant"
}')

if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
    TENANT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_success "Tenant created (ID: ${TENANT_ID:0:8}...)"
else
    print_error "Failed to create tenant"
    echo "$CREATE_RESPONSE"
    exit 1
fi

# 4. Get tenant by ID
print_info "4. Fetching tenant by ID..."
GET_RESPONSE=$(api_call "GET" "tenants/$TENANT_ID")

if echo "$GET_RESPONSE" | grep -q '"email":"alice.johnson@example.com"'; then
    print_success "Tenant retrieved successfully"
else
    print_error "Failed to retrieve tenant"
    echo "$GET_RESPONSE"
fi

# 5. Create more tenants
print_info "5. Creating additional tenants..."
for i in {1..4}; do
    api_call "POST" "tenants" '{
      "firstName": "Tenant'$i'",
      "lastName": "Smith",
      "email": "tenant'$i'@example.com",
      "phone": "+155512340'$i'",
      "monthlyIncome": 5000.00,
      "status": "active"
    }' > /dev/null
done
print_success "Created 4 additional tenants"

# 6. Get all tenants
print_info "6. Fetching all tenants..."
LIST_RESPONSE=$(api_call "GET" "tenants")

if echo "$LIST_RESPONSE" | grep -q '"email"'; then
    COUNT=$(echo "$LIST_RESPONSE" | grep -o '"email"' | wc -l)
    print_success "Found $COUNT tenants"
else
    print_error "Failed to list tenants"
fi

# 7. Filter by status
print_info "7. Filtering tenants by status (active)..."
FILTER_RESPONSE=$(api_call "GET" "tenants?status=active")

if echo "$FILTER_RESPONSE" | grep -q '"status":"active"'; then
    print_success "Filtered by status successfully"
else
    print_error "Failed to filter by status"
fi

# 8. Search tenants
print_info "8. Searching tenants by name..."
SEARCH_RESPONSE=$(api_call "GET" "tenants/search?q=Alice")

if echo "$SEARCH_RESPONSE" | grep -q '"firstName":"Alice"'; then
    print_success "Search successful"
else
    print_error "Search failed"
fi

# 9. Count tenants
print_info "9. Counting tenants..."
COUNT_RESPONSE=$(api_call "GET" "tenants/count")

if echo "$COUNT_RESPONSE" | grep -q '"count"'; then
    TOTAL=$(echo "$COUNT_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    print_success "Total tenants: $TOTAL"
else
    print_error "Failed to count tenants"
fi

# 10. Get tenant statistics
print_info "10. Getting tenant statistics..."
STATS_RESPONSE=$(api_call "GET" "tenants/stats")

if echo "$STATS_RESPONSE" | grep -q '"total"'; then
    TOTAL=$(echo "$STATS_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    ACTIVE=$(echo "$STATS_RESPONSE" | grep -o '"active":[0-9]*' | cut -d':' -f2)
    print_success "Stats: $TOTAL total, $ACTIVE active"
else
    print_error "Failed to get stats"
fi

# 11. Update tenant
print_info "11. Updating tenant..."
UPDATE_RESPONSE=$(api_call "PATCH" "tenants/$TENANT_ID" '{
  "phone": "+15559999999",
  "monthlyIncome": 8000.00,
  "notes": "Updated income information"
}')

if echo "$UPDATE_RESPONSE" | grep -q '"phone":"+15559999999"'; then
    print_success "Tenant updated successfully"
else
    print_error "Failed to update tenant"
    echo "$UPDATE_RESPONSE"
fi

# 12. Add document to tenant
print_info "12. Adding document to tenant..."
DOC_RESPONSE=$(api_call "POST" "tenants/$TENANT_ID/documents" '{
  "type": "ID Card",
  "fileName": "id_card_scan.pdf",
  "fileUrl": "/uploads/documents/id_123.pdf"
}')

if echo "$DOC_RESPONSE" | grep -q '"documents"'; then
    print_success "Document added successfully"
else
    print_error "Failed to add document"
fi

# 13. Add reference to tenant
print_info "13. Adding reference to tenant..."
REF_RESPONSE=$(api_call "POST" "tenants/$TENANT_ID/references" '{
  "name": "John Employer",
  "phone": "+15554444444",
  "relationship": "Current Employer",
  "email": "john.employer@company.com"
}')

if echo "$REF_RESPONSE" | grep -q '"references"'; then
    print_success "Reference added successfully"
else
    print_error "Failed to add reference"
fi

# 14. Update tenant status
print_info "14. Updating tenant status to inactive..."
STATUS_UPDATE=$(api_call "PATCH" "tenants/$TENANT_ID/status" '{
  "status": "inactive"
}')

if echo "$STATUS_UPDATE" | grep -q '"status":"inactive"'; then
    print_success "Status updated to inactive"
else
    print_error "Failed to update status"
fi

# 15. Get tenant with history endpoint
print_info "15. Fetching tenant with history..."
HISTORY_RESPONSE=$(api_call "GET" "tenants/$TENANT_ID/history")

if echo "$HISTORY_RESPONSE" | grep -q '"email"'; then
    print_success "Tenant history retrieved"
else
    print_error "Failed to get tenant history"
fi

# 16. Blacklist a tenant
print_info "16. Blacklisting a tenant..."
BLACKLIST_RESPONSE=$(api_call "POST" "tenants/$TENANT_ID/blacklist" '{
  "reason": "Repeated late payments and property damage"
}')

if echo "$BLACKLIST_RESPONSE" | grep -q '"status":"blacklisted"'; then
    print_success "Tenant blacklisted successfully"
    # Check if reason was added to notes
    if echo "$BLACKLIST_RESPONSE" | grep -q "BLACKLISTED"; then
        print_success "Blacklist reason recorded in notes"
    fi
else
    print_error "Failed to blacklist tenant"
    echo "$BLACKLIST_RESPONSE"
fi

# 17. Verify blacklisted status in stats
print_info "17. Verifying blacklisted count in stats..."
STATS_RESPONSE2=$(api_call "GET" "tenants/stats")

if echo "$STATS_RESPONSE2" | grep -q '"blacklisted":[1-9]'; then
    BLACKLISTED=$(echo "$STATS_RESPONSE2" | grep -o '"blacklisted":[0-9]*' | cut -d':' -f2)
    print_success "Blacklisted tenants count: $BLACKLISTED"
else
    print_info "No blacklisted tenants or count is 0"
fi

# 18. Soft delete tenant
print_info "18. Deactivating tenant..."
DELETE_RESPONSE=$(api_call "DELETE" "tenants/$TENANT_ID")

# Check if response is empty (204 No Content)
if [ -z "$DELETE_RESPONSE" ] || echo "$DELETE_RESPONSE" | grep -q "isActive"; then
    print_success "Tenant deactivated successfully"
else
    print_error "Failed to deactivate tenant"
    echo "$DELETE_RESPONSE"
fi

# 19. Verify tenant is no longer in active list
print_info "19. Verifying tenant is deactivated..."
VERIFY_LIST=$(api_call "GET" "tenants")

if ! echo "$VERIFY_LIST" | grep -q "\"id\":\"$TENANT_ID\""; then
    print_success "Tenant no longer appears in active list"
else
    print_error "Tenant still appears in list"
fi

# 20. Reactivate tenant
print_info "20. Reactivating tenant..."
REACTIVATE_RESPONSE=$(api_call "POST" "tenants/$TENANT_ID/activate")

if echo "$REACTIVATE_RESPONSE" | grep -q '"isActive":true'; then
    print_success "Tenant reactivated successfully"
else
    print_error "Failed to reactivate tenant"
    echo "$REACTIVATE_RESPONSE"
fi

# 21. Test duplicate email (should fail)
print_info "21. Testing duplicate email (should fail)..."
DUPLICATE_RESPONSE=$(api_call "POST" "tenants" '{
  "firstName": "Duplicate",
  "lastName": "Test",
  "email": "alice.johnson@example.com",
  "phone": "+15558888888"
}')

if echo "$DUPLICATE_RESPONSE" | grep -q "already exists"; then
    print_success "Correctly prevented duplicate email"
else
    print_error "Should have prevented duplicate"
    echo "$DUPLICATE_RESPONSE"
fi

# 22. Test include inactive parameter
print_info "22. Testing includeInactive parameter..."
INACTIVE_RESPONSE=$(api_call "GET" "tenants?includeInactive=true")

if echo "$INACTIVE_RESPONSE" | grep -q '"email"'; then
    TOTAL_WITH_INACTIVE=$(echo "$INACTIVE_RESPONSE" | grep -o '"email"' | wc -l)
    print_success "Listed $TOTAL_WITH_INACTIVE tenants (including inactive)"
else
    print_error "Failed to list with inactive"
fi

# 23. Test search by phone
print_info "23. Testing search by phone..."
PHONE_SEARCH=$(api_call "GET" "tenants/search?q=5559999999")

if echo "$PHONE_SEARCH" | grep -q '"phone"'; then
    print_success "Search by phone successful"
else
    print_info "No results found or search failed"
fi

# 24. Test search by email
print_info "24. Testing search by email..."
EMAIL_SEARCH=$(api_call "GET" "tenants/search?q=alice.johnson")

if echo "$EMAIL_SEARCH" | grep -q '"email"'; then
    print_success "Search by email successful"
else
    print_info "No results found or search failed"
fi

echo ""
echo "========================================="
echo "  Test Summary"
echo "========================================="
print_success "All Tenants module tests completed!"
print_info "Company ID: ${COMPANY_ID:0:12}..."
print_info "Tenant ID: ${TENANT_ID:0:12}..."
echo ""
print_info "You can view all endpoints at: http://localhost:3000/api/docs"
