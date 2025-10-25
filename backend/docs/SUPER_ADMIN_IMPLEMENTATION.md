# Super Admin Portal - Implementation Guide

## Overview
The Super Admin Portal allows platform administrators to manage all companies, users, and monitor platform-wide statistics. This implementation follows Object-Oriented Programming (OOP) principles and maintains clean architecture.

## Authentication Credentials
- Email: `superadmin@ternantapp.com`
- Password: `SuperAdmin@2025`
- Access: Platform-wide (no company association)

## Architecture

### Backend Structure

#### Database Schema Changes
```sql
-- Users table modifications
ALTER TABLE users MODIFY company_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN is_super_admin TINYINT DEFAULT 0;
ALTER TABLE users ADD INDEX idx_role (role);
```

#### Key Files
- **Migration**: `src/database/migrations/1761322206323-AddSuperAdminSupport.ts`
- **Guard**: `src/common/guards/super-admin.guard.ts`
- **Module**: `src/modules/super-admin/super-admin.module.ts`
- **Controller**: `src/modules/super-admin/controllers/super-admin-companies.controller.ts`
- **Service**: `src/modules/super-admin/services/super-admin-companies.service.ts`

### Frontend Structure (OOP)

#### Service Layer (Singleton Pattern)
```typescript
// src/lib/services/super-admin/SuperAdminCompanyService.ts
export class SuperAdminCompanyService {
  private static instance: SuperAdminCompanyService;
  
  private constructor() {} // Enforce Singleton
  
  public static getInstance(): SuperAdminCompanyService {
    if (!SuperAdminCompanyService.instance) {
      SuperAdminCompanyService.instance = new SuperAdminCompanyService();
    }
    return SuperAdminCompanyService.instance;
  }
  
  // All business logic encapsulated here
  public async getCompanies(filters: CompanyFilters): Promise<CompanyListResponse> { }
  public async createCompany(data: CreateCompanyDto): Promise<CreateCompanyResponse> { }
  public formatCurrency(amount: number, currency: string): string { }
  public generateSlug(name: string): string { }
}

export const superAdminCompanyService = SuperAdminCompanyService.getInstance();
```

#### Type System
- **Types**: `frontend/src/types/super-admin/company.types.ts`
- Comprehensive interfaces for all data structures
- Strong typing throughout the application

#### Components
- **Layout**: `frontend/src/app/super-admin/layout.tsx` (Purple theme)
- **Dashboard**: `frontend/src/app/super-admin/page.tsx`
- **Companies List**: `frontend/src/app/super-admin/companies/page.tsx`
- **Company Details**: `frontend/src/app/super-admin/companies/[id]/page.tsx`
- **Create Company**: `frontend/src/app/super-admin/companies/new/page.tsx`

## API Endpoints

### Authentication
```
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Companies Management
```
GET    /api/v1/super-admin/companies              - List all companies
POST   /api/v1/super-admin/companies              - Create company with owner
GET    /api/v1/super-admin/companies/:id          - Get company details
PATCH  /api/v1/super-admin/companies/:id          - Update company
DELETE /api/v1/super-admin/companies/:id          - Delete company
GET    /api/v1/super-admin/companies/:id/stats    - Company statistics
PATCH  /api/v1/super-admin/companies/:id/suspend  - Suspend company
PATCH  /api/v1/super-admin/companies/:id/activate - Activate company
GET    /api/v1/super-admin/companies/platform/stats - Platform-wide stats
```

## Features Implemented

### ✅ Backend
1. Database migration with super admin support
2. Super admin user entity with nullable company association
3. JWT authentication with `isSuperAdmin` flag
4. Role-based access control (SuperAdminGuard)
5. Complete CRUD API for companies
6. Statistics calculation for companies and platform
7. Pagination, search, and filtering
8. Company suspension/activation

### ✅ Frontend
1. Singleton service layer (OOP)
2. Type-safe interfaces and DTOs
3. Separate super admin layout with navigation
4. Platform statistics dashboard
5. Companies list with search and filters
6. Company details with comprehensive stats
7. Company creation form with validation
8. Owner account creation during company setup

## Testing

### Run API Tests
```bash
/tmp/test-super-admin-api.sh
```

### Test Results (Latest)
```
✅ Super Admin Login
✅ Auth /me verification
✅ Platform Stats
✅ Companies List (3 companies)
✅ Create Company (with owner)
✅ Get Company Details
✅ Company Statistics
✅ Suspend Company
✅ Activate Company
✅ Update Company
```

## OOP Principles Applied

### 1. Encapsulation
- Private constructor in Singleton pattern
- All business logic encapsulated in service classes
- Public interface methods for controlled access

### 2. Single Responsibility
- Service layer handles business logic
- Controllers handle HTTP requests/responses
- Components handle UI rendering
- Types define data structures

### 3. Separation of Concerns
- Clear separation between service, types, and components
- Backend and frontend completely decoupled
- API client abstraction

### 4. Type Safety
- TypeScript interfaces for all data structures
- Compile-time type checking
- Reduced runtime errors

## Database Seed

### Create Super Admin User
```bash
docker exec apartment-backend pnpm run seed:super-admin
```

Or via migration which auto-creates the user.

## Access Control

### Guards
- `JwtAuthGuard` - Validates JWT token
- `SuperAdminGuard` - Ensures user has super admin privileges

### JWT Payload
```typescript
{
  sub: userId,
  companyId: null,
  email: string,
  role: 'SUPER_ADMIN',
  isSuperAdmin: true,
  sessionId: string,
  type: 'access'
}
```

## Security Considerations

1. Super admin has null `companyId` (platform-wide access)
2. Separate guard for super admin routes
3. JWT includes `isSuperAdmin` flag
4. Password hashing with bcrypt (12 rounds)
5. Session management via Redis
6. Company suspension affects all users

## Usage

### 1. Login as Super Admin
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@ternantapp.com","password":"SuperAdmin@2025"}'
```

### 2. Access Dashboard
Navigate to: `http://localhost:3001/super-admin`

### 3. Create Company
- Go to "Add Company" button
- Fill in company details
- Provide owner information
- System creates company + owner account

### 4. Manage Companies
- View all companies across platform
- See detailed statistics per company
- Suspend/activate companies
- Update company information

## Next Steps

Potential enhancements:
1. User management (create/edit platform users)
2. Audit logs (track super admin actions)
3. Platform-wide analytics
4. Email notifications
5. Bulk operations
6. Export capabilities
7. Advanced filtering and reporting

## Notes

- Super admin cannot be suspended
- Company deletion is soft delete (sets isActive = false)
- All operations are logged in Redis sessions
- Frontend uses API versioning (/api/v1)
- Backend uses URI-based versioning
