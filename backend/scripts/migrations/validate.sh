#!/bin/bash
# ================================================================
# Migration Script: Validate Schema Consistency
# ================================================================
# Purpose: Validates that database schema matches entity definitions
# Usage: ./validate.sh [environment]
# Example: ./validate.sh dev
# ================================================================

set -e

ENVIRONMENT=${1:-dev}

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  Schema Validation"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo "========================================"
echo ""

# Determine environment file
if [ "$ENVIRONMENT" = "prod" ]; then
    ENV_FILE="../../.env.production"
else
    ENV_FILE="../../.env"
fi

# Use the comprehensive verify-schema.sh script
echo -e "${BLUE}Running comprehensive schema validation...${NC}"
echo ""

# Make sure verify-schema.sh is executable
chmod +x ../verify-schema.sh

# Run the validation script
DB_HOST=localhost ../verify-schema.sh "$ENVIRONMENT"

echo ""
echo "========================================"
echo ""
