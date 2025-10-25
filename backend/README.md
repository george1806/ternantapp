# TernantApp - Property Management SaaS

A comprehensive multi-tenant property management platform with super admin capabilities.

## Features

- ✅ Multi-tenant architecture with company isolation
- ✅ Role-based access control (Owner, Admin, Staff, Auditor)
- ✅ Super admin portal for platform management
- ✅ Property and apartment management
- ✅ Tenant management with occupancy tracking
- ✅ Invoice and payment processing
- ✅ Automated reminders and notifications
- ✅ Comprehensive reporting and analytics
- ✅ RESTful API with Swagger documentation
- ✅ JWT-based authentication with session management

## Tech Stack

### Backend
- NestJS 10
- TypeScript
- MySQL 8
- Redis 7
- TypeORM
- BullMQ (Job queues)
- Passport JWT

### Frontend
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Shadcn UI Components

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ternantapp
```

2. **Start services with Docker**
```bash
docker compose up -d
```

3. **Run database migrations**
```bash
docker exec apartment-backend pnpm run migration:run
```

4. **Create super admin user**
```bash
docker exec apartment-backend pnpm run seed:super-admin
```

5. **Access the application**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000/api
- API Docs: http://localhost:3000/api/docs
- Super Admin: http://localhost:3001/super-admin

## Default Credentials

### Super Admin
- Email: `superadmin@ternantapp.com`
- Password: `SuperAdmin@2025`

### Test Company Users
Seed data includes test companies with users. Example credentials:
- Owner: `owner@sunrise-pm.com` / Password: `Password123!`
- Admin: `admin@sunrise-pm.com` / Password: `Password123!`
- Staff: `staff@sunrise-pm.com` / Password: `Password123!`

**Note**: Replace `sunrise-pm` with the company slug (e.g., `metro-apartments`, `elite-housing`)

## Testing

### Run End-to-End Tests
```bash
./scripts/test-e2e.sh
```

### Manual API Testing
```bash
# Login as super admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@ternantapp.com","password":"SuperAdmin@2025"}'
```

## Architecture

### Super Admin Portal (OOP Implementation)
The super admin portal follows Object-Oriented Programming principles:

- **Singleton Pattern** - Service layer with single instance
- **Encapsulation** - Business logic in service classes
- **Separation of Concerns** - Clear layer separation
- **Type Safety** - Comprehensive TypeScript interfaces

See [Super Admin Implementation](docs/SUPER_ADMIN_IMPLEMENTATION.md) for details.

### Database Schema
- **Multi-tenant** - Data isolation by `company_id`
- **Soft deletes** - Using `status` and `isActive` flags
- **Audit trails** - `createdAt`, `updatedAt` timestamps
- **Optimistic locking** - Version control for critical operations

## Documentation

- [Super Admin Implementation Guide](docs/SUPER_ADMIN_IMPLEMENTATION.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [API Documentation](http://localhost:3000/api/docs) (when running)

## Available Services

| Service | Port | Description |
|---------|------|-------------|
| Backend API | 3000 | NestJS REST API |
| Frontend | 3001 | Next.js Application |
| MySQL | 3307 | Database |
| Redis | 6380 | Cache & Sessions |
| phpMyAdmin | 8082 | Database UI (dev only) |
| Redis Commander | 8081 | Redis UI (dev only) |
| MailPit | 8025 | Email testing (dev only) |

## Project Structure

```
ternantapp/
├── backend/           # NestJS backend
│   ├── src/
│   │   ├── modules/   # Feature modules
│   │   ├── common/    # Shared code
│   │   └── database/  # Migrations & seeds
│   └── Dockerfile
├── frontend/          # Next.js frontend
│   ├── src/
│   │   ├── app/       # Next.js 15 App Router
│   │   ├── components/# React components
│   │   ├── lib/       # Services & utilities
│   │   └── types/     # TypeScript types
│   └── Dockerfile
├── docs/              # Documentation
├── scripts/           # Utility scripts
└── docker-compose.yml # Docker orchestration
```

## Development

### Backend Development
```bash
cd backend
pnpm install
pnpm run start:dev
```

### Frontend Development
```bash
cd frontend
pnpm install
pnpm run dev
```

### Generate Migration
```bash
docker exec apartment-backend pnpm run migration:generate src/database/migrations/MigrationName
```

### Run Migration
```bash
docker exec apartment-backend pnpm run migration:run
```

### Revert Migration
```bash
docker exec apartment-backend pnpm run migration:revert
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Current user info
- `POST /api/v1/auth/logout` - Logout

### Super Admin
- `GET /api/v1/super-admin/companies` - List all companies
- `POST /api/v1/super-admin/companies` - Create company
- `GET /api/v1/super-admin/companies/:id` - Company details
- `PATCH /api/v1/super-admin/companies/:id` - Update company
- `GET /api/v1/super-admin/companies/platform/stats` - Platform stats

### Companies
- `GET /api/v1/companies/:id` - Company details
- `PATCH /api/v1/companies/:id` - Update company

### Properties & Apartments
- `GET /api/v1/compounds` - List properties
- `POST /api/v1/compounds` - Create property
- `GET /api/v1/apartments` - List apartments
- `POST /api/v1/apartments` - Create apartment

### Tenants & Occupancies
- `GET /api/v1/tenants` - List tenants
- `POST /api/v1/tenants` - Create tenant
- `GET /api/v1/occupancies` - List occupancies
- `POST /api/v1/occupancies` - Create occupancy

### Invoices & Payments
- `GET /api/v1/invoices` - List invoices
- `POST /api/v1/invoices` - Create invoice
- `GET /api/v1/payments` - List payments
- `POST /api/v1/payments` - Record payment

## Environment Variables

Required environment variables in `.env`:

```bash
# Database
DB_HOST=mysql
DB_PORT=3306
DB_NAME=apartment_management
DB_USER=apartment_user
DB_PASSWORD=<password>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=<secret>
JWT_EXPIRES_IN=15m

# Application
API_PREFIX=api
PORT=3000
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `./scripts/test-e2e.sh`
4. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For issues and questions, please contact the development team.
