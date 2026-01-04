# Deployment Directory

Automated deployment system for the Apartment Management application.

## Quick Navigation

- **[Deployment Scripts & Complete Guide](scripts/README.md)** - Main deployment documentation
- **[Migration Management](../backend/scripts/migrations/README.md)** - Database migration tools
- **[Utility Scripts](scripts/utils/README.md)** - Environment management helpers

## Quick Start

```bash
# First time setup
cd scripts
./utils/setup-env.sh dev
./deploy.sh dev

# Subsequent deployments
cd scripts
./deploy.sh dev

# Production deployment
cd scripts
./deploy.sh prod
```

## Directory Structure

```
deploy/
├── README.md                          # This file
├── backups/                           # Database backups (auto-created)
└── scripts/
    ├── README.md                      # Complete deployment guide
    ├── deploy.sh                      # Master deployment script
    ├── 01-validate-environment.sh     # Prerequisites validation
    ├── 02-backup-database.sh          # Database backup
    ├── 03-build-images.sh             # Docker image builds
    ├── 04-deploy-database.sh          # MySQL + Redis deployment
    ├── 05-deploy-backend.sh           # Backend API deployment
    ├── 06-deploy-frontend.sh          # Frontend app deployment
    ├── 07-verify-deployment.sh        # Deployment verification
    └── utils/
        ├── README.md                  # Utility scripts guide
        ├── setup-env.sh               # Environment setup
        ├── switch-env.sh              # Environment switcher
        └── compare-env.sh             # Environment comparison
```

## What's Included

### Deployment Automation
- **7 numbered scripts** - Sequential deployment steps
- **1 master script** - Orchestrates entire deployment
- **2 deployment modes** - Development and production
- **Automatic migrations** - Database updates on deployment
- **Health checks** - Comprehensive verification
- **Rollback support** - Database backups before deployment

### Environment Management
- **setup-env.sh** - Create and configure environments with secure secrets
- **switch-env.sh** - Switch between dev and prod
- **compare-env.sh** - Compare environment configurations

### Migration Tools
Located in `/backend/scripts/migrations/`:
- **generate.sh** - Auto-generate migrations
- **create-empty.sh** - Create blank migration
- **run.sh** - Execute migrations
- **revert.sh** - Rollback migrations
- **status.sh** - Check migration status
- **validate.sh** - Validate schema consistency

## Common Commands

### Initial Setup
```bash
cd deploy/scripts
./utils/setup-env.sh dev
nano ../../.env
./deploy.sh dev
```

### Regular Deployment
```bash
cd deploy/scripts
./deploy.sh dev
```

### Clean Install (Removes All Data)
```bash
cd deploy/scripts
./deploy.sh dev --clean
```

### Production Deployment
```bash
cd deploy/scripts
./utils/setup-env.sh prod
nano ../../.env.production
./deploy.sh prod
```

### Verify Deployment
```bash
cd deploy/scripts
./07-verify-deployment.sh dev
```

### Database Backup
```bash
cd deploy/scripts
./02-backup-database.sh dev
```

### Manage Migrations
```bash
cd backend/scripts/migrations
./generate.sh MyNewMigration dev
./run.sh dev
./validate.sh dev
```

## Deployment Modes

### Development (`dev`)
- Uses `.env` and `docker-compose.yml`
- Debug logging enabled
- Relaxed security for local testing
- **Command:** `./deploy.sh dev`

### Production (`prod`)
- Uses `.env.production` and `docker-compose.prod.yml`
- Optimized builds and logging
- Enhanced security settings
- **Command:** `./deploy.sh prod`

## Documentation

For complete documentation including:
- Detailed script descriptions
- Workflow examples
- Troubleshooting guide
- Best practices
- Environment variable reference

**See: [scripts/README.md](scripts/README.md)**

## Support

### Common Issues

**Deployment fails:**
```bash
# Check logs
docker compose logs

# Verify prerequisites
./scripts/01-validate-environment.sh dev
```

**Database issues:**
```bash
# Check database container
docker compose ps mysql
docker compose logs mysql

# Validate schema
cd backend/scripts/migrations
./validate.sh dev
```

**Migration problems:**
```bash
# Check status
cd backend/scripts/migrations
./status.sh dev

# Validate schema
./validate.sh dev
```

### Getting Help

1. Check the [complete deployment guide](scripts/README.md)
2. Review [migration documentation](../backend/scripts/migrations/README.md)
3. Check [utility scripts guide](scripts/utils/README.md)
4. Review container logs: `docker compose logs`
5. Verify deployment: `./scripts/07-verify-deployment.sh dev`

## Architecture

```
┌─────────────────────────────────────────┐
│         Apartment Management            │
│         Docker Deployment               │
└─────────────────────────────────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
┌───▼────┐         ┌────▼─────┐
│Database│         │  Cache   │
│ MySQL  │         │  Redis   │
│ :3306  │         │  :6379   │
└───┬────┘         └────┬─────┘
    │                   │
    └─────────┬─────────┘
              │
        ┌─────▼──────┐
        │  Backend   │
        │  NestJS    │
        │   :3000    │
        └─────┬──────┘
              │
        ┌─────▼──────┐
        │  Frontend  │
        │  Next.js   │
        │   :3001    │
        └────────────┘
```

## Next Steps

After deployment:

1. **Access Application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000/api/v1

2. **Create Admin User:**
   ```bash
   docker exec apartment-backend npm run seed:super-admin
   ```

3. **Monitor Logs:**
   ```bash
   docker compose logs -f
   ```

4. **Verify Health:**
   ```bash
   cd deploy/scripts
   ./07-verify-deployment.sh dev
   ```

---

For detailed information, see [scripts/README.md](scripts/README.md)
