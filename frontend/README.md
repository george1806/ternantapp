# TernantApp Frontend

Modern, responsive web application for the TernantApp property management SaaS platform.

**Version**: 1.0.1
**Framework**: Next.js 15 with App Router
**Author**: george1806

## Tech Stack

- **Framework**: Next.js 15.5+ with Turbopack
- **React**: 19.x with Server Components
- **TypeScript**: 5.x with strict mode
- **Styling**: Tailwind CSS 3.x
- **UI Components**: Shadcn UI + Radix UI
- **Forms**: React Hook Form + Zod validation
- **State Management**: Tanstack Query (React Query)
- **API Client**: Axios with interceptors
- **Icons**: Lucide React
- **PWA**: next-pwa with Workbox

## Features

### User Interface
- ✅ Responsive dashboard with real-time statistics
- ✅ Dark/light mode support
- ✅ Mobile-first design with touch optimization
- ✅ Accessible components (WCAG 2.1 AA compliant)
- ✅ Progressive Web App (PWA) capabilities

### Dashboard Features
- Real-time occupancy statistics
- Monthly recurring revenue tracking
- Payment collection metrics
- Overdue invoice alerts
- Recent activity feeds

### Property Management
- Compounds (buildings) management with geo-location
- Apartment/unit tracking with status
- Pagination and search functionality
- Bulk operations support

### Tenant Management
- Tenant profiles with KYC information
- Occupancy history tracking
- Emergency contact management
- Document uploads

### Financial Management
- Invoice generation and management
- Payment recording with multiple methods
- Financial reports and analytics
- Export to CSV/PDF

### Authentication
- JWT-based authentication
- Role-based access control
- Session management with refresh tokens
- Secure password handling

## Getting Started

### Prerequisites

```bash
Node.js 18+ (LTS recommended)
pnpm 8+ (recommended) or npm/yarn
```

### Installation

1. **Install dependencies**:
```bash
cd frontend
pnpm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_NAME=TernantApp
NEXT_PUBLIC_APP_VERSION=1.0.1
```

3. **Run development server**:
```bash
pnpm dev
```

The application will be available at `http://localhost:3001`

### Build for Production

```bash
# Create optimized production build
pnpm build

# Start production server
pnpm start

# Run in production mode with PM2 (recommended)
pm2 start npm --name "ternantapp-frontend" -- start
```

## Project Structure

```
frontend/
├── public/                    # Static assets
│   ├── icons/                # App icons (PWA)
│   ├── images/               # Images and graphics
│   └── manifest.json         # PWA manifest
├── src/
│   ├── app/                  # Next.js 15 App Router
│   │   ├── (auth)/          # Authentication routes
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/     # Protected dashboard routes
│   │   │   ├── dashboard/
│   │   │   ├── properties/
│   │   │   ├── apartments/
│   │   │   ├── tenants/
│   │   │   ├── occupancies/
│   │   │   ├── invoices/
│   │   │   └── payments/
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn UI components
│   │   ├── dashboard/      # Dashboard-specific components
│   │   ├── properties/     # Property components
│   │   ├── forms/          # Form components
│   │   └── layouts/        # Layout components
│   ├── lib/                # Utilities and configurations
│   │   ├── api.ts          # Axios client configuration
│   │   ├── utils.ts        # Utility functions
│   │   └── constants.ts    # App constants
│   ├── services/           # API services
│   │   ├── auth.service.ts
│   │   ├── compounds.service.ts
│   │   ├── apartments.service.ts
│   │   ├── tenants.service.ts
│   │   ├── invoices.service.ts
│   │   └── payments.service.ts
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts        # Global types
│   ├── hooks/              # Custom React hooks
│   │   ├── use-auth.ts
│   │   └── use-toast.ts
│   └── styles/             # Global styles
│       └── globals.css     # Tailwind + custom CSS
├── .env.example            # Environment variables template
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Key Concepts

### API Integration

All API calls go through centralized service files in `src/services/`:

```typescript
// Example: src/services/compounds.service.ts
import { api } from '@/lib/api';

export const compoundsService = {
  getAll: (params) => api.get('/compounds', { params }),
  getById: (id) => api.get(`/compounds/${id}`),
  create: (data) => api.post('/compounds', data),
  update: (id, data) => api.patch(`/compounds/${id}`, data),
  delete: (id) => api.delete(`/compounds/${id}`),
};
```

### Type Safety

All API responses and entities are strongly typed:

```typescript
// src/types/index.ts
export interface Compound {
  id: string;
  companyId: string;
  name: string;
  addressLine: string;
  city: string;
  region?: string;
  country: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### Form Validation

Forms use React Hook Form with Zod schemas:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

### Authentication

Authentication is handled via JWT tokens stored in localStorage:

```typescript
// Login flow
const response = await authService.login(email, password);
localStorage.setItem('auth_token', response.data.access_token);

// API client automatically adds token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Available Scripts

```bash
# Development
pnpm dev              # Start dev server with Turbopack
pnpm dev --port 3002  # Start on custom port

# Building
pnpm build            # Create production build
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint errors
pnpm type-check       # Run TypeScript compiler check

# Testing (if configured)
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
```

## Environment Variables

### Required Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# App Configuration
NEXT_PUBLIC_APP_NAME=TernantApp
NEXT_PUBLIC_APP_VERSION=1.0.1
```

### Optional Variables

```env
# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PWA=true

# External Services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here

# Development
NODE_ENV=development
```

## API Response Format

All list endpoints return paginated responses:

```json
{
  "data": [
    { "id": "1", "name": "Item 1" },
    { "id": "2", "name": "Item 2" }
  ],
  "meta": {
    "total": 43,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

## Performance Optimization

### Server Components

Use React Server Components for static content:

```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  // Fetch data on server
  const stats = await fetchStats();
  return <Dashboard stats={stats} />;
}
```

### Image Optimization

Use Next.js Image component:

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // For above-the-fold images
/>
```

### Code Splitting

Dynamic imports for heavy components:

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

## Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t ternantapp-frontend .

# Run container
docker run -p 3001:3001 \
  -e NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1 \
  ternantapp-frontend
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Build Output

```bash
# Standalone build (recommended for Docker)
next.config.js: output: 'standalone'

# Static export (for CDN)
next.config.js: output: 'export'
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Change port
pnpm dev --port 3002

# Or kill process
lsof -ti:3001 | xargs kill -9
```

**Type errors:**
```bash
# Regenerate types
rm -rf .next
pnpm build
```

**Build errors:**
```bash
# Clear cache
rm -rf .next node_modules
pnpm install
pnpm build
```

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile browsers: iOS Safari 12+, Android Chrome 90+

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader tested
- Proper ARIA labels
- Semantic HTML

## Contributing

1. Create a feature branch from `main`
2. Follow TypeScript strict mode
3. Use existing component patterns
4. Add proper TypeScript types
5. Test on mobile and desktop
6. Run linter before committing

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## License

Proprietary - All rights reserved

## Support

For issues and questions:
- Check the documentation in `/docs`
- Review API documentation at `http://localhost:3000/api/docs`
- Contact the development team
