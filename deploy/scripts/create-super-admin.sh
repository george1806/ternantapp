#!/bin/bash
# ================================================================
# Create Super Admin User (Interactive)
# ================================================================
# Purpose: Creates a super admin user with custom credentials
# Usage: ./create-super-admin.sh [prod|dev]
#
# Interactive Prompts:
#   - Email address
#   - Password (hidden input)
#   - First name
#   - Last name
#
# ⚠️  SECURITY: Choose a strong password!
# ================================================================

set -e

# ================================
# Color Definitions
# ================================
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
TEMP_SCRIPT="/tmp/create-admin.js"

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

print_info() {
    echo -e "${BLUE}$1${NC}"
}

# ================================
# Validation Functions
# ================================

setup_environment() {
    if [ "$ENVIRONMENT" = "prod" ]; then
        ENV_FILE="${ENV_FILE:-.env.production}"
        CONTAINER_NAME="${BACKEND_CONTAINER_NAME:-apartment-backend}"
    else
        ENV_FILE="${ENV_FILE:-.env}"
        CONTAINER_NAME="apartment-backend-dev"
    fi

    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
    else
        print_error "Environment file not found: $ENV_FILE"
        echo "Please create it from .env.example"
        exit 1
    fi
}

validate_backend_running() {
    echo -n "Checking backend container... "

    if ! docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME" || false; then
        echo ""
        print_error "Backend container ($CONTAINER_NAME) not running"
        echo "Please deploy the backend first: ./deploy-03-backend.sh $ENVIRONMENT"
        exit 1
    fi

    print_success "Running"
}

# ================================
# Input Functions
# ================================

prompt_for_credentials() {
    echo ""
    echo "Super Admin Credentials:"
    echo "------------------------"

    read -p "Email (default: admin@ternantapp.com): " ADMIN_EMAIL
    ADMIN_EMAIL=${ADMIN_EMAIL:-admin@ternantapp.com}

    read -sp "Password (default: Admin@123): " ADMIN_PASSWORD
    echo ""
    ADMIN_PASSWORD=${ADMIN_PASSWORD:-Admin@123}

    read -p "First Name (default: Super): " ADMIN_FIRST_NAME
    ADMIN_FIRST_NAME=${ADMIN_FIRST_NAME:-Super}

    read -p "Last Name (default: Admin): " ADMIN_LAST_NAME
    ADMIN_LAST_NAME=${ADMIN_LAST_NAME:-Admin}

    echo ""
}

# ================================
# Admin Creation Functions
# ================================

create_temp_script() {
    cat > "$TEMP_SCRIPT" << 'SCRIPT'
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
    // Check if user already exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [process.env.ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      console.log('⚠️  User with this email already exists');
      process.exit(0);
    }

    // Generate UUID
    const uuid = crypto.randomUUID();

    // Hash password using bcryptjs (used by NestJS backend)
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    // Insert super admin user
    await connection.execute(`
      INSERT INTO users (
        id,
        first_name,
        last_name,
        email,
        password_hash,
        role,
        is_super_admin,
        status,
        email_verified_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 'ADMIN', 1, 'ACTIVE', NOW(), NOW(), NOW())
    `, [
      uuid,
      process.env.ADMIN_FIRST_NAME,
      process.env.ADMIN_LAST_NAME,
      process.env.ADMIN_EMAIL,
      passwordHash
    ]);

    console.log('✅ Super admin user created successfully');
    console.log('');
    console.log('Login Credentials:');
    console.log('Email:', process.env.ADMIN_EMAIL);
    console.log('Password: [hidden]');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');

  } catch (error) {
    console.error('Error creating super admin:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

createSuperAdmin();
SCRIPT
}

execute_admin_creation() {
    echo "Creating super admin user..."
    echo ""

    # Copy script to container
    docker cp "$TEMP_SCRIPT" "$CONTAINER_NAME:/tmp/create-admin.js"

    # Execute script with environment variables
    docker exec \
        -e DB_HOST="${DATABASE_HOST:-mysql}" \
        -e DB_USERNAME="${DATABASE_USER}" \
        -e DB_PASSWORD="${DATABASE_PASSWORD}" \
        -e DB_DATABASE="${DATABASE_NAME}" \
        -e ADMIN_EMAIL="$ADMIN_EMAIL" \
        -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
        -e ADMIN_FIRST_NAME="$ADMIN_FIRST_NAME" \
        -e ADMIN_LAST_NAME="$ADMIN_LAST_NAME" \
        "$CONTAINER_NAME" node /tmp/create-admin.js
}

# ================================
# Cleanup Functions
# ================================

cleanup_temp_files() {
    rm -f "$TEMP_SCRIPT" 2>/dev/null || true
    docker exec "$CONTAINER_NAME" rm -f /tmp/create-admin.js 2>/dev/null || true
}

# ================================
# Summary Functions
# ================================

show_success_summary() {
    echo ""
    echo "========================================"
    print_success "Super admin creation completed"
    echo "========================================"
    echo ""
    echo "You can now login with:"
    echo "  Email: $ADMIN_EMAIL"
    echo "  Password: [the password you entered]"
    echo ""
    print_warning "SECURITY: Please change the password immediately after first login!"
    echo ""
}

# ================================
# Main Function
# ================================

main() {
    print_header "Create Super Admin User"

    setup_environment
    validate_backend_running
    prompt_for_credentials
    create_temp_script
    execute_admin_creation
    cleanup_temp_files
    show_success_summary
}

# ================================
# Script Entry Point
# ================================

main
