# Production Deployment Checklist

**Author**: george1806
**Project**: Multi-Tenant Apartment Management SaaS
**Status**: Production Ready - Configuration-Based Deployment

This application is **100% production-ready** and can be deployed by changing configuration values only - **NO CODE CHANGES REQUIRED**.

---

## ✅ Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Update `NODE_ENV=production`
- [ ] Set production `BASE_URL` and `FRONTEND_URL`
- [ ] Generate new JWT secrets (min 32 chars)
- [ ] Configure production database credentials
- [ ] Configure production Redis credentials
- [ ] Set up production email service (SendGrid/SES/etc)
- [ ] Configure CORS origins for production domains
- [ ] Review and adjust rate limiting settings
- [ ] Set appropriate log levels

### 2. Database Setup

- [ ] Create production database
- [ ] Create database user with proper permissions
- [ ] Enable SSL connections (recommended)
- [ ] Set `DB_SYNCHRONIZE=false` (CRITICAL!)
- [ ] Set `DB_MIGRATIONS_RUN=true`
- [ ] Run database migrations: `npm run migration:run`
- [ ] Verify database connectivity
- [ ] Configure connection pool based on expected load
- [ ] Set up automated backups

### 3. Redis Setup

- [ ] Provision Redis instance (ElastiCache/managed service)
- [ ] Set strong Redis password
- [ ] Enable Redis persistence (AOF + RDB)
- [ ] Configure separate Redis DB for queues (DB=1)
- [ ] Verify Redis connectivity
- [ ] Monitor memory usage

### 4. Security Configuration

- [ ] Change all default passwords
- [ ] Generate unique JWT secrets
- [ ] Enable HTTPS (use reverse proxy)
- [ ] Configure strict CORS
- [ ] Enable Helmet security headers
- [ ] Enable rate limiting
- [ ] Review throttle limits
- [ ] Set up firewall rules
- [ ] Configure SSL certificates
- [ ] Enable CSRF protection

### 5. Email Service

- [ ] Choose email provider (SendGrid/SES/Mailgun)
- [ ] Create account and verify domain
- [ ] Configure SMTP credentials
- [ ] Set `MAIL_SECURE=true`
- [ ] Test email delivery
- [ ] Configure email templates
- [ ] Set up SPF/DKIM/DMARC records

### 6. Queue & Background Jobs

- [ ] Verify queue Redis connection
- [ ] Configure job retry settings
- [ ] Set appropriate job retention periods
- [ ] Test queue processor startup
- [ ] Verify BullMQ dashboard access (optional)
- [ ] Monitor queue performance

### 7. Reminders & Cron Jobs

- [ ] Configure `REMINDER_DUE_SOON_DAYS` (default: 3)
- [ ] Set `REMINDER_DUE_SOON_CRON` for your timezone
- [ ] Set `REMINDER_OVERDUE_CRON` for your timezone
- [ ] Configure `REMINDER_OVERDUE_INTERVAL_DAYS` (default: 7)
- [ ] Test cron expressions: https://crontab.guru
- [ ] Verify cron jobs execute on schedule
- [ ] Monitor reminder queue processing

### 8. Monitoring & Logging

- [ ] Set up application monitoring (optional: Sentry)
- [ ] Configure log aggregation (optional: CloudWatch/Datadog)
- [ ] Enable health check endpoint
- [ ] Set up uptime monitoring
- [ ] Configure alerts for errors
- [ ] Set up performance monitoring
- [ ] Enable metrics collection

---

## 🚀 Deployment Steps

### Option 1: PM2 Deployment

```bash
# 1. Build application
npm run build

# 2. Install PM2 globally
npm install -g pm2

# 3. Start application with production env
pm2 start dist/main.js --name apartment-api --env production

# 4. Configure auto-restart on reboot
pm2 startup
pm2 save

# 5. Monitor
pm2 monit
pm2 logs apartment-api

# 6. Commands
pm2 restart apartment-api  # Restart app
pm2 stop apartment-api     # Stop app
pm2 delete apartment-api   # Remove app
```

### Option 2: Docker Deployment

```bash
# 1. Build Docker image
docker build -t apartment-api:latest .

# 2. Run container
docker run -d \
  --name apartment-api \
  --env-file .env.production \
  -p 3000:3000 \
  --restart unless-stopped \
  apartment-api:latest

# 3. Check logs
docker logs -f apartment-api

# 4. Commands
docker restart apartment-api
docker stop apartment-api
docker rm apartment-api
```

### Option 3: Docker Compose

```bash
# 1. Update docker-compose.yml for production
# 2. Deploy stack
docker-compose -f docker-compose.prod.yml up -d

# 3. Monitor
docker-compose logs -f api
```

### Option 4: Kubernetes

```bash
# 1. Create ConfigMap from .env.production
kubectl create configmap apartment-api-config --from-env-file=.env.production

# 2. Apply deployment
kubectl apply -f k8s/deployment.yaml

# 3. Expose service
kubectl apply -f k8s/service.yaml
```

---

## 🔧 Configuration Changes (No Code Required!)

All production customization is done via environment variables:

### Adjust Reminder Timing
```env
# Send reminders 5 days before due date
REMINDER_DUE_SOON_DAYS=5

# Run at 9 AM instead of 8 AM
REMINDER_DUE_SOON_CRON=0 9 * * *

# Send overdue reminders every 3 days
REMINDER_OVERDUE_INTERVAL_DAYS=3
```

### Adjust Rate Limiting
```env
# Allow 200 requests per minute
THROTTLE_LIMIT=200
THROTTLE_TTL=60
```

### Adjust Session Timeouts
```env
# 30-minute sessions
JWT_EXPIRES_IN=30m
SESSION_TTL=1800

# 30-day refresh tokens
JWT_REFRESH_EXPIRES_IN=30d
REFRESH_SESSION_TTL=2592000
```

### Scale Database Connections
```env
# Large deployment
DB_POOL_SIZE=100

# Small deployment
DB_POOL_SIZE=20
```

### Adjust Queue Retry Logic
```env
# More aggressive retries
QUEUE_JOB_ATTEMPTS=5
QUEUE_JOB_BACKOFF_DELAY=120000

# Keep jobs longer
QUEUE_COMPLETED_JOB_AGE=604800
QUEUE_FAILED_JOB_AGE=2592000
```

---

## 🧪 Testing Production Config

### Test Database Connection
```bash
node -e "
const mysql = require('mysql2/promise');
require('dotenv').config({path:'.env.production'});
mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
}).then(c => console.log('✅ DB Connected')).catch(e => console.error('❌', e));
"
```

### Test Redis Connection
```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

### Test Email Sending
```bash
# Start server and test via API
curl -X POST http://localhost:3000/api/v1/reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{...}'
```

### Verify Migrations
```bash
npm run migration:show
```

---

## 🔍 Post-Deployment Verification

### 1. Application Health
```bash
curl https://api.yourdomain.com/health
# Expected: {"status":"ok"}
```

### 2. Database Connectivity
```bash
curl https://api.yourdomain.com/health/db
```

### 3. Redis Connectivity
```bash
curl https://api.yourdomain.com/health/redis
```

### 4. API Documentation
```bash
# Access Swagger docs
https://api.yourdomain.com/api/docs
```

### 5. Test Authentication
```bash
# Register test company
curl -X POST https://api.yourdomain.com/api/v1/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test","email":"test@test.com","password":"Test1234!"}'
```

### 6. Monitor Logs
```bash
# PM2
pm2 logs apartment-api --lines 100

# Docker
docker logs apartment-api --tail 100 -f

# Kubernetes
kubectl logs -f deployment/apartment-api
```

### 7. Verify Cron Jobs
```bash
# Check logs for:
# "Running scheduled check for due invoices..."
# "Running scheduled check for overdue invoices..."
```

### 8. Check Queue Processing
```bash
# Redis CLI
redis-cli
> SELECT 1
> KEYS bull:*
> LLEN bull:reminders:waiting
```

---

## 📊 Performance Tuning (Configuration Only)

### High Load Optimization
```env
# Increase database pool
DB_POOL_SIZE=100

# Reduce cache TTL for fresher data
REDIS_TTL=1800

# More aggressive rate limiting
THROTTLE_LIMIT=200

# Longer job retention
QUEUE_COMPLETED_JOB_AGE=3600
```

### Low Resource Optimization
```env
# Reduce database pool
DB_POOL_SIZE=10

# Longer cache TTL
REDIS_TTL=7200

# Shorter job retention
QUEUE_COMPLETED_JOB_AGE=3600
QUEUE_FAILED_JOB_AGE=86400
```

---

## 🔄 Configuration Update Workflow

### Zero-Downtime Config Update

1. **Update .env.production**
2. **Graceful restart:**
   ```bash
   # PM2
   pm2 reload apartment-api

   # Docker
   docker restart apartment-api

   # Kubernetes
   kubectl rollout restart deployment/apartment-api
   ```

### Configuration Version Control

```bash
# Track configuration template (without secrets)
git add .env.production.example
git commit -m "Update production config template"

# NEVER commit actual .env.production!
# Add to .gitignore
echo ".env.production" >> .gitignore
```

---

## 🆘 Rollback Procedure

### Quick Rollback

1. **Restore previous .env.production**
   ```bash
   cp .env.production.backup .env.production
   ```

2. **Restart application**
   ```bash
   pm2 restart apartment-api
   ```

3. **Verify health**
   ```bash
   curl https://api.yourdomain.com/health
   ```

---

## 📈 Scaling Configuration

### Horizontal Scaling (Multiple Instances)

```env
# Use external Redis (not localhost)
REDIS_HOST=redis.cluster.internal
QUEUE_REDIS_HOST=redis.cluster.internal

# Use external MySQL (not localhost)
DB_HOST=mysql.cluster.internal

# Adjust pool per instance
DB_POOL_SIZE=30  # If running 3 instances, total = 90
```

### Vertical Scaling (Bigger Instances)

```env
# Increase connection pool
DB_POOL_SIZE=150

# Increase queue workers (automatic with more CPU)
# No config change needed - BullMQ scales automatically
```

---

## 🎯 Production Readiness Score

### Current Implementation: ✅ 100% Production Ready

- ✅ **Configuration-Driven**: All settings via environment variables
- ✅ **Security Hardened**: JWT, CORS, Rate Limiting, Helmet
- ✅ **Database Ready**: Migrations, Connection Pooling, SSL support
- ✅ **Caching**: Redis with configurable TTL
- ✅ **Background Jobs**: BullMQ with retry logic
- ✅ **Automated Tasks**: Cron jobs for reminders
- ✅ **Monitoring**: Health checks, logging
- ✅ **Scalable**: Horizontal and vertical scaling supported
- ✅ **Multi-tenant**: Complete tenant isolation
- ✅ **Email Ready**: SMTP support with queue
- ✅ **Error Handling**: Comprehensive error handling
- ✅ **Documentation**: Swagger API docs

---

## 📝 Deployment Notes

### What Makes This Production-Ready

1. **No Hardcoded Values**
   - All configuration via environment variables
   - Easy to change without code deployment
   - Environment-specific configs supported

2. **Security First**
   - Strong password hashing (bcrypt, 12 rounds)
   - JWT with refresh tokens
   - Session management with Redis
   - Rate limiting
   - CORS protection
   - Helmet security headers

3. **Scalable Architecture**
   - Connection pooling
   - Redis caching
   - Asynchronous job processing
   - Stateless API design

4. **Operational Excellence**
   - Health check endpoints
   - Comprehensive logging
   - Database migrations
   - Graceful shutdown
   - Error tracking ready

5. **Business Logic Complete**
   - Automated reminders
   - Invoice management
   - Payment processing
   - Multi-tenant support
   - Full CRUD operations

---

## 🎉 Ready to Deploy!

Your application is production-ready. Simply:

1. ✅ Copy `.env.production.example` to `.env.production`
2. ✅ Update configuration values for your environment
3. ✅ Deploy using your preferred method (PM2/Docker/K8s)
4. ✅ Run migrations
5. ✅ Verify health checks
6. ✅ Monitor logs

**No code changes required - it's all configuration!**

---

**Author**: george1806
**Date**: 2025-10-13
**Version**: 1.0.0
**Status**: Production Ready ✅
