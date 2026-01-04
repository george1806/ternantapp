# TernantApp - Production Deployment Guide

**Last Updated:** January 2026
**Version:** 1.0.0
**Deployment Method:** Modular Docker Compose with Automated Scripts

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Environment Setup](#environment-setup)
5. [Deployment Methods](#deployment-methods)
6. [Post-Deployment](#post-deployment)
7. [Database Management](#database-management)
8. [Security Hardening](#security-hardening)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)
11. [Rollback Procedures](#rollback-procedures)

---

## Overview

### Architecture

```
TernantApp Production Stack
├── MySQL 8.0          (Port 3306) - Primary database
├── Redis 7.0          (Port 6379) - Cache & sessions
├── Backend API        (Port 3000) - NestJS application
└── Frontend App       (Port 3001) - Next.js 15 SSR
```

### Deployment Approach

**Modular Service Deployment**: Each service deploys independently with:
- ✅ Automatic dependency validation
- ✅ Health check monitoring
- ✅ Zero-downtime deployment support
- ✅ Automatic database migrations
- ✅ Built-in rollback capabilities

---

## Prerequisites

### System Requirements

**Operating System:**
- Ubuntu 20.04+ LTS (Recommended)
- Debian 11+
- CentOS/RHEL 8+
- Amazon Linux 2023
- Any Linux with Docker support

**Minimum Hardware:**
```
CPU:     2 cores (4+ recommended)
RAM:     4GB (8GB+ recommended)
Disk:    20GB free space (50GB+ recommended)
Network: Stable internet connection
```

### Required Software

```bash
# 1. Docker Engine 24.0+
docker --version
# Expected: Docker version 24.0.0 or higher

# 2. Docker Compose V2
docker compose version
# Expected: Docker Compose version v2.20.0 or higher

# 3. Standard Linux utilities (pre-installed)
bash --version  # Bash 4.0+
curl --version
grep --version
```

**Installation (Ubuntu/Debian):**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (optional, avoid sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

---

## Pre-Deployment Checklist

### 1. System Validation

```bash
# Navigate to project directory
cd /path/to/ternantapp

# Run environment validation
chmod +x deploy/scripts/*.sh
./deploy/scripts/01-validate-environment.sh prod
```

**Validation Checks:**
- ✅ Docker and Docker Compose installed
- ✅ Environment file exists (.env.production)
- ✅ All required environment variables set
- ✅ Secrets are strong (32+ characters)
- ✅ Sufficient disk space (10GB+)
- ✅ No port conflicts

### 2. Firewall Configuration

```bash
# Allow application ports (if using UFW)
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # Backend API (if exposed)
sudo ufw allow 3001/tcp    # Frontend (if exposed)

# Optional: Database access (restrict to localhost in production)
# sudo ufw allow from <trusted-ip> to any port 3306
```

### 3. DNS Configuration

Point your domain to the server:
```
Type    Name              Value
A       ternantapp.com    <your-server-ip>
A       www               <your-server-ip>
```

---

## Environment Setup

### 1. Clone Repository

```bash
# Clone from repository
git clone https://github.com/your-org/ternantapp.git
cd ternantapp

# Checkout production branch
git checkout main
```

### 2. Create Production Environment File

```bash
# Copy example file
cp .env.example .env.production

# Edit with production values
nano .env.production
```

### 3. Environment Variables Reference

```bash
# ================================================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ================================================================

# --------------------------------
# Network Configuration
# --------------------------------
NETWORK_NAME=apartment_network

# --------------------------------
# MySQL Database
# --------------------------------
MYSQL_CONTAINER_NAME=apartment-mysql
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_NAME=apartment_management
DATABASE_USER=apartment_user
DATABASE_PASSWORD=<CHANGE-ME-STRONG-PASSWORD-32-CHARS>
MYSQL_ROOT_PASSWORD=<CHANGE-ME-ROOT-PASSWORD-32-CHARS>
MYSQL_EXTERNAL_PORT=3306

# Database Configuration
DB_POOL_SIZE=20
DB_POOL_ACQUIRE_TIMEOUT=30000
DB_SYNCHRONIZE=false              # MUST be false in production
DB_RUN_MIGRATIONS=true            # Auto-run migrations on startup
DB_LOGGING=false

# --------------------------------
# Redis Cache
# --------------------------------
REDIS_CONTAINER_NAME=apartment-redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<CHANGE-ME-REDIS-PASSWORD-32-CHARS>
REDIS_DB=0
REDIS_TTL=3600
REDIS_EXTERNAL_PORT=6379

# --------------------------------
# Backend API
# --------------------------------
BACKEND_CONTAINER_NAME=apartment-backend
BACKEND_EXTERNAL_PORT=3000
BACKEND_INTERNAL_PORT=3000
NODE_ENV=production
API_PREFIX=api/v1
APP_NAME=Apartment Management
BASE_URL=https://ternantapp.com
FRONTEND_URL=https://ternantapp.com

# JWT Authentication
JWT_SECRET=<GENERATE-STRONG-SECRET-MIN-64-CHARS>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<GENERATE-DIFFERENT-SECRET-MIN-64-CHARS>
JWT_REFRESH_EXPIRES_IN=7d

# Session Configuration (Redis-based)
SESSION_PREFIX=sess:
SESSION_TTL=900                   # 15 minutes (matches JWT)
REFRESH_SESSION_PREFIX=refresh:
REFRESH_SESSION_TTL=604800        # 7 days

# --------------------------------
# Frontend Application
# --------------------------------
FRONTEND_CONTAINER_NAME=apartment-frontend
FRONTEND_EXTERNAL_PORT=3001
FRONTEND_INTERNAL_PORT=3001
NEXT_PUBLIC_API_URL=https://ternantapp.com/api/v1
NEXT_PUBLIC_APP_NAME=TernantApp

# --------------------------------
# Email Configuration
# --------------------------------
MAIL_PROVIDER=brevo               # or 'smtp', 'mailpit' for dev
MAIL_FROM_NAME=TernantApp
MAIL_FROM_EMAIL=noreply@ternantapp.com

# SMTP Settings (if using SMTP provider)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your-smtp-user>
SMTP_PASS=<your-smtp-password>
SMTP_FROM_NAME=TernantApp
SMTP_FROM_EMAIL=noreply@ternantapp.com
SMTP_SECURE=false

# --------------------------------
# Security & Rate Limiting
# --------------------------------
CORS_ORIGINS=https://ternantapp.com,https://www.ternantapp.com
THROTTLE_TTL=60
THROTTLE_LIMIT=100
CSRF_ENABLED=true
HELMET_ENABLED=true

# --------------------------------
# Features & Monitoring
# --------------------------------
FEATURE_TENANT_PORTAL=true
FEATURE_FILE_UPLOAD=true
FEATURE_AUDIT_LOG=true
FEATURE_QUEUE_ENABLED=true
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true

# --------------------------------
# Timezone & Localization
# --------------------------------
TIMEZONE=UTC
DEFAULT_CURRENCY=USD

# --------------------------------
# Build Configuration
# --------------------------------
BUILD_CONTEXT=.
BACKEND_DOCKERFILE=backend/Dockerfile
FRONTEND_DOCKERFILE=frontend/Dockerfile
BUILD_TARGET=production

# --------------------------------
# Container Management
# --------------------------------
RESTART_POLICY=always
LOG_DRIVER=json-file
LOG_MAX_SIZE=10m
LOG_MAX_FILE=5
HEALTH_CHECK_INTERVAL=30s
HEALTH_CHECK_TIMEOUT=10s
HEALTH_CHECK_RETRIES=3
HEALTH_CHECK_START_PERIOD=60s

# --------------------------------
# Volume Names
# --------------------------------
MYSQL_DATA_VOLUME_NAME=apartment_mysql_data
REDIS_DATA_VOLUME_NAME=apartment_redis_data
BACKEND_LOGS_VOLUME_NAME=apartment_backend_logs
UPLOADS_VOLUME_NAME=apartment_uploads
```

### 4. Generate Strong Secrets

```bash
# Generate JWT secrets (64 characters)
openssl rand -base64 48

# Generate database passwords (32 characters)
openssl rand -base64 24

# Or use this helper script
for i in {1..3}; do
  echo "Secret $i: $(openssl rand -base64 48)"
done
```

**CRITICAL SECURITY:**
- ✅ JWT_SECRET must be 64+ characters
- ✅ All passwords must be 32+ characters
- ✅ Never reuse secrets across environments
- ✅ Store secrets in secure vault (not in git)

---

## Deployment Methods

### Method 1: Full Deployment (Recommended for First Time)

Deploys all services in correct dependency order with validation.

```bash
# 1. Validate environment first
./deploy/scripts/01-validate-environment.sh prod

# 2. Deploy all services
./deploy/scripts/deploy-all.sh prod

# Expected output:
# ========================================
# Deploying All Services
# Environment: prod
# ========================================
#
# [1/4] Deploying MySQL Database...
# ✓ MySQL deployed successfully
#
# [2/4] Deploying Redis Cache...
# ✓ Redis deployed successfully
#
# [3/4] Deploying Backend API...
# ✓ Backend deployed successfully
#
# [4/4] Deploying Frontend App...
# ✓ Frontend deployed successfully
#
# ========================================
# ✓ All services deployed successfully!
# ========================================
```

### Method 2: Modular Deployment (Individual Services)

Deploy services independently (respects dependency order).

```bash
# Step 1: Deploy MySQL (no dependencies)
./deploy/scripts/deploy-01-mysql.sh prod

# Step 2: Deploy Redis (no dependencies)
./deploy/scripts/deploy-02-redis.sh prod

# Step 3: Deploy Backend (requires MySQL + Redis)
./deploy/scripts/deploy-03-backend.sh prod

# Step 4: Deploy Frontend (requires Backend)
./deploy/scripts/deploy-04-frontend.sh prod
```

**When to use Modular Deployment:**
- Updating a single service
- Debugging specific component
- Selective rollback
- Resource-constrained deployments

### Method 3: Quick Restart (No Rebuild)

For configuration changes without code changes.

```bash
# Restart specific service
docker restart apartment-backend
docker restart apartment-frontend

# Restart all services
docker restart apartment-mysql apartment-redis apartment-backend apartment-frontend
```

---

## Post-Deployment

### 1. Verify Services are Running

```bash
# Check all containers
docker ps --filter "name=apartment-"

# Expected output:
# NAME                 STATUS
# apartment-mysql      Up (healthy)
# apartment-redis      Up (healthy)
# apartment-backend    Up (healthy)
# apartment-frontend   Up (healthy)
```

### 2. Run Deployment Verification

```bash
./deploy/scripts/07-verify-deployment.sh prod

# Checks:
# ✓ All containers running
# ✓ Health endpoints responding
# ✓ Database connectivity
# ✓ Redis connectivity
# ✓ API endpoints accessible
# ✓ Frontend loading
```

### 3. Create Super Admin User

**Method A: Non-Interactive (Automated)**
```bash
./deploy/scripts/create-default-admin.sh prod

# Creates:
# Email: superadmin@ternantapp.com
# Password: SuperAdmin123!@#
# Role: SUPER_ADMIN
```

**Method B: Interactive (Custom Credentials)**
```bash
./deploy/scripts/create-super-admin.sh prod

# Prompts for:
# - Email address
# - Password (with validation)
# - Name (optional)
```

### 4. Test Application Access

```bash
# Test backend health
curl http://localhost:3000/api/v1/health

# Test frontend
curl http://localhost:3001

# Test API endpoint
curl http://localhost:3000/api/v1/auth/health
```

### 5. Configure Reverse Proxy (Production)

#### Option A: Nginx (Recommended)

```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Create configuration
sudo nano /etc/nginx/sites-available/ternantapp
```

**Nginx Configuration:**
```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ternantapp.com www.ternantapp.com;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ternantapp.com www.ternantapp.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/ternantapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ternantapp.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend proxy
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
        proxy_pass http://localhost:3001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ternantapp /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Option B: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (automatic Nginx configuration)
sudo certbot --nginx -d ternantapp.com -d www.ternantapp.com

# Test auto-renewal
sudo certbot renew --dry-run

# Auto-renewal is configured via systemd timer
sudo systemctl status certbot.timer
```

---

## Database Management

### Automatic Migrations (Default)

Migrations run automatically on backend startup when `DB_RUN_MIGRATIONS=true`.

**Migration Files Location:**
```
backend/src/database/migrations/
├── 1733594000000-InitialSchema.ts
├── 1733595000000-UpdateUserRoleEnumToADMINOWNERWORKER.ts
├── 1734900000000-CreateReportSnapshotsTable.ts
├── 1735470000000-CreateInvoiceEmailLogsTable.ts
├── 1766751748000-CreateReminderSettingsAndLogsTable.ts
├── 1766866503464-MakeTenantIdNullableInReminders.ts
└── 1767000000000-UpdateWorkerToStaffAndAddAuditor.ts
```

**How It Works:**
1. Backend container starts
2. TypeORM reads `migrationsRun: true` setting
3. Checks `migrations` table in database
4. Runs all pending migrations in order
5. Updates `migrations` table with run migrations
6. Application starts after migrations complete

### Manual Migration Management

```bash
# Check migration status
docker exec apartment-backend npm run migration:show

# Run pending migrations manually
docker exec apartment-backend npm run migration:run

# Revert last migration
docker exec apartment-backend npm run migration:revert

# Generate new migration
docker exec apartment-backend npm run migration:generate -- src/database/migrations/DescriptiveName
```

### Database Backup

#### Automated Backup (Recommended)

```bash
# Run backup script
./deploy/scripts/02-backup-database.sh prod

# Creates: backups/mysql/apartment_management_YYYYMMDD_HHMMSS.sql.gz

# Schedule automated backups (crontab)
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/ternantapp/deploy/scripts/02-backup-database.sh prod
```

#### Manual Backup

```bash
# Full database backup
docker exec apartment-mysql mysqldump \
  -u apartment_user \
  -p apartment_management \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backup_*.sql

# Backup with structure only (no data)
docker exec apartment-mysql mysqldump \
  -u apartment_user \
  -p \
  --no-data \
  apartment_management \
  > schema_backup.sql
```

### Database Restore

```bash
# Extract backup
gunzip apartment_management_20260104_020000.sql.gz

# Restore to database
docker exec -i apartment-mysql mysql \
  -u apartment_user \
  -p apartment_management \
  < apartment_management_20260104_020000.sql

# Verify restoration
docker exec apartment-mysql mysql \
  -u apartment_user \
  -p apartment_management \
  -e "SHOW TABLES;"
```

---

## Security Hardening

### 1. Firewall Configuration

```bash
# Reset firewall (careful!)
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if needed)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Verify
sudo ufw status verbose
```

### 2. Secure Database Access

```bash
# Restrict database to localhost only
# In docker-compose, remove external port mapping

# Or use firewall to restrict
sudo ufw deny 3306/tcp
```

### 3. Environment Variables Security

```bash
# Set proper permissions
chmod 600 .env.production

# Verify ownership
chown $USER:$USER .env.production

# Never commit to git
echo ".env.production" >> .gitignore
```

### 4. Docker Security

```bash
# Run Docker daemon in rootless mode (optional)
dockerd-rootless-setuptool.sh install

# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1

# Regular security updates
sudo apt update && sudo apt upgrade -y
docker pull mysql:8.0
docker pull redis:7.0-alpine
```

### 5. Application Security Checklist

- ✅ JWT secrets are 64+ characters
- ✅ All passwords are strong (32+ characters)
- ✅ CORS configured for production domain only
- ✅ CSRF protection enabled (`CSRF_ENABLED=true`)
- ✅ Helmet security headers enabled
- ✅ Rate limiting configured
- ✅ HTTPS enforced (no HTTP)
- ✅ Database synchronize disabled in production
- ✅ Debug logging disabled
- ✅ Error messages don't expose system details
- ✅ File upload validation enabled
- ✅ SQL injection protection (TypeORM parameterized queries)
- ✅ XSS protection (sanitized inputs)

---

## Monitoring & Maintenance

### Health Checks

```bash
# Comprehensive health check
./deploy/scripts/health-check.sh

# Individual service health
curl http://localhost:3000/api/v1/health  # Backend
curl http://localhost:3001/api/health     # Frontend

# Database connectivity
docker exec apartment-backend npm run typeorm query "SELECT 1"

# Redis connectivity
docker exec apartment-redis redis-cli ping
```

### Logging

```bash
# View all logs
docker logs apartment-backend --tail=100 -f
docker logs apartment-frontend --tail=100 -f

# Specific time range
docker logs apartment-backend --since=1h

# Search logs
docker logs apartment-backend 2>&1 | grep ERROR

# Export logs
docker logs apartment-backend > backend_logs_$(date +%Y%m%d).log
```

### Resource Monitoring

```bash
# Container resource usage
docker stats

# Disk usage
docker system df
df -h

# Clean up unused resources
docker system prune -a --volumes

# Database size
docker exec apartment-mysql mysql -u apartment_user -p -e "
  SELECT
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
  FROM information_schema.TABLES
  WHERE table_schema = 'apartment_management'
  GROUP BY table_schema;
"
```

### Session Management

**Session Expiration (Automatic):**
- Access tokens: 15 minutes (Redis TTL)
- Refresh tokens: 7 days (Redis TTL)
- Redis automatically removes expired sessions
- Max 5 concurrent sessions per user

**Monitor Active Sessions:**
```bash
# Check Redis sessions
docker exec apartment-redis redis-cli KEYS "sess:*"

# Count active sessions
docker exec apartment-redis redis-cli KEYS "sess:*" | wc -l

# View specific session
docker exec apartment-redis redis-cli GET "sess:access:<session-id>"
```

### Application Updates

```bash
# 1. Backup database first
./deploy/scripts/02-backup-database.sh prod

# 2. Pull latest code
git pull origin main

# 3. Rebuild and redeploy
./deploy/scripts/deploy-all.sh prod

# 4. Verify deployment
./deploy/scripts/07-verify-deployment.sh prod
```

---

## Troubleshooting

### Common Issues

#### 1. Backend Won't Start

**Symptoms:**
- Container exits immediately
- Health check fails
- No response on port 3000

**Diagnosis:**
```bash
# Check container logs
docker logs apartment-backend --tail=100

# Check if database is accessible
docker exec apartment-backend npm run typeorm query "SELECT 1"

# Verify environment variables
docker exec apartment-backend env | grep -E "DB_|REDIS_|JWT_"
```

**Solutions:**
```bash
# Restart backend
docker restart apartment-backend

# Rebuild from scratch
docker stop apartment-backend
docker rm apartment-backend
./deploy/scripts/deploy-03-backend.sh prod

# Check migrations status
docker exec apartment-backend npm run migration:show
```

#### 2. Database Connection Failed

**Error:** `Error: connect ECONNREFUSED mysql:3306`

**Solutions:**
```bash
# Check MySQL is running
docker ps --filter "name=mysql"

# Check MySQL health
docker exec apartment-mysql mysqladmin ping -p

# Verify credentials
docker exec apartment-mysql mysql -u apartment_user -p apartment_management -e "SELECT 1"

# Check network
docker network inspect apartment_network
```

#### 3. Redis Connection Failed

**Error:** `Error: connect ECONNREFUSED redis:6379`

**Solutions:**
```bash
# Check Redis is running
docker ps --filter "name=redis"

# Test connection
docker exec apartment-redis redis-cli ping

# Check password
docker exec apartment-redis redis-cli -a <password> ping

# Restart Redis
docker restart apartment-redis
```

#### 4. Frontend Build Fails

**Symptoms:**
- Frontend container exits
- Blank page or 502 error
- Build errors in logs

**Solutions:**
```bash
# Clear build cache and rebuild
docker stop apartment-frontend
docker rm apartment-frontend
./deploy/scripts/deploy-04-frontend.sh prod

# Check build logs
docker logs apartment-frontend --tail=200

# Verify API connection
curl http://localhost:3000/api/v1/health
```

#### 5. Migrations Failed

**Error:** `Migration <name> has already been executed`

**Solutions:**
```bash
# Check migration status
docker exec apartment-backend npm run migration:show

# Manually mark migration as run (if safe)
docker exec -it apartment-mysql mysql -u apartment_user -p apartment_management -e "
  INSERT INTO migrations (timestamp, name)
  VALUES (1767000000000, 'MigrationName1767000000000');
"

# Or revert and re-run
docker exec apartment-backend npm run migration:revert
docker exec apartment-backend npm run migration:run
```

#### 6. Port Already in Use

**Error:** `bind: address already in use`

**Solutions:**
```bash
# Find process using port
sudo lsof -i :3000
sudo netstat -tulpn | grep 3000

# Kill process
sudo kill -9 <PID>

# Or change port in .env.production
BACKEND_EXTERNAL_PORT=3100
```

### Log Analysis

```bash
# Find errors in backend logs
docker logs apartment-backend 2>&1 | grep -i error

# Find database errors
docker logs apartment-mysql 2>&1 | grep -i error

# Check for OOM (Out of Memory)
dmesg | grep -i "out of memory"

# Monitor real-time logs
docker logs apartment-backend -f | grep -E "ERROR|WARN"
```

---

## Rollback Procedures

### Quick Rollback (Configuration Only)

If issue is due to environment variable changes:

```bash
# 1. Restore previous .env.production
cp .env.production.backup .env.production

# 2. Restart affected services
docker restart apartment-backend apartment-frontend

# 3. Verify
./deploy/scripts/health-check.sh
```

### Code Rollback

If issue is due to code changes:

```bash
# 1. Backup current database
./deploy/scripts/02-backup-database.sh prod

# 2. Checkout previous version
git log --oneline -5  # Find previous commit
git checkout <previous-commit-hash>

# 3. Redeploy
./deploy/scripts/deploy-all.sh prod

# 4. Verify
./deploy/scripts/07-verify-deployment.sh prod
```

### Database Rollback

If migrations caused issues:

```bash
# 1. Stop backend (prevent further changes)
docker stop apartment-backend

# 2. Restore database from backup
docker exec -i apartment-mysql mysql -u apartment_user -p apartment_management \
  < backups/mysql/apartment_management_<timestamp>.sql

# 3. Update migrations table if needed
docker exec -it apartment-mysql mysql -u apartment_user -p apartment_management

# 4. Restart backend
docker start apartment-backend
```

### Full System Rollback

Nuclear option - complete system restore:

```bash
# 1. Stop all services
docker stop apartment-backend apartment-frontend apartment-redis apartment-mysql

# 2. Restore database
docker exec -i apartment-mysql mysql -u apartment_user -p apartment_management \
  < backups/mysql/latest_backup.sql

# 3. Checkout previous code
git checkout <stable-commit>

# 4. Deploy from scratch
./deploy/scripts/deploy-all.sh prod

# 5. Verify everything
./deploy/scripts/07-verify-deployment.sh prod
```

---

## Performance Tuning

### Database Optimization

```sql
-- Run in MySQL
USE apartment_management;

-- Check slow queries
SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;

-- Analyze tables
ANALYZE TABLE users, companies, tenants, apartments, invoices, payments;

-- Check indexes
SHOW INDEX FROM users;
```

### Redis Optimization

```bash
# Check memory usage
docker exec apartment-redis redis-cli INFO memory

# Monitor commands
docker exec apartment-redis redis-cli MONITOR

# Clear unused cache (careful!)
docker exec apartment-redis redis-cli FLUSHDB
```

### Application Optimization

```bash
# Backend: Enable production optimizations
# Already set in .env.production:
NODE_ENV=production           # Enables production mode
DB_LOGGING=false             # Disable query logging
METRICS_ENABLED=true         # Enable performance metrics

# Frontend: Verify production build
docker exec apartment-frontend cat /app/frontend/.next/BUILD_ID
```

---

## Additional Resources

### Deployment Scripts Location

```
deploy/scripts/
├── 01-validate-environment.sh    # Pre-deployment validation
├── 02-backup-database.sh         # Database backup utility
├── 07-verify-deployment.sh       # Post-deployment verification
├── deploy-01-mysql.sh            # MySQL deployment
├── deploy-02-redis.sh            # Redis deployment
├── deploy-03-backend.sh          # Backend deployment
├── deploy-04-frontend.sh         # Frontend deployment
├── deploy-all.sh                 # Full stack deployment
├── create-default-admin.sh       # Create default admin
├── create-super-admin.sh         # Create custom admin
├── health-check.sh               # Health monitoring
└── teardown.sh                   # Service teardown
```

### Configuration Files

```
deploy/compose/
├── 01-mysql.yml                  # MySQL configuration
├── 02-redis.yml                  # Redis configuration
├── 03-backend.yml                # Backend configuration
└── 04-frontend.yml               # Frontend configuration
```

### Support & Documentation

- **Deployment Scripts README:** `deploy/scripts/README.md`
- **Compose Files README:** `deploy/compose/README.md`
- **Backend API Docs:** Available at `/api/docs` (if enabled)
- **Migration Guide:** `backend/docs/MIGRATIONS.md`

---

## Production Checklist

Before going live:

### Security
- [ ] All secrets are strong (64+ chars for JWT, 32+ for passwords)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Firewall configured (only 80, 443 open)
- [ ] Database not exposed externally
- [ ] Redis password protected
- [ ] CORS restricted to production domain
- [ ] `.env.production` not in git
- [ ] Docker daemon secured
- [ ] Regular security updates scheduled

### Performance
- [ ] Database indexes verified
- [ ] Redis caching enabled
- [ ] Production mode enabled (`NODE_ENV=production`)
- [ ] Database logging disabled
- [ ] Query caching configured
- [ ] Connection pooling optimized

### Monitoring
- [ ] Health checks verified
- [ ] Logging configured
- [ ] Backup automation set up
- [ ] Alerting configured (optional)
- [ ] Resource monitoring active

### Deployment
- [ ] Environment validation passed
- [ ] All services deployed and healthy
- [ ] Migrations completed successfully
- [ ] Super admin user created
- [ ] Application accessible via domain
- [ ] Reverse proxy configured
- [ ] SSL certificate valid

### Documentation
- [ ] Team trained on deployment process
- [ ] Rollback procedures documented
- [ ] Backup restoration tested
- [ ] Support contacts updated

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-04 | Initial production-ready documentation |

---

**Need Help?**

For deployment support or issues not covered here:
1. Check troubleshooting section above
2. Review deployment script logs
3. Check container logs: `docker logs apartment-<service>`
4. Contact development team

**Remember:** Always backup before making changes!
