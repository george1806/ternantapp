# Migration Guide: Old to New Deployment System

**Version**: 1.0
**Date**: 2026-01-01
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [What's Changed](#whats-changed)
3. [Prerequisites](#prerequisites)
4. [Migration Steps](#migration-steps)
5. [Verification](#verification)
6. [Rollback Plan](#rollback-plan)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Overview

This guide helps you migrate from the **old monolithic deployment approach** to the **new modular service-based deployment system**.

### Why Migrate?

| Benefit | Description |
|---------|-------------|
| **Modularity** | Deploy/update individual services without affecting others |
| **Flexibility** | Scale services independently |
| **Security** | Zero hard-coded values, all via environment variables |
| **Maintainability** | Clear separation of concerns, easier to debug |
| **Documentation** | Comprehensive docs for each service |

### Migration Impact

- ⏱️ **Estimated Time**: 15-30 minutes
- 🔄 **Downtime**: Optional (can do zero-downtime migration)
- 🔙 **Reversible**: Yes (keep old files as backup)
- ⚠️ **Risk Level**: Low (no data loss, fully tested)

---

## What's Changed

### Old Approach

```
docker-compose.prod.yml (monolithic)
├── All services in one file
├── Some hard-coded values
├── Deploy all or nothing
└── deploy.sh (orchestrator for old scripts)
```

### New Approach

```
deploy/compose/ (modular)
├── 01-mysql.yml      (MySQL only)
├── 02-redis.yml      (Redis only)
├── 03-backend.yml    (Backend only)
├── 04-frontend.yml   (Frontend only)
└── Individual deployment scripts
```

### Key Differences

| Aspect | Old System | New System |
|--------|-----------|------------|
| **Compose Files** | 1 monolithic file | 4 separate files |
| **Environment Variables** | Mixed (some hard-coded) | 100% environment variables |
| **Deployment** | All services at once | Individual or all |
| **Scripts** | 7 numbered scripts (01-07) | Service-specific scripts |
| **Dependencies** | Implicit | Explicit checks in scripts |
| **Documentation** | Basic | Comprehensive per service |

---

## Prerequisites

### 1. Backup Current Setup

```bash
# Backup current environment file
cp .env.production .env.production.backup

# Backup docker-compose.prod.yml
cp docker-compose.prod.yml docker-compose.prod.yml.backup

# Backup existing scripts
cp -r deploy/scripts deploy/scripts.backup
```

### 2. Verify Current Deployment

```bash
# Check currently running services
docker ps --filter "name=apartment-"

# Note the status of each service
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 3. Backup Database

```bash
# Create database backup before migration
cd deploy/scripts
./02-backup-database.sh prod
```

---

## Migration Steps

### Step 1: Create New Environment File

```bash
# Copy the new comprehensive template
cp .env.production.example .env.production.new

# Open both files side by side
nano .env.production      # Old file
nano .env.production.new  # New file
```

### Step 2: Migrate Environment Variables

**Map your existing variables to the new format:**

#### Database Variables

```bash
# OLD → NEW
DB_DATABASE           → DATABASE_NAME
DB_USERNAME           → DATABASE_USER
DB_PASSWORD           → DATABASE_PASSWORD

# Example migration:
# Old .env.production:
DB_DATABASE=apartment_management
DB_USERNAME=apartment_user
DB_PASSWORD=my_password

# New .env.production:
DATABASE_NAME=apartment_management
DATABASE_USER=apartment_user
DATABASE_PASSWORD=my_password
```

#### Add New Required Variables

```bash
# These are NEW and required:
NETWORK_NAME=apartment_network
MYSQL_CONTAINER_NAME=apartment-mysql
REDIS_CONTAINER_NAME=apartment-redis
BACKEND_CONTAINER_NAME=apartment-backend
FRONTEND_CONTAINER_NAME=apartment-frontend

# Database host/port (internal Docker network)
DATABASE_HOST=mysql
DATABASE_PORT=3306

# Redis configuration
REDIS_HOST=redis
REDIS_PORT=6379
```

#### Complete Variable Mapping

| Old Variable | New Variable | Notes |
|--------------|--------------|-------|
| `DB_DATABASE` | `DATABASE_NAME` | Database name |
| `DB_USERNAME` | `DATABASE_USER` | Database user |
| `DB_PASSWORD` | `DATABASE_PASSWORD` | Database password |
| `DB_HOST` | `DATABASE_HOST` | Default: `mysql` |
| `DB_PORT` | `DATABASE_PORT` | Default: `3306` |
| `REDIS_PORT_INTERNAL` | `REDIS_PORT` | Default: `6379` |
| N/A | `NETWORK_NAME` | NEW: `apartment_network` |
| N/A | `*_CONTAINER_NAME` | NEW: Container names |

### Step 3: Review and Validate New Environment File

```bash
# Check all CHANGE_ME values are updated
grep "CHANGE_ME" .env.production.new

# Ensure all required variables are set
grep "^[A-Z]" .env.production.new | grep "=$" | wc -l

# If count is 0, all variables have values ✅
```

### Step 4: Test Configuration (Dry Run)

```bash
# Validate environment variables
cd deploy/scripts
./01-validate-environment.sh prod

# If validation passes, you're ready!
```

### Step 5: Choose Migration Strategy

#### **Option A: Zero-Downtime Migration** (Recommended)

Deploy new services alongside old ones, then switch:

```bash
# 1. Deploy new services with different network
export NETWORK_NAME=apartment_network_new
export ENV_FILE=.env.production.new

# 2. Deploy all new services
cd deploy/scripts
./deploy-all.sh prod

# 3. Verify new services are healthy
docker ps --filter "name=apartment-"

# 4. Stop old services
docker compose -f ../../docker-compose.prod.yml down

# 5. Rename environment file
mv .env.production.new .env.production

# 6. Update network name back to default
# Edit .env.production and set NETWORK_NAME=apartment_network
```

#### **Option B: Stop-and-Replace** (Simpler, with downtime)

Stop old services, deploy new ones:

```bash
# 1. Stop old services
docker compose -f docker-compose.prod.yml down

# 2. Rename environment file
mv .env.production .env.production.old
mv .env.production.new .env.production

# 3. Deploy new services
cd deploy/scripts
./deploy-all.sh prod

# 4. Verify all services are running
docker ps --filter "name=apartment-"
```

---

## Verification

### 1. Check All Services Are Running

```bash
docker ps --filter "name=apartment-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Expected output:**
```
NAMES                    STATUS                  PORTS
apartment-mysql          Up (healthy)
apartment-redis          Up (healthy)
apartment-backend        Up (healthy)
apartment-frontend       Up (healthy)
```

### 2. Test Health Endpoints

```bash
# Backend health check
docker exec apartment-backend wget -qO- http://localhost:3000/api/v1/health

# Expected: {"status":"ok",...}
```

### 3. Test Database Connection

```bash
# Check backend logs for successful DB connection
docker logs apartment-backend | grep -i "database"

# Should see: "Database connected successfully" or similar
```

### 4. Test Redis Connection

```bash
# Check backend logs for Redis connection
docker logs apartment-backend | grep -i "redis"

# Should see: "Redis connected" or similar
```

### 5. Verify Application Functionality

```bash
# Test frontend (if you have Nginx configured)
curl -I http://localhost:3001

# Or access via browser
# http://your-domain.com
```

### 6. Check Data Integrity

```bash
# Verify database tables exist
docker exec apartment-mysql mysql -u${DATABASE_USER} -p${DATABASE_PASSWORD} ${DATABASE_NAME} -e "SHOW TABLES;"

# Verify Redis is working
docker exec apartment-redis redis-cli -a ${REDIS_PASSWORD} ping
```

---

## Rollback Plan

If something goes wrong, you can quickly rollback:

### Quick Rollback

```bash
# 1. Stop new services
cd deploy/scripts
docker compose -f ../compose/01-mysql.yml down
docker compose -f ../compose/02-redis.yml down
docker compose -f ../compose/03-backend.yml down
docker compose -f ../compose/04-frontend.yml down

# 2. Restore old environment file
mv .env.production.old .env.production

# 3. Start old services
cd ../..
docker compose -f docker-compose.prod.yml up -d

# 4. Verify old setup is working
docker ps --filter "name=apartment-"
```

### Restore Database Backup (if needed)

```bash
# List available backups
ls -lh deploy/backups/

# Restore from backup
cd deploy/scripts
./restore-backup.sh <backup-file-name>
```

---

## Troubleshooting

### Issue 1: Services Not Starting

**Problem**: Services fail to start after migration

**Solution**:
```bash
# Check logs for specific service
docker logs apartment-backend --tail=100

# Common issues:
# - Missing environment variables
# - Incorrect network configuration
# - Port conflicts

# Verify environment file
grep -E "^(DATABASE_|REDIS_|NETWORK_)" .env.production
```

### Issue 2: Database Connection Errors

**Problem**: Backend can't connect to MySQL

**Solution**:
```bash
# Check if MySQL is healthy
docker ps --filter "name=apartment-mysql"

# Verify network connectivity
docker exec apartment-backend ping -c 3 mysql

# Check MySQL logs
docker logs apartment-mysql --tail=50

# Verify credentials in .env.production
echo "DATABASE_HOST: $(grep DATABASE_HOST .env.production)"
echo "DATABASE_USER: $(grep DATABASE_USER .env.production)"
```

### Issue 3: Redis Connection Errors

**Problem**: Backend can't connect to Redis

**Solution**:
```bash
# Check if Redis is healthy
docker ps --filter "name=apartment-redis"

# Test Redis authentication
docker exec apartment-redis redis-cli -a ${REDIS_PASSWORD} ping

# Check Redis logs
docker logs apartment-redis --tail=50

# Verify Redis password matches in both services
grep REDIS_PASSWORD .env.production
```

### Issue 4: Network Not Found

**Problem**: Error: "network apartment_network not found"

**Solution**:
```bash
# Create the network manually
docker network create apartment_network

# Restart MySQL (it creates the network)
cd deploy/scripts
./deploy-01-mysql.sh prod
```

### Issue 5: Variable Not Substituted

**Problem**: Variables showing as ${VARIABLE_NAME} in logs

**Solution**:
```bash
# Ensure variable is defined in .env.production
grep "VARIABLE_NAME" .env.production

# If missing, add it with a value
echo "VARIABLE_NAME=value" >> .env.production

# Restart the service
docker compose -f deploy/compose/03-backend.yml restart
```

---

## Post-Migration Tasks

### 1. Update CI/CD Pipeline (if applicable)

```yaml
# Update your CI/CD to use new deployment scripts
# Example GitHub Actions:
- name: Deploy to Production
  run: |
    cd deploy/scripts
    ./deploy-all.sh prod
```

### 2. Update Documentation

Update your team docs to reference:
- New deployment scripts location
- New .env.production.example
- New compose files structure

### 3. Clean Up Old Files (Optional)

```bash
# After confirming new system works (wait 1-2 weeks)
rm docker-compose.prod.yml.backup
rm .env.production.backup
rm -rf deploy/scripts.backup
```

### 4. Update Monitoring

If you use monitoring, update scrape configs:
```yaml
# Prometheus config example
- job_name: 'apartment-backend'
  static_configs:
    - targets: ['apartment-backend:3000']
```

---

## FAQ

### Q1: Can I use both old and new systems simultaneously?

**A**: Yes, but you need different network names to avoid conflicts:
```bash
# Old system: apartment_network
# New system: apartment_network_v2
```

### Q2: Will I lose any data during migration?

**A**: No, if you follow the migration steps. The database volumes persist. Always backup first!

### Q3: Do I need to rebuild Docker images?

**A**: No, unless you want to. The new deployment scripts will rebuild if needed.

### Q4: What happens to my existing volumes?

**A**: They're preserved. The new compose files use the same volume names by default:
- `mysql_data` → `apartment_mysql_data` (configurable)
- `redis_data` → `apartment_redis_data` (configurable)

### Q5: Can I migrate one service at a time?

**A**: Yes! That's the beauty of the new system:
```bash
# Migrate just MySQL first
./deploy-01-mysql.sh prod

# Then Redis
./deploy-02-redis.sh prod

# Then Backend
./deploy-03-backend.sh prod

# Finally Frontend
./deploy-04-frontend.sh prod
```

### Q6: How do I update just the backend after migration?

**A**: Very easy now:
```bash
cd deploy/scripts
./deploy-03-backend.sh prod
```

### Q7: What if I want to keep using docker-compose.prod.yml?

**A**: You can! The new system is additive. Keep both:
- Old system: For familiarity
- New system: For modular deployments

Just make sure they don't run simultaneously on the same network.

---

## Best Practices After Migration

### 1. Regular Backups

```bash
# Set up automated backups (cron job)
0 2 * * * cd /path/to/app/deploy/scripts && ./02-backup-database.sh prod
```

### 2. Monitor Logs

```bash
# Set up log rotation
docker logs apartment-backend --tail=1000 -f

# Use deploy/scripts/logs.sh (create if needed)
```

### 3. Health Checks

```bash
# Periodically verify all services are healthy
watch -n 30 'docker ps --filter "name=apartment-" --format "table {{.Names}}\t{{.Status}}"'
```

### 4. Environment File Security

```bash
# Ensure proper permissions
chmod 600 .env.production

# Never commit to git
echo ".env.production" >> .gitignore
```

### 5. Documentation

Keep this migration guide for reference and update it with:
- Your specific environment details
- Custom configurations
- Lessons learned

---

## Support

If you encounter issues:

1. **Check logs**: `docker logs apartment-<service>`
2. **Review this guide**: Troubleshooting section
3. **Check compose files**: Verify environment variables
4. **Test connectivity**: Between services
5. **Rollback if needed**: Follow rollback plan above

---

## Conclusion

**You've successfully migrated to the new deployment system! 🎉**

### What You've Gained:

✅ **Modularity** - Deploy services independently
✅ **Flexibility** - Scale and update with ease
✅ **Security** - Zero hard-coded secrets
✅ **Maintainability** - Clear, documented structure
✅ **Reliability** - Better error handling and health checks

### Next Steps:

1. Monitor the new deployment for 24-48 hours
2. Update your team documentation
3. Remove old backup files (after 1-2 weeks)
4. Enjoy your improved deployment workflow! 🚀

---

**Document Version**: 1.0
**Last Updated**: 2026-01-01
**Maintained By**: DevOps Team
