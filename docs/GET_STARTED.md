# Getting Started with Your Apartment Management SaaS

**Welcome!** This guide will help you understand what's been built and how to continue development.

**Author**: george1806

## 🎉 What's Already Built

You have a **solid, production-ready foundation** with:

### ✅ Complete Infrastructure
- Docker Compose with MySQL 8, Redis 7, and Mailpit
- Optimized database and cache configurations
- pnpm monorepo setup
- TypeScript throughout

### ✅ Backend Architecture
- **NestJS** application with proper module structure
- **TypeORM** with connection pooling and caching
- **Redis** caching layer integrated
- **Swagger** API documentation
- **Security** middleware (Helmet, CORS, compression)
- **Rate limiting** configured

### ✅ Multi-Tenancy System
- Request-scoped tenant context
- Subdomain AND path-based routing support
- Tenant isolation middleware
- Automatic company_id scoping

### ✅ RBAC & Security
- Role decorators and guards
- JWT authentication guard (ready for JWT strategy)
- User roles defined (OWNER, ADMIN, STAFF, AUDITOR, TENANT_PORTAL)
- Password hashing utilities

### ✅ Complete Companies Module
This is your **reference implementation**. It includes:
- Entity with proper indexing
- Service with Redis caching
- Controller with RBAC protection
- DTOs with validation
- CRUD operations

### ✅ Comprehensive Documentation
- `README.md` - Full feature documentation
- `IMPLEMENTATION_GUIDE.md` - Code patterns and examples
- `QUICKSTART.md` - 5-minute setup guide
- `PROJECT_STATUS.md` - Progress tracking
- This file - Getting started guide

## 📂 Project Structure

```
ternantapp/
├── backend/              # NestJS API
│   ├── src/
│   │   ├── common/       # Shared utilities (✅ Complete)
│   │   ├── database/     # Database config (✅ Complete)
│   │   ├── modules/      # Feature modules (🚧 1/12 done)
│   │   ├── app.module.ts # Main module (✅ Complete)
│   │   └── main.ts       # Entry point (✅ Complete)
│   └── package.json
│
├── frontend/             # Next.js PWA (📋 To be built)
│
├── docker/               # Docker configs (✅ Complete)
├── docker-compose.yml    # Services (✅ Complete)
└── docs/                 # Documentation (✅ Complete)
```

## 🚀 Quick Start (First Time)

### 1. Prerequisites
```bash
# Check you have these installed
node --version   # >= 20.0.0
pnpm --version   # >= 8.0.0
docker --version
```

### 2. Install & Setup
```bash
# Install dependencies
pnpm install

# Copy environment file
cp backend/.env.example backend/.env

# Start infrastructure
pnpm docker:up

# Wait for services to be healthy
docker ps  # Should show all services as "healthy"
```

### 3. Verify Everything Works
```bash
# Start backend
cd backend
pnpm dev

# Open in browser
# - API: http://localhost:3000
# - Docs: http://localhost:3000/api/docs
# - Mailpit: http://localhost:8025
```

You should see the welcome message in terminal and be able to access the Swagger docs.

## 🎯 Your Next Steps

### Step 1: Implement Users Module (~ 1-2 hours)

**Why First?** Auth depends on Users.

**What to Build:**
1. Create `backend/src/modules/users/` folder structure
2. Copy the pattern from `companies/` module
3. Implement the User entity (see IMPLEMENTATION_GUIDE.md)
4. Add service, controller, DTOs
5. Test with Swagger

**Key Files:**
```
users/
├── entities/user.entity.ts
├── dto/create-user.dto.ts
├── dto/update-user.dto.ts
├── services/users.service.ts
├── controllers/users.controller.ts
└── users.module.ts
```

**Reference**: Check IMPLEMENTATION_GUIDE.md section 1

### Step 2: Implement Auth Module (~ 2-3 hours)

**What to Build:**
1. JWT strategy
2. Login/logout endpoints
3. Refresh token mechanism
4. Company registration endpoint (creates company + owner user)

**Reference**: Check IMPLEMENTATION_GUIDE.md section 2

### Step 3: Test Authentication Flow

```bash
# 1. Register a company
curl -X POST http://localhost:3000/api/v1/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{
    "company": { "name": "Test Co", "slug": "testco" },
    "owner": { "email": "owner@test.com", "password": "Test123!" }
  }'

# 2. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"email": "owner@test.com", "password": "Test123!"}'

# 3. Use token to access protected endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/companies/YOUR_COMPANY_ID
```

### Step 4: Property Modules (~ 3-4 hours)

Implement in this order:
1. **Compounds** - Buildings/locations
2. **Apartments** - Units within compounds

Both follow the same pattern as Companies module.

### Step 5: Tenant & Billing Modules (~ 4-5 hours)

1. **Tenants** - Tenant records
2. **Occupancies** - Who lives where (business logic!)
3. **Invoices** - Rent invoices
4. **Payments** - Payment tracking

### Step 6: Advanced Features (~ 3-4 hours)

1. **Reminders** - Email notifications with queues
2. **Reports** - Analytics and KPIs
3. **Files** - Document uploads
4. **Audit** - Change tracking

## 📖 How to Implement a Module

### The Pattern (Every Module is the Same!)

```
1. Create folder: backend/src/modules/your-module/
2. Create entities/your-module.entity.ts
3. Create dto/create-your-module.dto.ts
4. Create dto/update-your-module.dto.ts
5. Create services/your-module.service.ts
6. Create controllers/your-module.controller.ts
7. Create your-module.module.ts
8. Add to app.module.ts imports
```

### Example: Creating "Compounds" Module

```bash
cd backend
nest g module modules/compounds
nest g service modules/compounds/services/compounds
nest g controller modules/compounds/controllers/compounds
```

Then:
1. Copy entity from IMPLEMENTATION_GUIDE.md
2. Copy DTOs
3. Copy service (replace Company with Compound)
4. Copy controller
5. Test in Swagger

**Time per module**: 30min - 1 hour (once you get the pattern)

## 🎓 Learning Resources

### Understanding the Codebase

**Start Here:**
1. Read `backend/src/main.ts` - Entry point
2. Read `backend/src/app.module.ts` - Module registration
3. Read `backend/src/modules/companies/` - Reference implementation
4. Check `backend/src/common/` - Shared utilities

**Key Concepts:**

**Multi-Tenancy:**
- Every entity has `companyId`
- Middleware extracts tenant from subdomain/path
- Decorator `@TenantId()` gets current tenant
- All queries MUST filter by companyId

**RBAC:**
```typescript
@Roles(UserRole.OWNER, UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get()
findAll(@TenantId() companyId: string) {
  // Only OWNER or ADMIN can access
  // Automatically scoped to their company
}
```

**Caching:**
```typescript
// Cache company for 5 minutes
await this.cacheManager.set(`company:${id}`, company, 300000);

// Get from cache
const cached = await this.cacheManager.get<Company>(`company:${id}`);
```

## 🔧 Development Workflow

### Daily Development

```bash
# Terminal 1: Infrastructure
pnpm docker:up
docker compose logs -f

# Terminal 2: Backend
cd backend
pnpm dev

# Terminal 3: Frontend (when ready)
cd frontend
pnpm dev
```

### Testing Your Code

```bash
# Manual testing via Swagger
open http://localhost:3000/api/docs

# Unit tests
cd backend
pnpm test

# Watch mode during development
pnpm test:watch

# E2E tests
pnpm test:e2e
```

### Checking Emails

All emails go to Mailpit (no real emails sent):
```
http://localhost:8025
```

### Database Management

```bash
# View database
open http://localhost:8080  # phpMyAdmin

# Create migration after entity changes
cd backend
pnpm typeorm migration:generate -n YourMigrationName

# Run migrations
pnpm migration:run

# Revert last migration
pnpm migration:revert
```

## 🐛 Troubleshooting

### "Can't connect to database"
```bash
docker ps  # Check MySQL is running
docker compose logs mysql  # Check logs
docker compose restart mysql  # Restart if needed
```

### "Port 3000 already in use"
```bash
lsof -i :3000  # Find process
kill -9 <PID>  # Kill it
```

### "Redis connection error"
```bash
docker exec -it apartment-redis redis-cli ping
# Should return: PONG
```

### Fresh Start
```bash
pnpm docker:down
docker compose down -v  # ⚠️ Deletes all data
pnpm docker:up
pnpm db:migrate
```

## 💡 Pro Tips

### 1. Use Swagger for Testing
- Go to http://localhost:3000/api/docs
- Try endpoints without writing curl commands
- See request/response formats

### 2. Follow the Companies Module
- It's your template for everything
- Copy its structure
- Adapt the entity and business logic

### 3. Implement in Order
Don't jump around. The modules depend on each other:
```
Companies → Users → Auth → Compounds → Apartments → Tenants → ...
```

### 4. Test as You Go
After each module:
1. Test CRUD operations in Swagger
2. Check data in phpMyAdmin
3. Verify caching in Redis Commander

### 5. Read Error Messages
NestJS has excellent error messages. They tell you:
- What's wrong
- Which file
- How to fix it

## 📞 Need Help?

### Documentation
1. **This file** - Getting started
2. **QUICKSTART.md** - Fast setup
3. **IMPLEMENTATION_GUIDE.md** - Code patterns
4. **README.md** - Full documentation
5. **PROJECT_STATUS.md** - What's done/pending

### Code References
- Check `backend/src/modules/companies/` for examples
- Check `backend/src/common/` for utilities
- Check IMPLEMENTATION_GUIDE.md for entity templates

### Tools
- **Swagger UI**: http://localhost:3000/api/docs
- **Mailpit**: http://localhost:8025
- **phpMyAdmin**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

## 🎯 Your 30-Day Plan

### Week 1: Core Backend
- ✅ Setup (Done!)
- → Users module
- → Auth module
- → Test authentication flow

### Week 2: Property Management
- → Compounds module
- → Apartments module
- → Basic CRUD testing
- → Create migrations

### Week 3: Tenant & Billing
- → Tenants module
- → Occupancies module (complex!)
- → Invoices module
- → Payments module

### Week 4: Advanced Features
- → Reminders + Queue setup
- → Reports module
- → Start frontend

### Beyond
- Frontend development
- Testing
- Deployment

## ✨ You're Ready!

You have:
- ✅ Complete infrastructure
- ✅ Solid architecture
- ✅ Reference implementation
- ✅ Comprehensive guides
- ✅ All the tools

**Next Command:**
```bash
cd backend
pnpm dev
# Open http://localhost:3000/api/docs
# Start implementing Users module!
```

**Remember**: Every module follows the same pattern. Once you've done Users, the rest will be faster.

Good luck! 🚀

---

**Built by george1806**
