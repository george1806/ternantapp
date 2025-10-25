# Deployment Guide - TernantApp

## Prerequisites

### Required Software
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git
- MySQL 8.0+ (if not using Docker)
- Redis 7+ (if not using Docker)

### Environment Variables
Create `.env` file in project root:

```bash
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api

# Database
DB_HOST=mysql
DB_PORT=3306
DB_NAME=apartment_management
DB_USER=apartment_user
DB_PASSWORD=<strong-password>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# JWT
JWT_SECRET=<generate-strong-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<password>
SMTP_FROM=noreply@ternantapp.com

# Super Admin
SUPER_ADMIN_EMAIL=superadmin@ternantapp.com
SUPER_ADMIN_PASSWORD=<strong-password>
```

## Docker Deployment (Recommended)

### 1. Clone Repository
```bash
git clone <repository-url>
cd ternantapp
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with production values
```

### 3. Build and Start Services
```bash
# Build all services
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps
```

### 4. Run Database Migrations
```bash
docker exec apartment-backend pnpm run migration:run
```

### 5. Create Super Admin User
```bash
docker exec apartment-backend pnpm run seed:super-admin
```

### 6. Verify Deployment
```bash
# Check backend health
curl http://localhost:3000/api/health

# Check frontend
curl http://localhost:3001

# Access Swagger docs
open http://localhost:3000/api/docs
```

## Services Overview

### Backend API (Port 3000)
- NestJS application
- Handles all API requests
- Connects to MySQL and Redis

### Frontend (Port 3001)
- Next.js 15 application
- Server-side rendering
- API proxy to backend

### MySQL (Port 3307)
- Database for all application data
- Persistent volume for data storage

### Redis (Port 6380)
- Session management
- Caching layer
- Queue management (BullMQ)

### MailPit (Port 8025)
- Email testing in development
- Replace with real SMTP in production

### phpMyAdmin (Port 8082)
- Database management UI
- Remove in production

### Redis Commander (Port 8081)
- Redis management UI
- Remove in production

## Production Deployment

### Docker Compose Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    environment:
      - NODE_ENV=production
    restart: always
    
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    restart: always
    
  # Remove development-only services
  # - phpMyAdmin
  # - Redis Commander
  # - MailPit
```

### Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/ternantapp

server {
    listen 80;
    server_name ternantapp.com www.ternantapp.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ternantapp.com www.ternantapp.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/ternantapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ternantapp.com/privkey.pem;
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d ternantapp.com -d www.ternantapp.com

# Auto-renewal (cron)
0 0 * * * certbot renew --quiet
```

## Database Backup

### Automated Backup Script
```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="apartment_management_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec apartment-mysql mysqldump \
  -u apartment_user \
  -p apartment_management \
  > "${BACKUP_DIR}/${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_DIR}/${BACKUP_FILE}"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

### Restore Database
```bash
# Extract backup
gunzip apartment_management_20250124_120000.sql.gz

# Restore
docker exec -i apartment-mysql mysql \
  -u apartment_user \
  -p apartment_management \
  < apartment_management_20250124_120000.sql
```

## Monitoring

### Docker Logs
```bash
# View all logs
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend

# Last 100 lines
docker compose logs --tail=100 backend
```

### Health Checks
```bash
# Backend health
curl http://localhost:3000/api/health

# Database connectivity
docker exec apartment-backend pnpm run migration:show

# Redis connectivity
docker exec apartment-redis redis-cli ping
```

### Resource Monitoring
```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Scaling

### Horizontal Scaling (Multiple Backend Instances)
```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
    
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
    depends_on:
      - backend
```

### Load Balancer Configuration
```nginx
# nginx.conf
upstream backend_servers {
    least_conn;
    server backend_1:3000;
    server backend_2:3000;
    server backend_3:3000;
}

server {
    location /api/ {
        proxy_pass http://backend_servers;
    }
}
```

## Security Checklist

### Production Security
- [ ] Change all default passwords
- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable SSL/TLS (HTTPS only)
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Implement IP whitelisting for admin routes
- [ ] Regular security updates
- [ ] Database encryption at rest
- [ ] Secure Redis with password
- [ ] Remove development tools (phpMyAdmin, Redis Commander)
- [ ] Enable Docker security scanning
- [ ] Set up logging and alerting

### Environment Variables
Never commit `.env` to version control:
```bash
# .gitignore
.env
.env.local
.env.production
```

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
docker compose logs backend

# Check database connection
docker compose exec backend pnpm run migration:show

# Restart service
docker compose restart backend
```

### Database Connection Issues
```bash
# Check MySQL is running
docker compose ps mysql

# Test connection
docker exec apartment-backend pnpm run typeorm query "SELECT 1"

# Check environment variables
docker compose exec backend env | grep DB_
```

### Frontend Build Failures
```bash
# Clean and rebuild
docker compose down
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Redis Connection Issues
```bash
# Check Redis is running
docker compose ps redis

# Test connection
docker exec apartment-redis redis-cli ping

# Clear cache
docker exec apartment-redis redis-cli FLUSHALL
```

## Maintenance

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose down
docker compose build
docker compose up -d

# Run new migrations
docker exec apartment-backend pnpm run migration:run
```

### Database Migrations
```bash
# Show migration status
docker exec apartment-backend pnpm run migration:show

# Run pending migrations
docker exec apartment-backend pnpm run migration:run

# Revert last migration
docker exec apartment-backend pnpm run migration:revert
```

### Clear Application Cache
```bash
# Clear Redis cache
docker exec apartment-redis redis-cli FLUSHDB

# Clear application logs
docker compose logs --tail=0 -f backend > /dev/null &
```

## Performance Optimization

### Database Indexes
Ensure indexes are created for:
- User email + company_id
- Company slug
- Tenant email
- Invoice dates
- Payment dates

### Redis Caching
Configure appropriate TTLs:
- User data: 5 minutes
- Company settings: 15 minutes
- Statistics: 1 hour

### Frontend Optimization
- Enable Next.js production mode
- Configure CDN for static assets
- Enable image optimization
- Implement code splitting

## Support

### Logs Location
- Backend: `docker compose logs backend`
- Frontend: `docker compose logs frontend`
- MySQL: `docker compose logs mysql`
- Redis: `docker compose logs redis`

### Common Issues
1. **Port already in use**: Change ports in docker-compose.yml
2. **Permission denied**: Run with `sudo` or fix Docker permissions
3. **Out of memory**: Increase Docker memory limit
4. **Database locked**: Restart MySQL container

### Contact
For deployment support, contact the development team.
