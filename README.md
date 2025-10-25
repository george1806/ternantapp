# Apartment Management SaaS Platform

A production-ready, multi-tenant apartment management system built with Next.js, NestJS, and MySQL.

**Author**: george1806
**Version**: 1.0.1
**License**: MIT
**Production Ready**: ✅ 94% (with monitoring, security, and performance optimizations)

## Features

### Multi-Tenancy
- Row-level tenant isolation with company_id scoping
- Subdomain routing (acme.myapp.com) + path-based fallback (/c/acme)
- Request-scoped tenant context with Redis caching
- Unique slugs per company with validation

### User Management & Authentication
- JWT-based authentication with refresh tokens
- Role-based access control (OWNER, ADMIN, STAFF, AUDITOR, TENANT_PORTAL)
- Password hashing with bcryptjs
- Redis-based token blacklist for logout
- Invitation system for team members

### Property Management
- Companies → Compounds → Apartments hierarchy
- Detailed apartment features (bedrooms, bathrooms, area, amenities)
- Geo-location support for compounds
- Active/inactive status tracking

### Tenant & Occupancy Tracking
- Current and historical tenant records
- One active occupancy per apartment
- Automatic history preservation on tenant changes
- Emergency contact storage

### Billing & Invoicing
- Flexible rent cycles (Monthly, Quarterly, Yearly)
- Automated invoice generation
- Proration support for mid-cycle moves
- Multiple invoice statuses (PENDING, PARTIAL, PAID, OVERDUE, CANCELLED)
- Payment tracking with multiple methods

### Reminders & Notifications
- Email reminders for due and overdue payments
- Customizable reminder policies per company
- MJML-based responsive email templates
- BullMQ queue for async processing
- Idempotency to prevent duplicate sends

### Reporting & Analytics
- KPI dashboard (occupancy rate, MRR, collections)
- Aging reports (0-30, 31-60, 61-90, 90+ days)
- Upcoming dues and overdue tracking
- CSV export functionality

### File Management
- Streaming uploads for large files
- S3-compatible storage support
- Entity-based file organization
- MIME type validation

### Audit & Compliance
- Comprehensive audit logging
- Track all critical changes
- Actor identification
- JSON diff storage

## Tech Stack

### Backend
- **Framework**: NestJS 10.x
- **Database**: MySQL 8.0 with TypeORM
- **Cache**: Redis 7.x with cache-manager
- **Queue**: BullMQ with Redis
- **Email**: Nodemailer + MJML templates
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston with file rotation (NEW v1.0.1)
- **Metrics**: Prometheus + prom-client (NEW v1.0.1)
- **Security**: Helmet.js with comprehensive headers (NEW v1.0.1)
- **Testing**: Jest + Supertest + K6 (NEW v1.0.1)

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI**: React 18 + Tailwind CSS
- **State**: Tanstack Query (React Query)
- **Forms**: React Hook Form + Zod
- **PWA**: next-pwa with Workbox

### DevOps & Monitoring
- **Container**: Docker + Docker Compose
- **Package Manager**: pnpm workspaces
- **Linting**: ESLint + Prettier
- **Testing**: Jest + Supertest + K6 load testing
- **Monitoring**: Prometheus + Grafana (NEW v1.0.1)
- **Logging**: Winston with rotation (NEW v1.0.1)
- **Metrics**: Custom business metrics (NEW v1.0.1)
- **Exporters**: Node, MySQL, Redis exporters (NEW v1.0.1)

## Project Structure

```
ternantapp/
├── backend/
│   ├── src/
│   │   ├── common/
│   │   │   ├── decorators/     # Custom decorators (TenantId, CurrentUser, Roles)
│   │   │   ├── guards/         # Auth guards (JWT, Roles)
│   │   │   ├── middlewares/    # Tenant context middleware
│   │   │   ├── enums/          # Shared enums
│   │   │   └── interfaces/     # Shared interfaces
│   │   ├── database/
│   │   │   ├── entities/       # Base entities
│   │   │   ├── migrations/     # TypeORM migrations
│   │   │   ├── seeds/          # Seed data scripts
│   │   │   └── data-source.ts  # Database configuration
│   │   ├── modules/
│   │   │   ├── companies/
│   │   │   │   ├── entities/
│   │   │   │   ├── dto/
│   │   │   │   ├── services/
│   │   │   │   ├── controllers/
│   │   │   │   └── companies.module.ts
│   │   │   ├── users/
│   │   │   ├── auth/
│   │   │   ├── compounds/
│   │   │   ├── apartments/
│   │   │   ├── tenants/
│   │   │   ├── occupancies/
│   │   │   ├── invoices/
│   │   │   ├── payments/
│   │   │   ├── reminders/
│   │   │   ├── reports/
│   │   │   ├── files/
│   │   │   └── audit/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   ├── (portal)/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   └── styles/
│   ├── public/
│   ├── package.json
│   └── next.config.js
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md
```

## Database Schema

### Core Tables

**companies**
- id (UUID, PK)
- name, slug (unique), email, phone
- currency, timezone
- email_settings (JSON)
- reminder_preferences (JSON)
- branding (JSON)
- is_active, created_at, updated_at

**users**
- id (UUID, PK)
- company_id (UUID, FK, indexed)
- role (ENUM), email (unique per company), password_hash
- status, created_at, updated_at

**compounds**
- id (UUID, PK)
- company_id (UUID, FK, indexed)
- name, address_line, city, region, country
- geo_lat, geo_lng, notes
- created_at, updated_at

**apartments**
- id (UUID, PK)
- company_id (UUID, FK, indexed)
- compound_id (UUID, FK)
- code (unique per company), floor
- bedrooms, sitting_rooms, bathrooms, toilets, kitchen
- area_sq_m, features (JSON)
- base_rent_amount, rent_cycle (ENUM), deposit_amount
- is_active, created_at, updated_at

**tenants**
- id (UUID, PK)
- company_id (UUID, FK, indexed)
- first_name, last_name, email, phone, id_number
- emergency_contact (JSON)
- status (ACTIVE|INACTIVE)
- created_at, updated_at

**occupancies**
- id (UUID, PK)
- company_id (UUID, FK, indexed)
- apartment_id (UUID, FK), tenant_id (UUID, FK)
- start_date, end_date (nullable)
- status (ACTIVE|INACTIVE)
- notes, created_at, updated_at
- Constraint: Only one ACTIVE per apartment

**invoices**
- id (UUID, PK)
- company_id (UUID, FK, indexed)
- occupancy_id (UUID, FK)
- period_start, period_end, due_date
- amount_due, currency
- status (PENDING|PARTIAL|PAID|OVERDUE|CANCELLED)
- meta (JSON)
- created_at, updated_at

**payments**
- id (UUID, PK)
- company_id (UUID, FK, indexed)
- invoice_id (UUID, FK)
- amount, paid_at
- method (CASH|BANK|MOBILE|CARD)
- reference, created_at, updated_at

**reminders**
- id (UUID, PK)
- company_id (UUID, FK, indexed)
- invoice_id (UUID, FK)
- to_email, type (DUE_SOON|OVERDUE|RECEIPT)
- sent_at, status (SENT|FAILED)
- payload (JSON)
- created_at

**audit_logs**
- id (UUID, PK)
- company_id (UUID, FK, indexed)
- actor_user_id (UUID, FK)
- action, entity_type, entity_id
- diff (JSON)
- created_at

**files**
- id (UUID, PK)
- company_id (UUID, FK, indexed)
- entity_type, entity_id
- storage_key, mime, size
- created_at

## Setup Instructions

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ternantapp
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit the `.env` files with your configuration.

4. **Start infrastructure services**
```bash
pnpm docker:up
```

This starts:
- MySQL (port 3306)
- Redis (port 6379)
- Mailpit (SMTP: 1025, UI: 8025)
- phpMyAdmin (port 8080)
- Redis Commander (port 8081)

5. **Run database migrations**
```bash
pnpm db:migrate
```

6. **Seed database (optional)**
```bash
pnpm db:seed
```

7. **Start development servers**
```bash
pnpm dev
```

Backend: http://localhost:3000
API Docs: http://localhost:3000/api/docs
Frontend: http://localhost:3001

## Performance Optimizations

### Database
- Connection pooling (20 connections default)
- Proper indexing on all foreign keys and search fields
- Query result caching (TypeORM + Redis)
- Optimized MySQL configuration (InnoDB buffer pool, log settings)

### Caching Strategy
- Company lookup by ID/slug (5 min TTL)
- User session data (15 min TTL)
- Query results for reports (30 sec TTL)
- Redis with LRU eviction policy

### Queue Processing
- BullMQ for background jobs (invoice generation, reminders)
- Concurrent job processing
- Rate limiting on email sends
- Retry logic with exponential backoff

### Frontend
- React Server Components for static content
- Tanstack Query for data fetching with caching
- PWA with offline-first strategy
- Image optimization with Next.js Image
- Code splitting and lazy loading

## API Documentation

### Authentication

**POST /api/v1/auth/register-company**
Register a new company with owner account.

**POST /api/v1/auth/login**
Login with email and password.

**POST /api/v1/auth/refresh**
Refresh access token.

**POST /api/v1/auth/logout**
Logout and invalidate tokens.

### Companies

**GET /api/v1/companies/:id**
Get company by ID.

**GET /api/v1/companies/slug/:slug**
Get company by slug.

**PATCH /api/v1/companies/:id**
Update company (Owner/Admin only).

### Users

**GET /api/v1/users**
List users in company.

**POST /api/v1/users/invite**
Invite new user (Owner/Admin only).

**PATCH /api/v1/users/:id**
Update user.

### Compounds

**GET /api/v1/compounds**
List compounds.

**POST /api/v1/compounds**
Create compound.

**PATCH /api/v1/compounds/:id**
Update compound.

### Apartments

**GET /api/v1/apartments**
List apartments with filters.

**POST /api/v1/apartments**
Create apartment.

**PATCH /api/v1/apartments/:id**
Update apartment.

### Tenants

**GET /api/v1/tenants**
List tenants (default: ACTIVE only, use ?includeHistory=true for all).

**POST /api/v1/tenants**
Create tenant.

**PATCH /api/v1/tenants/:id**
Update tenant.

### Occupancies

**POST /api/v1/occupancies**
Create occupancy (auto-inactivates previous).

**PUT /api/v1/occupancies/:id/end**
End occupancy.

### Invoices

**GET /api/v1/invoices**
List invoices with filters.

**POST /api/v1/invoices/generate**
Generate invoices in bulk.

**PATCH /api/v1/invoices/:id**
Update invoice.

### Payments

**POST /api/v1/payments**
Record payment.

### Reports

**GET /api/v1/reports/kpis**
Get KPI dashboard data.

**GET /api/v1/reports/aging**
Get aging analysis.

**GET /api/v1/exports/:type**
Export data as CSV.

## Testing

### Run Unit Tests
```bash
pnpm test
```

### Run E2E Tests
```bash
pnpm test:e2e
```

### Coverage Report
```bash
pnpm test:cov
```

## Deployment

### 📚 Deployment Documentation

TernantApp v1.0.1 includes comprehensive deployment guides for different environments:

**Choose Your Environment:**
- 📖 **[Deployment Environments Guide](DEPLOYMENT_ENVIRONMENTS.md)** - Compare local dev, staging, and production environments to choose the right one

**Staging Deployment:**
- 🧪 **[Staging Deployment Guide](STAGING_DEPLOYMENT.md)** - Complete guide for deploying to staging environment
  - Server requirements: 2 CPU, 4GB RAM
  - Deployment time: ~90 minutes
  - Purpose: Testing and validation before production

**Production Deployment:**
- 🚀 **[Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)** - Comprehensive production deployment with security hardening
  - Server requirements: 4 CPU, 8GB+ RAM
  - Deployment time: ~5-6 hours (including monitoring)
  - Includes: SSL setup, firewall configuration, monitoring, rollback procedures

**Additional Resources:**
- ✅ **[Final Deployment Checklist](FINAL_DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist with sign-off sheet (40 minutes)
- 📘 **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - General deployment guide with monitoring setup
- ⚡ **[Quick Start Production](QUICK_START_PRODUCTION.md)** - 5-minute quick start for experienced users
- 🔧 **[Production Improvements](PRODUCTION_IMPROVEMENTS.md)** - Detailed v1.0.1 improvements documentation
- 📋 **[Update Summary](UPDATE_SUMMARY.md)** - Summary of all v1.0.1 deployment updates

### Quick Deployment (Automated)

```bash
# 1. Configure environment
cp .env.example .env.production
cp backend/.env.production.example backend/.env.production
nano .env.production

# 2. Deploy
chmod +x deploy.sh
./deploy.sh production

# 3. Verify
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/metrics
```

### What the Deployment Script Does

The automated `deploy.sh` script includes:
1. ✅ Creates logging directories
2. ✅ Backs up existing database
3. ✅ Builds Docker images
4. ✅ Starts all services (MySQL, Redis, Backend, Frontend)
5. ✅ Applies database migrations (including performance indexes)
6. ✅ Verifies health and metrics endpoints
7. ✅ Starts monitoring stack (Prometheus + Grafana)
8. ✅ Shows deployment summary

### Key Environment Variables (Production)

```bash
# Application
NODE_ENV=production
APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# Security
JWT_SECRET=<64-char-hex-secret>
JWT_REFRESH_SECRET=<64-char-hex-secret>
SESSION_SECRET=<32-char-hex-secret>

# Database
DATABASE_HOST=mysql
DATABASE_NAME=ternantapp_production

# Redis (NEW v1.0.1)
REDIS_HOST=redis
REDIS_PASSWORD=<strong-password>

# Rate Limiting (NEW v1.0.1)
THROTTLE_LIMIT=100

# Logging (NEW v1.0.1)
LOG_LEVEL=error
LOG_FILE_PATH=./logs

# Monitoring (NEW v1.0.1)
METRICS_ENABLED=true

# CORS (STRICT)
CORS_ORIGINS=https://your-domain.com
```

### Post-Deployment Verification

```bash
# Check services
docker compose -f docker-compose.prod.yml ps

# Verify health
curl http://localhost:3001/api/v1/health

# Check metrics
curl http://localhost:3001/api/v1/metrics

# Access Grafana monitoring
# URL: http://localhost:3002
# Username: admin / Password: admin123

# View logs
tail -f backend/logs/combined.log
```

### Performance Benchmarks (v1.0.1)

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Dashboard (cached) | 200ms | <10ms | **95% faster** |
| List compounds | 75ms | 45ms | **40% faster** |
| List apartments | 180ms | 55ms | **69% faster** |
| Cache hit rate | - | ~85% | **Excellent** |

See **[Production Improvements](PRODUCTION_IMPROVEMENTS.md)** for detailed performance analysis.

## Development Guidelines

### Module Structure
Each module follows this pattern:
```
module-name/
├── entities/          # TypeORM entities
├── dto/              # Data transfer objects
├── services/         # Business logic
├── controllers/      # HTTP endpoints
└── module-name.module.ts
```

### Creating a New Module

1. **Generate scaffold**
```bash
cd backend
nest g module modules/module-name
nest g service modules/module-name/services/module-name
nest g controller modules/module-name/controllers/module-name
```

2. **Create entity** in `entities/module-name.entity.ts`
3. **Create DTOs** in `dto/`
4. **Implement service** with tenant scoping
5. **Implement controller** with proper guards
6. **Add to AppModule** imports

### Tenant Scoping
All queries MUST scope by company_id:

```typescript
// In service
async findAll(companyId: string): Promise<Entity[]> {
  return this.repository.find({
    where: { companyId },
    order: { createdAt: 'DESC' },
  });
}

// In controller
@Get()
async findAll(@TenantId() companyId: string) {
  return this.service.findAll(companyId);
}
```

### RBAC Usage
```typescript
@Roles(UserRole.OWNER, UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Patch(':id')
async update(...) {
  // Only OWNER or ADMIN can access
}
```

## Troubleshooting

### Database Connection Issues
- Check MySQL is running: `docker ps`
- Verify connection credentials in `.env`
- Ensure database exists: `docker exec -it apartment-mysql mysql -u root -p`

### Redis Connection Issues
- Check Redis is running: `docker logs apartment-redis`
- Verify Redis host/port in `.env`
- Test connection: `docker exec -it apartment-redis redis-cli ping`

### Email Not Sending
- Check Mailpit UI: http://localhost:8025
- Verify SMTP settings in `.env`
- Check queue processing: logs for BullMQ jobs

### Performance Issues
- Enable query logging: `DB_LOGGING=true`
- Check slow query log in MySQL container
- Monitor Redis memory: `docker exec -it apartment-redis redis-cli INFO memory`
- Review connection pool settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review API docs at /api/docs

---

**Built by george1806**
