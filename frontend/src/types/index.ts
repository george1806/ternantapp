/**
 * User Types
 */
export interface User {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  company?: Company;
  profile?: {
    phone?: string;
    avatar?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  AUDITOR = 'AUDITOR',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Company Types
 */
export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  currency: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Compound Types
 */
export interface Compound {
  id: string;
  companyId: string;
  name: string;
  address: string; // Backend uses 'address', not 'addressLine'
  addressLine?: string; // Keep for backward compatibility
  city: string;
  region?: string;
  country: string;
  postalCode?: string;
  geoLat?: number;
  geoLng?: number;
  totalUnits?: number; // Computed from apartments count
  vacantUnits?: number; // Computed field
  occupiedUnits?: number; // Computed field
  description?: string;
  notes?: string;
  amenities?: string[];
  isActive: boolean;
  apartments?: Apartment[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Apartment Types
 */
export interface Apartment {
  id: string;
  companyId: string;
  compoundId: string;
  unitNumber: string;
  floor?: number;
  bedrooms: number;
  bathrooms: number;
  areaSqm?: number;
  monthlyRent: number;
  status: ApartmentStatus;
  amenities?: string[];
  notes?: string;
  isActive: boolean;
  compound?: Compound;
  createdAt: string;
  updatedAt: string;
}

export enum ApartmentStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance',
  RESERVED = 'reserved',
}

/**
 * Tenant Types
 */
export interface Tenant {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber?: string;
  dateOfBirth?: string;
  nationality?: string;
  occupation?: string;
  employer?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  status: 'active' | 'inactive';
  notes?: string;
  isActive: boolean;
  occupancies?: Occupancy[];
  createdAt: string;
  updatedAt: string;
}

export type TenantStatus = 'active' | 'inactive';

/**
 * Occupancy Types
 */
export interface Occupancy {
  id: string;
  companyId: string;
  apartmentId: string;
  tenantId: string;
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyRent: number;
  securityDeposit?: number;
  depositPaid?: number;
  moveInDate?: string;
  moveOutDate?: string;
  status: 'pending' | 'active' | 'ended' | 'cancelled';
  notes?: string;
  isActive: boolean;
  apartment?: Apartment;
  tenant?: Tenant;
  createdAt: string;
  updatedAt: string;
}

export type OccupancyStatus = 'pending' | 'active' | 'ended' | 'cancelled';

/**
 * Invoice Types
 */
export interface Invoice {
  id: string;
  companyId: string;
  occupancyId: string;
  invoiceNumber: string;
  issueDate: string; // Backend uses issueDate
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  isActive: boolean;
  occupancy?: Occupancy;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

/**
 * Payment Types
 */
export interface Payment {
  id: string;
  companyId: string;
  invoiceId: string;
  amount: number;
  paymentDate: string; // Backend uses paymentDate
  paymentMethod: 'mpesa' | 'bank_transfer' | 'cash' | 'cheque' | 'other';
  reference: string;
  notes?: string;
  isActive: boolean;
  invoice?: Invoice;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'mpesa' | 'bank_transfer' | 'cash' | 'cheque' | 'other';

/**
 * Authentication Types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  company: Company;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Dashboard Stats Types
 */
export interface DashboardStats {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  activeTenants: number;
  averageRent: number;
  monthlyRecurringRevenue: number;
  totalRevenue: number;
  outstandingAmount: number;
  collectionRate: number;
  overdueInvoices: number;
  overdueAmount: number;
}

/**
 * Pagination Types
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
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

/**
 * API Response Types
 */
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}
