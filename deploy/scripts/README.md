# Apartment Management System - Deployment Guide

Complete automated deployment system for the Apartment Management application with support for development and production environments.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Deployment Scripts](#deployment-scripts)
4. [Utility Scripts](#utility-scripts)
5. [Migration Management](#migration-management)
6. [Deployment Modes](#deployment-modes)
7. [Common Workflows](#common-workflows)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Overview

The deployment system consists of:
- **7 numbered deployment scripts** - Sequential deployment steps
- **1 master orchestrator** - Main deployment script
- **3 utility scripts** - Environment management helpers
- **6 migration scripts** - Database migration tools

### Architecture

```
Apartment Management System
├── MySQL Database (Port 3306)
├── Redis Cache (Port 6379)
├── Backend API - NestJS (Port 3000)
└── Frontend App - Next.js (Port 3001/3002)
```

### Deployment Flow

```
deploy.sh
    ├── 01-validate-environment.sh    (Prerequisites check)
    ├── 02-backup-database.sh         (Database backup)
    ├── 03-build-images.sh            (Docker image builds)
    ├── 04-deploy-database.sh         (MySQL + Redis)
    ├── 05-deploy-backend.sh          (NestJS API)
    ├── 06-deploy-frontend.sh         (Next.js App)
    └── 07-verify-deployment.sh       (Health checks)
```

---

## Quick Start

### First Time Setup

```bash
# 1. Navigate to deployment directory
cd deploy/scripts

# 2. Setup environment configuration
./utils/setup-env.sh dev

# 3. Review and customize .env file
nano ../../.env

# 4. Run deployment
./deploy.sh dev
```

### Subsequent Deployments

```bash
# Deploy development environment
./deploy.sh dev

# Deploy production environment
./deploy.sh prod

# Clean install (removes all data)
./deploy.sh dev --clean

# Skip database backup
./deploy.sh dev --no-backup

# Build without cache
./deploy.sh dev --no-cache
```

---

## Deployment Scripts

### Master Script: deploy.sh

Main orchestration script that runs all deployment steps in order.

```bash
./deploy.sh [dev|prod] [options]
```

**Options:**
- `--clean` - Remove all volumes and perform fresh install
- `--no-backup` - Skip database backup step
- `--no-cache` - Build Docker images without cache

**Examples:**
```bash
# Standard development deployment
./deploy.sh dev

# Production deployment with backup
./deploy.sh prod

# Clean install for development
./deploy.sh dev --clean

# Production rebuild without cache
./deploy.sh prod --no-cache

# Dev deployment, skip backup
./deploy.sh dev --no-backup
```

---

### 01-validate-environment.sh

Validates all prerequisites before deployment.

**Checks:**
- Docker and Docker Compose installed
- Environment files exist
- Required environment variables set
- JWT secrets are strong (not weak test patterns)
- Sufficient disk space available
- No port conflicts

**Usage:**
```bash
./01-validate-environment.sh [dev|prod]
```

**When it runs:**
- First step in every deployment
- Can be run standalone to check readiness

---

### 02-backup-database.sh

Creates timestamped database backups.

**Features:**
- Backs up entire database to SQL file
- Timestamps: `backup_YYYYMMDD_HHMMSS.sql`
- Stores in `deploy/backups/`
- Keeps last 7 backups (auto-cleanup)
- Skips if database doesn't exist yet

**Usage:**
```bash
./02-backup-database.sh [dev|prod]
```

**When it runs:**
- Before deploying when data exists
- Skipped if `--no-backup` flag used
- Skipped if `--clean` flag used

**Manual backup:**
```bash
# Backup dev database
./02-backup-database.sh dev

# Backup prod database
./02-backup-database.sh prod
```

---

### 03-build-images.sh

Builds Docker images for backend and frontend.

**Features:**
- Multi-stage Docker builds
- Optimized for production
- Optional cache busting
- Progress indication
- Build verification

**Usage:**
```bash
./03-build-images.sh [dev|prod] [--no-cache]
```

**Examples:**
```bash
# Build dev images
./03-build-images.sh dev

# Build prod images without cache
./03-build-images.sh prod --no-cache
```

---

### 04-deploy-database.sh

Deploys MySQL and Redis services.

**Features:**
- Starts MySQL database
- Starts Redis cache
- Waits for health checks
- 30-second timeout per service
- Automatic retry mechanism

**Usage:**
```bash
./04-deploy-database.sh [dev|prod]
```

**Health checks:**
- MySQL: `mysqladmin ping`
- Redis: `redis-cli ping`

---

### 05-deploy-backend.sh

Deploys NestJS backend API.

**Features:**
- Starts backend service
- Waits for healthy status (up to 60 seconds)
- Runs database migrations automatically
- Verifies health endpoint
- Shows logs on failure

**Usage:**
```bash
./05-deploy-backend.sh [dev|prod]
```

**What happens:**
1. Backend container starts
2. Migrations run automatically (if `DB_RUN_MIGRATIONS=true`)
3. NestJS application starts
4. Health check at `/api/v1/health`

---

### 06-deploy-frontend.sh

Deploys Next.js frontend application.

**Features:**
- Starts frontend service
- Waits for running status (up to 30 seconds)
- Verifies port accessibility
- Shows logs on failure

**Usage:**
```bash
./06-deploy-frontend.sh [dev|prod]
```

**Ports:**
- Development: 3001
- Production: 3001

---

### 07-verify-deployment.sh

Comprehensive deployment verification.

**Checks:**
- All containers running
- Container health status
- Database schema (table count)
- Backend API responding
- Frontend port accessible
- Recent logs for errors

**Usage:**
```bash
./07-verify-deployment.sh [dev|prod]
```

**Success criteria:**
- All 4 services running (mysql, redis, backend, frontend)
- Health checks passing
- At least 10 database tables
- API health endpoint returns success
- No critical errors in logs

**When it runs:**
- Final step of every deployment
- Can be run standalone for health check

---

## Utility Scripts

Located in `/deploy/scripts/utils/`

### setup-env.sh
Creates and configures environment files with secure secrets.

```bash
./utils/setup-env.sh [dev|prod]
```

See [utils/README.md](utils/README.md) for details.

### switch-env.sh
Switches between development and production environments.

```bash
./utils/switch-env.sh <dev|prod>
```

### compare-env.sh
Compares dev and prod environment configurations.

```bash
./utils/compare-env.sh
```

---

## Migration Management

Located in `/backend/scripts/migrations/`

### Available Scripts

- **generate.sh** - Auto-generate migration from entity changes
- **create-empty.sh** - Create blank migration for manual SQL
- **run.sh** - Execute pending migrations
- **revert.sh** - Rollback last migration(s)
- **status.sh** - Show migration status
- **validate.sh** - Validate schema consistency

### Quick Examples

```bash
cd backend/scripts/migrations

# Generate migration after changing entities
./generate.sh AddEmailVerification dev

# Create empty migration for custom SQL
./create-empty.sh AddCustomIndexes

# Run pending migrations
./run.sh dev

# Check status
./status.sh dev

# Validate schema
./validate.sh dev
```

See [/backend/scripts/migrations/README.md](../../backend/scripts/migrations/README.md) for complete guide.

---

## Deployment Modes

### Development Mode

**Purpose:** Local development and testing

**Characteristics:**
- Uses `.env` and `docker-compose.yml`
- `NODE_ENV=development`
- Debug logging enabled
- Relaxed security settings
- Local email testing
- Hot-reload enabled

**Command:**
```bash
./deploy.sh dev
```

**Ports:**
- MySQL: 3306
- Redis: 6379
- Backend: 3000
- Frontend: 3001

---

### Production Mode

**Purpose:** Production deployment or production-like testing

**Characteristics:**
- Uses `.env.production` and `docker-compose.prod.yml`
- `NODE_ENV=production`
- Optimized builds
- Production logging
- Strict security settings
- Real email service
- Performance optimizations

**Command:**
```bash
./deploy.sh prod
```

**Ports:**
- MySQL: 3306
- Redis: 6379
- Backend: 3000
- Frontend: 3001

---

## Common Workflows

### Workflow 1: Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd ternantapp

# 2. Setup development environment
cd deploy/scripts
./utils/setup-env.sh dev

# 3. Review and customize environment
nano ../../.env

# 4. Deploy
./deploy.sh dev

# 5. Create super admin
docker exec apartment-backend npm run seed:super-admin

# 6. Access application
# Frontend: http://localhost:3001
# Backend: http://localhost:3000/api/v1
```

---

### Workflow 2: Regular Development Deployment

```bash
# 1. Pull latest changes
git pull

# 2. Deploy with rebuild
cd deploy/scripts
./deploy.sh dev --no-cache

# 3. Run new migrations (if any)
cd ../../backend/scripts/migrations
./run.sh dev

# 4. Verify deployment
cd ../../../deploy/scripts
./07-verify-deployment.sh dev
```

---

### Workflow 3: Production Deployment

```bash
# 1. Setup production environment (first time only)
./utils/setup-env.sh prod
nano ../../.env.production

# 2. Switch to production
./utils/switch-env.sh prod

# 3. Backup current database
./02-backup-database.sh prod

# 4. Deploy
./deploy.sh prod

# 5. Verify
./07-verify-deployment.sh prod

# 6. Monitor logs
docker compose -f ../../docker-compose.prod.yml logs -f
```

---

### Workflow 4: Clean Installation

```bash
# WARNING: This will delete all data!

# 1. Backup if needed
./02-backup-database.sh dev

# 2. Clean install
./deploy.sh dev --clean

# 3. Verify
./07-verify-deployment.sh dev

# 4. Seed data
docker exec apartment-backend npm run seed:super-admin
```

---

### Workflow 5: Handling Failed Deployment

```bash
# 1. Check deployment status
./07-verify-deployment.sh dev

# 2. Check container logs
docker compose logs backend
docker compose logs frontend

# 3. Check specific service
docker compose ps

# 4. Restart specific service
docker compose restart backend

# 5. Re-verify
./07-verify-deployment.sh dev

# 6. If still failing, clean reinstall
./deploy.sh dev --clean
```

---

### Workflow 6: Database Migration Updates

```bash
# 1. Modify entity file (e.g., add column to User entity)
# 2. Generate migration
cd backend/scripts/migrations
./generate.sh AddUserColumn dev

# 3. Review generated migration
# 4. Run migration
./run.sh dev

# 5. Validate schema
./validate.sh dev

# 6. Test application
# 7. Commit migration file
git add backend/src/database/migrations/*
git commit -m "Add user column migration"
```

---

## Troubleshooting

### Issue: Deployment Fails at Validation

**Symptoms:**
- Script exits at step 1
- Missing environment files error
- Weak JWT secret warning

**Solutions:**
```bash
# Setup environment properly
./utils/setup-env.sh dev

# Or manually check
cat ../../.env

# Ensure JWT secrets are strong (48+ characters)
```

---

### Issue: Database Won't Start

**Symptoms:**
- MySQL container exits immediately
- Health check fails
- "Cannot connect to database" errors

**Solutions:**
```bash
# Check logs
docker compose logs mysql

# Common causes:
# 1. Port 3306 already in use
sudo lsof -i :3306

# 2. Corrupted data volume
docker compose down -v
./deploy.sh dev --clean

# 3. Permission issues
# Check docker volume permissions
```

---

### Issue: Backend Fails to Start

**Symptoms:**
- Backend container unhealthy
- Migration errors in logs
- Application won't connect to database

**Solutions:**
```bash
# Check backend logs
docker compose logs backend

# Check if database is ready
docker exec apartment-mysql mysqladmin -u root -p${DB_ROOT_PASSWORD} ping

# Verify migrations
cd backend/scripts/migrations
./status.sh dev

# If migration issues, revert and fix
./revert.sh dev 1
# Fix migration file
./run.sh dev
```

---

### Issue: Frontend Shows Blank Page

**Symptoms:**
- Frontend container running but page blank
- 404 errors for static files
- Console shows network errors

**Solutions:**
```bash
# Check frontend logs
docker compose logs frontend

# Verify CORS settings in .env
# Ensure CORS_ORIGINS includes frontend URL

# Rebuild frontend
./03-build-images.sh dev --no-cache
docker compose restart frontend

# Check if backend is accessible
curl http://localhost:3000/api/v1/health
```

---

### Issue: "Port Already in Use"

**Symptoms:**
- Container won't start
- "Bind for 0.0.0.0:XXXX failed: port is already allocated"

**Solutions:**
```bash
# Find process using port
sudo lsof -i :3306   # MySQL
sudo lsof -i :6379   # Redis
sudo lsof -i :3000   # Backend
sudo lsof -i :3001   # Frontend

# Kill process or change port in .env

# Or stop all Docker containers
docker compose down
docker compose -f docker-compose.prod.yml down
```

---

### Issue: Migrations Out of Sync

**Symptoms:**
- Table doesn't exist errors
- Column not found errors
- Migration timestamp issues

**Solutions:**
```bash
# Check migration status
cd backend/scripts/migrations
./status.sh dev

# Validate schema
./validate.sh dev

# If InitialSchema not first, fix timestamp
# Ensure InitialSchema is: 1733594000000-InitialSchema.ts

# Clean reinstall if severely out of sync
cd ../../deploy/scripts
./deploy.sh dev --clean
```

---

### Issue: Containers Keep Restarting

**Symptoms:**
- Container status shows "Restarting"
- Health checks failing repeatedly

**Solutions:**
```bash
# Check what's failing
docker compose ps

# See container logs
docker compose logs <service-name>

# Common causes:
# 1. Application crash - check logs
# 2. Health check misconfigured
# 3. Dependency not ready (e.g., database)

# Temporary: disable health check
# Edit docker-compose.yml, comment out healthcheck section
# Then restart
```

---

## Best Practices

### 1. Always Backup Before Production Deployments

```bash
# Manual backup before critical changes
./02-backup-database.sh prod
```

### 2. Test in Development First

Never deploy untested changes directly to production.

```bash
# Test in dev
./deploy.sh dev
# Run tests
# Then deploy to prod
./deploy.sh prod
```

### 3. Use Clean Install Sparingly

Clean install deletes all data. Use only when necessary.

```bash
# Backup first!
./02-backup-database.sh dev
# Then clean install
./deploy.sh dev --clean
```

### 4. Monitor Logs After Deployment

```bash
# Watch logs in real-time
docker compose logs -f

# Check for errors
docker compose logs | grep -i error
```

### 5. Keep Environment Files Secure

- Never commit .env or .env.production to git
- Restrict access to production secrets
- Rotate secrets periodically

### 6. Validate After Migrations

```bash
# Always validate after running migrations
cd backend/scripts/migrations
./run.sh dev
./validate.sh dev
```

### 7. Use Descriptive Migration Names

```bash
# Good
./generate.sh AddEmailVerificationToUsers dev

# Bad
./generate.sh UpdateUsers dev
```

### 8. Document Environment-Specific Configurations

Keep notes on what's different between dev and prod:

```bash
# Compare environments
./utils/compare-env.sh
```

### 9. Regular Health Checks

```bash
# Run verification regularly
./07-verify-deployment.sh dev
```

### 10. Version Control Migrations

Always commit migration files immediately after creation.

```bash
cd backend/scripts/migrations
./generate.sh AddNewFeature dev
git add ../../src/database/migrations/*
git commit -m "Add migration for new feature"
```

---

## Environment Variables Reference

### Critical Variables

**Application:**
- `NODE_ENV` - development | production
- `APP_PORT` - Backend port (3000)
- `FRONTEND_PORT` - Frontend port (3001)

**Database:**
- `DB_HOST` - Database host (mysql for Docker, localhost for local)
- `DB_PORT` - Database port (3306)
- `DB_USERNAME` - Database user
- `DB_PASSWORD` - Database password
- `DB_DATABASE` - Database name
- `DB_RUN_MIGRATIONS` - Auto-run migrations (true/false)

**Security:**
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `JWT_REFRESH_SECRET` - Refresh token secret
- `JWT_EXPIRATION` - Access token expiry (15m)
- `JWT_REFRESH_EXPIRATION` - Refresh token expiry (7d)

**Redis:**
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port (6379)
- `REDIS_PASSWORD` - Redis password

**CORS:**
- `CORS_ORIGINS` - Allowed origins (comma-separated)

**Email:**
- `SMTP_HOST` - SMTP server
- `SMTP_PORT` - SMTP port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `EMAIL_FROM` - Default sender email

---

## Scripts Summary

| Script | Purpose | Usage |
|--------|---------|-------|
| `deploy.sh` | Master orchestrator | `./deploy.sh [dev\|prod] [options]` |
| `01-validate-environment.sh` | Prerequisites check | `./01-validate-environment.sh [dev\|prod]` |
| `02-backup-database.sh` | Database backup | `./02-backup-database.sh [dev\|prod]` |
| `03-build-images.sh` | Build Docker images | `./03-build-images.sh [dev\|prod] [--no-cache]` |
| `04-deploy-database.sh` | Deploy MySQL + Redis | `./04-deploy-database.sh [dev\|prod]` |
| `05-deploy-backend.sh` | Deploy backend API | `./05-deploy-backend.sh [dev\|prod]` |
| `06-deploy-frontend.sh` | Deploy frontend app | `./06-deploy-frontend.sh [dev\|prod]` |
| `07-verify-deployment.sh` | Verify deployment | `./07-verify-deployment.sh [dev\|prod]` |
| `utils/setup-env.sh` | Setup environment | `./utils/setup-env.sh [dev\|prod]` |
| `utils/switch-env.sh` | Switch environment | `./utils/switch-env.sh <dev\|prod>` |
| `utils/compare-env.sh` | Compare environments | `./utils/compare-env.sh` |

---

## Support

For issues or questions:
1. Check this documentation
2. Review script comments
3. Check logs: `docker compose logs`
4. See troubleshooting section above

---

## Related Documentation

- [Migration Management Guide](../../backend/scripts/migrations/README.md)
- [Utility Scripts Guide](utils/README.md)
- [Database Schema Management](../../backend/docs/SCHEMA_MANAGEMENT.md)
- [Docker Compose Configuration](../../docker-compose.yml)
