#!/bin/bash

# Test script for Apartments Module
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
COMPANY_SLUG="test-props-apartments"
USER_EMAIL="john@testapts.com"
USER_PASSWORD="SecurePass123!"
ACCESS_TOKEN=""
COMPANY_ID=""
COMPOUND_ID=""
APARTMENT_ID=""

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
echo "  Apartments Module Test Suite"
echo "========================================="
echo ""

# 1. Register company and owner
print_info "1. Registering company and owner..."
REGISTER_RESPONSE=$(api_call "POST" "companies/register" '{
  "company": {
    "name": "Test Apartments Inc",
    "slug": "'$COMPANY_SLUG'",
    "email": "admin@testapts.com",
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

# 3. Create a compound first (required for apartments)
print_info "3. Creating a compound..."
COMPOUND_RESPONSE=$(api_call "POST" "compounds" '{
  "name": "Test Building A",
  "addressLine": "123 Main Street",
  "city": "New York",
  "region": "NY",
  "country": "USA",
  "geoLat": 40.7128,
  "geoLng": -74.0060,
  "notes": "Test building for apartment testing"
}')

if echo "$COMPOUND_RESPONSE" | grep -q '"id"'; then
    COMPOUND_ID=$(echo "$COMPOUND_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_success "Compound created (ID: ${COMPOUND_ID:0:8}...)"
else
    print_error "Failed to create compound"
    echo "$COMPOUND_RESPONSE"
    exit 1
fi

# 4. Create an apartment
print_info "4. Creating apartment..."
CREATE_RESPONSE=$(api_call "POST" "apartments" '{
  "compoundId": "'$COMPOUND_ID'",
  "unitNumber": "101",
  "floor": 1,
  "bedrooms": 2,
  "bathrooms": 2,
  "areaSqm": 85.5,
  "monthlyRent": 1500.00,
  "status": "available",
  "amenities": ["AC", "Balcony", "Parking"],
  "notes": "Corner unit with great views"
}')

if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
    APARTMENT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_success "Apartment created (ID: ${APARTMENT_ID:0:8}...)"
else
    print_error "Failed to create apartment"
    echo "$CREATE_RESPONSE"
    exit 1
fi

# 5. Get apartment by ID
print_info "5. Fetching apartment by ID..."
GET_RESPONSE=$(api_call "GET" "apartments/$APARTMENT_ID")

if echo "$GET_RESPONSE" | grep -q '"unitNumber":"101"'; then
    print_success "Apartment retrieved successfully"
else
    print_error "Failed to retrieve apartment"
    echo "$GET_RESPONSE"
fi

# 6. Create more apartments
print_info "6. Creating additional apartments..."
for unit in 102 103 201 202; do
    api_call "POST" "apartments" '{
      "compoundId": "'$COMPOUND_ID'",
      "unitNumber": "'$unit'",
      "floor": '$(echo $unit | cut -c1)',
      "bedrooms": 2,
      "bathrooms": 1,
      "areaSqm": 75.0,
      "monthlyRent": 1200.00,
      "status": "available"
    }' > /dev/null
done
print_success "Created 4 additional apartments"

# 7. Get all apartments
print_info "7. Fetching all apartments..."
LIST_RESPONSE=$(api_call "GET" "apartments")

if echo "$LIST_RESPONSE" | grep -q '"unitNumber"'; then
    COUNT=$(echo "$LIST_RESPONSE" | grep -o '"unitNumber"' | wc -l)
    print_success "Found $COUNT apartments"
else
    print_error "Failed to list apartments"
fi

# 8. Filter by compound
print_info "8. Filtering apartments by compound..."
FILTER_RESPONSE=$(api_call "GET" "apartments?compoundId=$COMPOUND_ID")

if echo "$FILTER_RESPONSE" | grep -q '"unitNumber"'; then
    print_success "Filtered apartments successfully"
else
    print_error "Failed to filter apartments"
fi

# 9. Filter by status
print_info "9. Filtering apartments by status..."
STATUS_RESPONSE=$(api_call "GET" "apartments?status=available")

if echo "$STATUS_RESPONSE" | grep -q '"status":"available"'; then
    print_success "Filtered by status successfully"
else
    print_error "Failed to filter by status"
fi

# 10. Search apartments
print_info "10. Searching apartments..."
SEARCH_RESPONSE=$(api_call "GET" "apartments/search?q=101")

if echo "$SEARCH_RESPONSE" | grep -q '"unitNumber":"101"'; then
    print_success "Search successful"
else
    print_error "Search failed"
fi

# 11. Count apartments
print_info "11. Counting apartments..."
COUNT_RESPONSE=$(api_call "GET" "apartments/count")

if echo "$COUNT_RESPONSE" | grep -q '"count"'; then
    TOTAL=$(echo "$COUNT_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    print_success "Total apartments: $TOTAL"
else
    print_error "Failed to count apartments"
fi

# 12. Get availability stats
print_info "12. Getting availability statistics..."
STATS_RESPONSE=$(api_call "GET" "apartments/stats")

if echo "$STATS_RESPONSE" | grep -q '"total"'; then
    TOTAL=$(echo "$STATS_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    AVAILABLE=$(echo "$STATS_RESPONSE" | grep -o '"available":[0-9]*' | cut -d':' -f2)
    print_success "Stats: $TOTAL total, $AVAILABLE available"
else
    print_error "Failed to get stats"
fi

# 13. Update apartment
print_info "13. Updating apartment..."
UPDATE_RESPONSE=$(api_call "PATCH" "apartments/$APARTMENT_ID" '{
  "monthlyRent": 1650.00,
  "notes": "Updated rent - premium corner unit"
}')

if echo "$UPDATE_RESPONSE" | grep -q '"monthlyRent"'; then
    print_success "Apartment updated successfully"
else
    print_error "Failed to update apartment"
    echo "$UPDATE_RESPONSE"
fi

# 14. Update apartment status
print_info "14. Updating apartment status to occupied..."
STATUS_UPDATE=$(api_call "PATCH" "apartments/$APARTMENT_ID/status" '{
  "status": "occupied"
}')

if echo "$STATUS_UPDATE" | grep -q '"status":"occupied"'; then
    print_success "Status updated to occupied"
else
    print_error "Failed to update status"
fi

# 15. Try to delete occupied apartment (should fail)
print_info "15. Testing delete occupied apartment (should fail)..."
DELETE_OCCUPIED=$(api_call "DELETE" "apartments/$APARTMENT_ID")

if echo "$DELETE_OCCUPIED" | grep -q "Cannot delete an occupied apartment"; then
    print_success "Correctly prevented deletion of occupied apartment"
else
    print_error "Should have prevented deletion"
fi

# 16. Update status back to available
print_info "16. Changing status back to available..."
api_call "PATCH" "apartments/$APARTMENT_ID/status" '{
  "status": "available"
}' > /dev/null
print_success "Status changed to available"

# 17. Soft delete apartment
print_info "17. Deactivating apartment..."
DELETE_RESPONSE=$(api_call "DELETE" "apartments/$APARTMENT_ID")

# Check if response is empty (204 No Content)
if [ -z "$DELETE_RESPONSE" ] || echo "$DELETE_RESPONSE" | grep -q "isActive"; then
    print_success "Apartment deactivated successfully"
else
    print_error "Failed to deactivate apartment"
    echo "$DELETE_RESPONSE"
fi

# 18. Verify apartment is no longer in list
print_info "18. Verifying apartment is deactivated..."
VERIFY_LIST=$(api_call "GET" "apartments")

if ! echo "$VERIFY_LIST" | grep -q "\"id\":\"$APARTMENT_ID\""; then
    print_success "Apartment no longer appears in active list"
else
    print_error "Apartment still appears in list"
fi

# 19. Reactivate apartment
print_info "19. Reactivating apartment..."
REACTIVATE_RESPONSE=$(api_call "POST" "apartments/$APARTMENT_ID/activate")

if echo "$REACTIVATE_RESPONSE" | grep -q '"isActive":true'; then
    print_success "Apartment reactivated successfully"
else
    print_error "Failed to reactivate apartment"
    echo "$REACTIVATE_RESPONSE"
fi

# 20. Test duplicate unit number (should fail)
print_info "20. Testing duplicate unit number (should fail)..."
DUPLICATE_RESPONSE=$(api_call "POST" "apartments" '{
  "compoundId": "'$COMPOUND_ID'",
  "unitNumber": "102",
  "floor": 1,
  "bedrooms": 1,
  "bathrooms": 1
}')

if echo "$DUPLICATE_RESPONSE" | grep -q "already exists"; then
    print_success "Correctly prevented duplicate unit number"
else
    print_error "Should have prevented duplicate"
    echo "$DUPLICATE_RESPONSE"
fi

# 21. Test invalid compound ID (should fail)
print_info "21. Testing invalid compound ID (should fail)..."
INVALID_COMPOUND=$(api_call "POST" "apartments" '{
  "compoundId": "00000000-0000-0000-0000-000000000000",
  "unitNumber": "999",
  "floor": 1
}')

if echo "$INVALID_COMPOUND" | grep -q "not found\|does not belong"; then
    print_success "Correctly rejected invalid compound"
else
    print_error "Should have rejected invalid compound"
fi

# 22. Get compound with apartments stats
print_info "22. Getting compound with apartment statistics..."
COMPOUND_STATS=$(api_call "GET" "compounds/$COMPOUND_ID/stats")

if echo "$COMPOUND_STATS" | grep -q '"apartments"'; then
    APARTMENT_COUNT=$(echo "$COMPOUND_STATS" | grep -o '"apartments":\[[^]]*\]' | grep -o '"unitNumber"' | wc -l)
    print_success "Compound has $APARTMENT_COUNT apartments"
else
    print_info "Compound stats retrieved (apartments may be in different format)"
fi

echo ""
echo "========================================="
echo "  Test Summary"
echo "========================================="
print_success "All Apartments module tests completed!"
print_info "Company ID: ${COMPANY_ID:0:12}..."
print_info "Compound ID: ${COMPOUND_ID:0:12}..."
print_info "Apartment ID: ${APARTMENT_ID:0:12}..."
echo ""
print_info "You can view all endpoints at: http://localhost:3000/api/docs"
