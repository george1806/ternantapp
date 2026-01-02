# Apartment Management System - Deployment Scripts

Complete automated deployment system with modular, functional approach for both development and production environments.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Deployment Scripts](#deployment-scripts)
4. [Utility Scripts](#utility-scripts)
5. [Admin User Management](#admin-user-management)
6. [Common Workflows](#common-workflows)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Architecture

```
Apartment Management System
├── MySQL Database (Port 3306)
├── Redis Cache (Port 6379)
├── Backend API - NestJS (Port 3000)
└── Frontend App - Next.js (Port 3001)
```

### Deployment Approach

**Modular Service Deployment**: Each service has its own deployment script with built-in dependency checking and health validation.

**Functional Design**: All scripts use a clean functional approach with:
- Color-coded output helpers
- Validation functions
- Reusable deployment functions
- Clear error handling
- Health check monitoring

---

## Quick Start

### Option 1: Deploy All Services (Recommended for First-Time)

```bash
# Deploy all services in correct order
./deploy-all.sh prod
```

### Option 2: Deploy Individual Services

```bash
# Deploy in order (respects dependencies)
./deploy-01-mysql.sh prod
./deploy-02-redis.sh prod
./deploy-03-backend.sh prod
./deploy-04-frontend.sh prod
```

### Create Admin User

```bash
# Non-interactive (for automation)
./create-default-admin.sh prod

# Interactive (custom credentials)
./create-super-admin.sh prod
```

---

## Deployment Scripts

### Core Deployment Scripts

| Script | Purpose | Dependencies | Features |
|--------|---------|--------------|----------|
| `deploy-01-mysql.sh` | Deploy MySQL database | None | Health monitoring, auto-recovery |
| `deploy-02-redis.sh` | Deploy Redis cache | None | Health monitoring, persistence check |
| `deploy-03-backend.sh` | Deploy NestJS API | MySQL, Redis | Dependency validation, migrations, health endpoint test |
| `deploy-04-frontend.sh` | Deploy Next.js app | Backend | Dependency validation, build optimization |
| `deploy-all.sh` | Master orchestrator | None | Runs all scripts in order, summary report |

**Usage Pattern:**
```bash
./deploy-XX-<service>.sh [prod|dev]
```

**Features:**
- ✅ Automatic dependency checking
- ✅ Health status monitoring
- ✅ Clear error messages with logs
- ✅ Color-coded output
- ✅ No manual intervention required

---

## Utility Scripts

### Pre/Post Deployment Tools

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `01-validate-environment.sh` | Validate .env configuration | Before deployment |
| `02-backup-database.sh` | Backup MySQL database | Before updates/changes |
| `07-verify-deployment.sh` | Comprehensive deployment check | After deployment |
| `health-check.sh` | Quick health status | Anytime |

### Environment Management (utils/)

| Script | Purpose |
|--------|---------|
| `utils/setup-env.sh` | Setup .env from template |
| `utils/compare-env.sh` | Compare env files |
| `utils/switch-env.sh` | Switch between environments |

---

## Admin User Management

### create-default-admin.sh

**Purpose**: Create default admin user (non-interactive, automation-friendly)

**Credentials Source**: Reads from environment variables in `.env.production`:
- `DEFAULT_ADMIN_EMAIL` - Admin email address
- `DEFAULT_ADMIN_PASSWORD` - Admin password (minimum 8 characters)
- `DEFAULT_ADMIN_FIRST_NAME` - First name (optional, defaults to 'Super')
- `DEFAULT_ADMIN_LAST_NAME` - Last name (optional, defaults to 'Admin')

**Usage**:
```bash
# 1. Set credentials in .env.production:
#    DEFAULT_ADMIN_EMAIL=admin@your-domain.com
#    DEFAULT_ADMIN_PASSWORD=YourStrongPassword123!

# 2. Run the script:
./create-default-admin.sh prod

# ⚠️ SECURITY: Use strong passwords and change immediately after first login!
```

### create-super-admin.sh

**Purpose**: Create custom admin user (interactive)

**Usage**:
```bash
./create-super-admin.sh prod

# Prompts for:
# - Email address
# - Password (hidden input)
# - First name
# - Last name
```

---

## Common Workflows

### Initial Production Deployment

```bash
# 1. Validate environment
./01-validate-environment.sh prod

# 2. Deploy all services
./deploy-all.sh prod

# 3. Create admin user
./create-default-admin.sh prod

# 4. Verify deployment
./07-verify-deployment.sh prod
```

### Update Deployment

```bash
# 1. Backup database
./02-backup-database.sh prod

# 2. Redeploy services (rebuilds images)
./deploy-03-backend.sh prod    # If backend changed
./deploy-04-frontend.sh prod   # If frontend changed

# 3. Verify
./health-check.sh
```

### Check System Health

```bash
# Quick check
./health-check.sh

# Comprehensive check
./07-verify-deployment.sh prod
```

### Switch Environments

```bash
# Switch to production
./utils/switch-env.sh prod

# Switch to development
./utils/switch-env.sh dev
```

---

## Deployment Script Architecture

### Functional Structure

Each deployment script follows this pattern:

```bash
# 1. Color Definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
...

# 2. Global Variables
ENVIRONMENT=${1:-prod}
SERVICE_NAME="..."

# 3. Helper Functions
print_success() { ... }
print_error() { ... }

# 4. Validation Functions
validate_environment_file() { ... }
validate_dependencies() { ... }

# 5. Deployment Functions
start_service() { ... }
wait_for_healthy() { ... }
show_status() { ... }

# 6. Main Function
deploy_<service>() {
    validate_environment_file
    validate_dependencies
    start_service
    wait_for_healthy
    show_status
}

# 7. Entry Point
deploy_<service>
```

### Benefits

- **Modularity**: Each function has single responsibility
- **Reusability**: Helper functions shared across scripts
- **Testability**: Functions can be tested independently
- **Readability**: Clear execution flow
- **Maintainability**: Easy to modify and extend

---

## Troubleshooting

### Container Not Healthy

```bash
# Check logs
docker logs apartment-backend --tail 100

# Check status
docker ps --filter "name=apartment-"

# Restart service
./deploy-03-backend.sh prod
```

### Dependency Check Fails

```bash
# Check if dependency is running
docker ps --filter "name=apartment-mysql"

# Redeploy dependency
./deploy-01-mysql.sh prod

# Then redeploy dependent service
./deploy-03-backend.sh prod
```

### Environment Variable Issues

```bash
# Validate configuration
./01-validate-environment.sh prod

# Compare with example
./utils/compare-env.sh

# Recreate from template
cp .env.production.example .env.production
# Edit .env.production with your values
```

### Port Conflicts

```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :3001

# Kill the process
sudo kill -9 <PID>

# Redeploy
./deploy-all.sh prod
```

---

## Environment Variables

### Production (.env.production)

Required variables are validated before deployment:
- `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`, `JWT_REFRESH_SECRET` (min 32 chars)
- `CORS_ORIGINS`
- `SMTP_*` (email configuration)

See `.env.production.example` for full list with documentation.

### Development (.env)

Similar to production but with different naming:
- `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- Simpler configuration
- Less strict validation

---

## Best Practices

1. **Always validate before deploying**
   ```bash
   ./01-validate-environment.sh prod
   ```

2. **Backup before updates**
   ```bash
   ./02-backup-database.sh prod
   ```

3. **Use deploy-all.sh for clean installations**
   ```bash
   ./deploy-all.sh prod
   ```

4. **Monitor health regularly**
   ```bash
   ./health-check.sh
   ```

5. **Change default admin password immediately**
   ```bash
   # After using create-default-admin.sh
   # Login and change password in UI
   ```

6. **Keep secrets secure**
   - Never commit `.env.production` to git
   - Use strong, random secrets for JWT
   - Rotate secrets regularly

---

## Support

For issues or questions:
- Check logs: `docker logs apartment-<service>`
- Run health check: `./health-check.sh`
- Verify deployment: `./07-verify-deployment.sh prod`
- Review environment: `./01-validate-environment.sh prod`

---

## Script Reference

### All Available Scripts

```
deploy/scripts/
├── deploy-01-mysql.sh          # Deploy MySQL database
├── deploy-02-redis.sh          # Deploy Redis cache
├── deploy-03-backend.sh        # Deploy NestJS backend
├── deploy-04-frontend.sh       # Deploy Next.js frontend
├── deploy-all.sh               # Deploy all services
├── create-default-admin.sh     # Create default admin
├── create-super-admin.sh       # Create custom admin
├── 01-validate-environment.sh  # Validate configuration
├── 02-backup-database.sh       # Backup database
├── 07-verify-deployment.sh     # Verify deployment
├── health-check.sh             # Quick health check
└── utils/
    ├── setup-env.sh            # Setup environment
    ├── compare-env.sh          # Compare configurations
    └── switch-env.sh           # Switch environments
```
