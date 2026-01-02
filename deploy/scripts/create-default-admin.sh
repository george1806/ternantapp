#!/bin/bash
# ================================================================
# Create Default Super Admin User (Non-Interactive)
# ================================================================
# Purpose: Creates a default super admin with preset credentials
# Usage: ./create-default-admin.sh [prod|dev]
#
# Default Credentials:
#   Email: admin@ternantapp.com
#   Password: Admin@123
#
# ⚠️  SECURITY: Change password after first login!
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
ADMIN_EMAIL="admin@ternantapp.com"
ADMIN_PASSWORD="Admin@123"
ADMIN_FIRST_NAME="Super"
ADMIN_LAST_NAME="Admin"

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
    echo "Creating super admin with default credentials..."
    echo "Email: $ADMIN_EMAIL"
    echo ""

    docker exec -i "$CONTAINER_NAME" node << 'SCRIPT'
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
    const email = 'admin@ternantapp.com';

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
    const passwordHash = await bcrypt.hash('Admin@123', 10);

    // Create user
    await connection.execute(`
      INSERT INTO users (
        id, first_name, last_name, email, password_hash,
        role, is_super_admin, status, email_verified_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'ADMIN', 1, 'ACTIVE', NOW(), NOW(), NOW())
    `, [uuid, 'Super', 'Admin', email, passwordHash]);

    console.log('✅ Super admin created successfully');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email: admin@ternantapp.com');
    console.log('  Password: Admin@123');
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
    echo "Default credentials have been created:"
    echo "  Email: admin@ternantapp.com"
    echo "  Password: Admin@123"
    echo ""
    echo "These are PUBLIC credentials. Change them immediately!"
    echo ""
}

# ================================
# Main Function
# ================================

main() {
    print_header "Create Default Super Admin"

    setup_environment
    validate_backend_running
    create_admin_user
    show_security_warning
}

# ================================
# Script Entry Point
# ================================

main
