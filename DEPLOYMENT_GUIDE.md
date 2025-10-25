# TernantApp - Production Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-25
**Status:** Production-Ready

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)
10. [Security Hardening](#security-hardening)

---

## 📦 Prerequisites

### Server Requirements

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB SSD
- OS: Ubuntu 20.04 LTS or later

**Recommended for Production:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 50GB SSD
- OS: Ubuntu 22.04 LTS

### Software Requirements

```bash
# Docker & Docker Compose
Docker version: 24.0+
Docker Compose version: 2.20+

# Node.js (for local development)
Node.js: 22.x LTS

# Database
MySQL: 8.0+
Redis: 7.0+
```

### Domain & SSL

- Domain name configured
- SSL/TLS certificates (Let's Encrypt recommended)
- DNS records properly configured

---

## ✅ Pre-Deployment Checklist

### Security

- [ ] All default passwords changed
- [ ] JWT secrets generated (64+ characters)
- [ ] Database credentials secured
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured

### Configuration

- [ ] `.env.production` created and configured
- [ ] Database connection tested
- [ ] Email SMTP configured
- [ ] Redis connection configured
- [ ] File storage configured (S3/local)
- [ ] Monitoring tools configured

### Code

- [ ] Latest code pulled from repository
- [ ] All tests passing
- [ ] Production build successful
- [ ] No development dependencies in production
- [ ] Sensitive data removed from codebase

### Infrastructure

- [ ] Server provisioned
- [ ] Docker installed
- [ ] Nginx configured
- [ ] SSL certificates installed
- [ ] Backup system configured
- [ ] Monitoring system configured

---

## 🔧 Environment Setup

### Step 1: Clone Repository

```bash
# SSH (recommended)
git clone git@github.com:your-org/ternantapp.git
cd ternantapp

# HTTPS
git clone https://github.com/your-org/ternantapp.git
cd ternantapp
```

### Step 2: Create Production Environment Files

```bash
# Backend
cp backend/.env.production.example backend/.env.production

# Frontend
cp frontend/.env.production.example frontend/.env.production

# Docker Compose
cp .env.example .env.production
```

### Step 3: Generate Secrets

```bash
# Generate JWT Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Refresh Token Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Session Secret (32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Configure Environment Variables

Edit `.env.production` and set:

```bash
# Critical - MUST change these!
JWT_SECRET=your_generated_64_char_secret
JWT_REFRESH_SECRET=your_different_64_char_secret
DATABASE_PASSWORD=strong_database_password
MYSQL_ROOT_PASSWORD=strong_root_password
REDIS_PASSWORD=strong_redis_password

# Application URLs
APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1
CORS_ORIGIN=https://your-domain.com

# Database
DATABASE_HOST=mysql
DATABASE_NAME=ternantapp_production
DATABASE_USER=ternantapp_prod

# Email (Configure your SMTP provider)
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587
MAIL_USER=noreply@your-domain.com
MAIL_PASSWORD=your_smtp_password
MAIL_FROM=TernantApp <noreply@your-domain.com>
```

---

## 💾 Database Setup

### Option 1: Fresh Installation

```bash
# Start database container
docker compose -f docker-compose.prod.yml up -d mysql

# Wait for database to be ready
sleep 10

# Run migrations
docker exec ternantapp-backend-prod npm run migration:run

# Seed super admin (optional)
docker exec ternantapp-backend-prod npm run seed:super-admin
```

### Option 2: Restore from Backup

```bash
# Copy backup to container
docker cp backup.sql ternantapp-mysql-prod:/tmp/

# Restore database
docker exec ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD" ternantapp_production < /tmp/backup.sql
```

---

## 🚀 Deployment Steps

### Automated Deployment (Recommended)

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh production
```

### Manual Deployment

```bash
# 1. Stop existing services
docker compose -f docker-compose.prod.yml down

# 2. Pull latest code
git pull origin main

# 3. Build images
docker compose -f docker-compose.prod.yml build --no-cache

# 4. Start services
docker compose -f docker-compose.prod.yml up -d

# 5. Run migrations
docker exec ternantapp-backend-prod npm run migration:run

# 6. Check health
docker compose -f docker-compose.prod.yml ps
```

---

## ✅ Post-Deployment Verification

### 1. Health Checks

```bash
# Backend health
curl https://api.your-domain.com/api/v1/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-10-25T...",
  "database": "connected"
}

# Frontend health
curl https://your-domain.com

# Expected: HTTP 200 OK
```

### 2. Test Authentication

```bash
# Test login
curl -X POST https://api.your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@ternantapp.com","password":"SuperAdmin@2025"}'

# Should return access token
```

### 3. Verify Services

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Expected: All services showing "Up" and "healthy"
```

### 4. Check Logs

```bash
# Backend logs
docker compose -f docker-compose.prod.yml logs -f backend

# Frontend logs
docker compose -f docker-compose.prod.yml logs -f frontend

# Database logs
docker compose -f docker-compose.prod.yml logs -f mysql
```

---

## 📊 Monitoring & Maintenance

### Log Management

```bash
# View real-time logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service
docker compose -f docker-compose.prod.yml logs -f backend

# Export logs
docker compose -f docker-compose.prod.yml logs --no-color > logs-$(date +%Y%m%d).log
```

### Performance Monitoring

```bash
# Check resource usage
docker stats

# Check disk usage
df -h

# Check database size
docker exec ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "
SELECT table_schema 'Database',
       ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) 'Size (MB)'
FROM information_schema.tables
GROUP BY table_schema;"
```

### Updating the Application

```bash
# 1. Backup database
./deploy.sh backup

# 2. Pull latest code
git pull origin main

# 3. Deploy
./deploy.sh production
```

---

## 💾 Backup & Recovery

### Automated Backups

The deployment script automatically creates backups. Manual backup:

```bash
# Create backup directory
mkdir -p backups

# Backup database
docker exec ternantapp-mysql-prod mysqldump \
  -u root -p"$MYSQL_ROOT_PASSWORD" \
  ternantapp_production > backups/backup-$(date +%Y%m%d-%H%M%S).sql

# Compress backup
gzip backups/backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore from Backup

```bash
# Stop application
docker compose -f docker-compose.prod.yml down

# Restore database
gunzip < backups/backup-YYYYMMDD-HHMMSS.sql.gz | \
  docker exec -i ternantapp-mysql-prod mysql \
  -u root -p"$MYSQL_ROOT_PASSWORD" ternantapp_production

# Start application
docker compose -f docker-compose.prod.yml up -d
```

---

## 🔧 Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker logs ternantapp-backend-prod

# Common issues:
# 1. Database not ready - wait and retry
# 2. Wrong environment variables - check .env.production
# 3. Migration failed - run manually: docker exec ternantapp-backend-prod npm run migration:run
```

### Database Connection Failed

```bash
# Check if MySQL is running
docker ps | grep mysql

# Check MySQL logs
docker logs ternantapp-mysql-prod

# Test connection
docker exec ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1"
```

### High Memory Usage

```bash
# Check memory usage
docker stats --no-stream

# Restart services
docker compose -f docker-compose.prod.yml restart

# Increase limits in docker-compose.prod.yml if needed
```

### SSL Certificate Issues

```bash
# Renew Let's Encrypt certificates
certbot renew

# Restart Nginx
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

### 2. Fail2ban Setup

```bash
# Install fail2ban
apt-get install fail2ban

# Configure for Nginx
cat > /etc/fail2ban/jail.local << EOF
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
EOF

# Restart fail2ban
systemctl restart fail2ban
```

### 3. Regular Security Updates

```bash
# Update system packages
apt-get update && apt-get upgrade -y

# Update Docker images
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### 4. Audit Logs

```bash
# Enable audit logging in MySQL
docker exec ternantapp-mysql-prod mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/general.log';"
```

---

## 📞 Support & Contact

### Emergency Contacts
- System Administrator: admin@your-domain.com
- Database Administrator: dba@your-domain.com
- Security Team: security@your-domain.com

### Documentation
- API Docs: https://api.your-domain.com/api/docs
- Project Repository: https://github.com/your-org/ternantapp
- Issue Tracker: https://github.com/your-org/ternantapp/issues

---

## 📝 Changelog

### Version 1.0.0 (2025-10-25)
- Initial production deployment
- Full CRUD functionality
- Multi-tenant support
- Reports and analytics
- Super admin portal

---

**Deployment Guide v1.0.0**
**Last Updated:** October 25, 2025
**Maintained By:** Development Team
