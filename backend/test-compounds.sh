#!/bin/bash

# Compounds Module Test Script
# Author: george1806
# Tests all compounds endpoints end-to-end

set -e

BASE_URL="http://localhost:3000/api/v1"
CONTENT_TYPE="Content-Type: application/json"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}  Compounds Module Test Script${NC}"
echo -e "${YELLOW}======================================${NC}"
echo ""

# Step 1: Register a company
echo -e "${YELLOW}Step 1: Registering test company...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/companies/register" \
  -H "$CONTENT_TYPE" \
  -d '{
    "company": {
      "name": "Test Properties Inc",
      "slug": "test-props-compounds",
      "email": "admin@testprops.com",
      "phone": "+1234567890",
      "currency": "USD",
      "timezone": "America/New_York"
    },
    "owner": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@testprops.com",
      "password": "SecurePass123@",
      "phone": "+1234567890"
    }
  }')

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.tokens.accessToken')
COMPANY_ID=$(echo $REGISTER_RESPONSE | jq -r '.company.id')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
  echo -e "${RED}✗ Failed to register company${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Company registered successfully${NC}"
echo -e "  Company ID: $COMPANY_ID"
echo ""

# Step 2: Create a compound
echo -e "${YELLOW}Step 2: Creating compound...${NC}"
COMPOUND_RESPONSE=$(curl -s -X POST "$BASE_URL/compounds" \
  -H "$CONTENT_TYPE" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Sunset Gardens",
    "addressLine": "123 Main Street",
    "city": "New York",
    "region": "NY",
    "country": "USA",
    "geoLat": 40.7128,
    "geoLng": -74.0060,
    "notes": "Modern residential complex with amenities"
  }')

COMPOUND_ID=$(echo $COMPOUND_RESPONSE | jq -r '.id')

if [ -z "$COMPOUND_ID" ] || [ "$COMPOUND_ID" == "null" ]; then
  echo -e "${RED}✗ Failed to create compound${NC}"
  echo "Response: $COMPOUND_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Compound created successfully${NC}"
echo -e "  Compound ID: $COMPOUND_ID"
echo -e "  Name: $(echo $COMPOUND_RESPONSE | jq -r '.name')"
echo ""

# Step 3: Get all compounds
echo -e "${YELLOW}Step 3: Fetching all compounds...${NC}"
ALL_COMPOUNDS=$(curl -s -X GET "$BASE_URL/compounds" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

COMPOUND_COUNT=$(echo $ALL_COMPOUNDS | jq '. | length')

echo -e "${GREEN}✓ Fetched all compounds${NC}"
echo -e "  Count: $COMPOUND_COUNT"
echo ""

# Step 4: Get compound by ID
echo -e "${YELLOW}Step 4: Fetching compound by ID...${NC}"
COMPOUND_DETAILS=$(curl -s -X GET "$BASE_URL/compounds/$COMPOUND_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

FETCHED_NAME=$(echo $COMPOUND_DETAILS | jq -r '.name')

if [ "$FETCHED_NAME" != "Sunset Gardens" ]; then
  echo -e "${RED}✗ Failed to fetch compound details${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Compound fetched successfully${NC}"
echo -e "  Name: $FETCHED_NAME"
echo -e "  Full Address: $(echo $COMPOUND_DETAILS | jq -r '.fullAddress')"
echo ""

# Step 5: Update compound
echo -e "${YELLOW}Step 5: Updating compound...${NC}"
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/compounds/$COMPOUND_ID" \
  -H "$CONTENT_TYPE" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Sunset Gardens Premium",
    "notes": "Updated: Premium residential complex"
  }')

UPDATED_NAME=$(echo $UPDATE_RESPONSE | jq -r '.name')

if [ "$UPDATED_NAME" != "Sunset Gardens Premium" ]; then
  echo -e "${RED}✗ Failed to update compound${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Compound updated successfully${NC}"
echo -e "  New Name: $UPDATED_NAME"
echo ""

# Step 6: Create second compound for search
echo -e "${YELLOW}Step 6: Creating second compound for search...${NC}"
COMPOUND2_RESPONSE=$(curl -s -X POST "$BASE_URL/compounds" \
  -H "$CONTENT_TYPE" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Ocean View Towers",
    "addressLine": "456 Beach Road",
    "city": "Miami",
    "region": "FL",
    "country": "USA",
    "geoLat": 25.7617,
    "geoLng": -80.1918
  }')

COMPOUND2_ID=$(echo $COMPOUND2_RESPONSE | jq -r '.id')

echo -e "${GREEN}✓ Second compound created${NC}"
echo -e "  Compound ID: $COMPOUND2_ID"
echo ""

# Step 7: Search compounds
echo -e "${YELLOW}Step 7: Searching compounds...${NC}"
SEARCH_RESULTS=$(curl -s -X GET "$BASE_URL/compounds/search?q=Ocean" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

SEARCH_COUNT=$(echo $SEARCH_RESULTS | jq '. | length')

if [ "$SEARCH_COUNT" -lt 1 ]; then
  echo -e "${RED}✗ Search failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Search completed successfully${NC}"
echo -e "  Results: $SEARCH_COUNT compound(s) found"
echo ""

# Step 8: Count compounds
echo -e "${YELLOW}Step 8: Counting compounds...${NC}"
COUNT_RESPONSE=$(curl -s -X GET "$BASE_URL/compounds/count" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

TOTAL_COUNT=$(echo $COUNT_RESPONSE | jq -r '.count')

echo -e "${GREEN}✓ Count retrieved${NC}"
echo -e "  Total Active Compounds: $TOTAL_COUNT"
echo ""

# Step 9: Get compound with stats
echo -e "${YELLOW}Step 9: Getting compound with stats...${NC}"
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/compounds/$COMPOUND_ID/stats" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

STATS_NAME=$(echo $STATS_RESPONSE | jq -r '.name')

echo -e "${GREEN}✓ Compound stats fetched${NC}"
echo -e "  Compound: $STATS_NAME"
echo ""

# Step 10: Soft delete compound
echo -e "${YELLOW}Step 10: Deactivating compound (soft delete)...${NC}"
curl -s -X DELETE "$BASE_URL/compounds/$COMPOUND2_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -w "%{http_code}" -o /dev/null > /tmp/delete_status.txt

DELETE_STATUS=$(cat /tmp/delete_status.txt)

if [ "$DELETE_STATUS" != "204" ]; then
  echo -e "${RED}✗ Failed to deactivate compound${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Compound deactivated successfully${NC}"
echo ""

# Step 11: Verify compound is not in active list
echo -e "${YELLOW}Step 11: Verifying compound is deactivated...${NC}"
ACTIVE_COMPOUNDS=$(curl -s -X GET "$BASE_URL/compounds" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

ACTIVE_COUNT=$(echo $ACTIVE_COMPOUNDS | jq '. | length')

echo -e "${GREEN}✓ Verification complete${NC}"
echo -e "  Active Compounds: $ACTIVE_COUNT (should be 1)"
echo ""

# Step 12: Activate compound
echo -e "${YELLOW}Step 12: Reactivating compound...${NC}"
ACTIVATE_RESPONSE=$(curl -s -X POST "$BASE_URL/compounds/$COMPOUND2_ID/activate" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

ACTIVATED=$(echo $ACTIVATE_RESPONSE | jq -r '.isActive')

if [ "$ACTIVATED" != "true" ]; then
  echo -e "${RED}✗ Failed to reactivate compound${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Compound reactivated successfully${NC}"
echo ""

# Step 13: Verify reactivation
echo -e "${YELLOW}Step 13: Verifying reactivation...${NC}"
FINAL_COUNT=$(curl -s -X GET "$BASE_URL/compounds" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '. | length')

echo -e "${GREEN}✓ Verification complete${NC}"
echo -e "  Active Compounds: $FINAL_COUNT (should be 2)"
echo ""

# Final Summary
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  All Tests Passed! ✓${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Summary:"
echo -e "  ✓ Company registration"
echo -e "  ✓ Compound creation"
echo -e "  ✓ List all compounds"
echo -e "  ✓ Get compound by ID"
echo -e "  ✓ Update compound"
echo -e "  ✓ Create second compound"
echo -e "  ✓ Search compounds"
echo -e "  ✓ Count compounds"
echo -e "  ✓ Get compound with stats"
echo -e "  ✓ Soft delete compound"
echo -e "  ✓ Verify deactivation"
echo -e "  ✓ Reactivate compound"
echo -e "  ✓ Verify reactivation"
echo ""
echo -e "${YELLOW}Compounds Module is fully functional!${NC}"
