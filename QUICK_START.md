# TernantApp - Quick Start Guide

**Last Updated:** 2025-10-25

---

## Prerequisites

- Node.js 18+ and npm/pnpm
- Docker and Docker Compose
- PostgreSQL client (optional, for direct DB access)
- Git

---

## 🚀 Quick Start (5 Minutes)

### 1. Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd ternantapp

# Setup backend
cd backend
npm install
cp .env.example .env  # Update with your values

# Setup frontend
cd ../frontend
npm install
cp .env.local.example .env.local  # Update with your values
```

### 2. Start Services

```bash
# Terminal 1 - Start Database & Backend
cd backend
docker-compose up -d  # Starts PostgreSQL
npm run start:dev     # Starts backend on port 3000

# Terminal 2 - Start Frontend
cd frontend
pnpm dev --port 3001  # Starts frontend on port 3001
```

### 3. Initialize Database

```bash
cd backend

# Run migrations
npm run migration:run

# Seed database with test data
npm run seed:run
```

### 4. Access Application

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/docs

---

## 🔑 Test Credentials

### Super Admin
```
Email: super@admin.com
Password: SuperAdmin@123
```

### Property Owner
```
Email: owner@sunrise-pm.com
Password: Password123!
```

---

## 📁 Project Structure

```
ternantapp/
├── backend/           # NestJS backend
│   ├── src/
│   │   ├── auth/     # Authentication
│   │   ├── users/    # User management
│   │   ├── compounds/    # Properties
│   │   ├── apartments/   # Units
│   │   ├── tenants/      # Tenant management
│   │   ├── occupancies/  # Leases
│   │   ├── invoices/     # Invoicing
│   │   ├── payments/     # Payments
│   │   ├── dashboard/    # Dashboard stats
│   │   └── super-admin/  # Platform admin
│   └── docker-compose.yml
│
└── frontend/          # Next.js frontend
    ├── src/
    │   ├── app/      # Pages (App Router)
    │   ├── components/   # React components
    │   ├── services/     # API services
    │   ├── store/        # State management
    │   └── types/        # TypeScript types
    └── package.json
```

---

## 🛠️ Common Commands

### Backend

```bash
# Development
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Database migrations
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:revert

# Seed database
npm run seed:run
npm run seed:super-admin  # Create super admin only

# Testing
npm run test
npm run test:e2e
npm run test:cov

# Linting
npm run lint
npm run format
```

### Frontend

```bash
# Development
pnpm dev
pnpm dev --port 3001

# Build for production
pnpm build

# Start production build
pnpm start

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Docker

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Rebuild containers
docker-compose up -d --build

# Remove all containers and volumes
docker-compose down -v
```

---

## 🔧 Configuration

### Backend Environment (.env)

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=ternantapp
DATABASE_PASSWORD=ternantapp_password
DATABASE_NAME=ternantapp

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3001
```

### Frontend Environment (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

---

## 🧪 Testing the Application

### 1. Test Backend API

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@sunrise-pm.com","password":"Password123!"}'

# Get dashboard stats (use token from login)
curl http://localhost:3000/api/v1/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. Test Frontend

1. Open http://localhost:3001
2. Login with owner credentials
3. Navigate through dashboard
4. Test CRUD operations:
   - Create a new property
   - Add apartments
   - Create tenants
   - Create occupancies

---

## 📊 Sample Data

After running `npm run seed:run`, you'll have:

- **1 Super Admin:** super@admin.com
- **1 Company:** Sunrise Property Management
- **1 Owner:** owner@sunrise-pm.com
- **3 Properties:** Sunset Towers, Ocean View Apartments, Garden Heights
- **42 Apartments:** Mixed units across properties
- **20 Tenants:** Test tenant data
- **17 Active Occupancies:** Current leases

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
sudo lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
sudo lsof -ti:3001 | xargs kill -9

# Kill process on port 5432
sudo lsof -ti:5432 | xargs kill -9
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Reset database
docker-compose down -v
docker-compose up -d
npm run migration:run
npm run seed:run
```

### Frontend Build Errors

```bash
# Clear Next.js cache
rm -rf .next
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Rebuild
pnpm build
```

### Backend Build Errors

```bash
# Clear build artifacts
rm -rf dist

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

### TypeScript Errors

```bash
# Frontend
cd frontend
pnpm type-check

# Backend
cd backend
npm run build
```

---

## 📝 API Endpoints Overview

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### Dashboard
- `GET /api/v1/dashboard/stats` - Dashboard statistics

### Properties (Compounds)
- `GET /api/v1/compounds` - List properties
- `GET /api/v1/compounds/:id` - Get property
- `POST /api/v1/compounds` - Create property
- `PATCH /api/v1/compounds/:id` - Update property
- `DELETE /api/v1/compounds/:id` - Delete property

### Apartments
- `GET /api/v1/apartments` - List apartments
- `GET /api/v1/apartments/:id` - Get apartment
- `POST /api/v1/apartments` - Create apartment
- `PATCH /api/v1/apartments/:id` - Update apartment
- `DELETE /api/v1/apartments/:id` - Delete apartment

### Tenants
- `GET /api/v1/tenants` - List tenants
- `GET /api/v1/tenants/:id` - Get tenant
- `POST /api/v1/tenants` - Create tenant
- `PATCH /api/v1/tenants/:id` - Update tenant
- `DELETE /api/v1/tenants/:id` - Delete tenant

### Occupancies
- `GET /api/v1/occupancies` - List occupancies
- `GET /api/v1/occupancies/:id` - Get occupancy
- `POST /api/v1/occupancies` - Create occupancy
- `PATCH /api/v1/occupancies/:id` - Update occupancy
- `DELETE /api/v1/occupancies/:id` - Delete occupancy

### Invoices
- `GET /api/v1/invoices` - List invoices
- `GET /api/v1/invoices/:id` - Get invoice
- `POST /api/v1/invoices` - Create invoice
- `PATCH /api/v1/invoices/:id` - Update invoice
- `DELETE /api/v1/invoices/:id` - Delete invoice

### Payments
- `GET /api/v1/payments` - List payments
- `GET /api/v1/payments/:id` - Get payment
- `POST /api/v1/payments` - Create payment
- `PATCH /api/v1/payments/:id` - Update payment
- `DELETE /api/v1/payments/:id` - Delete payment

### Super Admin
- `GET /api/v1/super-admin/companies` - List companies
- `POST /api/v1/super-admin/companies` - Create company
- `GET /api/v1/super-admin/users` - List users
- `POST /api/v1/super-admin/users` - Create user

---

## 🎯 Next Steps

1. **Review Documentation:**
   - Read `DEVELOPMENT_STATUS.md` for project status
   - Review `ARCHITECTURE.md` for technical details

2. **Start Development:**
   - Fix ESLint warnings
   - Implement tests
   - Add security features

3. **Customize:**
   - Update branding
   - Modify business logic
   - Add new features

---

## 📚 Additional Resources

- **NestJS Documentation:** https://docs.nestjs.com
- **Next.js Documentation:** https://nextjs.org/docs
- **TypeORM Documentation:** https://typeorm.io
- **Tailwind CSS:** https://tailwindcss.com/docs

---

## 🆘 Getting Help

- Review error messages in terminal
- Check backend logs: `docker-compose logs backend`
- Check database logs: `docker-compose logs postgres`
- Review API documentation: http://localhost:3000/api/docs
- Check browser console for frontend errors

---

## 📄 License

[Add your license here]

---

## 👥 Contributing

[Add contribution guidelines here]
