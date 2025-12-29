#!/bin/bash
# ================================================================
# Utility Script: Compare Environments
# ================================================================
# Purpose: Compares dev and prod environment configurations
# Usage: ./compare-env.sh
# ================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

DEV_ENV="$PROJECT_ROOT/.env"
PROD_ENV="$PROJECT_ROOT/.env.production"

echo ""
echo "========================================"
echo "  Environment Comparison"
echo "========================================"
echo ""

# Check if files exist
if [ ! -f "$DEV_ENV" ]; then
    echo -e "${RED}Error: Development environment file not found: .env${NC}"
    exit 1
fi

if [ ! -f "$PROD_ENV" ]; then
    echo -e "${RED}Error: Production environment file not found: .env.production${NC}"
    exit 1
fi

# Extract variable names (excluding comments and empty lines)
DEV_VARS=$(grep -E '^[A-Z_]+=.*' "$DEV_ENV" | cut -d= -f1 | sort)
PROD_VARS=$(grep -E '^[A-Z_]+=.*' "$PROD_ENV" | cut -d= -f1 | sort)

# Find variables only in dev
echo -e "${BLUE}Variables only in DEV:${NC}"
ONLY_DEV=$(comm -23 <(echo "$DEV_VARS") <(echo "$PROD_VARS"))
if [ -z "$ONLY_DEV" ]; then
    echo -e "${GREEN}  (none)${NC}"
else
    echo "$ONLY_DEV" | while read var; do
        echo -e "  ${YELLOW}$var${NC}"
    done
fi

echo ""

# Find variables only in prod
echo -e "${BLUE}Variables only in PROD:${NC}"
ONLY_PROD=$(comm -13 <(echo "$DEV_VARS") <(echo "$PROD_VARS"))
if [ -z "$ONLY_PROD" ]; then
    echo -e "${GREEN}  (none)${NC}"
else
    echo "$ONLY_PROD" | while read var; do
        echo -e "  ${YELLOW}$var${NC}"
    done
fi

echo ""

# Find common variables with different values
echo -e "${BLUE}Variables with different values:${NC}"
COMMON_VARS=$(comm -12 <(echo "$DEV_VARS") <(echo "$PROD_VARS"))
DIFFERENT=0

echo "$COMMON_VARS" | while read var; do
    DEV_VAL=$(grep "^$var=" "$DEV_ENV" | cut -d= -f2-)
    PROD_VAL=$(grep "^$var=" "$PROD_ENV" | cut -d= -f2-)

    # Skip if values contain secrets (too long or look like hashes)
    if [ "${#DEV_VAL}" -gt 100 ] || [ "${#PROD_VAL}" -gt 100 ]; then
        continue
    fi

    if [ "$DEV_VAL" != "$PROD_VAL" ]; then
        echo -e "  ${YELLOW}$var${NC}"
        echo "    Dev:  $DEV_VAL"
        echo "    Prod: $PROD_VAL"
        DIFFERENT=$((DIFFERENT + 1))
    fi
done

if [ $DIFFERENT -eq 0 ]; then
    echo -e "${GREEN}  (none shown - secrets excluded)${NC}"
fi

echo ""
echo "========================================"
echo ""
echo "Summary:"
echo "  Dev file:  $DEV_ENV"
echo "  Prod file: $PROD_ENV"
echo ""
