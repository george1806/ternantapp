# Apartment Management System - Overview

Complete system documentation covering features, architecture, and components.

---

## Table of Contents

1. [System Features](#system-features)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Core Modules](#core-modules)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Security Features](#security-features)
8. [Infrastructure Services](#infrastructure-services)

---

## System Features

### Multi-Tenant Property Management
- **Company Management**: Multi-company support with isolated data
- **User Management**: Role-based access control (Super Admin, Owner, Admin, Staff, Auditor)
- **Compound Management**: Multiple property locations per company
- **Apartment Management**: Unit tracking with status (available, occupied, maintenance, reserved)
- **Tenant Management**: Complete tenant profiles with documents and references
- **Occupancy Management**: Lease tracking with dates, rent, and deposits

### Financial Management
- **Invoice Generation**: Manual and automated rent invoice creation
- **Bulk Invoice Generation**: Generate invoices for multiple occupancies
- **Payment Recording**: Multiple payment methods (Cash, Bank, Mobile, Card)
- **Invoice Email Delivery**: Send and resend invoices with PDF attachments
- **Email Logging**: Complete audit trail of all invoice emails
- **Payment Tracking**: Track payments against invoices

### Reminder System
- **Automated Reminders**: Scheduled rent due and overdue notifications
- **Reminder Types**: Due soon, Overdue, Receipt, Welcome
- **Email Delivery**: Brevo email provider integration
- **Template System**: MJML-based email templates (gentle, urgent, firm)
- **Reminder Settings**: Company-wide and tenant-specific configurations
- **Reminder Logs**: Complete history of sent reminders

### Reporting & Analytics
- **Dashboard Statistics**: Key metrics and trends
- **Report Snapshots**: Scheduled report generation and storage
- **Invoice Analytics**: Payment tracking and overdue analysis
- **Occupancy Analytics**: Lease expiration tracking
- **Reminder Analytics**: Delivery success rates and statistics

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Internet (HTTPS)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
             ┌─────────▼─────────┐
             │   Nginx (Port 80)  │ ← Reverse Proxy & Load Balancer
             │   SSL Termination  │
             └─────────┬─────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────┐         ┌─────────▼────────┐
│   Frontend     │         │    Backend API    │
│   Next.js 15   │◄────────│    NestJS 10      │
│   Port 3001    │         │    Port 3000      │
└────────────────┘         └─────────┬─────────┘
                                     │
                       ┌─────────────┴─────────────┐
                       │                           │
                ┌──────▼──────┐           ┌───────▼───────┐
                │   MySQL 8   │           │   Redis 7     │
                │   Database  │           │  Cache/Queue  │
                │   Port 3306 │           │   Port 6379   │
                └─────────────┘           └───────────────┘

Monitoring Stack:
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Prometheus  │   Grafana    │     Loki     │ Alertmanager │
│  (Metrics)   │ (Dashboards) │    (Logs)    │   (Alerts)   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Network Architecture (Production)

```
Frontend Network (Public)
├── Nginx (reverse proxy)
└── Frontend (Next.js) x2 replicas

Backend Network (Internal)
├── Backend (NestJS) x3 replicas
└── Redis (cache/queue)

Database Network (Isolated)
├── MySQL (primary database)
└── MySQL Backup Service

Monitoring Network
├── Prometheus, Grafana, Loki
└── Exporters (Node, MySQL, Redis, cAdvisor)
```

---

## Technology Stack

### Backend
- **Framework**: NestJS 10.x (TypeScript)
- **Runtime**: Node.js 20.x
- **ORM**: TypeORM 0.3.x
- **Database**: MySQL 8.0
- **Cache/Queue**: Redis 7.x
- **Email**: Brevo SMTP provider
- **Template Engine**: MJML for email templates
- **Authentication**: JWT (Access + Refresh tokens)
- **Validation**: class-validator + class-transformer
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 15.x (React 19)
- **Language**: TypeScript
- **UI Library**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Forms**: react-hook-form + zod
- **HTTP Client**: Axios with interceptors
- **Date Handling**: date-fns

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **SSL**: Certbot (Let's Encrypt)
- **Monitoring**: Prometheus + Grafana
- **Logging**: Loki + Promtail
- **Alerts**: Alertmanager

---

## Core Modules

### Backend Modules

1. **Authentication Module** (`auth`)
   - JWT-based authentication
   - Login, logout, token refresh
   - Password reset and email verification
   - Account lockout after failed attempts

2. **Users Module** (`users`)
   - User CRUD operations
   - Role management
   - Profile management
   - Multi-company user support

3. **Companies Module** (`companies`)
   - Company CRUD operations
   - Company settings and branding
   - Email and reminder preferences

4. **Compounds Module** (`compounds`)
   - Property location management
   - Address and geo-coordinates
   - Compound-specific settings

5. **Apartments Module** (`apartments`)
   - Unit management
   - Status tracking
   - Amenities and specifications
   - Rental pricing

6. **Tenants Module** (`tenants`)
   - Tenant profile management
   - Document storage
   - Emergency contact information
   - Employment and reference tracking

7. **Occupancies Module** (`occupancies`)
   - Lease management
   - Move-in/move-out tracking
   - Deposit and rent management
   - Lease status workflow

8. **Invoices Module** (`invoices`)
   - Invoice CRUD operations
   - Automatic rent invoice generation
   - Bulk invoice generation
   - Invoice status management
   - PDF generation
   - Email delivery with logging

9. **Payments Module** (`payments`)
   - Payment recording
   - Multiple payment methods
   - Payment-invoice linking
   - Payment analytics

10. **Reminders Module** (`reminders`)
    - Automated reminder scheduling
    - Email delivery via queue
    - Reminder templates
    - Reminder settings and logs
    - Analytics and success tracking

11. **Dashboard Module** (`dashboard`)
    - Key metrics and statistics
    - Recent activity tracking
    - Performance caching

12. **Reports Module** (`reports`)
    - Report generation
    - Scheduled snapshots
    - Report caching

### Frontend Pages

1. **Authentication**
   - Login, Logout, Password Reset
   - Session management

2. **Dashboard**
   - Overview statistics
   - Recent invoices and payments
   - Quick actions

3. **Compounds**
   - List, Create, Edit, View
   - Apartment management

4. **Apartments**
   - List with filters
   - Availability tracking
   - Occupancy management

5. **Tenants**
   - Tenant directory
   - Profile management
   - Document uploads

6. **Occupancies**
   - Active leases
   - Lease creation and management
   - Move-in/move-out tracking

7. **Invoices**
   - Invoice list with filters
   - Invoice creation
   - Bulk generation
   - Email sending
   - PDF download
   - Email history

8. **Payments**
   - Payment recording
   - Payment history
   - Payment methods

9. **Reminders**
   - Reminder list
   - Manual reminder creation
   - Batch sending
   - Reminder settings
   - Analytics dashboard

10. **Users**
    - User management
    - Role assignment

---

## Database Schema

### Core Entities

**companies**
- Multi-tenant company information
- Settings: currency, timezone, branding
- Email and reminder preferences

**users**
- User authentication and authorization
- Role-based access control
- Account security (lockout, verification)

**compounds**
- Property locations
- Address and geo-location

**apartments**
- Individual units
- Status: available, occupied, maintenance, reserved
- Specifications: bedrooms, bathrooms, area

**tenants**
- Tenant personal information
- Documents and references
- Emergency contacts

**occupancies**
- Lease agreements
- Dates: lease start/end, move-in/move-out
- Financial: monthly rent, security deposit
- Status: pending, active, ended, cancelled

**invoices**
- Invoice details and line items
- Status: draft, sent, paid, overdue, cancelled
- Amounts: subtotal, tax, total, paid

**payments**
- Payment records
- Payment methods and references
- Invoice linking

**reminders**
- Automated reminder scheduling
- Types: DUE_SOON, OVERDUE, RECEIPT, WELCOME
- Status: PENDING, SENT, FAILED
- Delivery tracking

**invoice_email_logs**
- Complete email audit trail
- Status tracking: queued, sent, failed, delivered
- First send vs resend tracking

**reminder_logs**
- Reminder delivery history
- Success/failure tracking

**reminder_settings**
- Company and tenant-specific settings
- Email preferences
- Reminder timing configuration

**report_snapshots**
- Scheduled report storage
- Report caching

### Database Relationships

```
companies
├── users (1:N)
├── compounds (1:N)
├── tenants (1:N)
├── invoices (1:N)
├── payments (1:N)
├── reminders (1:N)
└── occupancies (1:N)

compounds
└── apartments (1:N)

apartments
└── occupancies (1:N)

tenants
├── occupancies (1:N)
├── invoices (1:N)
└── reminders (1:N)

occupancies
└── invoices (1:N)

invoices
├── payments (1:N)
├── reminders (1:N)
└── invoice_email_logs (1:N)

reminders
└── reminder_logs (1:N)
```

---

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

### Invoices
- `GET /invoices` - List invoices (paginated, filtered)
- `POST /invoices` - Create invoice
- `GET /invoices/:id` - Get invoice details
- `PATCH /invoices/:id` - Update invoice
- `DELETE /invoices/:id` - Delete invoice
- `POST /invoices/generate-rent` - Generate rent invoice
- `POST /invoices/bulk-generate` - Bulk generate invoices
- `POST /invoices/:id/send` - Send invoice email
- `POST /invoices/:id/resend` - Resend invoice email
- `GET /invoices/:id/email-logs` - Get email history
- `GET /invoices/:id/pdf` - Download PDF
- `GET /invoices/stats` - Get statistics
- `GET /invoices/overdue` - Get overdue invoices

### Reminders
- `GET /reminders` - List reminders
- `POST /reminders` - Create reminder
- `GET /reminders/:id` - Get reminder
- `PATCH /reminders/:id` - Update reminder
- `DELETE /reminders/:id` - Delete reminder
- `POST /reminders/batch-send` - Send batch reminders
- `GET /reminders/analytics` - Get analytics

### Payments, Tenants, Occupancies, etc.
- Similar CRUD patterns for other modules

---

## Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Multi-company data isolation
- Session management

### Account Security
- Password hashing with bcrypt
- Account lockout after failed login attempts
- Email verification
- Password reset with expiring tokens

### API Security
- CORS configuration
- Rate limiting (throttling)
- Input validation
- SQL injection prevention (parameterized queries)
- XSS prevention

### Infrastructure Security
- Docker secrets for sensitive data
- Network isolation (separate networks for frontend/backend/database)
- No exposed database ports in production
- SSL/TLS encryption
- Nginx reverse proxy

---

## Infrastructure Services

### Production Services (Required)

| Service | Container | Purpose | Replicas |
|---------|-----------|---------|----------|
| Nginx | apartment-nginx | Reverse proxy, SSL termination | 1 |
| Frontend | apartment-frontend | Next.js web app | 2 |
| Backend | apartment-backend | NestJS API | 3 |
| MySQL | apartment-mysql | Primary database | 1 |
| Redis | apartment-redis | Cache and queue | 1 |
| MySQL Backup | apartment-mysql-backup | Automated backups | 1 |

### Monitoring Services (Recommended)

| Service | Purpose | Port |
|---------|---------|------|
| Prometheus | Metrics collection | 9090 |
| Grafana | Visualization dashboards | 3002 |
| Loki | Log aggregation | 3100 |
| Promtail | Log shipper | - |
| Alertmanager | Alert routing | 9093 |
| Node Exporter | System metrics | 9100 |
| MySQL Exporter | Database metrics | 9104 |
| Redis Exporter | Cache metrics | 9121 |

### Development Services

| Service | Purpose | Port |
|---------|---------|------|
| Mailpit | Email testing | 8025 |
| phpMyAdmin | Database UI | 8080 |
| Redis Commander | Redis UI | 8081 |

---

## Queue System

### Bull Queue (Redis-based)
- **Email Queue**: Asynchronous email sending
- **Reminder Queue**: Scheduled reminder processing
- **Report Queue**: Background report generation

### Queue Processors
- **Email Processor**: Handles email delivery
- **Reminder Processor**: Processes scheduled reminders
- **Report Processor**: Generates scheduled reports

---

## Email System

### Email Provider
- **Primary**: Brevo SMTP
- **Fallback**: Configurable provider

### Email Templates (MJML)
- `rent-overdue-gentle.mjml` - First overdue reminder
- `rent-overdue-urgent.mjml` - Second overdue reminder
- `rent-overdue-firm.mjml` - Final overdue reminder
- Invoice templates (generated dynamically)

### Email Features
- PDF attachments
- Template variables
- Retry logic
- Delivery tracking
- Bounce handling

---

## File Storage

### Document Storage
- Tenant documents (ID, contracts, etc.)
- Invoice PDFs (generated on-demand)
- Company branding assets

### Storage Strategy
- Local file system (development)
- S3-compatible storage (production ready)

---

## Performance Optimization

### Caching Strategy
- Redis caching for dashboard statistics
- Query result caching
- API response caching

### Database Optimization
- Proper indexing on all queries
- Compound indexes for multi-column queries
- Soft deletes for data retention

### Frontend Optimization
- Next.js server-side rendering
- Static generation where possible
- Image optimization
- Code splitting

---

## Logging & Monitoring

### Application Logging
- Structured JSON logs
- Log levels: error, warn, info, debug
- Request/response logging
- Error tracking

### Metrics Collection
- API request rates and latencies
- Database query performance
- Queue processing metrics
- Cache hit rates

### Dashboards
- System health overview
- Application performance
- Business metrics
- Error rates and alerts

---

For deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

For current project status, see [PROJECT_STATUS.md](PROJECT_STATUS.md)
