# Database Migration Management Scripts

Comprehensive scripts for managing TypeORM database migrations in both development and production environments.

## Available Scripts

### 1. generate.sh - Generate New Migration
Automatically generates a migration by comparing entity definitions with the database schema.

```bash
./generate.sh <migration-name> [environment]
```

**Examples:**
```bash
# Generate migration in dev environment
./generate.sh AddUserPreferences dev

# Generate migration in prod environment
./generate.sh AddPaymentGatewayIntegration prod
```

**What it does:**
- Compares current entity definitions with database schema
- Generates TypeORM migration file with necessary SQL changes
- Works in both Docker and local environments
- Names file with timestamp for proper ordering

**When to use:**
- After modifying entity files (adding/removing columns)
- When you need to capture schema changes automatically

---

### 2. create-empty.sh - Create Empty Migration
Creates a blank migration file for manual SQL editing.

```bash
./create-empty.sh <migration-name>
```

**Examples:**
```bash
# Create empty migration for custom indexes
./create-empty.sh AddCustomIndexes

# Create empty migration for data migration
./create-empty.sh MigrateUserData
```

**What it does:**
- Creates a timestamped migration file with empty up/down methods
- Allows you to write custom SQL queries
- Useful for complex changes or data migrations

**When to use:**
- Adding custom indexes or constraints
- Data migrations or transformations
- Complex SQL that TypeORM can't auto-generate
- Seed data insertion

---

### 3. run.sh - Execute Migrations
Runs all pending migrations against the database.

```bash
./run.sh [environment]
```

**Examples:**
```bash
# Run migrations in dev
./run.sh dev

# Run migrations in production
./run.sh prod
```

**What it does:**
- Executes all migrations that haven't been run yet
- Updates the migrations table to track execution
- Works with running containers or local setup

**When to use:**
- After generating or creating new migrations
- When deploying to a new environment
- After pulling migration files from git

---

### 4. revert.sh - Rollback Migrations
Reverts the last executed migration(s).

```bash
./revert.sh [environment] [count]
```

**Examples:**
```bash
# Revert last migration in dev
./revert.sh dev 1

# Revert last 3 migrations in dev
./revert.sh dev 3

# Revert in production (requires confirmation)
./revert.sh prod 1
```

**What it does:**
- Executes the `down()` method of the most recent migration(s)
- Removes entries from migrations table
- Requires confirmation for production

**When to use:**
- Migration caused issues in dev environment
- Need to make changes to a recent migration
- Emergency rollback in production (use with caution)

**Warning:** Always backup your database before reverting in production!

---

### 5. status.sh - Check Migration Status
Shows which migrations have been executed and which files exist.

```bash
./status.sh [environment]
```

**Examples:**
```bash
# Check status in dev
./status.sh dev

# Check status in production
./status.sh prod
```

**What it does:**
- Lists all executed migrations from the database
- Lists all migration files in the codebase
- Helps identify pending migrations

**When to use:**
- Before running migrations
- To verify what's been executed
- Troubleshooting migration issues

---

### 6. validate.sh - Validate Schema Consistency
Validates that the database schema matches entity definitions.

```bash
./validate.sh [environment]
```

**Examples:**
```bash
# Validate dev database
./validate.sh dev

# Validate production database
./validate.sh prod
```

**What it does:**
- Runs comprehensive schema validation
- Checks all tables exist
- Verifies all entity columns are present in database
- Reports any discrepancies

**When to use:**
- After running migrations
- Before deploying to production
- Troubleshooting schema issues
- Regular health checks

---

## Common Workflows

### Workflow 1: Adding a New Feature
```bash
# 1. Modify entity files (e.g., add new column to User entity)
# 2. Generate migration
./generate.sh AddEmailVerificationToUsers dev

# 3. Review the generated migration file
# 4. Run the migration
./run.sh dev

# 5. Validate the changes
./validate.sh dev

# 6. Test your application
# 7. Commit the migration file to git
```

### Workflow 2: Custom Data Migration
```bash
# 1. Create empty migration
./create-empty.sh MigrateUserRolesToNewFormat

# 2. Edit the migration file and add custom SQL
# 3. Run the migration
./run.sh dev

# 4. Validate
./validate.sh dev

# 5. If issues occur, revert and fix
./revert.sh dev 1
```

### Workflow 3: Deploying to Production
```bash
# 1. Check current status
./status.sh prod

# 2. Validate current schema
./validate.sh prod

# 3. Backup database first (use deploy/scripts/02-backup-database.sh)

# 4. Run new migrations
./run.sh prod

# 5. Validate the changes
./validate.sh prod

# 6. Monitor application logs
```

### Workflow 4: Fixing a Bad Migration
```bash
# 1. Revert the problematic migration
./revert.sh dev 1

# 2. Delete or edit the migration file
# 3. Generate new migration or fix manually
# 4. Run the corrected migration
./run.sh dev

# 5. Validate
./validate.sh dev
```

---

## Migration Best Practices

### 1. Always Test in Development First
Never run untested migrations in production. Always test in dev environment first.

### 2. Review Generated Migrations
Auto-generated migrations might not always produce optimal SQL. Always review before running.

### 3. Make Migrations Reversible
Always implement the `down()` method so migrations can be reverted if needed.

### 4. Backup Before Production Migrations
Always backup your production database before running migrations.

### 5. Use Descriptive Names
Use clear, descriptive names for migrations:
- Good: `AddEmailVerificationToUsers`
- Bad: `UpdateUsers`

### 6. One Purpose Per Migration
Each migration should do one thing. Don't combine multiple unrelated changes.

### 7. Never Modify Executed Migrations
Once a migration has been run in production, never modify it. Create a new migration instead.

### 8. Version Control
Always commit migration files to version control immediately after creation.

### 9. Keep Migrations Small
Smaller migrations are easier to review, test, and rollback if needed.

### 10. Document Complex Migrations
Add comments in the migration file explaining complex logic or data transformations.

---

## Troubleshooting

### Problem: "Migration failed"
**Solution:**
1. Check the error message in the logs
2. Verify database connection
3. Check SQL syntax in migration file
4. Ensure migrations table exists
5. Verify user has proper database permissions

### Problem: "Migration already executed"
**Solution:**
1. Check migration status: `./status.sh dev`
2. If you need to re-run, revert first: `./revert.sh dev 1`
3. Or delete the entry from migrations table (use with caution)

### Problem: "Column already exists"
**Solution:**
- Another migration or manual change already added the column
- Check database schema vs migration SQL
- Remove duplicate changes from migration file

### Problem: "Table doesn't exist"
**Solution:**
- Migrations may be running out of order
- Verify InitialSchema has correct timestamp (1733594000000)
- Check migration file timestamps

### Problem: Schema validation fails
**Solution:**
1. Run status to see what's executed: `./status.sh dev`
2. Compare with entity definitions
3. Generate missing migration: `./generate.sh SyncMissingChanges dev`
4. Run and validate

---

## Environment Support

All scripts support two environments:

- **dev** (default): Uses `.env` and `docker-compose.yml`
- **prod**: Uses `.env.production` and `docker-compose.prod.yml`

Scripts automatically detect if running in Docker containers or local environment.

---

## Integration with Deployment Scripts

These migration scripts are integrated with the deployment automation in `/deploy/scripts/`:

- **05-deploy-backend.sh** automatically runs migrations during backend deployment
- **02-backup-database.sh** should be run before production migrations
- **07-verify-deployment.sh** includes schema validation

For full deployment workflow, see `/deploy/scripts/README.md`
