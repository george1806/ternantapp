#!/bin/bash
# ================================================================
# Create Default Super Admin User (Non-Interactive)
# ================================================================
# Purpose: Creates a default super admin with credentials from env
# Usage: ./create-default-admin.sh [prod|dev]
#
# Required Environment Variables:
#   DEFAULT_ADMIN_EMAIL - Admin email address
#   DEFAULT_ADMIN_PASSWORD - Admin password (use strong password!)
#   DEFAULT_ADMIN_FIRST_NAME - Admin first name (optional, defaults to 'Super')
#   DEFAULT_ADMIN_LAST_NAME - Admin last name (optional, defaults to 'Admin')
#
# ⚠️  SECURITY: Use strong passwords and change after first login!
# ================================================================

set -e

# ================================
# Color Definitions
# ================================
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ================================
# Global Variables
# ================================
ENVIRONMENT=${1:-prod}
CONTAINER_NAME=""
ENV_FILE=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
ADMIN_FIRST_NAME=""
ADMIN_LAST_NAME=""

# ================================
# Helper Functions
# ================================

print_header() {
    echo "========================================"
    echo "$1"
    echo "Environment: $ENVIRONMENT"
    echo "========================================"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ================================
# Validation Functions
# ================================

setup_environment() {
    if [ "$ENVIRONMENT" = "prod" ]; then
        CONTAINER_NAME="${BACKEND_CONTAINER_NAME:-apartment-backend}"
        ENV_FILE=".env.production"
    else
        CONTAINER_NAME="apartment-backend-dev"
        ENV_FILE=".env"
    fi

    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
    fi
}

load_admin_credentials() {
    # Load credentials from environment variables
    ADMIN_EMAIL="${DEFAULT_ADMIN_EMAIL:-}"
    ADMIN_PASSWORD="${DEFAULT_ADMIN_PASSWORD:-}"
    ADMIN_FIRST_NAME="${DEFAULT_ADMIN_FIRST_NAME:-Super}"
    ADMIN_LAST_NAME="${DEFAULT_ADMIN_LAST_NAME:-Admin}"

    # Validate required credentials
    if [ -z "$ADMIN_EMAIL" ]; then
        print_error "DEFAULT_ADMIN_EMAIL not set in $ENV_FILE"
        echo "Please add DEFAULT_ADMIN_EMAIL to your environment file"
        exit 1
    fi

    if [ -z "$ADMIN_PASSWORD" ]; then
        print_error "DEFAULT_ADMIN_PASSWORD not set in $ENV_FILE"
        echo "Please add DEFAULT_ADMIN_PASSWORD to your environment file"
        exit 1
    fi

    # Validate password strength (minimum 8 characters)
    if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
        print_error "DEFAULT_ADMIN_PASSWORD must be at least 8 characters long"
        exit 1
    fi
}

validate_backend_running() {
    if ! docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME" || false; then
        print_error "Backend container ($CONTAINER_NAME) not running"
        echo "Please start backend first: ./deploy-03-backend.sh $ENVIRONMENT"
        exit 1
    fi
}

# ================================
# Admin Creation Functions
# ================================

create_admin_user() {
    echo "Creating super admin from environment credentials..."
    echo "Email: $ADMIN_EMAIL"
    echo ""

    docker exec -i \
        -e DB_HOST="${DATABASE_HOST:-mysql}" \
        -e DB_USERNAME="${DATABASE_USER}" \
        -e DB_PASSWORD="${DATABASE_PASSWORD}" \
        -e DB_DATABASE="${DATABASE_NAME}" \
        -e ADMIN_EMAIL="$ADMIN_EMAIL" \
        -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
        -e ADMIN_FIRST_NAME="$ADMIN_FIRST_NAME" \
        -e ADMIN_LAST_NAME="$ADMIN_LAST_NAME" \
        "$CONTAINER_NAME" node << 'SCRIPT'
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function createSuperAdmin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const firstName = process.env.ADMIN_FIRST_NAME;
    const lastName = process.env.ADMIN_LAST_NAME;

    // Check if user exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      console.log('⚠️  Super admin already exists');
      return;
    }

    // Import bcryptjs (used by NestJS backend)
    const bcrypt = require('bcryptjs');
    const uuid = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    await connection.execute(`
      INSERT INTO users (
        id, first_name, last_name, email, password_hash,
        role, is_super_admin, status, email_verified_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'ADMIN', 1, 'ACTIVE', NOW(), NOW(), NOW())
    `, [uuid, firstName, lastName, email, passwordHash]);

    console.log('✅ Super admin created successfully');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email:', email);
    console.log('  Password: [hidden]');
    console.log('');
    console.log('⚠️  IMPORTANT: Change password after first login!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

createSuperAdmin();
SCRIPT
}

show_security_warning() {
    echo ""
    echo "========================================"
    print_success "Default super admin setup completed"
    echo "========================================"
    echo ""
    print_warning "SECURITY WARNING:"
    echo "Admin credentials have been created from environment variables:"
    echo "  Email: $ADMIN_EMAIL"
    echo "  Password: [hidden]"
    echo ""
    echo "Please change the password immediately after first login!"
    echo ""
}

# ================================
# Main Function
# ================================

main() {
    print_header "Create Default Super Admin"

    setup_environment
    load_admin_credentials
    validate_backend_running
    create_admin_user
    show_security_warning
}

# ================================
# Script Entry Point
# ================================

main
