'use client';

import { useEffect, useState } from 'react';
import { dashboardService, type DashboardStats } from '@/services/dashboard.service';
import { compoundsService } from '@/services/compounds.service';
import type { Invoice, Payment, Compound } from '@/types';
import { StatsCard } from '@/components/dashboard/stats-card';
import { ExpiringLeasesWidget } from '@/components/dashboard/expiring-leases-widget';
import { DueSoonInvoicesWidget } from '@/components/dashboard/due-soon-invoices-widget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import {
  Building2,
  Users,
  DollarSign,
  FileText,
  AlertCircle,
  TrendingUp,
  Home,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

/**
 * Dashboard Page
 *
 * Best Practices:
 * - Loading states with skeletons
 * - Error handling with user feedback
 * - Responsive grid layout
 * - Real-time stats display
 * - Quick access to recent data
 *
 * Performance:
 * - Optimized API calls
 * - Lazy loading of data sections
 */

// Circular Progress Component
interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  showPercentage?: boolean;
}

function CircularProgress({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = '#3b82f6',
  label,
  showPercentage = true
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span className="text-2xl font-bold">{percentage.toFixed(0)}%</span>
        )}
        {label && (
          <span className="text-xs text-muted-foreground mt-1">{label}</span>
        )}
      </div>
    </div>
  );
}

// Enhanced Stat Card Component
interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  colorClass?: string;
  iconBgClass?: string;
}

function EnhancedStatCard({
  title,
  value,
  icon: Icon,
  description,
  change,
  colorClass = 'text-blue-600',
  iconBgClass = 'bg-blue-100 dark:bg-blue-950',
}: EnhancedStatCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
            <h3 className={cn("text-3xl font-bold mb-1", colorClass)}>{value}</h3>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {change && (
              <div className="flex items-center gap-1 mt-2">
                {change.isPositive ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                )}
                <span
                  className={cn(
                    "text-sm font-semibold",
                    change.isPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  {Math.abs(change.value)}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">vs last month</span>
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", iconBgClass)}>
            <Icon className={cn("h-6 w-6", colorClass)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompoundId]);

  const fetchCompounds = async () => {
    try {
      const response = await compoundsService.getAll({ limit: 100 });
      if (response.data?.data) {
        setCompounds(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch compounds:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Ensure token is available before making requests
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found, skipping dashboard data fetch');
        return;
      }

      // Determine compoundId parameter (undefined for 'all')
      const compoundId = selectedCompoundId === 'all' ? undefined : selectedCompoundId;

      // Fetch stats and recent data in parallel for performance
      const [statsResponse, invoicesResponse, paymentsResponse] = await Promise.all([
        dashboardService.getStats(compoundId).catch(err => {
          console.error('Stats fetch failed:', {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message
          });
          return null;
        }),
        dashboardService.getRecentInvoices(5, compoundId).catch(err => {
          console.error('Invoices fetch failed:', {
            status: err.response?.status,
            data: err.response?.data
          });
          return null;
        }),
        dashboardService.getRecentPayments(5, compoundId).catch(err => {
          console.error('Payments fetch failed:', {
            status: err.response?.status,
            data: err.response?.data
          });
          return null;
        }),
      ]);

      console.log('Dashboard API responses:', {
        stats: !!statsResponse,
        invoices: !!invoicesResponse,
        payments: !!paymentsResponse,
        statsData: statsResponse?.data
      });

      if (statsResponse?.data?.data) {
        setStats(statsResponse.data.data);
      } else {
        // Fallback: Backend endpoint doesn't exist yet
        console.warn('Dashboard stats endpoint not available, using mock data');
      }

      if (invoicesResponse?.data?.data) {
        setRecentInvoices(invoicesResponse.data.data);
      } else {
        console.warn('Invoices endpoint not available');
      }

      if (paymentsResponse?.data?.data) {
        setRecentPayments(paymentsResponse.data.data);
      } else {
        console.warn('Payments endpoint not available');
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    if (!status) {
      return <Badge variant="default">Unknown</Badge>;
    }
    const variants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
      paid: 'success',
      pending: 'warning',
      sent: 'warning',
      overdue: 'destructive',
      cancelled: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const getPaymentMethodBadge = (method: string) => {
    if (!method) {
      return <Badge variant="outline">N/A</Badge>;
    }
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      CASH: 'outline',
      BANK: 'secondary',
      MOBILE: 'default',
      CARD: 'secondary',
      OTHER: 'outline',
    };
    const displayNames: Record<string, string> = {
      CASH: 'Cash',
      BANK: 'Bank Transfer',
      MOBILE: 'Mobile Money',
      CARD: 'Card',
      OTHER: 'Other',
    };
    return <Badge variant={variants[method] || 'outline'}>{displayNames[method] || method}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>

        {/* Enhanced Stats Cards Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>

        {/* Circular Progress Cards Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>

        {/* Financial Cards Skeleton */}
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>

        {/* Widgets Skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>

        {/* Tables Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedCompoundId === 'all'
              ? 'Viewing all properties'
              : `Viewing ${compounds.find(c => c.id === selectedCompoundId)?.name || 'property'}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCompoundId} onValueChange={setSelectedCompoundId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>All Properties</span>
                </div>
              </SelectItem>
              {compounds.map((compound) => (
                <SelectItem key={compound.id} value={compound.id}>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span>{compound.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {formatDate(new Date())}
          </p>
        </div>
      </div>

      {/* Backend Status Notice - Only show if data failed to load */}
      {!stats && !loading && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="font-semibold text-yellow-900">Unable to Load Dashboard Data</h3>
          <p className="text-sm text-yellow-800 mt-1">
            The dashboard data could not be loaded. Please check that the backend is running and you're authenticated.
            Try refreshing the page or contact support if the problem persists.
          </p>
        </div>
      )}

      {/* Enhanced Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <EnhancedStatCard
          title="Total Units"
          value={stats?.totalUnits || 0}
          description={`${stats?.occupiedUnits || 0} occupied • ${stats?.vacantUnits || 0} vacant`}
          icon={Building2}
          colorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-100 dark:bg-blue-950"
        />
        <EnhancedStatCard
          title="Active Tenants"
          value={stats?.activeTenants || 0}
          description={`Avg rent: ${formatCurrency(stats?.averageRent || 0, currency)}`}
          icon={Users}
          colorClass="text-purple-600 dark:text-purple-400"
          iconBgClass="bg-purple-100 dark:bg-purple-950"
        />
        <EnhancedStatCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.monthlyRecurringRevenue || 0, currency)}
          description="Recurring revenue per month"
          icon={DollarSign}
          colorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-100 dark:bg-emerald-950"
        />
        <EnhancedStatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0, currency)}
          description="All-time collection"
          icon={TrendingUp}
          colorClass="text-orange-600 dark:text-orange-400"
          iconBgClass="bg-orange-100 dark:bg-orange-950"
        />
      </div>

      {/* Circular Progress Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Occupancy Rate */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-5 w-5 text-blue-600" />
              Occupancy Rate
            </CardTitle>
            <CardDescription>Current property utilization</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-6">
            <CircularProgress
              percentage={stats?.occupancyRate || 0}
              size={140}
              strokeWidth={10}
              color="#3b82f6"
            />
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{stats?.occupiedUnits || 0}</span> occupied of{' '}
                <span className="font-semibold text-foreground">{stats?.totalUnits || 0}</span> total units
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Collection Rate
            </CardTitle>
            <CardDescription>Payment collection efficiency</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-6">
            <CircularProgress
              percentage={stats?.collectionRate || 0}
              size={140}
              strokeWidth={10}
              color="#10b981"
            />
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Outstanding: <span className="font-semibold text-orange-600">{formatCurrency(stats?.outstandingAmount || 0, currency)}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Units Breakdown */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-indigo-600" />
              Units Breakdown
            </CardTitle>
            <CardDescription>Status distribution</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Occupied</p>
                    <p className="text-xs text-muted-foreground">Active leases</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-emerald-600">{stats?.occupiedUnits || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950">
                    <XCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Vacant</p>
                    <p className="text-xs text-muted-foreground">Available units</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-orange-600">{stats?.vacantUnits || 0}</span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total Units</span>
                  <span className="text-xl font-bold">{stats?.totalUnits || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-orange-200 dark:border-orange-900 bg-gradient-to-br from-orange-50 to-background dark:from-orange-950/20 dark:to-background">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              Outstanding Amount
            </CardTitle>
            <CardDescription>Pending collections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{formatCurrency(stats?.outstandingAmount || 0, currency)}</div>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-2 bg-orange-200 dark:bg-orange-900/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-600 rounded-full transition-all duration-500"
                  style={{ width: `${100 - (stats?.collectionRate || 0)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {(100 - (stats?.collectionRate || 0)).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-background dark:from-red-950/20 dark:to-background">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              Overdue Invoices
            </CardTitle>
            <CardDescription>Requires immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-red-600">{stats?.overdueInvoices || 0}</div>
              <span className="text-sm text-muted-foreground">invoices</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Amount: <span className="font-semibold text-red-600">{formatCurrency(stats?.overdueAmount || 0, currency)}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              Average Rent
            </CardTitle>
            <CardDescription>Per unit monthly rent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{formatCurrency(stats?.averageRent || 0, currency)}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Across {stats?.activeTenants || 0} active {(stats?.activeTenants || 0) === 1 ? 'tenant' : 'tenants'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Widgets Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <ExpiringLeasesWidget />
        <DueSoonInvoicesWidget />
      </div>

      {/* Recent Activity Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Invoices */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-background dark:from-blue-950/20 dark:to-background border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Recent Invoices
            </CardTitle>
            <CardDescription>Latest 5 invoices generated</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No invoices found</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentInvoices.map((invoice, index) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.occupancy?.tenant
                            ? `${invoice.occupancy.tenant.firstName} ${invoice.occupancy.tenant.lastName}`
                            : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(invoice.totalAmount, currency)}</p>
                        <div className="mt-1">{getInvoiceStatusBadge(invoice.status)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background border-b">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Recent Payments
            </CardTitle>
            <CardDescription>Latest 5 payments received</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No payments found</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentPayments.map((payment, index) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{payment.reference || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.paidAt ? formatDate(payment.paidAt) : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(payment.amount, currency)}</p>
                        <div className="mt-1">{getPaymentMethodBadge(payment.method)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
