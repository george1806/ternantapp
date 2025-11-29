# Ternant App - Deployment Guide

Complete guide for deploying the Ternant App using Docker Compose for local development and production environments.

## Table of Contents
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Local Development Setup](#local-development-setup)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Scaling & Performance](#scaling--performance)
- [Monitoring & Logs](#monitoring--logs)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Development (Local)
```bash
# Clone the repository
git clone <repo-url>
cd ternantapp

# Copy .env.example to .env.local and configure
cp .env.example .env.local

# Start the application
docker-compose up -d

# Verify all services are running
docker-compose ps
```

**Access URLs:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000/api/v1
- Database Admin: http://localhost:8082 (phpMyAdmin)
- Redis Admin: http://localhost:8081 (Redis Commander)
- Email Testing: http://localhost:8025 (Mailpit)

### Production
```bash
# Prepare environment
cp .env.production .env.production (and update values)

# Deploy using script
./scripts/deploy.sh prod

# Or manually with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

---

## Architecture

### Services Overview

```
┌─────────────────────────────────────────────────┐
│                   NGINX (Reverse Proxy)         │
│           (Port 80/443 - Load Balancer)         │
└────────────┬──────────────────────┬─────────────┘
             │                      │
    ┌────────▼────────┐   ┌─────────▼──────────┐
    │   Frontend      │   │   Backend API      │
    │  (Next.js 15)   │   │   (NestJS 22)      │
    │  Port: 3001     │   │   Port: 3000       │
    └────────┬────────┘   └─────────┬──────────┘
             │                      │
             └──────────┬───────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    ┌───▼──┐        ┌──▼──┐        ┌──▼──┐
    │MySQL │        │Redis│        │Mail │
    │  8.0 │        │  7  │        │pit  │
    └──────┘        └─────┘        └─────┘
```

### Service Details

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **MySQL** | mysql:8.0 | 3306 | Primary database |
| **Redis** | redis:7-alpine | 6379 | Cache & sessions |
| **Backend** | Custom (NestJS) | 3000 | API server |
| **Frontend** | Custom (Next.js) | 3001 | Web UI |
| **Mailpit** | axllent/mailpit | 1025/8025 | Email testing (dev only) |
| **phpMyAdmin** | phpmyadmin | 8082 | Database admin (dev only) |
| **Redis Commander** | rediscommander | 8081 | Redis admin (dev only) |
| **Nginx** | nginx:alpine | 80/443 | Reverse proxy (prod only) |

---

## Local Development Setup

### Prerequisites
- Docker (20.10+)
- Docker Compose (2.0+)
- Git
- 4GB RAM minimum
- 10GB disk space

### Initial Setup

1. **Clone and install:**
```bash
git clone <repo-url>
cd ternantapp
```

2. **Create environment file:**
```bash
cp .env.example .env.local
# Edit .env.local with your local settings
```

3. **Start all services:**
```bash
docker-compose up -d
```

4. **Wait for health checks:**
```bash
# Monitor service startup
docker-compose logs -f

# Check when ready (all "healthy")
docker-compose ps
```

5. **Initialize database (if first run):**
```bash
# Migrations run automatically on backend startup
# Check backend logs for confirmation
docker-compose logs backend | grep -i migration
```

### Common Development Commands

```bash
# View logs
docker-compose logs -f backend      # Backend logs
docker-compose logs -f frontend     # Frontend logs
docker-compose logs -f mysql        # Database logs

# Execute commands in containers
docker-compose exec backend pnpm run test    # Run tests
docker-compose exec mysql mysql -u apartment_user -p  # MySQL CLI

# Rebuild after code changes
docker-compose build backend
docker-compose up -d

# Stop all services
docker-compose down

# Remove volumes (careful! deletes data)
docker-compose down -v
```

### Development Workflow

1. **Code changes are hot-reloaded** (src/* mounted as volumes)
2. **Backend changes:**
   - Source in `/backend/src` is watched
   - NestJS auto-compiles on save
3. **Frontend changes:**
   - Source in `/frontend/src` is watched
   - Next.js Turbopack auto-rebuilds
4. **Database changes:**
   - Create migration: `docker-compose exec backend pnpm run migration:create`
   - Run migrations: Automatic on startup

---

## Production Deployment

### Prerequisites
- Linux server (Ubuntu 20.04 LTS+)
- Docker & Docker Compose
- SSL certificates (Let's Encrypt recommended)
- Domain name
- 8GB+ RAM, 30GB+ disk
- Strong firewall rules

### Deployment Steps

1. **Prepare server:**
```bash
# SSH into your server
ssh user@your-server.com

# Clone repository
git clone <repo-url>
cd ternantapp

# Create production .env
nano .env.production
# Update all CHANGE_THIS variables with actual values
```

2. **Security setup:**
```bash
# Generate strong JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copy to .env.production
# JWT_SECRET=<generated-value-1>
# JWT_REFRESH_SECRET=<generated-value-2>
```

3. **SSL Certificate Setup:**
```bash
# Option 1: Let's Encrypt with Certbot
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to ssl directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem
sudo chown $USER ./ssl/*
```

4. **Create data directories:**
```bash
mkdir -p /data/mysql /data/redis /data/uploads
chmod 755 /data/*
```

5. **Deploy using script:**
```bash
./scripts/deploy.sh prod

# Or manually
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

6. **Verify deployment:**
```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f backend
```

7. **Test endpoints:**
```bash
curl https://api.your-domain.com/api/v1/health
curl https://your-domain.com
```

### Production Checklist
- [ ] Updated .env.production with all actual values
- [ ] Generated strong JWT secrets
- [ ] Set up SSL certificates
- [ ] Configured database backups
- [ ] Set up monitoring/alerting
- [ ] Configured log rotation
- [ ] Security hardened firewall
- [ ] Set up domain DNS records
- [ ] Tested backup restoration
- [ ] Created admin user
- [ ] Tested email notifications

---

## Environment Variables

### Key Variables

#### Application
- `NODE_ENV`: Set to "production" for production
- `APP_URL`: Your domain (e.g., https://your-domain.com)
- `NEXT_PUBLIC_API_URL`: Backend API URL

#### Database
- `DB_HOST`: MySQL host (use "mysql" in Docker)
- `DB_USERNAME`: Database user
- `DB_PASSWORD`: Strong password (change in production!)
- `DB_POOL_SIZE`: Connection pool size (20 for dev, 50+ for prod)

#### Redis
- `REDIS_HOST`: Redis host
- `REDIS_PASSWORD`: Set for production
- `REDIS_TTL`: Session TTL in seconds

#### JWT Security
```bash
# Generate strong secrets (64 chars minimum)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

JWT_SECRET=<64-char-random-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<different-64-char-string>
JWT_REFRESH_EXPIRES_IN=7d
```

#### CORS
- `CORS_ORIGINS`: Allowed origins (comma-separated)
  - Dev: `http://localhost:3001,http://localhost:3000`
  - Prod: `https://your-domain.com,https://www.your-domain.com`

#### Email
- `MAIL_HOST`: SMTP server
- `MAIL_PORT`: Usually 587 (TLS) or 465 (SSL)
- `MAIL_USER`: Email account
- `MAIL_PASSWORD`: Email password or app-specific token

See `.env.example` and `.env.production` for all available variables.

---

## Scaling & Performance

### Horizontal Scaling

#### Multiple Backend Instances
```yaml
# In docker-compose.prod.yml
backend:
  deploy:
    replicas: 3  # Run 3 instances
    
# Or use Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.prod.yml ternant
```

#### Load Balancing
Nginx automatically distributes traffic to multiple backend instances:
```nginx
upstream backend {
    least_conn;  # Load balancing algorithm
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}
```

### Performance Tuning

#### Database
```env
# Increase pool size for more concurrency
DB_POOL_SIZE=100
DB_POOL_ACQUIRE_TIMEOUT=30000

# Increase MySQL memory
--innodb_buffer_pool_size=4G
--max_connections=2000
```

#### Redis
```env
# Increase memory and enable persistence
--maxmemory 4gb
--appendonly yes
--appendfsync everysec
```

#### Frontend
- Enable CDN for static assets
- Use image optimization
- Implement Progressive Web App (PWA)

#### Caching
```nginx
# Cache static assets for 30 days
proxy_cache_valid 200 30d;
add_header Cache-Control "public, max-age=2592000, immutable";
```

---

## Monitoring & Logs

### View Logs

```bash
# Development
./scripts/logs.sh backend        # Backend logs
./scripts/logs.sh frontend       # Frontend logs
./scripts/logs.sh mysql          # Database logs

# Production
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Log Levels
- `debug`: Detailed debugging info
- `info`: General information
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Fatal errors

### Health Checks

```bash
# Backend health
curl http://localhost:3000/api/v1/health

# Frontend health
curl http://localhost:3001

# Database health
docker-compose exec mysql mysqladmin ping

# Redis health
docker-compose exec redis redis-cli ping
```

### Monitoring Solutions (Optional)
- **New Relic**: APM and monitoring
- **DataDog**: Infrastructure monitoring
- **Sentry**: Error tracking
- **Prometheus + Grafana**: Metrics and dashboards

---

## Backup & Recovery

### Automated Backups

```bash
# Manual backup
./scripts/backup.sh [dev|prod]

# Scheduled backup (add to crontab)
0 2 * * * cd /home/user/ternantapp && ./scripts/backup.sh prod >> /var/log/ternant-backup.log 2>&1
```

### Restore from Backup

```bash
# Restore database
docker-compose exec -T mysql mysql \
  -u apartment_user -p apartment_management \
  < db-backup/backup_20240115_020000.sql
```

### Backup Strategy
1. **Daily backups** - Automated via cron
2. **Keep 30 days** - Older backups auto-deleted
3. **Offsite storage** - Copy to S3 or similar
4. **Test restores** - Monthly recovery drill

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs mysql

# Common issues:
# - Port already in use: Change in docker-compose.yml
# - Insufficient memory: Increase Docker memory
# - Volume permissions: Fix with sudo chown
```

### Database Connection Failed

```bash
# Verify MySQL is running
docker-compose exec mysql mysql -u root -p

# Check connection pool settings
docker-compose logs backend | grep "pool"
```

### Frontend Not Loading

```bash
# Clear Next.js cache
docker-compose exec frontend rm -rf .next

# Rebuild
docker-compose build frontend
docker-compose up -d frontend
```

### Redis Memory Issues

```bash
# Monitor Redis memory
docker-compose exec redis redis-cli info memory

# Increase memory or flush old data
docker-compose exec redis redis-cli FLUSHDB
```

### SSL Certificate Errors

```bash
# Verify certificate
openssl x509 -in ./ssl/cert.pem -text -noout

# Renew certificate
sudo certbot renew --force-renewal
```

---

## Support & Documentation

- **Documentation**: See README.md
- **Issues**: GitHub Issues
- **Docker Docs**: https://docs.docker.com
- **NestJS Docs**: https://nestjs.com
- **Next.js Docs**: https://nextjs.org

---

## License

See LICENSE file for details.
