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

ENVIRONMENT=${1:-prod}

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "Create Default Super Admin"
echo "Environment: $ENVIRONMENT"
echo "========================================"
echo ""

# Determine container name
if [ "$ENVIRONMENT" = "prod" ]; then
    CONTAINER_NAME="${BACKEND_CONTAINER_NAME:-apartment-backend}"
    ENV_FILE=".env.production"
else
    CONTAINER_NAME="apartment-backend-dev"
    ENV_FILE=".env"
fi

# Load environment for database credentials
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

# Check if backend container is running
if ! docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}✗ Backend container ($CONTAINER_NAME) not running${NC}"
    exit 1
fi

# Default credentials
ADMIN_EMAIL="admin@ternantapp.com"
ADMIN_PASSWORD="Admin@123"
ADMIN_FIRST_NAME="Super"
ADMIN_LAST_NAME="Admin"

echo "Creating super admin with default credentials..."
echo "Email: $ADMIN_EMAIL"
echo ""

# Create inline script and execute
docker exec -i $CONTAINER_NAME node << 'SCRIPT'
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

echo ""
echo "========================================"
echo -e "${GREEN}✓ Default super admin setup completed${NC}"
echo "========================================"
echo ""
echo -e "${YELLOW}⚠️  SECURITY WARNING:${NC}"
echo "Default credentials have been created:"
echo "  Email: admin@ternantapp.com"
echo "  Password: Admin@123"
echo ""
echo "These are PUBLIC credentials. Change them immediately!"
echo ""
