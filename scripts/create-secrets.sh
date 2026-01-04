#!/bin/bash
# ==========================================
# Secrets Creation Script
# ==========================================
# Creates all required secrets for production deployment
# ==========================================

set -e

SECRETS_DIR="./secrets"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Production Secrets Creation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create secrets directory
if [ ! -d "${SECRETS_DIR}" ]; then
    mkdir -p "${SECRETS_DIR}"
    echo -e "${GREEN}✓${NC} Created secrets directory"
fi

# Add to .gitignore
if ! grep -q "^secrets/$" .gitignore 2>/dev/null; then
    echo "secrets/" >> .gitignore
    echo -e "${GREEN}✓${NC} Added secrets/ to .gitignore"
fi

# Function to generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to create secret file
create_secret() {
    local name=$1
    local file="${SECRETS_DIR}/${name}.txt"

    if [ -f "${file}" ]; then
        echo -e "${YELLOW}⚠${NC}  ${name} already exists. Skipping..."
        return
    fi

    local password=$(generate_password)
    echo -n "${password}" > "${file}"
    chmod 600 "${file}"
    echo -e "${GREEN}✓${NC} Created ${name}"
}

# Function to create secret from user input
create_secret_input() {
    local name=$1
    local prompt=$2
    local file="${SECRETS_DIR}/${name}.txt"

    if [ -f "${file}" ]; then
        echo -e "${YELLOW}⚠${NC}  ${name} already exists. Skipping..."
        return
    fi

    echo -n "${prompt}: "
    read -s value
    echo ""

    if [ -z "${value}" ]; then
        echo -e "${RED}✗${NC} Empty value provided. Skipping..."
        return
    fi

    echo -n "${value}" > "${file}"
    chmod 600 "${file}"
    echo -e "${GREEN}✓${NC} Created ${name}"
}

echo -e "${BLUE}Creating auto-generated secrets...${NC}"
echo ""

# Auto-generated secrets
create_secret "mysql_root_password"
create_secret "mysql_password"
create_secret "redis_password"
create_secret "jwt_secret"
create_secret "jwt_refresh_secret"
create_secret "grafana_password"

echo ""
echo -e "${BLUE}Creating user-input secrets...${NC}"
echo ""

# User-input secrets
create_secret_input "mail_password" "Enter email password (e.g., Brevo API key)"
create_secret_input "aws_secret_key" "Enter AWS secret key (optional, press Enter to skip)"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Secrets creation complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "1. Secrets are stored in: ${SECRETS_DIR}/"
echo "2. Never commit secrets to git"
echo "3. Backup secrets securely"
echo "4. Set permissions: chmod 600 ${SECRETS_DIR}/*"
echo ""
echo -e "${BLUE}Created secrets:${NC}"
ls -lh "${SECRETS_DIR}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Review and update .env.production file"
echo "2. Deploy: docker-compose -f docker-compose.prod.v2.yml up -d"
