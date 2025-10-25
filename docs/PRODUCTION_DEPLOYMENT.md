# TernantApp - Production Deployment Guide

**Version:** 1.0.1
**Environment:** Production
**Purpose:** Live customer-facing deployment
**Last Updated:** 2025-10-25

---

## ⚠️ CRITICAL - Read Before Deploying

**Production deployment should only be done:**
- ✅ After successful staging deployment and testing
- ✅ During scheduled maintenance windows
- ✅ With full team availability for support
- ✅ With verified backups and rollback plan
- ✅ After security audit completion

**This guide assumes you have:**
- ✅ Tested everything in staging environment
- ✅ Completed all security requirements
- ✅ Set up monitoring and alerting
- ✅ Configured SSL certificates
- ✅ Prepared rollback procedures

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Environment Setup](#environment-setup)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Rollback Procedure](#rollback-procedure)
9. [Post-Deployment Tasks](#post-deployment-tasks)

---

## 🎯 Overview

### Production Environment Characteristics

| Aspect | Configuration |
|--------|--------------|
| **Data** | Real customer data |
| **Domain** | your-domain.com |
| **SSL** | Valid commercial certificate |
| **Monitoring** | Full stack + alerts |
| **Backups** | Daily + hourly incrementals |
| **Resources** | Recommended specs (4 CPU, 8GB RAM) |
| **Access** | Public + restricted admin |
| **Availability** | 99.9% SLA target |
| **Support** | 24/7 on-call rotation |

### Critical Success Factors

1. **Zero Downtime:** Use blue-green or rolling deployment
2. **Data Integrity:** Verified backups before any changes
3. **Rollback Ready:** Tested rollback procedure
4. **Monitoring Active:** All alerts configured
5. **Team Ready:** On-call engineers available

---

## 📦 Prerequisites

### Server Requirements (Production)

```bash
CPU: 4 cores minimum (8 cores recommended)
RAM: 8GB minimum (16GB recommended)
Storage: 100GB SSD minimum (for logs, backups, growth)
OS: Ubuntu 22.04 LTS (latest patches applied)
Network: High-speed, redundant connection
Firewall: Configured with strict rules
```

### Infrastructure Requirements

```bash
# Essential
✓ Valid SSL/TLS certificates
✓ Domain name with DNS configured
✓ CDN configured (optional but recommended)
✓ Backup storage (S3, DO Spaces, etc.)
✓ Monitoring/alerting system
✓ Log aggregation service

# Security
✓ Firewall (UFW) configured
✓ Fail2ban installed and configured
✓ SSH key-based authentication only
✓ Regular security updates scheduled
✓ DDoS protection (Cloudflare, etc.)

# Compliance
✓ Data retention policy defined
✓ Privacy policy published
✓ Terms of service published
✓ GDPR compliance (if applicable)
```

### Team Readiness

```bash
# Required Personnel
✓ Technical Lead (deployment authority)
✓ Backend Engineer (on-call)
✓ Frontend Engineer (on-call)
✓ DevOps Engineer (deployment executor)
✓ QA Engineer (verification)

# Communication
✓ Deployment announcement sent
✓ Status page updated
✓ Support team briefed
✓ Stakeholders notified
```

---

## ✅ Pre-Deployment Checklist

### Security Sign-Off

- [ ] **Security audit completed** (penetration testing done)
- [ ] **All default passwords changed**
- [ ] **Secrets in secure vault** (not in code or env files)
- [ ] **SSL certificates valid** (not expiring soon)
- [ ] **Firewall rules configured** (only required ports open)
- [ ] **Fail2ban active** (protecting against brute force)
- [ ] **Rate limiting tested** (confirms working)
- [ ] **CORS configured correctly** (not allowing *)
- [ ] **Input validation verified** (SQL/XSS protection)
- [ ] **Dependencies scanned** (no known vulnerabilities)

### Testing Sign-Off

- [ ] **All unit tests passing** (80%+ coverage)
- [ ] **Integration tests passing** (all critical paths)
- [ ] **Load testing completed** (handles expected traffic)
- [ ] **Stress testing done** (knows breaking point)
- [ ] **UAT sign-off received** (customer/business approval)
- [ ] **Staging environment tested** (identical to production)
- [ ] **Performance benchmarks met** (meets SLA requirements)
- [ ] **Security tests passed** (no critical vulnerabilities)

### Infrastructure Sign-Off

- [ ] **Backups verified** (can restore successfully)
- [ ] **Monitoring configured** (Grafana dashboards ready)
- [ ] **Alerts configured** (team receives notifications)
- [ ] **Logging working** (logs being collected)
- [ ] **SSL certificates installed** (HTTPS working)
- [ ] **DNS configured** (domain pointing correctly)
- [ ] **CDN configured** (if using)
- [ ] **Database optimized** (indexes applied)

### Documentation Sign-Off

- [ ] **Runbook created** (step-by-step procedures)
- [ ] **Rollback plan documented** (tested procedure)
- [ ] **API documentation current** (Swagger up-to-date)
- [ ] **User documentation ready** (help guides)
- [ ] **Team trained** (everyone knows their role)

---

## 🔧 Environment Setup

### Step 1: Production Server Preparation (30 minutes)

```bash
# 1. SSH into production server (use SSH keys only)
ssh -i ~/.ssh/production_key user@production-server

# 2. Update and secure the system
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get autoremove -y

# 3. Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 4. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 5. Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 6. Install and configure Fail2ban
sudo apt-get install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 7. Create application directory
sudo mkdir -p /opt/ternantapp
sudo chown $USER:$USER /opt/ternantapp
cd /opt/ternantapp

# 8. Set up log rotation
sudo tee /etc/logrotate.d/ternantapp <<EOF
/opt/ternantapp/backend/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
    sharedscripts
}
EOF
```

### Step 2: Clone and Configure (20 minutes)

```bash
# 1. Clone repository (use production branch)
git clone -b production https://github.com/your-org/ternantapp.git .

# Or clone main and checkout production tag
git clone https://github.com/your-org/ternantapp.git .
git checkout tags/v1.0.1

# 2. Verify checksum (if provided)
sha256sum -c checksums.txt

# 3. Create environment files
cp .env.example .env.production
cp backend/.env.production.example backend/.env.production
cp frontend/.env.production.example frontend/.env.production
```

### Step 3: Secure Environment Variables (30 minutes)

**CRITICAL: Never commit actual .env.production files!**

```bash
# Generate strong secrets
echo "=== PRODUCTION SECRETS ==="
echo "JWT_SECRET (64 chars):"
openssl rand -hex 64

echo "JWT_REFRESH_SECRET (64 chars):"
openssl rand -hex 64

echo "SESSION_SECRET (32 chars):"
openssl rand -hex 32

echo "DATABASE_PASSWORD (32 chars):"
openssl rand -base64 32

echo "REDIS_PASSWORD (32 chars):"
openssl rand -base64 32

echo "MYSQL_ROOT_PASSWORD (32 chars):"
openssl rand -base64 32

# Store these in a secure vault (1Password, AWS Secrets Manager, etc.)
```

**Configure `.env.production`:**

```bash
# Edit with secure editor (vim/nano)
nano .env.production
```

```bash
# =================================
# PRODUCTION ENVIRONMENT
# =================================
NODE_ENV=production
APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1

# Database (CHANGE ALL PASSWORDS)
MYSQL_ROOT_PASSWORD=<STRONG-RANDOM-PASSWORD>
DATABASE_NAME=ternantapp_production
DATABASE_USER=ternantapp_prod
DATABASE_PASSWORD=<STRONG-RANDOM-PASSWORD>
DATABASE_HOST=mysql
DATABASE_PORT=3306

# Redis (CHANGE PASSWORD)
REDIS_PASSWORD=<STRONG-RANDOM-PASSWORD>
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
REDIS_TTL=3600

# JWT (CHANGE ALL SECRETS - 64 chars each)
JWT_SECRET=<64-char-random-secret>
JWT_REFRESH_SECRET=<64-char-random-secret>
SESSION_SECRET=<32-char-random-secret>

# CORS (STRICT - NO WILDCARDS)
CORS_ORIGINS=https://your-domain.com

# Rate Limiting (PRODUCTION VALUES)
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Database Pool
DB_POOL_SIZE=20
DB_POOL_ACQUIRE_TIMEOUT=30000

# Logging (ERROR LEVEL FOR PRODUCTION)
LOG_LEVEL=error
LOG_FILE_PATH=./logs

# Email (PRODUCTION SMTP)
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASSWORD=<sendgrid-api-key>
MAIL_FROM=TernantApp <noreply@your-domain.com>
MAIL_SECURE=true

# Monitoring
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=<STRONG-RANDOM-PASSWORD>

# CDN (if using)
CDN_URL=https://cdn.your-domain.com

# Sentry (recommended for production)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

### Step 4: SSL Certificate Setup (15 minutes)

```bash
# Option 1: Let's Encrypt (Free, Recommended)
sudo apt-get install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot certonly --nginx \
  -d your-domain.com \
  -d api.your-domain.com \
  -d www.your-domain.com \
  --email admin@your-domain.com \
  --agree-tos \
  --non-interactive

# Certificates will be at:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# Set up auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Option 2: Commercial Certificate
# Copy your certificates to:
# /opt/ternantapp/ssl/cert.pem
# /opt/ternantapp/ssl/key.pem
```

---

## 🚀 Deployment Steps

### Pre-Flight Checks (5 minutes)

```bash
# 1. Verify you're on the correct server
hostname
# Expected: production-server-name

# 2. Verify git branch/tag
git branch
git describe --tags
# Expected: v1.0.1 or production branch

# 3. Verify environment files exist
ls -la .env.production backend/.env.production frontend/.env.production

# 4. Check disk space
df -h
# Ensure at least 20GB free

# 5. Check system resources
free -h
top -bn1 | head -20

# 6. Notify team
echo "Starting production deployment at $(date)"
# Send notification to team (Slack, email, etc.)
```

### Backup Current State (10 minutes)

```bash
# 1. Create backup directory
mkdir -p /opt/backups/pre-deployment-$(date +%Y%m%d-%H%M%S)
cd /opt/backups/pre-deployment-$(date +%Y%m%d-%H%M%S)

# 2. Backup database (if exists)
if docker ps | grep -q ternantapp-mysql-prod; then
  docker exec ternantapp-mysql-prod mysqldump \
    -u root -p"$MYSQL_ROOT_PASSWORD" \
    --all-databases --single-transaction --quick --lock-tables=false \
    > database-backup-$(date +%Y%m%d-%H%M%S).sql

  gzip database-backup-*.sql
  echo "✅ Database backup created"
fi

# 3. Backup current code
tar -czf code-backup-$(date +%Y%m%d-%H%M%S).tar.gz /opt/ternantapp

# 4. Backup environment files
cp /opt/ternantapp/.env.production .
cp /opt/ternantapp/backend/.env.production backend.env.production
cp /opt/ternantapp/frontend/.env.production frontend.env.production

# 5. Upload backups to S3 (or backup storage)
# aws s3 cp . s3://your-bucket/backups/$(date +%Y%m%d-%H%M%S)/ --recursive

echo "✅ All backups created"
cd /opt/ternantapp
```

### Deploy Application (15 minutes)

```bash
# 1. Set environment to production
export ENV=production

# 2. Run deployment script
chmod +x deploy.sh
./deploy.sh production

# What this does:
# ✅ Creates logging directories
# ✅ Backs up database (again, safety)
# ✅ Builds Docker images with production settings
# ✅ Starts all services (MySQL, Redis, Backend, Frontend)
# ✅ Applies database migrations (including indexes)
# ✅ Verifies health endpoints
# ✅ Starts monitoring stack (Prometheus + Grafana)

# 3. Monitor deployment progress
docker compose -f docker-compose.prod.yml logs -f

# Press Ctrl+C when you see "Deployment completed successfully"
```

### Alternative: Manual Zero-Downtime Deployment (30 minutes)

For critical deployments, use blue-green strategy:

```bash
# 1. Start new version alongside old (blue-green)
docker compose -f docker-compose.prod.yml -p ternantapp-blue up -d

# 2. Wait for new version to be healthy
sleep 60

# 3. Run smoke tests on new version
./scripts/smoke-test.sh http://localhost:3001

# 4. Switch traffic to new version (update nginx/load balancer)
# Update nginx config to point to new containers

# 5. Monitor for issues
# If issues: switch back to old version
# If good: stop old version after 24 hours

# 6. Stop old version
docker compose -f docker-compose.prod.yml -p ternantapp-green down
```

---

## ✅ Post-Deployment Verification

### Critical Checks (15 minutes)

```bash
# 1. Service Health
echo "=== Service Health Checks ==="

# All containers running
docker compose -f docker-compose.prod.yml ps
# Expected: All "Up" and "healthy"

# Backend health
curl https://api.your-domain.com/api/v1/health
# Expected: {"status":"ok","database":"connected"}

# Frontend
curl https://your-domain.com
# Expected: HTTP 200

# Metrics
curl https://api.your-domain.com/api/v1/metrics | head -20
# Expected: Prometheus metrics

echo "✅ All services healthy"

# 2. Database Verification
echo "=== Database Verification ==="

docker exec ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "
SELECT
  TABLE_NAME,
  TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'ternantapp_production'
ORDER BY TABLE_ROWS DESC;
"

# Check critical indexes exist
docker exec ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "
SELECT
  TABLE_NAME,
  INDEX_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'ternantapp_production'
  AND INDEX_NAME LIKE 'IDX_%';
"

echo "✅ Database verified"

# 3. SSL/HTTPS Verification
echo "=== SSL Verification ==="

# Check SSL certificate
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check SSL grade (requires ssllabs-scan tool)
# ssllabs-scan your-domain.com

# Verify HTTPS redirect
curl -I http://your-domain.com
# Expected: 301/302 redirect to https://

echo "✅ SSL verified"

# 4. Performance Verification
echo "=== Performance Verification ==="

# Test cache performance
TOKEN=$(curl -s -X POST https://api.your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@ternantapp.com","password":"SuperAdmin@2025"}' \
  | jq -r '.accessToken')

# First request (uncached)
time curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.your-domain.com/api/v1/dashboard/stats > /dev/null

# Second request (cached - should be 95% faster)
time curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.your-domain.com/api/v1/dashboard/stats > /dev/null

echo "✅ Performance verified"

# 5. Monitoring Verification
echo "=== Monitoring Verification ==="

# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | \
  jq '.data.activeTargets[] | {job, health}'
# Expected: All "up"

# Check Grafana is accessible
curl -I http://localhost:3002
# Expected: HTTP 200

echo "✅ Monitoring verified"

# 6. Logs Verification
echo "=== Logs Verification ==="

# Check log files exist
ls -lh backend/logs/
# Expected: combined.log, error.log, warn.log

# Check for startup errors
tail -100 backend/logs/error.log

# Check application is logging
tail -20 backend/logs/combined.log

echo "✅ Logs verified"
```

### Functional Testing (20 minutes)

```bash
# Test critical user journeys
./scripts/production-smoke-tests.sh

# Key scenarios to test:
# 1. User registration and login
# 2. Create company
# 3. Create property
# 4. Create tenant
# 5. Create occupancy
# 6. Generate invoice
# 7. Record payment
# 8. View reports
```

---

## 📊 Monitoring & Alerts

### Configure Grafana Alerts (15 minutes)

```bash
# Access Grafana
URL: https://your-domain.com:3002
Username: admin
Password: <from-env-file>

# Configure alerts for:
# 1. High error rate (> 1%)
# 2. High response time (p95 > 500ms)
# 3. Low cache hit rate (< 70%)
# 4. High database connections (> 80%)
# 5. High CPU/memory usage (> 80%)
# 6. Disk space low (< 20% free)

# Set alert notification channels:
# - Email to team
# - Slack to #production-alerts
# - PagerDuty for critical alerts
```

### Monitor First 4 Hours

```bash
# Stay online and monitor these metrics:

# 1. Error rate
watch -n 10 'curl -s https://api.your-domain.com/api/v1/metrics | grep error'

# 2. Response times
# Monitor Grafana dashboard continuously

# 3. Server resources
watch -n 10 'docker stats --no-stream'

# 4. Log errors
tail -f backend/logs/error.log

# 5. User activity
# Monitor real user activity in dashboard
```

---

## 🔄 Rollback Procedure

### When to Rollback

Rollback immediately if:
- ❌ Critical features broken
- ❌ Data corruption detected
- ❌ Security vulnerability introduced
- ❌ Error rate > 5%
- ❌ Performance degraded > 50%
- ❌ Database migration failed

### Rollback Steps (10 minutes)

```bash
# 1. Stop current deployment
docker compose -f docker-compose.prod.yml down

# 2. Checkout previous version
cd /opt/ternantapp
git checkout <previous-version-tag>

# 3. Restore database (if schema changed)
cd /opt/backups/pre-deployment-YYYYMMDD-HHMMSS
gunzip < database-backup-*.sql.gz | \
  docker exec -i ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD"

# 4. Start previous version
docker compose -f docker-compose.prod.yml up -d

# 5. Verify rollback
curl https://api.your-domain.com/api/v1/health

# 6. Notify team
echo "ROLLBACK COMPLETED at $(date)"
# Send notification to team

# 7. Investigate root cause
# Document what went wrong
# Plan fix for next deployment
```

---

## 📋 Post-Deployment Tasks

### Immediate (Day 1)

- [ ] **Monitor continuously** for first 4 hours
- [ ] **Check error logs** every hour
- [ ] **Monitor Grafana dashboards** for anomalies
- [ ] **Verify backups running** automatically
- [ ] **Test critical features** with real users
- [ ] **Update status page** to "All Systems Operational"
- [ ] **Send deployment success notification** to team
- [ ] **Document any issues** encountered

### Short-term (Week 1)

- [ ] **Review performance metrics** daily
- [ ] **Analyze user feedback** and bug reports
- [ ] **Check security logs** for suspicious activity
- [ ] **Verify backup restoration** works
- [ ] **Review and adjust alerts** if needed
- [ ] **Conduct post-deployment review** with team
- [ ] **Update documentation** based on learnings
- [ ] **Plan next deployment** improvements

### Ongoing

- [ ] **Daily monitoring** of key metrics
- [ ] **Weekly backup verification**
- [ ] **Monthly security updates**
- [ ] **Quarterly disaster recovery drills**
- [ ] **Regular performance optimization**
- [ ] **Continuous documentation updates**

---

## 🆘 Emergency Contacts

```bash
# Technical Lead
Name: [Name]
Phone: [Number]
Email: [Email]

# Backend Engineer
Name: [Name]
Phone: [Number]
Email: [Email]

# DevOps Engineer
Name: [Name]
Phone: [Number]
Email: [Email]

# 24/7 On-Call
PagerDuty: [URL]
Phone: [Number]
```

---

## 📚 Related Documentation

- **Staging Deployment:** `STAGING_DEPLOYMENT.md`
- **Quick Start:** `QUICK_START_PRODUCTION.md`
- **Full Guide:** `DEPLOYMENT_GUIDE.md`
- **Improvements:** `PRODUCTION_IMPROVEMENTS.md`
- **Checklist:** `FINAL_DEPLOYMENT_CHECKLIST.md`

---

## ✅ Final Sign-Off

**BEFORE clicking deploy, verify:**

- [ ] Staging tested successfully
- [ ] All security checks passed
- [ ] Team is ready and available
- [ ] Backups are current and verified
- [ ] Monitoring is configured
- [ ] Rollback plan is tested
- [ ] Stakeholders are notified
- [ ] Maintenance window scheduled
- [ ] Emergency contacts verified

**Deployment Authorized By:**

Name: ___________________
Role: ___________________
Date: ___________________
Time: ___________________

**Deployment Executed By:**

Name: ___________________
Role: ___________________
Date: ___________________
Time: ___________________

**Deployment Verified By:**

Name: ___________________
Role: ___________________
Date: ___________________
Time: ___________________

---

**Version:** 1.0.1
**Environment:** Production
**Last Updated:** October 25, 2025
**Author:** george1806

**Remember:** Production is sacred. Deploy with care. Monitor closely. Be ready to rollback.
