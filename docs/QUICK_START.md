# Quick Start Guide - Production Deployment

**Get your Apartment Management System deployed in 15 minutes!**

---

## 📋 Pre-Deployment Checklist

Print this checklist and check off each item:

```
PREREQUISITES
[ ] Docker installed and running (docker --version)
[ ] Docker Compose installed (docker compose version)
[ ] Git repository cloned
[ ] Sufficient disk space (>20GB recommended)
[ ] Domain name configured (for production)
[ ] SMTP credentials ready (Brevo, SendGrid, etc.)
[ ] Sudo/root access (if needed)

PREPARATION
[ ] Backed up any existing deployment
[ ] Reviewed deployment architecture
[ ] Generated strong passwords ready
[ ] SSL certificates ready (optional)
[ ] Team notified of deployment
```

---

## 🚀 Quick Start (5 Steps)

### **Step 1: Create Environment File** (5 minutes)

```bash
# Navigate to project root
cd /home/george/devs/webDevs/ternantapp

# Copy environment template
cp .env.production.example .env.production

# Set proper permissions
chmod 600 .env.production
```

### **Step 2: Configure Environment Variables** (5 minutes)

```bash
# Edit environment file
nano .env.production
```

**REQUIRED: Change these values immediately:**

```bash
# 1. DATABASE CREDENTIALS (CRITICAL!)
MYSQL_ROOT_PASSWORD=CHANGE_ME_strong_root_password_minimum_16_chars
DATABASE_PASSWORD=CHANGE_ME_strong_db_password_minimum_16_chars
REDIS_PASSWORD=CHANGE_ME_strong_redis_password_minimum_16_chars

# 2. JWT SECRETS (CRITICAL!)
# Generate with: openssl rand -base64 48
JWT_SECRET=CHANGE_ME_generate_with_openssl_rand_base64_48
JWT_REFRESH_SECRET=CHANGE_ME_generate_different_secret_openssl_rand_base64_48

# 3. SMTP/EMAIL SETTINGS
SMTP_HOST=smtp-relay.brevo.com
SMTP_USER=your-brevo-email@example.com
SMTP_PASS=your-brevo-api-key-or-smtp-password
SMTP_FROM_EMAIL=noreply@your-domain.com

# 4. DOMAIN CONFIGURATION
BASE_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
```

**Quick Secret Generation:**

```bash
# Generate JWT_SECRET
openssl rand -base64 48

# Generate JWT_REFRESH_SECRET
openssl rand -base64 48

# Generate MySQL root password
openssl rand -base64 24

# Generate database password
openssl rand -base64 24

# Generate Redis password
openssl rand -base64 24
```

### **Step 3: Verify Configuration** (2 minutes)

```bash
# Check for any CHANGE_ME values left
grep "CHANGE_ME" .env.production

# If this returns nothing, you're good! ✅
# If it shows lines, go back and change those values
```

```bash
# Validate environment
cd deploy/scripts
./01-validate-environment.sh prod

# Expected output: ✓ Validation passed!
```

### **Step 4: Deploy All Services** (5-10 minutes)

```bash
# Still in deploy/scripts/
./deploy-all.sh prod
```

**Watch for:**
```
========================================
  Apartment Management System
  Master Deployment Script
========================================

Environment: prod

Step 1/4: Deploying MySQL Database
✓ MySQL deployed successfully

Step 2/4: Deploying Redis Cache
✓ Redis deployed successfully

Step 3/4: Deploying Backend API
✓ Backend deployed successfully

Step 4/4: Deploying Frontend App
✓ Frontend deployed successfully

✓ All services deployed successfully!
```

### **Step 5: Verify Deployment** (2 minutes)

```bash
# Check all services are running
docker ps --filter "name=apartment-"

# Expected output:
# apartment-mysql       Up (healthy)
# apartment-redis       Up (healthy)
# apartment-backend     Up (healthy)
# apartment-frontend    Up (healthy)
```

```bash
# Test backend health
docker exec apartment-backend wget -qO- http://localhost:3000/api/v1/health

# Expected: {"status":"ok","timestamp":"..."}
```

**🎉 Done! Your system is deployed!**

---

## ✅ Post-Deployment Verification

### Quick Health Check

```bash
#!/bin/bash
# Save as: deploy/scripts/health-check.sh

echo "=== Apartment Management System Health Check ==="
echo ""

# Check MySQL
echo -n "MySQL: "
docker ps --filter "name=apartment-mysql" --filter "health=healthy" | grep -q "apartment-mysql" && echo "✅ Healthy" || echo "❌ Unhealthy"

# Check Redis
echo -n "Redis: "
docker ps --filter "name=apartment-redis" --filter "health=healthy" | grep -q "apartment-redis" && echo "✅ Healthy" || echo "❌ Unhealthy"

# Check Backend
echo -n "Backend: "
docker ps --filter "name=apartment-backend" --filter "health=healthy" | grep -q "apartment-backend" && echo "✅ Healthy" || echo "❌ Unhealthy"

# Check Frontend
echo -n "Frontend: "
docker ps --filter "name=apartment-frontend" | grep -q "apartment-frontend" && echo "✅ Running" || echo "❌ Not Running"

echo ""
echo "=== Service Logs (Last 5 lines) ==="
echo ""
echo "Backend:"
docker logs apartment-backend --tail=5
```

### Test Database Connection

```bash
# Connect to MySQL
docker exec -it apartment-mysql mysql -u${DATABASE_USER} -p${DATABASE_PASSWORD} ${DATABASE_NAME}

# Inside MySQL:
SHOW TABLES;
SELECT COUNT(*) FROM users;
EXIT;
```

### Test Redis Connection

```bash
# Test Redis
docker exec apartment-redis redis-cli -a ${REDIS_PASSWORD} ping

# Expected: PONG
```

### Test Application Access

```bash
# If you have Nginx configured:
curl -I http://your-domain.com

# Or access in browser:
# http://your-domain.com
```

---

## 📝 Common Tasks

### View Logs

```bash
# All services
docker logs apartment-backend -f
docker logs apartment-frontend -f
docker logs apartment-mysql --tail=100
docker logs apartment-redis --tail=100

# With timestamps
docker logs apartment-backend -f --timestamps
```

### Restart Services

```bash
# Restart backend only
docker compose -f deploy/compose/03-backend.yml restart

# Restart all services
docker restart apartment-mysql apartment-redis apartment-backend apartment-frontend
```

### Update Backend Code

```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy backend
cd deploy/scripts
./deploy-03-backend.sh prod
```

### Backup Database

```bash
cd deploy/scripts
./02-backup-database.sh prod

# Backup saved to: deploy/backups/
```

### Scale Services (Future)

```bash
# Scale backend to 3 replicas
docker compose -f deploy/compose/03-backend.yml up -d --scale backend=3
```

---

## 🔧 Troubleshooting Quick Fixes

### Issue: Service Won't Start

```bash
# Check logs
docker logs apartment-<service> --tail=50

# Check if port is already in use
sudo netstat -tulpn | grep <port>

# Restart service
docker restart apartment-<service>
```

### Issue: Database Connection Failed

```bash
# Check MySQL is running
docker ps | grep mysql

# Check MySQL logs
docker logs apartment-mysql --tail=50

# Verify credentials
grep DATABASE_ .env.production

# Test connection manually
docker exec apartment-backend ping -c 3 mysql
```

### Issue: Redis Connection Failed

```bash
# Check Redis is running
docker ps | grep redis

# Test Redis authentication
docker exec apartment-redis redis-cli -a ${REDIS_PASSWORD} ping

# Check Redis logs
docker logs apartment-redis --tail=50
```

### Issue: Backend Unhealthy

```bash
# Check backend logs
docker logs apartment-backend --tail=100

# Check database migrations
docker exec apartment-backend ls -la dist/

# Restart backend
docker restart apartment-backend

# Wait 60 seconds for health check
sleep 60 && docker ps | grep apartment-backend
```

### Issue: Environment Variable Not Set

```bash
# Check if variable exists
grep "VARIABLE_NAME" .env.production

# If missing, add it
echo "VARIABLE_NAME=value" >> .env.production

# Restart affected service
docker compose -f deploy/compose/03-backend.yml restart
```

---

## 🎯 Essential Commands Reference

### Deployment

```bash
# Deploy all services
cd deploy/scripts && ./deploy-all.sh prod

# Deploy individual service
./deploy-01-mysql.sh prod
./deploy-02-redis.sh prod
./deploy-03-backend.sh prod
./deploy-04-frontend.sh prod

# Deploy with validation skip
./deploy-all.sh prod --skip-validation
```

### Service Management

```bash
# Check status
docker ps --filter "name=apartment-"

# Start all
docker start apartment-mysql apartment-redis apartment-backend apartment-frontend

# Stop all
docker stop apartment-mysql apartment-redis apartment-backend apartment-frontend

# Restart all
docker restart apartment-mysql apartment-redis apartment-backend apartment-frontend

# Remove all (CAUTION: removes containers, not data)
docker stop apartment-mysql apartment-redis apartment-backend apartment-frontend
docker rm apartment-mysql apartment-redis apartment-backend apartment-frontend
```

### Logs & Debugging

```bash
# View logs
docker logs apartment-backend -f --tail=100

# View logs from all services
docker logs apartment-mysql --tail=50 &
docker logs apartment-redis --tail=50 &
docker logs apartment-backend --tail=50 &
docker logs apartment-frontend --tail=50

# Export logs
docker logs apartment-backend > backend-logs.txt

# Check container inspect
docker inspect apartment-backend | less
```

### Database Operations

```bash
# Backup database
cd deploy/scripts && ./02-backup-database.sh prod

# Connect to MySQL
docker exec -it apartment-mysql mysql -u${DATABASE_USER} -p

# Export database
docker exec apartment-mysql mysqldump -u${DATABASE_USER} -p${DATABASE_PASSWORD} ${DATABASE_NAME} > backup.sql

# Import database
cat backup.sql | docker exec -i apartment-mysql mysql -u${DATABASE_USER} -p${DATABASE_PASSWORD} ${DATABASE_NAME}
```

### Network Operations

```bash
# List networks
docker network ls | grep apartment

# Inspect network
docker network inspect apartment_network

# Check which containers are on network
docker network inspect apartment_network | grep -A 10 Containers
```

### Volume Operations

```bash
# List volumes
docker volume ls | grep apartment

# Inspect volume
docker volume inspect apartment_mysql_data

# Backup volume
docker run --rm -v apartment_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql-data-backup.tar.gz /data

# Restore volume
docker run --rm -v apartment_mysql_data:/data -v $(pwd):/backup alpine tar xzf /backup/mysql-data-backup.tar.gz -C /
```

---

## 🚨 Emergency Procedures

### Complete System Restart

```bash
# Stop all services
docker stop apartment-frontend apartment-backend apartment-redis apartment-mysql

# Start in order
docker start apartment-mysql
sleep 10
docker start apartment-redis
sleep 5
docker start apartment-backend
sleep 10
docker start apartment-frontend

# Or use deployment scripts
cd deploy/scripts
./deploy-all.sh prod
```

### Rollback to Previous Version

```bash
# If you have git tags
git log --oneline -10
git checkout <previous-tag>

# Rebuild and redeploy
cd deploy/scripts
./deploy-all.sh prod
```

### Database Restore from Backup

```bash
# List backups
ls -lh deploy/backups/

# Stop backend to prevent writes
docker stop apartment-backend

# Restore database
docker exec -i apartment-mysql mysql -u${DATABASE_USER} -p${DATABASE_PASSWORD} ${DATABASE_NAME} < deploy/backups/backup-file.sql

# Start backend
docker start apartment-backend
```

---

## 📊 Monitoring Commands

### Resource Usage

```bash
# Container stats
docker stats apartment-mysql apartment-redis apartment-backend apartment-frontend

# Disk usage
docker system df -v

# Network stats
docker network inspect apartment_network | grep -E "IPv4Address|Name"
```

### Performance Metrics

```bash
# MySQL queries
docker exec apartment-mysql mysql -u${DATABASE_USER} -p${DATABASE_PASSWORD} -e "SHOW PROCESSLIST;"

# Redis info
docker exec apartment-redis redis-cli -a ${REDIS_PASSWORD} INFO

# Backend metrics (if endpoint exists)
curl http://localhost:3000/api/v1/metrics
```

---

## 📚 Next Steps

After successful deployment:

1. **Configure Nginx** (if not done)
   - Set up reverse proxy
   - Configure SSL with Certbot
   - Update nginx.conf with your domain

2. **Set Up Monitoring** (optional)
   ```bash
   docker compose -f docker-compose.monitoring.yml up -d
   # Access Grafana: http://localhost:3002
   ```

3. **Create Admin User**
   - Access frontend
   - Complete initial setup
   - Create first admin account

4. **Test All Features**
   - User management
   - Company creation
   - Property/apartment management
   - Invoice generation
   - Payment recording

5. **Set Up Backups**
   - Configure automated backups
   - Test restore procedure
   - Set up offsite backup storage

6. **Configure Alerts** (optional)
   - Set up Prometheus alerts
   - Configure email notifications
   - Monitor system health

---

## ✅ Final Checklist

Before going live:

```
SECURITY
[ ] All CHANGE_ME values updated
[ ] Strong passwords set (16+ chars)
[ ] JWT secrets generated (32+ chars)
[ ] .env.production permissions: 600
[ ] .env.production in .gitignore
[ ] SSL certificates installed (if public)

FUNCTIONALITY
[ ] All services healthy
[ ] Database connection working
[ ] Redis connection working
[ ] Backend health endpoint responding
[ ] Frontend accessible
[ ] Email sending working

BACKUPS
[ ] Database backup tested
[ ] Backup restoration tested
[ ] Backup schedule configured
[ ] Offsite backup configured (optional)

MONITORING
[ ] Logs accessible
[ ] Health checks passing
[ ] Resource usage normal
[ ] Alerts configured (optional)

DOCUMENTATION
[ ] Team trained on deployment
[ ] Runbooks created
[ ] Emergency contacts documented
[ ] Rollback procedure tested
```

---

## 🆘 Getting Help

**Quick Support:**

1. **Check Logs First**
   ```bash
   docker logs apartment-backend --tail=100
   ```

2. **Review Documentation**
   - `deploy/MIGRATION_GUIDE.md` - Migration help
   - `deploy/compose/README.md` - Compose file docs
   - `docs/DEPLOYMENT_GUIDE.md` - Full deployment guide

3. **Common Issues**
   - Check environment variables
   - Verify network connectivity
   - Ensure services are healthy
   - Review error logs

4. **Contact Support**
   - GitHub Issues: https://github.com/anthropics/claude-code/issues
   - Team Chat/Slack
   - Email: support@your-domain.com

---

## 🎉 You're Done!

**Congratulations!** Your Apartment Management System is now deployed and running.

**Quick Links:**
- Frontend: http://your-domain.com
- Backend API: http://your-domain.com/api/v1
- API Docs: http://your-domain.com/api/v1/docs
- Grafana: http://your-domain.com:3002 (if monitoring enabled)

**Remember:**
- Monitor logs regularly
- Keep backups current
- Update regularly
- Document any custom changes

**Happy hosting! 🚀**

---

**Document Version**: 1.0
**Last Updated**: 2026-01-01
**Quick Start Time**: ~15 minutes
