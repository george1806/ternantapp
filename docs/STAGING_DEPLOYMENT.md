# TernantApp - Staging Deployment Guide

**Version:** 1.0.1
**Environment:** Staging
**Purpose:** Testing and validation before production
**Last Updated:** 2025-10-25

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Deployment Steps](#deployment-steps)
5. [Verification](#verification)
6. [Testing](#testing)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

### Purpose of Staging Environment

Staging is a production-like environment used for:
- ✅ Testing new features before production release
- ✅ Validating deployment procedures
- ✅ Load testing and performance benchmarking
- ✅ Training and user acceptance testing (UAT)
- ✅ Integration testing with external services

### Staging vs Production Differences

| Aspect | Staging | Production |
|--------|---------|------------|
| **Data** | Test/synthetic data | Real customer data |
| **Domain** | staging.your-domain.com | your-domain.com |
| **SSL** | Let's Encrypt or self-signed | Valid SSL certificate |
| **Monitoring** | Basic (Grafana local) | Full (+ alerts) |
| **Backups** | Weekly | Daily + hourly |
| **Resources** | Minimum specs | Recommended specs |
| **Access** | Team only | Public |

---

## 📦 Prerequisites

### Server Requirements (Minimum for Staging)

```bash
CPU: 2 cores (can share with other services)
RAM: 4GB (minimum)
Storage: 30GB SSD
OS: Ubuntu 22.04 LTS
Network: Stable internet connection
```

### Software Requirements

```bash
# Required
Docker: 24.0+
Docker Compose: 2.20+
Git: Latest

# Optional (for testing)
curl, wget
Node.js 22.x (for running tests locally)
k6 (for load testing)
```

### Access Requirements

```bash
# Server access
SSH access with sudo privileges
Firewall access to open ports

# Code access
Git repository access
Environment variable templates

# Domain
Subdomain configured (staging.your-domain.com)
DNS A record pointing to server IP
```

---

## 🔧 Environment Setup

### Step 1: Server Preparation (10 minutes)

```bash
# 1. SSH into staging server
ssh user@staging-server-ip

# 2. Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 4. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 5. Verify installations
docker --version
docker compose version

# 6. Create application directory
sudo mkdir -p /opt/ternantapp
sudo chown $USER:$USER /opt/ternantapp
cd /opt/ternantapp
```

### Step 2: Clone Repository (2 minutes)

```bash
# Clone the repository
git clone https://github.com/your-org/ternantapp.git .

# Checkout specific version (optional)
git checkout v1.0.1

# Verify files
ls -la
```

### Step 3: Configure Environment Variables (15 minutes)

```bash
# 1. Copy environment templates
cp .env.example .env.staging
cp backend/.env.production.example backend/.env.staging
cp frontend/.env.production.example frontend/.env.staging

# 2. Generate secrets
echo "=== GENERATE THESE SECRETS ==="
echo "JWT_SECRET:"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

echo "JWT_REFRESH_SECRET:"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

echo "SESSION_SECRET:"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

echo "DATABASE_PASSWORD:"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

echo "REDIS_PASSWORD:"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. Edit root .env.staging
nano .env.staging
```

**Configure `.env.staging`:**

```bash
# =================================
# STAGING ENVIRONMENT
# =================================
NODE_ENV=staging
APP_URL=https://staging.your-domain.com
NEXT_PUBLIC_API_URL=https://api-staging.your-domain.com/api/v1

# Database
MYSQL_ROOT_PASSWORD=<your-generated-root-password>
DATABASE_NAME=ternantapp_staging
DATABASE_USER=ternantapp_staging
DATABASE_PASSWORD=<your-generated-db-password>

# Redis
REDIS_PASSWORD=<your-generated-redis-password>

# JWT
JWT_SECRET=<your-generated-64-char-secret>
JWT_REFRESH_SECRET=<your-different-64-char-secret>
SESSION_SECRET=<your-generated-32-char-secret>

# CORS (allow your staging frontend)
CORS_ORIGINS=https://staging.your-domain.com,http://localhost:3000

# Rate Limiting (more permissive for testing)
THROTTLE_TTL=60
THROTTLE_LIMIT=200

# Logging (verbose for debugging)
LOG_LEVEL=debug
LOG_FILE_PATH=./logs

# Email (use test SMTP or MailHog)
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=<mailtrap-user>
MAIL_PASSWORD=<mailtrap-password>
MAIL_FROM=TernantApp Staging <staging@your-domain.com>

# Monitoring
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=staging-admin-123
```

**Configure `backend/.env.staging`:**

```bash
# Copy similar settings from root .env.staging
NODE_ENV=staging
PORT=3001
APP_URL=https://staging.your-domain.com

# Database
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_USER=ternantapp_staging
DATABASE_PASSWORD=<same-as-root>
DATABASE_NAME=ternantapp_staging

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<same-as-root>

# JWT
JWT_SECRET=<same-as-root>
JWT_REFRESH_SECRET=<same-as-root>
SESSION_SECRET=<same-as-root>

# CORS
CORS_ORIGINS=https://staging.your-domain.com,http://localhost:3000

# Logging (verbose)
LOG_LEVEL=debug
```

**Configure `frontend/.env.staging`:**

```bash
NODE_ENV=staging
NEXT_PUBLIC_API_URL=https://api-staging.your-domain.com/api/v1
```

---

## 🚀 Deployment Steps

### Automated Deployment (5 minutes)

```bash
# 1. Make deployment script executable
chmod +x deploy.sh

# 2. Run deployment with staging environment file
COMPOSE_FILE=docker-compose.prod.yml ./deploy.sh staging

# Or manually specify env file
docker compose --env-file .env.staging -f docker-compose.prod.yml up -d
```

### Manual Deployment (10 minutes)

If you prefer manual steps:

```bash
# 1. Create logging directory
mkdir -p backend/logs
chmod 755 backend/logs

# 2. Build Docker images
docker compose --env-file .env.staging -f docker-compose.prod.yml build --no-cache

# 3. Start services
docker compose --env-file .env.staging -f docker-compose.prod.yml up -d

# 4. Wait for services to be healthy (30 seconds)
sleep 30

# 5. Check service status
docker compose -f docker-compose.prod.yml ps

# 6. Run database migrations
docker exec ternantapp-backend-prod npm run migration:run

# 7. Seed staging data (optional)
docker exec ternantapp-backend-prod npm run seed:run

# 8. Start monitoring stack
docker compose --env-file .env.staging -f docker-compose.monitoring.yml up -d
```

---

## ✅ Verification

### 1. Service Health Checks (2 minutes)

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Expected output: All services "Up" and "healthy"

# Check backend health
curl http://localhost:3001/api/v1/health

# Expected:
# {
#   "status": "ok",
#   "timestamp": "2025-10-25T...",
#   "database": "connected"
# }

# Check metrics endpoint
curl http://localhost:3001/api/v1/metrics | head -20

# Expected: Prometheus metrics format

# Check frontend
curl http://localhost:3000

# Expected: HTTP 200 OK
```

### 2. Database Verification (2 minutes)

```bash
# Check database connection
docker exec ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1"

# Check tables exist
docker exec ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD" ternantapp_staging -e "SHOW TABLES"

# Check indexes were applied
docker exec ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD" ternantapp_staging -e "SHOW INDEXES FROM occupancies"

# Expected: Multiple indexes including IDX_occupancies_company_id
```

### 3. Cache Verification (1 minute)

```bash
# Check Redis is running
docker exec ternantapp-redis-prod redis-cli ping

# Expected: PONG

# Check Redis info
docker exec ternantapp-redis-prod redis-cli INFO stats

# Check cache keys
docker exec ternantapp-redis-prod redis-cli KEYS "*"
```

### 4. Monitoring Stack Verification (2 minutes)

```bash
# Check Grafana is accessible
curl http://localhost:3002

# Check Prometheus is healthy
curl http://localhost:9090/-/healthy

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job, health}'

# Expected: All targets "up"
```

### 5. Application Testing (5 minutes)

```bash
# Test super admin login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@ternantapp.com",
    "password": "SuperAdmin@2025"
  }'

# Expected: Returns access_token and refresh_token

# Save token
TOKEN="<access_token_from_above>"

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/dashboard/stats

# Expected: Returns dashboard statistics
```

---

## 🧪 Testing

### 1. Functional Testing (30 minutes)

Test all major features:

```bash
# 1. Authentication
# - Login with super admin
# - Register new user
# - Refresh token
# - Logout

# 2. Company Management
# - Create company
# - Update company
# - List companies

# 3. Property Management
# - Create compound
# - Create apartment
# - Update apartment status

# 4. Tenant Management
# - Create tenant
# - Create occupancy
# - Generate invoice
# - Record payment

# 5. Reports
# - View dashboard stats
# - Generate KPI report
# - Generate revenue report
```

### 2. Performance Testing (15 minutes)

```bash
# Install k6 if not already installed
# https://k6.io/docs/getting-started/installation/

# Run load tests
k6 run backend/test/load/k6-load-test.js

# Expected results:
# - p95 latency < 500ms
# - p99 latency < 1000ms
# - Error rate < 1%
# - All scenarios pass

# Check cache performance
# First request (uncached)
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/dashboard/stats

# Second request (cached) - should be 95% faster
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/dashboard/stats
```

### 3. Integration Testing (10 minutes)

```bash
# Run integration tests
docker exec ternantapp-backend-prod npm run test:e2e

# Expected: All tests pass
```

### 4. Security Testing (15 minutes)

```bash
# 1. Test rate limiting
for i in {1..150}; do
  curl -s http://localhost:3001/api/v1/health > /dev/null
done

# Expected: Some requests return 429 Too Many Requests

# 2. Test CORS
curl -H "Origin: https://malicious-site.com" \
  http://localhost:3001/api/v1/health

# Expected: CORS error or blocked

# 3. Test SQL injection protection
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com' OR '1'='1",
    "password": "test"
  }'

# Expected: Validation error, not SQL error

# 4. Check security headers
curl -I http://localhost:3001/api/v1/health

# Expected headers:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - Strict-Transport-Security: max-age=31536000
```

---

## 📊 Monitoring

### Access Monitoring Dashboards

```bash
# Grafana
URL: http://localhost:3002
Username: admin
Password: staging-admin-123

# Prometheus
URL: http://localhost:9090

# Metrics Endpoint
URL: http://localhost:3001/api/v1/metrics
```

### Key Metrics to Monitor in Staging

1. **Application Performance**
   - HTTP request rate
   - Response times (p50, p95, p99)
   - Error rate
   - Cache hit rate

2. **Database Performance**
   - Active connections
   - Query duration
   - Connection pool usage

3. **System Resources**
   - CPU usage
   - Memory usage
   - Disk space

4. **Business Metrics**
   - Test users created
   - Test transactions
   - Feature usage

### Setup Grafana Dashboard

```bash
# 1. Login to Grafana (http://localhost:3002)
# 2. Go to Configuration → Data Sources
# 3. Add Prometheus:
#    URL: http://prometheus:9090
# 4. Go to Dashboards → Import
# 5. Upload: backend/monitoring/grafana-dashboard.json
# 6. Verify data is showing
```

---

## 🔧 Troubleshooting

### Common Issues in Staging

#### Issue 1: Services Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend

# Common causes:
# 1. Environment variables not set
cat .env.staging

# 2. Port conflicts
sudo lsof -i :3001
sudo lsof -i :3000

# 3. Insufficient resources
docker stats

# Solutions:
# - Fix environment variables
# - Change ports in docker-compose
# - Increase server resources
```

#### Issue 2: Database Migration Fails

```bash
# Check database is accessible
docker exec ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1"

# Check migration status
docker exec ternantapp-backend-prod npm run typeorm migration:show

# Revert and retry
docker exec ternantapp-backend-prod npm run migration:revert
docker exec ternantapp-backend-prod npm run migration:run

# Check for conflicts
docker exec ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD" ternantapp_staging -e "SHOW TABLES"
```

#### Issue 3: Cache Not Working

```bash
# Check Redis
docker exec ternantapp-redis-prod redis-cli ping

# Check Redis password
docker exec ternantapp-redis-prod redis-cli -a "$REDIS_PASSWORD" ping

# Check cache keys
docker exec ternantapp-redis-prod redis-cli -a "$REDIS_PASSWORD" KEYS "*"

# Test cache manually
docker exec ternantapp-redis-prod redis-cli -a "$REDIS_PASSWORD" SET test "value"
docker exec ternantapp-redis-prod redis-cli -a "$REDIS_PASSWORD" GET test

# Clear cache if needed
docker exec ternantapp-redis-prod redis-cli -a "$REDIS_PASSWORD" FLUSHDB
```

#### Issue 4: Monitoring Not Showing Data

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check metrics endpoint is accessible
curl http://localhost:3001/api/v1/metrics

# Restart Prometheus
docker compose -f docker-compose.monitoring.yml restart prometheus

# Check Prometheus logs
docker logs ternantapp-prometheus
```

---

## 🔄 Update and Rollback

### Update Staging Environment

```bash
# 1. Backup database
docker exec ternantapp-mysql-prod mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" ternantapp_staging > backup-staging-$(date +%Y%m%d-%H%M%S).sql

# 2. Pull latest code
git pull origin main

# 3. Rebuild and deploy
./deploy.sh staging

# 4. Verify deployment
curl http://localhost:3001/api/v1/health
```

### Rollback to Previous Version

```bash
# 1. Stop current deployment
docker compose -f docker-compose.prod.yml down

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Restore database (if needed)
docker compose -f docker-compose.prod.yml up -d mysql
docker exec -i ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD" ternantapp_staging < backup-staging-YYYYMMDD-HHMMSS.sql

# 4. Redeploy
./deploy.sh staging
```

---

## 📝 Staging Checklist

### Before Testing:
- [ ] All services running and healthy
- [ ] Database migrations applied
- [ ] Database seeded with test data
- [ ] Monitoring stack operational
- [ ] Logs being written
- [ ] Cache working

### Testing Phase:
- [ ] Functional tests complete
- [ ] Performance tests run (k6)
- [ ] Integration tests passing
- [ ] Security tests conducted
- [ ] UAT sign-off received

### After Testing:
- [ ] Issues documented
- [ ] Fixes applied and retested
- [ ] Performance benchmarks recorded
- [ ] Team notified of results
- [ ] Ready for production deployment decision

---

## 📚 Additional Resources

- **Production Deployment:** See `PRODUCTION_DEPLOYMENT.md`
- **Quick Start:** `QUICK_START_PRODUCTION.md`
- **Full Guide:** `DEPLOYMENT_GUIDE.md`
- **Troubleshooting:** `PRODUCTION_IMPROVEMENTS.md`

---

**Version:** 1.0.1
**Environment:** Staging
**Last Updated:** October 25, 2025
**Author:** george1806
