# Deployment Utility Scripts

Helper scripts for managing environment configurations and deployment utilities.

## Available Scripts

### setup-env.sh
Sets up environment configuration files with secure secrets.

```bash
./setup-env.sh [dev|prod]
```

**What it does:**
- Copies from .env.example to create .env or .env.production
- Generates secure random secrets for JWT, database, and Redis
- Sets environment-specific configurations
- Provides checklist of manual configurations needed

**Examples:**
```bash
# Setup development environment
./setup-env.sh dev

# Setup production environment
./setup-env.sh prod
```

**Use when:**
- First time setting up the project
- Creating a new environment configuration
- Regenerating secrets after a security incident

---

### switch-env.sh
Switches between development and production environments.

```bash
./switch-env.sh <dev|prod>
```

**What it does:**
- Stops all running Docker containers
- Switches context to target environment
- Provides next steps for starting services

**Examples:**
```bash
# Switch to development
./switch-env.sh dev

# Switch to production
./switch-env.sh prod
```

**Use when:**
- Testing production configuration locally
- Switching between environments during development
- Before running deployment scripts

---

### compare-env.sh
Compares development and production environment configurations.

```bash
./compare-env.sh
```

**What it does:**
- Lists variables only in dev environment
- Lists variables only in prod environment
- Shows variables with different values (excluding secrets)
- Helps identify configuration drift

**Use when:**
- Verifying environment parity
- Debugging environment-specific issues
- Before deploying to production
- Auditing configuration consistency

---

## Workflow Examples

### Initial Project Setup
```bash
# 1. Setup development environment
./utils/setup-env.sh dev

# 2. Review and customize .env
nano ../../.env

# 3. Deploy development environment
../deploy.sh dev

# 4. Later, setup production
./utils/setup-env.sh prod

# 5. Review and customize .env.production
nano ../../.env.production
```

### Switching Between Environments
```bash
# Check current differences
./utils/compare-env.sh

# Switch to production test
./utils/switch-env.sh prod

# Deploy production configuration locally
../deploy.sh prod

# Switch back to dev
./utils/switch-env.sh dev
```

### Configuration Audit
```bash
# Compare environments
./utils/compare-env.sh

# Review differences and ensure consistency where needed
# Update configurations as necessary
```

---

## Environment Files

### .env (Development)
Used for local development and testing.

**Key settings:**
- `NODE_ENV=development`
- Debug logging enabled
- Relaxed CORS settings
- Local email testing
- Development database

### .env.production (Production)
Used for production or production-like testing.

**Key settings:**
- `NODE_ENV=production`
- Production logging
- Strict CORS settings
- Real email service
- Production database
- Enhanced security

---

## Security Considerations

### Secrets Generation
All utility scripts use `openssl rand -base64` to generate cryptographically secure secrets.

**Generated secrets:**
- JWT_SECRET (48 bytes, base64 encoded)
- JWT_REFRESH_SECRET (48 bytes, base64 encoded)
- DB_ROOT_PASSWORD (32 bytes, base64 encoded)
- DB_PASSWORD (32 bytes, base64 encoded)
- REDIS_PASSWORD (32 bytes, base64 encoded)

### Best Practices
1. **Never commit .env files to git**
   - Already in .gitignore
   - Only commit .env.example templates

2. **Regenerate secrets for each environment**
   - Don't copy secrets between dev and prod
   - Each environment should have unique secrets

3. **Restrict access to production .env**
   - Keep .env.production on secure servers only
   - Limit who can view production secrets

4. **Regular rotation**
   - Rotate secrets periodically
   - Especially after team member departures

5. **Backup encrypted**
   - If backing up .env files, encrypt them
   - Store backups securely

---

## Troubleshooting

### Problem: "Environment file already exists"
**Solution:**
- Confirm you want to overwrite when prompted
- Or manually backup and delete the existing file first

### Problem: "Example file not found"
**Solution:**
- Ensure you're running from the correct directory
- Verify .env.example exists in project root
- Check file permissions

### Problem: "sed command not found"
**Solution:**
- Install sed (should be available on most systems)
- Or manually edit the generated .env file

### Problem: Secrets not updating
**Solution:**
- Check if sed command completed successfully
- Manually update the secrets in the .env file
- Verify file permissions allow writing

---

## Integration

These utilities integrate with:
- **Deployment scripts** (`/deploy/scripts/01-*.sh` through `07-*.sh`)
- **Docker Compose** configurations
- **Migration scripts** (`/backend/scripts/migrations/`)
- **Main deploy script** (`/deploy/scripts/deploy.sh`)

For full deployment workflow, see `/deploy/scripts/README.md`
