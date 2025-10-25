#!/bin/bash

# Test script for Payments module
# Author: george1806

BASE_URL="http://localhost:3000"
TOKEN="your-jwt-token-here"

echo "================================"
echo "Payments Module Test Script"
echo "================================"
echo ""

# Test 1: Create a payment
echo "1. Creating a new payment..."
curl -X POST "$BASE_URL/payments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "invoice-uuid-here",
    "amount": 1500.00,
    "paidAt": "2024-01-15T10:30:00Z",
    "method": "BANK",
    "reference": "TXN-2024-001",
    "notes": "Monthly rent payment"
  }'
echo -e "\n"

# Test 2: Get all payments
echo "2. Fetching all payments..."
curl -X GET "$BASE_URL/payments" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 3: Get payment statistics
echo "3. Fetching payment statistics..."
curl -X GET "$BASE_URL/payments/stats" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 4: Get payments by invoice
echo "4. Fetching payments for a specific invoice..."
curl -X GET "$BASE_URL/payments/invoice/invoice-uuid-here" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 5: Get payments by date range
echo "5. Fetching payments within date range..."
curl -X GET "$BASE_URL/payments/date-range?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 6: Get single payment
echo "6. Fetching single payment..."
curl -X GET "$BASE_URL/payments/payment-uuid-here" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 7: Update payment
echo "7. Updating a payment..."
curl -X PATCH "$BASE_URL/payments/payment-uuid-here" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1600.00,
    "notes": "Updated payment amount"
  }'
echo -e "\n"

# Test 8: Delete payment
echo "8. Deleting (deactivating) a payment..."
curl -X DELETE "$BASE_URL/payments/payment-uuid-here" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 9: Reactivate payment
echo "9. Reactivating a payment..."
curl -X POST "$BASE_URL/payments/payment-uuid-here/activate" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "================================"
echo "Test script completed!"
echo "================================"
