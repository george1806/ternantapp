/**
 * Super Admin - Company Types
 * Following OOP principles with proper encapsulation
 */

export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  currency: string;
  timezone: string;
  isActive: boolean;
  emailSettings: EmailSettings | null;
  reminderPreferences: ReminderPreferences | null;
  branding: Branding | null;
  createdAt: string;
  updatedAt: string;
  users?: User[];
}

export interface EmailSettings {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromName?: string;
  fromEmail?: string;
}

export interface ReminderPreferences {
  enabled?: boolean;
  daysBefore?: number;
  daysAfter?: number;
  sendTime?: string;
  ccEmails?: string[];
}

export interface Branding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
}

export interface CompanyStats {
  companyId: string;
  companyName: string;
  totalProperties: number;
  totalApartments: number;
  occupiedApartments: number;
  availableApartments: number;
  occupancyRate: number;
  totalTenants: number;
  activeTenants: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
  outstandingBalance: number;
  totalUsers: number;
  activeUsers: number;
  lastActivity: string | null;
  createdAt: string;
}

export interface PlatformStats {
  companies: {
    total: number;
    active: number;
    suspended: number;
  };
  properties: {
    total: number;
    averagePerCompany: number;
  };
  apartments: {
    total: number;
  };
  tenants: {
    total: number;
  };
  users: {
    total: number;
  };
  financials: {
    totalRevenue: number;
    totalInvoices: number;
    paidInvoices: number;
    collectionRate: number;
  };
}

export interface CompanyListResponse {
  data: Company[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateCompanyDto {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  currency?: string;
  timezone?: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerPhone?: string;
}

export interface UpdateCompanyDto {
  name?: string;
  email?: string;
  phone?: string;
  currency?: string;
  timezone?: string;
}

export interface CompanyFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
}
