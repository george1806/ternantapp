#!/bin/bash
# ================================================================
# Database Schema Verification Script
# ================================================================
# This script verifies that all entity columns exist in the database
# Run this after a clean install to ensure schema completeness
# ================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Database Schema Verification"
echo "========================================="
echo ""

# Database connection info
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USERNAME:-apartment_user}
DB_PASS=${DB_PASSWORD:-test_password_123}
DB_NAME=${DB_DATABASE:-apartment_management}

# Check if running in Docker
if [ -n "$DOCKER_ENV" ]; then
    DB_HOST="mysql"
fi

echo "Checking database connection..."
if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}✗ Cannot connect to database${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Function to check if a table exists
check_table() {
    local table=$1
    if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DESCRIBE $table" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Table '$table' exists${NC}"
        return 0
    else
        echo -e "${RED}✗ Table '$table' missing${NC}"
        return 1
    fi
}

# Function to check if a column exists in a table
check_column() {
    local table=$1
    local column=$2
    if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW COLUMNS FROM $table LIKE '$column'" | grep -q "$column"; then
        return 0
    else
        echo -e "${RED}  ✗ Column '$table.$column' missing${NC}"
        return 1
    fi
}

# Check all required tables
echo "Checking core tables..."
TABLES=("users" "companies" "compounds" "apartments" "tenants" "occupancies" "invoices" "payments" "reminders")
MISSING_TABLES=0

for table in "${TABLES[@]}"; do
    if ! check_table "$table"; then
        ((MISSING_TABLES++))
    fi
done

echo ""

# Check critical columns that were previously missing
echo "Checking critical columns..."
MISSING_COLUMNS=0

# User table columns
echo "  Checking users table..."
check_column "users" "notification_settings" || ((MISSING_COLUMNS++))
check_column "users" "login_attempts" || ((MISSING_COLUMNS++))
check_column "users" "locked_until" || ((MISSING_COLUMNS++))
check_column "users" "last_failed_login" || ((MISSING_COLUMNS++))

# Company table columns
echo "  Checking companies table..."
check_column "companies" "address" || ((MISSING_COLUMNS++))
check_column "companies" "city" || ((MISSING_COLUMNS++))
check_column "companies" "region" || ((MISSING_COLUMNS++))
check_column "companies" "country" || ((MISSING_COLUMNS++))
check_column "companies" "postal_code" || ((MISSING_COLUMNS++))
check_column "companies" "website" || ((MISSING_COLUMNS++))

echo ""
echo "========================================="
echo "Verification Summary"
echo "========================================="

if [ $MISSING_TABLES -eq 0 ] && [ $MISSING_COLUMNS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "Database schema is complete and ready."
    exit 0
else
    echo -e "${RED}✗ Schema verification failed${NC}"
    echo "Missing tables: $MISSING_TABLES"
    echo "Missing columns: $MISSING_COLUMNS"
    echo ""
    echo "Please run migrations: npm run migration:run"
    exit 1
fi
