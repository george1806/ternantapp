# Database Schema Management Guide

This guide ensures clean database installations always work correctly with complete schema definitions.

## Table of Contents
- [Quick Verification](#quick-verification)
- [Schema Consistency Rules](#schema-consistency-rules)
- [Clean Install Process](#clean-install-process)
- [Adding New Columns](#adding-new-columns)
- [Common Issues](#common-issues)

---

## Quick Verification

After any clean install, run the verification script:

```bash
# From backend directory
./scripts/verify-schema.sh

# Or with Docker
docker exec apartment-backend ./scripts/verify-schema.sh
```

This checks that all critical tables and columns exist.

---

## Schema Consistency Rules

### Rule 1: InitialSchema Must Be Complete

**The `InitialSchema` migration must include ALL columns from current entity definitions for core tables.**

Core tables:
- users
- companies
- compounds
- apartments
- tenants
- occupancies
- invoices
- payments
- reminders

### Rule 2: No Duplicate Column Additions

**Never create a separate migration to add a column that should be in InitialSchema.**

❌ **Bad:**
```typescript
// InitialSchema creates users table without notification_settings
// Later migration adds notification_settings
```

✅ **Good:**
```typescript
// InitialSchema creates users table with ALL current columns
// including notification_settings from the start
```

### Rule 3: New Tables = New Migrations

**New entities added after InitialSchema should have their own migrations.**

Examples:
- `reminder_settings` → `CreateReminderSettingsTable` migration
- `reminder_logs` → `CreateReminderLogsTable` migration
- `report_snapshots` → `CreateReportSnapshotsTable` migration

---

## Clean Install Process

### Step 1: Fresh Database

```bash
# Stop containers and remove volumes
docker compose down -v

# Start services
docker compose up -d
```

### Step 2: Run Migrations

Migrations run automatically on startup if `DB_RUN_MIGRATIONS=true` is set.

Or manually:
```bash
npm run migration:run
```

### Step 3: Verify Schema

```bash
./scripts/verify-schema.sh
```

Should output:
```
✓ All checks passed!
Database schema is complete and ready.
```

### Step 4: Seed Data (Optional)

```bash
# Create super admin
npm run seed:super-admin

# Or full seed
npm run seed:run
```

---

## Adding New Columns

### For Existing Core Tables

**DON'T** create a new migration. Instead, update InitialSchema:

1. **Add column to entity:**
   ```typescript
   // user.entity.ts
   @Column({ type: 'json', nullable: true })
   preferences: Record<string, any>;
   ```

2. **Update InitialSchema migration:**
   ```typescript
   // 1733594000000-InitialSchema.ts
   CREATE TABLE `users` (
     ...
     `preferences` json NULL,
     ...
   )
   ```

3. **Delete any conflicting migrations** that try to add the same column

4. **Test clean install:**
   ```bash
   docker compose down -v
   docker compose up -d
   ./scripts/verify-schema.sh
   ```

### For New Tables

Create a new migration:

```bash
npm run migration:generate -- src/database/migrations/CreateNewTable
```

---

## Common Issues

### Issue 1: "Column cannot be null" Error

**Symptom:** Creating records fails with database constraint error

**Cause:** Entity has a column that doesn't exist in database

**Solution:**
1. Check entity definition
2. Verify column exists: `DESCRIBE table_name`
3. If missing, add to InitialSchema (for core tables) or create migration (for new tables)

### Issue 2: Migration Runs After InitialSchema

**Symptom:** Migration tries to add column that should be in initial schema

**Cause:** Migration timestamp is after InitialSchema timestamp

**Solution:**
1. Add the column to InitialSchema instead
2. Delete the redundant migration
3. Test clean install

### Issue 3: "Duplicate column name" Error

**Symptom:** Migration fails saying column already exists

**Cause:** Column exists in InitialSchema AND a later migration tries to add it again

**Solution:**
1. Remove the column from the later migration
2. Ensure InitialSchema has the column
3. Delete any migrations that duplicate InitialSchema columns

---

## Verification Checklist

Before committing schema changes:

- [ ] All entity columns exist in InitialSchema (for core tables)
- [ ] No migrations duplicate InitialSchema columns
- [ ] Migration timestamps are correct (InitialSchema = 1733594000000)
- [ ] Clean install test passes (`docker compose down -v && docker compose up -d`)
- [ ] Verification script passes (`./scripts/verify-schema.sh`)
- [ ] Can create records in all tables
- [ ] Seed scripts work

---

## Current Schema Status

### Core Tables (in InitialSchema)

✅ **users**
- All columns including: notification_settings, login_attempts, locked_until, last_failed_login

✅ **companies**
- All columns including: address, city, region, country, postal_code, website

✅ **compounds, apartments, tenants, occupancies, invoices, payments, reminders**
- All current columns included

### Additional Tables (separate migrations)

✅ **reminder_settings** - Migration: 1766751748000
✅ **reminder_logs** - Migration: 1766751748000
✅ **report_snapshots** - Migration: 1734900000000

---

## Maintenance Commands

```bash
# Generate new migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show

# Verify schema
./scripts/verify-schema.sh

# Test clean install
docker compose down -v && docker compose --env-file .env.production -f docker-compose.prod-test.yml up -d
```

---

## Best Practices

1. **Always update InitialSchema** for core table changes
2. **Test clean installs** before deploying
3. **Run verification script** after schema changes
4. **Keep migrations minimal** - one logical change per migration
5. **Document breaking changes** in migration comments
6. **Never modify executed migrations** - create new ones instead
7. **Use TypeORM synchronize: false** in production

---

## Questions?

If schema issues arise:
1. Run `./scripts/verify-schema.sh`
2. Check migration order: `npm run migration:show`
3. Compare entity vs database: `DESCRIBE table_name`
4. Test clean install with: `docker compose down -v && docker compose up -d`
