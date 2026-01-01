#!/bin/bash
# ================================================================
# Create Default Super Admin User
# ================================================================
# Purpose: Creates a default super admin user for initial setup
# Usage: ./create-super-admin.sh [prod|dev]
# ================================================================

set -e

ENVIRONMENT=${1:-prod}

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "Create Super Admin User"
echo "Environment: $ENVIRONMENT"
echo "========================================"
echo ""

# Determine environment file and container name
if [ "$ENVIRONMENT" = "prod" ]; then
    ENV_FILE="${ENV_FILE:-.env.production}"
    CONTAINER_NAME="apartment-backend"
else
    ENV_FILE="${ENV_FILE:-.env}"
    CONTAINER_NAME="apartment-backend-dev"
fi

# Load environment
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
else
    echo -e "${RED}Error: Environment file not found: $ENV_FILE${NC}"
    exit 1
fi

# Check if backend container is running
echo -n "Checking backend container... "
if ! docker ps --filter "name=$CONTAINER_NAME" | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}✗ Backend container not running${NC}"
    echo "Please deploy the backend first"
    exit 1
fi
echo -e "${GREEN}✓${NC}"

# Get admin credentials
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
echo "Creating super admin user..."

# Create a Node.js script to create the user
cat > /tmp/create-admin.js << 'SCRIPT'
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

# Copy script to container and execute
echo "Executing user creation script..."
docker cp /tmp/create-admin.js $CONTAINER_NAME:/tmp/create-admin.js

docker exec -e DB_HOST="${DATABASE_HOST:-mysql}" \
           -e DB_USERNAME="${DATABASE_USER}" \
           -e DB_PASSWORD="${DATABASE_PASSWORD}" \
           -e DB_DATABASE="${DATABASE_NAME}" \
           -e ADMIN_EMAIL="$ADMIN_EMAIL" \
           -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
           -e ADMIN_FIRST_NAME="$ADMIN_FIRST_NAME" \
           -e ADMIN_LAST_NAME="$ADMIN_LAST_NAME" \
           $CONTAINER_NAME node /tmp/create-admin.js

# Cleanup
rm /tmp/create-admin.js 2>/dev/null || true
docker exec $CONTAINER_NAME rm /tmp/create-admin.js 2>/dev/null || true

echo ""
echo "========================================"
echo -e "${GREEN}✓ Super admin creation completed${NC}"
echo "========================================"
echo ""
echo "You can now login with:"
echo "  Email: $ADMIN_EMAIL"
echo "  Password: [the password you entered]"
echo ""
echo -e "${YELLOW}⚠️  SECURITY: Please change the password immediately after first login!${NC}"
echo ""
