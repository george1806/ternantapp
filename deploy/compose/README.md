# Production Compose Files

This directory contains separate Docker Compose files for each service in the production deployment.

## Architecture

The production deployment is split into individual service compose files for better:
- **Modularity**: Deploy/update services independently
- **Maintainability**: Each service has its own configuration
- **Flexibility**: Scale services separately
- **Debugging**: Easier to troubleshoot individual services

## Compose Files

| File | Service | Dependencies | Deploy Order |
|------|---------|--------------|--------------|
| `01-mysql.yml` | MySQL Database | None | 1st |
| `02-redis.yml` | Redis Cache | Network from MySQL | 2nd |
| `03-backend.yml` | NestJS API | MySQL + Redis | 3rd |
| `04-frontend.yml` | Next.js App | Backend | 4th |

## Deployment Order

**IMPORTANT**: Services must be deployed in the correct order:

```
1. MySQL    (creates network + provides database)
   ↓
2. Redis    (provides caching and queues)
   ↓
3. Backend  (depends on MySQL + Redis)
   ↓
4. Frontend (depends on Backend)
```

## Usage

### Individual Service Deployment

```bash
# Set environment
export ENV_FILE=.env.production

# Deploy MySQL
docker compose --env-file $ENV_FILE -f deploy/compose/01-mysql.yml up -d

# Deploy Redis
docker compose --env-file $ENV_FILE -f deploy/compose/02-redis.yml up -d

# Deploy Backend
docker compose --env-file $ENV_FILE -f deploy/compose/03-backend.yml up -d

# Deploy Frontend
docker compose --env-file $ENV_FILE -f deploy/compose/04-frontend.yml up -d
```

### Automated Deployment (Recommended)

Use the deployment scripts in `deploy/scripts/`:

```bash
# Deploy all services in correct order
cd deploy/scripts
./deploy-all.sh prod

# Or deploy individually
./deploy-01-mysql.sh prod
./deploy-02-redis.sh prod
./deploy-03-backend.sh prod
./deploy-04-frontend.sh prod
```

## Environment Variables

All compose files use environment variables - **NO hard-coded values**.

### Required Variables

Create `.env.production` with:

```bash
# Network
NETWORK_NAME=apartment_network

# MySQL
MYSQL_VERSION=8.0
MYSQL_CONTAINER_NAME=apartment-mysql
MYSQL_ROOT_PASSWORD=strong_root_password_here
DATABASE_NAME=apartment_management
DATABASE_USER=apartment_user
DATABASE_PASSWORD=strong_db_password_here
MYSQL_MAX_CONNECTIONS=1000
MYSQL_BUFFER_POOL_SIZE=2G

# Redis
REDIS_VERSION=7-alpine
REDIS_CONTAINER_NAME=apartment-redis
REDIS_PASSWORD=strong_redis_password_here
REDIS_MAXMEMORY=2gb
REDIS_MAXMEMORY_POLICY=noeviction

# Backend
BACKEND_CONTAINER_NAME=apartment-backend
BACKEND_INTERNAL_PORT=3000
NODE_ENV=production
DATABASE_HOST=mysql
DATABASE_PORT=3306
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret_32_chars_minimum
JWT_REFRESH_SECRET=your_refresh_secret_32_chars_minimum
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM_EMAIL=noreply@example.com
BASE_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com

# Frontend
FRONTEND_CONTAINER_NAME=apartment-frontend
FRONTEND_INTERNAL_PORT=3001
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1

# Health Checks
HEALTH_CHECK_INTERVAL=30s
HEALTH_CHECK_TIMEOUT=10s
HEALTH_CHECK_RETRIES=3
HEALTH_CHECK_START_PERIOD=60s

# Logging
LOG_DRIVER=json-file
LOG_MAX_SIZE=10m
LOG_MAX_FILE=5

# General
RESTART_POLICY=always
TIMEZONE=UTC
BUILD_TARGET=production
```

## Networking

All services connect to `apartment_network` (bridge network):

- **MySQL**: Creates the network on first deployment
- **Redis**: Joins existing network (external: true)
- **Backend**: Joins existing network (external: true)
- **Frontend**: Joins existing network (external: true)

Services communicate using container names:
- Backend connects to: `mysql:3306` and `redis:6379`
- Frontend connects to: `backend:3000`

## Volumes

### Persistent Volumes

- `apartment_mysql_data`: MySQL database files
- `apartment_redis_data`: Redis persistence files
- `apartment_backend_logs`: Backend application logs
- `apartment_uploads`: Uploaded files

### Bind Mounts

- `./mysql/conf.d`: MySQL configuration (read-only)
- `./deploy/backups`: Database backup destination

## Health Checks

All services have health checks configured:

- **MySQL**: `mysqladmin ping`
- **Redis**: `redis-cli ping`
- **Backend**: HTTP GET `/api/v1/health`
- **Frontend**: HTTP GET `/`

Health check parameters are configurable via environment variables.

## Service Management

### View Service Status

```bash
# All services
docker ps --filter "name=apartment-"

# Specific service
docker compose --env-file .env.production -f deploy/compose/01-mysql.yml ps
```

### View Logs

```bash
# MySQL
docker compose --env-file .env.production -f deploy/compose/01-mysql.yml logs -f

# Backend
docker compose --env-file .env.production -f deploy/compose/03-backend.yml logs -f --tail=100
```

### Stop Services

```bash
# Stop all (in reverse order)
docker compose -f deploy/compose/04-frontend.yml down
docker compose -f deploy/compose/03-backend.yml down
docker compose -f deploy/compose/02-redis.yml down
docker compose -f deploy/compose/01-mysql.yml down

# Or use --volumes to remove data (CAREFUL!)
docker compose -f deploy/compose/01-mysql.yml down --volumes
```

### Restart Service

```bash
# Restart backend
docker compose --env-file .env.production -f deploy/compose/03-backend.yml restart
```

### Update Service

```bash
# Rebuild and redeploy backend
docker compose --env-file .env.production -f deploy/compose/03-backend.yml up -d --build
```

## Security Notes

1. **No Exposed Ports**: MySQL and Redis have NO exposed ports (internal only)
2. **Backend/Frontend**: Use `expose` instead of `ports` (accessed via Nginx)
3. **Passwords Required**: All services require strong passwords
4. **Non-root Users**: Production images run as non-root users
5. **Network Isolation**: Services only accessible within Docker network

## Troubleshooting

### Network Issues

```bash
# Check if network exists
docker network inspect apartment_network

# Recreate network
docker network rm apartment_network
docker network create apartment_network
```

### Container Not Healthy

```bash
# Check logs
docker logs apartment-backend --tail=100

# Check health status
docker inspect apartment-backend | grep -A 10 Health
```

### Volume Issues

```bash
# List volumes
docker volume ls | grep apartment

# Inspect volume
docker volume inspect apartment_mysql_data
```

## Best Practices

1. **Always use environment files**: Never hard-code values
2. **Deploy in order**: Follow the dependency chain
3. **Check health**: Verify each service is healthy before deploying next
4. **Use scripts**: Prefer automated scripts over manual commands
5. **Backup before updates**: Always backup MySQL before major changes
6. **Monitor logs**: Watch logs during deployment for errors
7. **Test thoroughly**: Verify each service after deployment

## See Also

- [Deployment Scripts README](../scripts/README.md)
- [Deployment Guide](../../docs/DEPLOYMENT_GUIDE.md)
- [System Overview](../../docs/SYSTEM_OVERVIEW.md)
