#!/bin/bash
# ================================================================
# Migration Script: Create Empty Migration
# ================================================================
# Purpose: Creates an empty migration file for manual editing
# Usage: ./create-empty.sh <migration-name>
# Example: ./create-empty.sh AddCustomIndexes
# ================================================================

set -e

MIGRATION_NAME=$1

if [ -z "$MIGRATION_NAME" ]; then
    echo "Error: Migration name is required"
    echo "Usage: ./create-empty.sh <migration-name>"
    echo "Example: ./create-empty.sh AddCustomIndexes"
    exit 1
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  Creating Empty Migration"
echo "========================================"
echo "Migration: $MIGRATION_NAME"
echo "========================================"
echo ""

# Generate timestamp (milliseconds since epoch)
TIMESTAMP=$(date +%s%3N)

# Create class name
CLASS_NAME="${MIGRATION_NAME}${TIMESTAMP}"

# Create migration file path
MIGRATION_DIR="../../src/database/migrations"
MIGRATION_FILE="${MIGRATION_DIR}/${TIMESTAMP}-${MIGRATION_NAME}.ts"

# Ensure migrations directory exists
mkdir -p "$MIGRATION_DIR"

# Create migration file
cat > "$MIGRATION_FILE" << EOF
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ${CLASS_NAME} implements MigrationInterface {
  name = '${CLASS_NAME}'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TODO: Add your migration SQL here
    // Example:
    // await queryRunner.query(\`
    //   ALTER TABLE users ADD COLUMN new_field VARCHAR(255)
    // \`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // TODO: Add your rollback SQL here
    // Example:
    // await queryRunner.query(\`
    //   ALTER TABLE users DROP COLUMN new_field
    // \`);
  }
}
EOF

echo -e "${GREEN}✓ Empty migration created successfully${NC}"
echo ""
echo "File: $MIGRATION_FILE"
echo ""
echo "Next steps:"
echo "  1. Edit the migration file and add your SQL queries"
echo "  2. Test the migration: ./run.sh dev"
echo "  3. If successful, commit the migration file"
echo ""
