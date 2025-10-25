# TernantApp - Deployment Environments Guide

**Version:** 1.0.1
**Last Updated:** 2025-10-25

---

## 📋 Overview

This document provides a comprehensive comparison of different deployment environments for TernantApp and helps you choose the right approach for your needs.

---

## 🌍 Available Environments

### 1. Local Development
**Purpose:** Development and debugging
**Documentation:** `README.md` (Development section)

### 2. Staging
**Purpose:** Pre-production testing and validation
**Documentation:** `STAGING_DEPLOYMENT.md`

### 3. Production
**Purpose:** Live customer-facing deployment
**Documentation:** `PRODUCTION_DEPLOYMENT.md`

---

## 📊 Environment Comparison

### Quick Reference Table

| Aspect | Local Dev | Staging | Production |
|--------|-----------|---------|------------|
| **Purpose** | Development | Testing | Live Users |
| **Data** | Mock/Test | Synthetic | Real Customer Data |
| **Domain** | localhost | staging.domain.com | domain.com |
| **SSL** | Not required | Optional | **Required** |
| **Monitoring** | Minimal | Basic | **Full + Alerts** |
| **Backups** | None | Weekly | **Daily + Hourly** |
| **Resources** | Min (2CPU, 4GB) | Min (2CPU, 4GB) | **Rec (4CPU, 8GB+)** |
| **Deployment** | Manual | Automated | **Automated + Verified** |
| **Testing** | Unit tests | Full suite | **Smoke tests only** |
| **Availability** | Developer hours | Business hours | **24/7** |
| **Support** | Self | Team | **24/7 On-call** |
| **Cost** | Free (local) | Low | **Higher** |

---

## 🎯 Detailed Comparison

### Infrastructure

#### Local Development
```yaml
Server: Developer's machine
CPU: 2-4 cores
RAM: 4-8GB
Storage: 20GB
Network: Local
Firewall: Not required
SSL: Not required
Docker: Yes
Compose: Yes
```

#### Staging
```yaml
Server: Cloud VM (DigitalOcean, AWS, etc.)
CPU: 2 cores minimum
RAM: 4GB minimum
Storage: 30GB SSD
Network: Public internet
Firewall: UFW (basic rules)
SSL: Let's Encrypt (optional)
Docker: Yes
Compose: Yes
Monitoring: Grafana (local)
Backups: Weekly
```

#### Production
```yaml
Server: Cloud VM (HA if possible)
CPU: 4 cores minimum (8 recommended)
RAM: 8GB minimum (16GB recommended)
Storage: 100GB SSD (with growth plan)
Network: High-speed, redundant
Firewall: UFW (strict rules) + Fail2ban
SSL: Commercial cert (Let's Encrypt acceptable)
Docker: Yes
Compose: Yes
Monitoring: Grafana + Prometheus + Alerts
Backups: Daily + Hourly incrementals
CDN: Recommended
Load Balancer: Recommended for scaling
```

---

### Configuration Differences

#### Environment Variables

**Local Development:**
```bash
NODE_ENV=development
DATABASE_HOST=localhost
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=debug
THROTTLE_LIMIT=1000  # Very permissive
```

**Staging:**
```bash
NODE_ENV=staging
DATABASE_HOST=mysql
CORS_ORIGINS=https://staging.domain.com,http://localhost:3000
LOG_LEVEL=debug
THROTTLE_LIMIT=200  # Permissive for testing
```

**Production:**
```bash
NODE_ENV=production
DATABASE_HOST=mysql
CORS_ORIGINS=https://domain.com  # STRICT
LOG_LEVEL=error
THROTTLE_LIMIT=100  # Production limits
```

---

### Security Requirements

| Security Measure | Local | Staging | Production |
|------------------|-------|---------|------------|
| **Strong Passwords** | No | Yes | **CRITICAL** |
| **SSL/TLS** | No | Optional | **Required** |
| **Firewall** | No | Basic | **Strict + Fail2ban** |
| **Rate Limiting** | No | Yes | **Yes + Tested** |
| **Security Headers** | Basic | Yes | **Full Helmet.js** |
| **Secrets Management** | .env file | .env file | **Vault (recommended)** |
| **Security Audit** | No | Recommended | **Required** |
| **Penetration Testing** | No | Optional | **Required** |
| **Vulnerability Scanning** | No | Yes | **Automated + Regular** |

---

### Monitoring & Logging

| Feature | Local | Staging | Production |
|---------|-------|---------|------------|
| **Application Logs** | Console | File + Console | **File (rotated)** |
| **Error Tracking** | Console | Basic | **Sentry/Similar** |
| **Metrics Collection** | No | Yes (Prometheus) | **Yes + Historical** |
| **Dashboards** | No | Grafana (local) | **Grafana + Public** |
| **Alerts** | No | Email only | **Email + Slack + PagerDuty** |
| **Uptime Monitoring** | No | Optional | **Required** |
| **Log Retention** | 1 day | 7 days | **30 days minimum** |
| **APM** | No | Optional | **Recommended** |

---

### Testing Requirements

| Test Type | Local | Staging | Production |
|-----------|-------|---------|------------|
| **Unit Tests** | Always | Before deploy | **Must pass** |
| **Integration Tests** | On demand | Always | **Must pass** |
| **E2E Tests** | On demand | Before deploy | **Smoke tests only** |
| **Load Tests** | No | Yes (k6) | **Results documented** |
| **Security Tests** | No | Yes | **Audit required** |
| **UAT** | No | Yes | **Sign-off required** |
| **Smoke Tests** | No | After deploy | **After deploy** |

---

### Deployment Process

#### Local Development
```bash
# Quick and simple
docker compose up -d
npm run dev

# No verification needed
# No backups needed
# No approvals needed
```

#### Staging
```bash
# Preparation (15 min)
1. Update code from git
2. Configure .env.staging
3. Generate test secrets

# Deployment (10 min)
4. Run ./deploy.sh staging
5. Verify health checks
6. Seed test data

# Testing (30-60 min)
7. Run test suite
8. Load testing
9. Manual UAT
10. Document results

# Total: ~90 minutes
```

#### Production
```bash
# Pre-deployment (45 min)
1. Complete staging testing
2. Security audit review
3. Backup verification
4. Team notification
5. Stakeholder approval

# Deployment (30 min)
6. Maintenance window starts
7. Final backup
8. Run ./deploy.sh production
9. Verify health checks
10. Smoke tests

# Post-deployment (4 hours)
11. Continuous monitoring
12. Error log review
13. Performance verification
14. Team standby

# Total: ~5-6 hours (including monitoring)
```

---

## 🚦 Deployment Decision Tree

```
┌─────────────────────────────────────┐
│  What are you trying to do?        │
└─────────────────────────────────────┘
                 │
                 ├─→ Develop new features ──→ LOCAL DEVELOPMENT
                 │
                 ├─→ Test before production ──→ STAGING
                 │
                 └─→ Deploy to customers ──→ PRODUCTION
                           │
                           ├─→ Staging tested? NO ──→ GO TO STAGING FIRST!
                           │
                           └─→ Staging tested? YES ──→ ✅ Proceed
```

---

## 📝 Environment-Specific Guides

### Choose Your Guide

**For Local Development:**
```bash
# See README.md - Quick Start section
cd backend && npm run dev
cd frontend && npm run dev
```

**For Staging Deployment:**
```bash
# See STAGING_DEPLOYMENT.md
# Purpose: Testing before production
# Time: ~90 minutes
# Checklist: Testing-focused
```

**For Production Deployment:**
```bash
# See PRODUCTION_DEPLOYMENT.md
# Purpose: Live deployment
# Time: ~5-6 hours (inc. monitoring)
# Checklist: Security and stability focused
```

---

## ⚙️ Configuration Files by Environment

### Environment File Mapping

| File | Local | Staging | Production |
|------|-------|---------|------------|
| **Root** | `.env` | `.env.staging` | `.env.production` |
| **Backend** | `backend/.env` | `backend/.env.staging` | `backend/.env.production` |
| **Frontend** | `frontend/.env.local` | `frontend/.env.staging` | `frontend/.env.production` |
| **Compose** | `docker-compose.yml` | `docker-compose.prod.yml` | `docker-compose.prod.yml` |

### Key Configuration Differences

**Database:**
```bash
# Local
DATABASE_HOST=localhost
DATABASE_NAME=ternantapp_dev

# Staging
DATABASE_HOST=mysql
DATABASE_NAME=ternantapp_staging

# Production
DATABASE_HOST=mysql
DATABASE_NAME=ternantapp_production
```

**CORS:**
```bash
# Local
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Staging
CORS_ORIGINS=https://staging.domain.com,http://localhost:3000

# Production
CORS_ORIGINS=https://domain.com  # STRICT!
```

**Logging:**
```bash
# Local
LOG_LEVEL=debug
LOG_FILE_PATH=./logs  # Optional

# Staging
LOG_LEVEL=debug
LOG_FILE_PATH=./logs  # Required

# Production
LOG_LEVEL=error  # Only errors in production
LOG_FILE_PATH=./logs  # Required + Rotation
```

---

## 🔄 Promotion Path

### Recommended Workflow

```
┌──────────────┐
│   LOCAL DEV  │
│  (Feature)   │
└──────────────┘
       │
       ▼ git push
┌──────────────┐
│     GIT      │
│  (main)      │
└──────────────┘
       │
       ▼ deploy
┌──────────────┐
│   STAGING    │
│  (Testing)   │
└──────────────┘
       │
       ▼ tests pass
┌──────────────┐
│  PRODUCTION  │
│   (Live)     │
└──────────────┘
```

**Never skip staging for production deployments!**

---

## ✅ Checklists by Environment

### Staging Deployment Checklist
- [ ] Code pushed to repository
- [ ] Environment variables configured
- [ ] Deployment script executed
- [ ] Health checks passing
- [ ] Test data seeded
- [ ] Functional tests completed
- [ ] Load tests run (k6)
- [ ] Performance benchmarks recorded
- [ ] Team notified of results

### Production Deployment Checklist
- [ ] Staging deployment successful
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Team approval received
- [ ] Maintenance window scheduled
- [ ] Backups verified
- [ ] Monitoring configured
- [ ] Alerts tested
- [ ] Rollback plan ready
- [ ] Team on standby
- [ ] Deployment executed
- [ ] Smoke tests passed
- [ ] Monitoring active (4 hours)
- [ ] Stakeholders notified

---

## 📚 Quick Links

### Documentation
- **Staging Guide:** `STAGING_DEPLOYMENT.md`
- **Production Guide:** `PRODUCTION_DEPLOYMENT.md`
- **Deployment Checklist:** `FINAL_DEPLOYMENT_CHECKLIST.md`
- **Improvements:** `PRODUCTION_IMPROVEMENTS.md`

### Tools
- **Deployment Script:** `./deploy.sh`
- **Load Testing:** `backend/test/load/k6-load-test.js`
- **Health Check:** `curl http://localhost:3001/api/v1/health`
- **Metrics:** `curl http://localhost:3001/api/v1/metrics`

---

## 🆘 Need Help?

### Choose the Right Resource

**For development issues:**
- See: `README.md`
- Ask: Development team

**For staging deployment:**
- See: `STAGING_DEPLOYMENT.md`
- Run: `./deploy.sh staging`

**For production deployment:**
- See: `PRODUCTION_DEPLOYMENT.md`
- Require: Team approval + On-call availability
- Run: `./deploy.sh production`

---

**Version:** 1.0.1
**Last Updated:** October 25, 2025
**Author:** george1806
