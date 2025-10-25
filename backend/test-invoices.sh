#!/bin/bash

# Test script for Invoices Module
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
COMPANY_SLUG="test-invoices-$TIMESTAMP"
USER_EMAIL="john$TIMESTAMP@testinvoices.com"
USER_PASSWORD="SecurePass123!"
ACCESS_TOKEN=""
COMPANY_ID=""
COMPOUND_ID=""
APARTMENT_ID=""
TENANT_ID=""
OCCUPANCY_ID=""
INVOICE_ID=""
INVOICE2_ID=""

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
echo "  Invoices Module Test Suite"
echo "========================================="
echo ""

# 1. Register company and owner
print_info "1. Registering company and owner..."
REGISTER_RESPONSE=$(api_call "POST" "companies/register" '{
  "company": {
    "name": "Test Invoices Inc",
    "slug": "'"$COMPANY_SLUG"'",
    "email": "admin@testinvoices.com",
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
  "notes": "Test compound for invoices"
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

# 6. Create an occupancy (needed for invoice)
print_info "6. Creating occupancy..."
OCCUPANCY_RESPONSE=$(api_call "POST" "occupancies" '{
  "tenantId": "'"$TENANT_ID"'",
  "apartmentId": "'"$APARTMENT_ID"'",
  "leaseStartDate": "2024-01-01",
  "leaseEndDate": "2024-12-31",
  "monthlyRent": 1500.00,
  "securityDeposit": 3000.00,
  "status": "active"
}')

if echo "$OCCUPANCY_RESPONSE" | grep -q '"id"'; then
    OCCUPANCY_ID=$(echo "$OCCUPANCY_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Occupancy created (ID: ${OCCUPANCY_ID:0:8}...)"
else
    print_error "Failed to create occupancy"
    echo "$OCCUPANCY_RESPONSE"
    exit 1
fi

# 7. Create a manual invoice
print_info "7. Creating manual invoice..."
CREATE_RESPONSE=$(api_call "POST" "invoices" '{
  "invoiceNumber": "INV-TEST-001",
  "occupancyId": "'"$OCCUPANCY_ID"'",
  "tenantId": "'"$TENANT_ID"'",
  "invoiceDate": "2024-01-01",
  "dueDate": "2024-01-05",
  "status": "draft",
  "lineItems": [
    {
      "description": "Monthly Rent - January 2024",
      "quantity": 1,
      "unitPrice": 1500.00,
      "amount": 1500.00,
      "type": "rent"
    },
    {
      "description": "Water Bill",
      "quantity": 1,
      "unitPrice": 50.00,
      "amount": 50.00,
      "type": "utility"
    }
  ],
  "subtotal": 1550.00,
  "taxAmount": 0,
  "totalAmount": 1550.00,
  "notes": "First invoice for testing"
}')

if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
    INVOICE_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Invoice created (ID: ${INVOICE_ID:0:8}...)"
else
    print_error "Failed to create invoice"
    echo "$CREATE_RESPONSE"
    exit 1
fi

# 8. Generate rent invoice automatically
print_info "8. Auto-generating rent invoice for February..."
GENERATE_RESPONSE=$(api_call "POST" "invoices/generate-rent" '{
  "occupancyId": "'"$OCCUPANCY_ID"'",
  "month": "2024-02",
  "dueDay": 5
}')

if echo "$GENERATE_RESPONSE" | grep -q '"id"'; then
    INVOICE2_ID=$(echo "$GENERATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Rent invoice auto-generated (ID: ${INVOICE2_ID:0:8}...)"
else
    print_error "Failed to generate rent invoice"
    echo "$GENERATE_RESPONSE"
fi

# 9. Get invoice by ID
print_info "9. Fetching invoice by ID..."
GET_RESPONSE=$(api_call "GET" "invoices/$INVOICE_ID")

if echo "$GET_RESPONSE" | grep -q '"tenant"'; then
    print_success "Invoice retrieved with tenant and occupancy details"
else
    print_error "Failed to retrieve invoice"
    echo "$GET_RESPONSE"
fi

# 10. Get all invoices
print_info "10. Fetching all invoices..."
LIST_RESPONSE=$(api_call "GET" "invoices")

if echo "$LIST_RESPONSE" | grep -q '"id"'; then
    COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)
    print_success "Found $COUNT invoice(s)"
else
    print_error "Failed to list invoices"
fi

# 11. Get invoices by tenant
print_info "11. Fetching invoices by tenant..."
BY_TENANT=$(api_call "GET" "invoices/tenant/$TENANT_ID")

if echo "$BY_TENANT" | grep -q '"tenantId"' || echo "$BY_TENANT" | grep -q "\[\]"; then
    print_success "Tenant invoices retrieved"
else
    print_error "Failed to get tenant invoices"
fi

# 12. Get invoices by occupancy
print_info "12. Fetching invoices by occupancy..."
BY_OCCUPANCY=$(api_call "GET" "invoices/occupancy/$OCCUPANCY_ID")

if echo "$BY_OCCUPANCY" | grep -q '"occupancyId"' || echo "$BY_OCCUPANCY" | grep -q "\[\]"; then
    print_success "Occupancy invoices retrieved"
else
    print_error "Failed to get occupancy invoices"
fi

# 13. Get invoice statistics
print_info "13. Getting invoice statistics..."
STATS_RESPONSE=$(api_call "GET" "invoices/stats")

if echo "$STATS_RESPONSE" | grep -q '"total"'; then
    TOTAL=$(echo "$STATS_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    DRAFT=$(echo "$STATS_RESPONSE" | grep -o '"draft":[0-9]*' | cut -d':' -f2)
    print_success "Stats: $TOTAL total, $DRAFT draft"
else
    print_error "Failed to get stats"
fi

# 14. Update invoice
print_info "14. Updating invoice..."
UPDATE_RESPONSE=$(api_call "PATCH" "invoices/$INVOICE_ID" '{
  "notes": "Updated invoice with additional notes"
}')

if echo "$UPDATE_RESPONSE" | grep -q '"notes":"Updated invoice with additional notes"'; then
    print_success "Invoice updated successfully"
else
    print_error "Failed to update invoice"
    echo "$UPDATE_RESPONSE"
fi

# 15. Mark invoice as sent
print_info "15. Marking invoice as sent..."
SENT_RESPONSE=$(api_call "POST" "invoices/$INVOICE_ID/send")

if echo "$SENT_RESPONSE" | grep -q '"status":"sent"'; then
    print_success "Invoice marked as sent"
else
    print_error "Failed to mark as sent"
    echo "$SENT_RESPONSE"
fi

# 16. Record partial payment
print_info "16. Recording partial payment of 500.00..."
PAYMENT1_RESPONSE=$(api_call "POST" "invoices/$INVOICE_ID/payment" '{
  "amount": 500.00
}')

if echo "$PAYMENT1_RESPONSE" | grep -q '"amountPaid":500' || echo "$PAYMENT1_RESPONSE" | grep -q '"amountPaid":"500"'; then
    print_success "Partial payment recorded"
else
    print_error "Failed to record payment"
    echo "$PAYMENT1_RESPONSE"
fi

# 17. Record full payment
print_info "17. Recording remaining payment of 1050.00..."
PAYMENT2_RESPONSE=$(api_call "POST" "invoices/$INVOICE_ID/payment" '{
  "amount": 1050.00
}')

if echo "$PAYMENT2_RESPONSE" | grep -q '"status":"paid"'; then
    print_success "Full payment recorded, status auto-updated to paid"
else
    print_error "Failed to record full payment"
    echo "$PAYMENT2_RESPONSE"
fi

# 18. Get overdue invoices
print_info "18. Fetching overdue invoices..."
OVERDUE=$(api_call "GET" "invoices/overdue")

if echo "$OVERDUE" | grep -q '"id"' || echo "$OVERDUE" | grep -q "\[\]"; then
    print_success "Overdue invoices retrieved"
else
    print_error "Failed to get overdue invoices"
fi

# 19. Get invoices due soon (next 30 days)
print_info "19. Fetching invoices due soon..."
DUE_SOON=$(api_call "GET" "invoices/due-soon?daysAhead=30")

if echo "$DUE_SOON" | grep -q '"id"' || echo "$DUE_SOON" | grep -q "\[\]"; then
    print_success "Due soon invoices retrieved"
else
    print_error "Failed to get due soon invoices"
fi

# 20. Test duplicate invoice number prevention
print_info "20. Testing duplicate invoice number (should fail)..."
DUPLICATE=$(api_call "POST" "invoices" '{
  "invoiceNumber": "INV-TEST-001",
  "occupancyId": "'"$OCCUPANCY_ID"'",
  "tenantId": "'"$TENANT_ID"'",
  "invoiceDate": "2024-03-01",
  "dueDate": "2024-03-05",
  "lineItems": [
    {
      "description": "Test",
      "quantity": 1,
      "unitPrice": 100.00,
      "amount": 100.00
    }
  ],
  "subtotal": 100.00,
  "totalAmount": 100.00
}')

if echo "$DUPLICATE" | grep -q "already exists" || echo "$DUPLICATE" | grep -q "Conflict"; then
    print_success "Correctly prevented duplicate invoice number"
else
    print_error "Should have rejected duplicate invoice number"
    echo "$DUPLICATE"
fi

# 21. Create invoice for cancellation test
print_info "21. Creating invoice for cancellation test..."
CANCEL_TEST=$(api_call "POST" "invoices" '{
  "invoiceNumber": "INV-TEST-CANCEL",
  "occupancyId": "'"$OCCUPANCY_ID"'",
  "tenantId": "'"$TENANT_ID"'",
  "invoiceDate": "2024-03-01",
  "dueDate": "2024-03-05",
  "status": "sent",
  "lineItems": [
    {
      "description": "Test for cancellation",
      "quantity": 1,
      "unitPrice": 200.00,
      "amount": 200.00
    }
  ],
  "subtotal": 200.00,
  "totalAmount": 200.00
}')

if echo "$CANCEL_TEST" | grep -q '"id"'; then
    CANCEL_INVOICE_ID=$(echo "$CANCEL_TEST" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Test invoice created for cancellation"
else
    print_error "Failed to create test invoice"
fi

# 22. Cancel invoice
if [ -n "$CANCEL_INVOICE_ID" ]; then
    print_info "22. Cancelling invoice..."
    CANCEL_RESPONSE=$(api_call "POST" "invoices/$CANCEL_INVOICE_ID/cancel")

    if echo "$CANCEL_RESPONSE" | grep -q '"status":"cancelled"'; then
        print_success "Invoice cancelled successfully"
    else
        print_error "Failed to cancel invoice"
        echo "$CANCEL_RESPONSE"
    fi
else
    print_info "22. Skipping cancel test (no test invoice)"
fi

# 23. Test filtering by status
print_info "23. Filtering invoices by status (draft)..."
FILTER_RESPONSE=$(api_call "GET" "invoices?status=draft")

if echo "$FILTER_RESPONSE" | grep -q '"status":"draft"' || echo "$FILTER_RESPONSE" | grep -q "\[\]"; then
    print_success "Filtered by status successfully"
else
    print_error "Failed to filter by status"
fi

# 24. Test date validation (due date before invoice date)
print_info "24. Testing date validation (should fail)..."
INVALID_DATE=$(api_call "POST" "invoices" '{
  "invoiceNumber": "INV-INVALID-DATE",
  "occupancyId": "'"$OCCUPANCY_ID"'",
  "tenantId": "'"$TENANT_ID"'",
  "invoiceDate": "2024-03-05",
  "dueDate": "2024-03-01",
  "lineItems": [
    {
      "description": "Test",
      "quantity": 1,
      "unitPrice": 100.00,
      "amount": 100.00
    }
  ],
  "subtotal": 100.00,
  "totalAmount": 100.00
}')

if echo "$INVALID_DATE" | grep -q "after invoice date" || echo "$INVALID_DATE" | grep -q "Bad Request"; then
    print_success "Correctly validated date range"
else
    print_error "Should have rejected invalid dates"
    echo "$INVALID_DATE"
fi

# 25. Test payment amount validation (exceeds total)
print_info "25. Testing payment amount validation (should fail)..."
if [ -n "$INVOICE2_ID" ]; then
    EXCEED_PAYMENT=$(api_call "POST" "invoices/$INVOICE2_ID/payment" '{
      "amount": 99999.00
    }')

    if echo "$EXCEED_PAYMENT" | grep -q "exceeds" || echo "$EXCEED_PAYMENT" | grep -q "Bad Request"; then
        print_success "Correctly validated payment amount"
    else
        print_error "Should have rejected excessive payment"
        echo "$EXCEED_PAYMENT"
    fi
else
    print_info "Skipping payment validation test"
fi

# 26. Test updating paid invoice (should fail)
print_info "26. Testing update on paid invoice (should fail)..."
UPDATE_PAID=$(api_call "PATCH" "invoices/$INVOICE_ID" '{
  "notes": "Trying to update paid invoice"
}')

if echo "$UPDATE_PAID" | grep -q "Cannot update" || echo "$UPDATE_PAID" | grep -q "Bad Request"; then
    print_success "Correctly prevented update on paid invoice"
else
    print_error "Should have prevented update on paid invoice"
    echo "$UPDATE_PAID"
fi

# 27. Test cancelling paid invoice (should fail)
print_info "27. Testing cancel on paid invoice (should fail)..."
CANCEL_PAID=$(api_call "POST" "invoices/$INVOICE_ID/cancel")

if echo "$CANCEL_PAID" | grep -q "Cannot cancel paid" || echo "$CANCEL_PAID" | grep -q "Bad Request"; then
    print_success "Correctly prevented cancel on paid invoice"
else
    print_error "Should have prevented cancel on paid invoice"
    echo "$CANCEL_PAID"
fi

echo ""
echo "========================================="
echo "  Test Summary"
echo "========================================="
print_success "All Invoices module tests completed!"
print_info "Company ID: ${COMPANY_ID:0:12}..."
print_info "Compound ID: ${COMPOUND_ID:0:12}..."
print_info "Apartment ID: ${APARTMENT_ID:0:12}..."
print_info "Tenant ID: ${TENANT_ID:0:12}..."
print_info "Occupancy ID: ${OCCUPANCY_ID:0:12}..."
print_info "Invoice ID: ${INVOICE_ID:0:12}..."
echo ""
print_info "You can view all endpoints at: http://localhost:3000/api/docs"
