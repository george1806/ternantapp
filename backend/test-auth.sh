#!/bin/bash

# Auth Module Test Script
# Author: george1806

set -e

BASE_URL="http://localhost:3000/api/v1"
COMPANY_EMAIL="test$(date +%s)@example.com"
COMPANY_SLUG="test-company-$(date +%s)"

echo "🧪 Testing Authentication Module"
echo "=================================="
echo ""

# 1. Register Company
echo "1️⃣  Testing: Register Company"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register-company" \
  -H "Content-Type: application/json" \
  -d "{
    \"company\": {
      \"name\": \"Test Company\",
      \"slug\": \"$COMPANY_SLUG\",
      \"email\": \"$COMPANY_EMAIL\",
      \"currency\": \"USD\"
    },
    \"owner\": {
      \"firstName\": \"Test\",
      \"lastName\": \"Owner\",
      \"email\": \"$COMPANY_EMAIL\",
      \"password\": \"TestPass123!\",
      \"phone\": \"+1234567890\"
    }
  }")

echo "$REGISTER_RESPONSE" | jq '.'

ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.tokens.accessToken')
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.tokens.refreshToken')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Registration failed"
  exit 1
fi

echo "✅ Registration successful"
echo ""

# 2. Get Current User
echo "2️⃣  Testing: Get Current User"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ME_RESPONSE" | jq '.'

if echo "$ME_RESPONSE" | jq -e '.userId' > /dev/null; then
  echo "✅ Get current user successful"
else
  echo "❌ Get current user failed"
  exit 1
fi
echo ""

# 3. Login
echo "3️⃣  Testing: Login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$COMPANY_EMAIL\",
    \"password\": \"TestPass123!\"
  }")

echo "$LOGIN_RESPONSE" | jq '.'

NEW_ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.accessToken')

if [ "$NEW_ACCESS_TOKEN" == "null" ] || [ -z "$NEW_ACCESS_TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo ""

# 4. Get Sessions
echo "4️⃣  Testing: Get Active Sessions"
SESSIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/sessions" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN")

echo "$SESSIONS_RESPONSE" | jq '.'

SESSION_COUNT=$(echo "$SESSIONS_RESPONSE" | jq -r '.sessionCount')

if [ "$SESSION_COUNT" -ge 1 ]; then
  echo "✅ Get sessions successful (Count: $SESSION_COUNT)"
else
  echo "❌ Get sessions failed"
  exit 1
fi
echo ""

# 5. Refresh Token
echo "5️⃣  Testing: Refresh Token"
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

echo "$REFRESH_RESPONSE" | jq '.'

REFRESHED_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.tokens.accessToken')

if [ "$REFRESHED_ACCESS_TOKEN" == "null" ] || [ -z "$REFRESHED_ACCESS_TOKEN" ]; then
  echo "❌ Refresh token failed"
  exit 1
fi

echo "✅ Refresh token successful"
echo ""

# 6. Logout
echo "6️⃣  Testing: Logout"
LOGOUT_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $REFRESHED_ACCESS_TOKEN")

if [ "$LOGOUT_RESPONSE" == "204" ]; then
  echo "✅ Logout successful"
else
  echo "❌ Logout failed (HTTP $LOGOUT_RESPONSE)"
  exit 1
fi
echo ""

# 7. Try to access protected route after logout (should fail)
echo "7️⃣  Testing: Access after logout (should fail)"
AFTER_LOGOUT=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $REFRESHED_ACCESS_TOKEN")

if echo "$AFTER_LOGOUT" | grep -q "401"; then
  echo "✅ Correctly rejected after logout"
else
  echo "❌ Should have been rejected after logout"
  exit 1
fi
echo ""

echo "=================================="
echo "✅ All Auth tests passed!"
echo "=================================="
