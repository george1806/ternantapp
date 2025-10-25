export class CompanyStatsDto {
  companyId: string;
  companyName: string;

  // Property stats
  totalProperties: number;
  totalApartments: number;
  occupiedApartments: number;
  availableApartments: number;
  occupancyRate: number;

  // Tenant stats
  totalTenants: number;
  activeTenants: number;

  // Financial stats
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
  outstandingBalance: number;

  // User stats
  totalUsers: number;
  activeUsers: number;

  // Subscription info
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: Date;

  // Activity
  lastActivity?: Date;
  createdAt: Date;
}
