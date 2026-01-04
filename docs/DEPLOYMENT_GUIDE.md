# Apartment Management System - Deployment Guide

Complete step-by-step deployment guide for both development and production environments.

> **📢 IMPORTANT UPDATE (2026-01-01):**
> The deployment system has been restructured to use **modular compose files** and service-specific deployment scripts.
> For the latest deployment approach, see:
> - **Quick Deployment**: [QUICK_START.md](./QUICK_START.md) - 15-minute guide
> - **Migration from Old System**: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
> - **New Deployment Scripts**: `deploy/scripts/deploy-01-mysql.sh` through `deploy-04-frontend.sh`

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Development Deployment](#development-deployment)
4. [Production Deployment](#production-deployment)
5. [Deployment Scripts](#deployment-scripts)
6. [Environment Configuration](#environment-configuration)
7. [Database Migrations](#database-migrations)
8. [SSL Certificate Setup](#ssl-certificate-setup)
9. [Monitoring Setup](#monitoring-setup)
10. [Backup & Recovery](#backup--recovery)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance](#maintenance)

---

## Quick Start

### Development (Local)

```bash
# Clone repository
git clone <repository-url>
cd ternantapp

# Setup environment
cp .env.example .env
nano .env  # Configure as needed

# Deploy using development docker-compose
docker compose up -d

# Access application
# Frontend: http://localhost:3001
# Backend: http://localhost:3000/api/v1
```

### Production (Server) - NEW Modular Approach

```bash
# 1. Setup environment
cp .env.production.example .env.production
nano .env.production  # Update all CHANGE_ME values

# 2. Deploy all services (individually or in sequence)
bash deploy/scripts/deploy-01-mysql.sh prod
bash deploy/scripts/deploy-02-redis.sh prod
bash deploy/scripts/deploy-03-backend.sh prod
bash deploy/scripts/deploy-04-frontend.sh prod

# 3. Verify deployment
bash deploy/scripts/health-check.sh
bash deploy/scripts/07-verify-deployment.sh prod

# 4. Create default super admin (optional)
bash deploy/scripts/create-super-admin.sh prod
```

**See [QUICK_START.md](./QUICK_START.md) for detailed 15-minute deployment guide.**

---

## Prerequisites

### Server Requirements

**Minimum for Development:**
- CPU: 2 cores
- RAM: 4 GB
- Disk: 20 GB
- OS: Linux, macOS, or Windows (with WSL2)

**Recommended for Production:**
- CPU: 8 cores
- RAM: 16 GB
- Disk: 250 GB NVMe SSD
- OS: Ubuntu 22.04 LTS or similar
- Network: 10 Gbps

### Software Requirements

#### 1. Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group (Linux)
sudo usermod -aG docker $USER

# Logout and login for group changes to take effect

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

#### 2. Git

```bash
# Ubuntu/Debian
sudo apt-get install git

# macOS
brew install git

# Verify
git --version
```

### Domain & DNS (Production Only)

1. **Purchase Domain**: Register a domain (e.g., yourdomain.com)

2. **Configure DNS Records**:
   ```
   A     yourdomain.com           -> YOUR_SERVER_IP
   A     www.yourdomain.com       -> YOUR_SERVER_IP
   A     api.yourdomain.com       -> YOUR_SERVER_IP
   CNAME grafana.yourdomain.com   -> yourdomain.com
   ```

3. **Wait for DNS Propagation**:
   ```bash
   # Check DNS propagation
   dig yourdomain.com
   nslookup yourdomain.com
   ```

---

## Development Deployment

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd ternantapp
```

### Step 2: Setup Environment

```bash
# Navigate to deployment scripts
cd deploy/scripts

# Setup development environment
./utils/setup-env.sh dev

# Return to project root
cd ../..
```

This creates `.env` file with:
- Auto-generated secrets (JWT, session keys)
- Development database credentials
- Default port configurations
- Development CORS settings

### Step 3: Configure Environment

```bash
# Edit environment file
nano .env
```

**Important Variables to Review:**

```bash
# Application
NODE_ENV=development
APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000

# Database
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=rootpassword
DATABASE_NAME=ternantapp_dev

# Email (use Mailpit for development)
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=noreply@yourdomain.com

# CORS (allow localhost for development)
CORS_ORIGINS=http://localhost:3001,http://localhost:3000
```

### Step 4: Deploy Services

```bash
# Navigate to deployment scripts
cd deploy/scripts

# Deploy with automatic migrations
./deploy.sh dev

# Or deploy from scratch (removes all data)
./deploy.sh dev --clean
```

**What happens during deployment:**
1. ✅ Validates environment and prerequisites
2. ✅ Backs up database (if exists)
3. ✅ Builds Docker images (backend + frontend)
4. ✅ Deploys database (MySQL + Redis)
5. ✅ Runs database migrations
6. ✅ Deploys backend (NestJS)
7. ✅ Deploys frontend (Next.js)
8. ✅ Verifies all services are healthy

### Step 5: Create Super Admin

```bash
# Create super admin user
docker exec apartment-backend npm run seed:super-admin

# Default credentials (change immediately):
# Email: admin@ternantapp.com
# Password: Admin@123
```

### Step 6: Access Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api/v1
- **API Health**: http://localhost:3000/api/v1/health
- **API Docs**: http://localhost:3000/api/v1/docs
- **Mailpit UI**: http://localhost:8025 (email testing)

### Step 7: Verify Deployment

```bash
cd deploy/scripts
./07-verify-deployment.sh dev
```

---

## Production Deployment

### Step 1: Server Preparation

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install prerequisites
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login
exit
```

### Step 2: Clone Repository

```bash
# Clone to server
git clone <repository-url>
cd ternantapp

# Checkout production branch
git checkout main
```

### Step 3: Setup Production Environment

```bash
cd deploy/scripts
./utils/setup-env.sh prod
cd ../..
```

This creates `.env.production` with production-ready defaults.

### Step 4: Configure Production Environment

```bash
nano .env.production
```

**Critical Production Settings:**

```bash
# Application
NODE_ENV=production
APP_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Security - GENERATE UNIQUE VALUES!
JWT_SECRET=<64-char-hex>                    # openssl rand -hex 32
JWT_REFRESH_SECRET=<64-char-hex>            # openssl rand -hex 32
SESSION_SECRET=<32-char-hex>                # openssl rand -hex 16

# Database - USE STRONG PASSWORDS!
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_USER=apartment_user
DATABASE_PASSWORD=<strong-unique-password>
DATABASE_NAME=ternantapp_production

# Redis - SECURE PASSWORD!
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<strong-unique-password>

# CORS - NO WILDCARDS!
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email Provider (Brevo SMTP)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-email@example.com
SMTP_PASS=your-brevo-api-key
SMTP_FROM_EMAIL=noreply@yourdomain.com

# SSL (Let's Encrypt)
LETSENCRYPT_EMAIL=admin@yourdomain.com
DOMAIN=yourdomain.com

# Logging
LOG_LEVEL=error
LOG_FILE_PATH=./logs

# Monitoring
METRICS_ENABLED=true
```

**Generate Secrets:**

```bash
# JWT Secret (64 characters)
openssl rand -hex 32

# JWT Refresh Secret (64 characters)
openssl rand -hex 32

# Session Secret (32 characters)
openssl rand -hex 16

# Or use the provided script
./scripts/create-secrets.sh
```

### Step 5: Configure Firewall

```bash
# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Allow HTTP (port 80)
sudo ufw allow 80/tcp

# Allow HTTPS (port 443)
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 6: Deploy to Production

```bash
cd deploy/scripts

# Deploy
./deploy.sh prod

# Or clean install (removes all data)
./deploy.sh prod --clean

# Or skip backup (faster, but risky)
./deploy.sh prod --no-backup
```

### Step 7: Setup SSL Certificate

```bash
# The deployment automatically configures Certbot
# Certificates are auto-renewed every 12 hours

# Verify SSL certificate
curl -I https://yourdomain.com

# Manual certificate renewal (if needed)
docker exec apartment-certbot certbot renew
```

### Step 8: Create Super Admin

```bash
docker exec apartment-backend npm run seed:super-admin
```

### Step 9: Verify Deployment

```bash
cd deploy/scripts
./07-verify-deployment.sh prod
```

**Expected Output:**
```
✅ Backend API: HEALTHY
✅ Frontend: ACCESSIBLE
✅ Database: CONNECTED
✅ Redis: CONNECTED
✅ Migrations: UP TO DATE
✅ SSL: VALID
```

### Step 10: Access Application

- **Frontend**: https://yourdomain.com
- **Backend API**: https://api.yourdomain.com/api/v1
- **Monitoring**: https://grafana.yourdomain.com (if monitoring enabled)

---

## Deployment Scripts

### Master Orchestrator

**`deploy/scripts/deploy.sh`** - Orchestrates entire deployment

```bash
# Usage
./deploy.sh [dev|prod] [options]

# Options
--clean       # Remove all volumes (fresh install)
--no-backup   # Skip database backup
--no-cache    # Build images without cache

# Examples
./deploy.sh dev                  # Development deployment
./deploy.sh prod                 # Production deployment
./deploy.sh dev --clean          # Fresh development install
./deploy.sh prod --no-backup     # Production without backup
```

### Individual Scripts

**01. Validate Environment**
```bash
./01-validate-environment.sh dev
```
- Checks Docker and Docker Compose installation
- Validates environment file exists
- Checks required variables

**02. Backup Database**
```bash
./02-backup-database.sh dev
```
- Creates timestamped database backup
- Stores in `deploy/backups/`
- Auto-cleanup (keeps last 10 backups)

**03. Build Images**
```bash
./03-build-images.sh dev [--no-cache]
```
- Builds backend Docker image
- Builds frontend Docker image
- Optional: Build without cache

**04. Deploy Database**
```bash
./04-deploy-database.sh dev
```
- Starts MySQL container
- Starts Redis container
- Waits for health checks

**05. Deploy Backend**
```bash
./05-deploy-backend.sh dev
```
- Starts backend API container
- Runs database migrations
- Waits for health check

**06. Deploy Frontend**
```bash
./06-deploy-frontend.sh dev
```
- Starts frontend container
- Waits for health check

**07. Verify Deployment**
```bash
./07-verify-deployment.sh dev
```
- Comprehensive deployment verification
- Tests all endpoints
- Checks database connectivity
- Validates migrations

---

## Environment Configuration

### Environment Utilities

**Setup Environment**
```bash
cd deploy/scripts/utils
./setup-env.sh [dev|prod]
```
- Creates environment file
- Generates secure secrets
- Sets defaults for environment

**Switch Environment**
```bash
./switch-env.sh [dev|prod]
```
- Switches between dev and prod environments
- Creates backup of current .env

**Compare Environments**
```bash
./compare-env.sh
```
- Shows differences between `.env` and `.env.production`
- Highlights missing variables

### Environment Variables Reference

**Required Variables:**
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `DATABASE_HOST` - Database host
- `DATABASE_PASSWORD` - Database password
- `CORS_ORIGINS` - Allowed CORS origins

**Optional Variables:**
- `LOG_LEVEL` - Logging level (default: info)
- `SMTP_HOST` - Email SMTP host
- `REDIS_PASSWORD` - Redis password
- `METRICS_ENABLED` - Enable metrics (default: true)

**See** `.env.production.example` for complete reference.

---

## Database Migrations

### Migration Management Scripts

Located in `backend/scripts/migrations/`

**Generate Migration from Entity Changes**
```bash
cd backend/scripts/migrations
./generate.sh MigrationName dev
```

**Create Empty Migration**
```bash
./create-empty.sh MigrationName dev
```

**Run Migrations**
```bash
./run.sh dev
```

**Revert Last Migration**
```bash
./revert.sh dev
```

**Check Migration Status**
```bash
./status.sh dev
```

**Validate Schema**
```bash
./validate.sh dev
```

### Migration Best Practices

1. **Always test migrations in development first**
2. **Backup database before running migrations in production**
3. **Review generated migrations before running**
4. **Use descriptive migration names**
5. **Never edit executed migrations**

### Manual Migration

```bash
# Development
docker exec apartment-backend npm run migration:run

# Production
docker exec apartment-backend npm run migration:run

# Revert (development only)
docker exec apartment-backend npm run migration:revert
```

---

## SSL Certificate Setup

### Automatic Setup (Let's Encrypt)

SSL is automatically configured during production deployment with Certbot.

**Requirements:**
- Domain must point to server IP
- Ports 80 and 443 must be accessible
- `DOMAIN` and `LETSENCRYPT_EMAIL` must be set in `.env.production`

**Automatic Renewal:**
- Certbot container runs renewal check every 12 hours
- Certificates are renewed 30 days before expiry
- Nginx automatically reloads after renewal

### Manual Certificate Operations

```bash
# Force renewal
docker exec apartment-certbot certbot renew --force-renewal

# Check certificate status
docker exec apartment-certbot certbot certificates

# Test renewal (dry run)
docker exec apartment-certbot certbot renew --dry-run
```

### Using Custom Certificates

```bash
# Place certificates in nginx/ssl/
mkdir -p nginx/ssl
cp your-cert.crt nginx/ssl/
cp your-key.key nginx/ssl/

# Update nginx.conf to use custom certificates
nano nginx/nginx.conf
```

---

## Monitoring Setup

### Deploy Monitoring Stack

```bash
# Start monitoring services
docker-compose -f docker-compose.monitoring.v2.yml up -d

# Access dashboards
# Grafana: http://your-server:3002 (admin/admin)
# Prometheus: http://your-server:9090
# Alertmanager: http://your-server:9093
```

### Monitoring Services

**Prometheus** (Metrics Collection)
- Collects metrics from all services
- Stores time-series data
- Provides query interface

**Grafana** (Visualization)
- Pre-configured dashboards
- Custom dashboard creation
- Alert visualization

**Loki** (Log Aggregation)
- Collects logs from all containers
- Log querying and filtering
- Integration with Grafana

**Alertmanager** (Alert Routing)
- Routes alerts from Prometheus
- Alert grouping and deduplication
- Notification channels (email, Slack, etc.)

### Configure Alerts

Edit `monitoring/prometheus/alerts/app-alerts.yml`

```yaml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
```

---

## Backup & Recovery

### Automated Backups

**MySQL Backup Service** (Production)
- Automatic daily backups at 2:00 AM
- Keeps last 7 daily backups
- Stores in `deploy/backups/`

```bash
# Check backup status
docker exec apartment-mysql-backup ls -lh /backups

# Manual backup trigger
docker exec apartment-mysql-backup /backup.sh
```

### Manual Database Backup

```bash
# Using deployment script
cd deploy/scripts
./02-backup-database.sh prod

# Manual backup
docker exec apartment-mysql mysqldump -u root -p ternantapp_production > backup.sql
```

### Database Restore

```bash
# Stop backend to prevent conflicts
docker stop apartment-backend

# Restore from backup
docker exec -i apartment-mysql mysql -u root -p ternantapp_production < backup.sql

# Restart backend
docker start apartment-backend
```

### Volume Backup (Complete System Backup)

```bash
# Backup all Docker volumes
docker run --rm \
  -v ternantapp_mysql_data:/data \
  -v $(pwd):/backup \
  ubuntu tar czf /backup/mysql_backup.tar.gz /data

# Restore volume
docker run --rm \
  -v ternantapp_mysql_data:/data \
  -v $(pwd):/backup \
  ubuntu tar xzf /backup/mysql_backup.tar.gz -C /
```

---

## Troubleshooting

### Common Issues

**1. Services Not Starting**

```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs backend

# Check container status
docker-compose ps
```

**2. Database Connection Errors**

```bash
# Check MySQL is running
docker-compose ps mysql

# Check MySQL logs
docker-compose logs mysql

# Test connection
docker exec apartment-backend npm run db:test
```

**3. Migration Failures**

```bash
# Check migration status
cd backend/scripts/migrations
./status.sh dev

# Validate schema
./validate.sh dev

# View detailed logs
docker-compose logs backend | grep migration
```

**4. SSL Certificate Issues**

```bash
# Check Certbot logs
docker-compose logs certbot

# Test certificate renewal
docker exec apartment-certbot certbot renew --dry-run

# Force renewal
docker exec apartment-certbot certbot renew --force-renewal
```

**5. Frontend Build Failures**

```bash
# Rebuild without cache
docker-compose build --no-cache frontend

# Check build logs
docker-compose logs frontend
```

**6. Port Conflicts**

```bash
# Check port usage
sudo lsof -i :3000
sudo lsof -i :3001

# Kill process using port
sudo kill -9 <PID>
```

### Log Viewing

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Since specific time
docker-compose logs --since 2024-01-01T00:00:00
```

### Health Checks

```bash
# Backend health
curl http://localhost:3000/api/v1/health

# Frontend health
curl http://localhost:3001

# Database health
docker exec apartment-mysql mysqladmin ping

# Redis health
docker exec apartment-redis redis-cli ping
```

---

## Maintenance

### Regular Maintenance Tasks

**Daily:**
- Check monitoring dashboards
- Review error logs
- Verify backups completed

**Weekly:**
- Review disk usage
- Check for security updates
- Review performance metrics

**Monthly:**
- Update dependencies
- Review and clean old logs
- Test disaster recovery

### System Updates

**Update Application:**
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
cd deploy/scripts
./deploy.sh prod --no-cache
```

**Update Docker Images:**
```bash
# Pull latest base images
docker-compose pull

# Rebuild
docker-compose build --no-cache

# Restart
docker-compose up -d
```

**Update Dependencies:**
```bash
# Backend
cd backend
npm update
npm audit fix

# Frontend
cd frontend
npm update
npm audit fix

# Rebuild
cd ../deploy/scripts
./deploy.sh prod
```

### Log Rotation

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/docker-containers

# Add configuration
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  size=10M
  missingok
  delaycompress
  copytruncate
}

# Test rotation
sudo logrotate -f /etc/logrotate.d/docker-containers
```

### Cleanup

```bash
# Remove unused Docker images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Complete cleanup (careful!)
docker system prune -a --volumes
```

---

## Performance Optimization

### Database Optimization

- Regular ANALYZE TABLE
- Index optimization
- Query performance monitoring
- Connection pooling configuration

### Redis Optimization

- Memory limit configuration
- Eviction policy (noeviction for production)
- Persistence configuration
- Key expiration strategy

### Application Optimization

- Enable production builds
- Configure caching layers
- Optimize API queries
- Enable compression

### Infrastructure Optimization

- Load balancer configuration
- CDN for static assets
- Database read replicas
- Horizontal scaling

---

## Security Checklist

**Pre-Production:**
- [ ] Strong database passwords
- [ ] Unique JWT secrets
- [ ] CORS configured (no wildcards)
- [ ] SSL/TLS enabled
- [ ] Firewall configured
- [ ] Database ports not exposed
- [ ] Security headers configured
- [ ] Rate limiting enabled

**Post-Production:**
- [ ] Change default admin password
- [ ] Configure backups
- [ ] Setup monitoring alerts
- [ ] Test disaster recovery
- [ ] Review access logs
- [ ] Security audit

---

## Additional Resources

- **System Overview**: [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)
- **Project Status**: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- **Deployment Scripts README**: [../deploy/scripts/README.md](../deploy/scripts/README.md)
- **Migration Tools README**: [../backend/scripts/migrations/README.md](../backend/scripts/migrations/README.md)
- **Schema Management**: [../backend/docs/SCHEMA_MANAGEMENT.md](../backend/docs/SCHEMA_MANAGEMENT.md)

---

## Support

For issues and questions:
1. Check troubleshooting section above
2. Review container logs
3. Verify environment configuration
4. Check deployment script output
5. Review migration status
6. Contact system administrator

---

**Last Updated**: 2025-12-29
