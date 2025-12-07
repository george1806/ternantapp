'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { analyticsService, type AnalyticsFilters } from '@/services/analytics.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { RevenueChart } from '@/components/analytics/RevenueChart';
import { InvoiceDistributionChart } from '@/components/analytics/InvoiceDistributionChart';

/**
 * Super Admin Analytics Page
 *
 * Features:
 * - Platform-wide revenue analytics
 * - Invoice distribution breakdown
 * - Payment collection metrics
 * - Top companies by revenue
 * - Period selection (7d, 30d, 90d, YTD)
 * - Multiple chart types (line, pie, bar)
 * - Responsive design
 */

type PeriodType = '7d' | '30d' | '90d' | 'ytd' | 'all';

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';
  const [period, setPeriod] = useState<PeriodType>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
  const [invoiceDistribution, setInvoiceDistribution] = useState<any[]>([]);
  const [paymentCollection, setPaymentCollection] = useState<any>(null);
  const [topCompanies, setTopCompanies] = useState<any[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: AnalyticsFilters = { period };

      const [trendsRes, distributionRes, collectionRes, companiesRes] = await Promise.all([
        analyticsService.getRevenueTrends(filters).catch(() => ({ data: { data: [] } })),
        analyticsService.getInvoiceDistribution(filters).catch(() => ({ data: { data: [] } })),
        analyticsService.getPaymentCollection(filters).catch(() => ({ data: { data: null } })),
        analyticsService.getTopCompanies({ ...filters, limit: 10 }).catch(() => ({ data: { data: [] } })),
      ]);

      setRevenueTrends(trendsRes.data?.data || []);
      setInvoiceDistribution(distributionRes.data?.data || []);
      setPaymentCollection(collectionRes.data?.data || null);
      setTopCompanies(companiesRes.data?.data || []);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (p: PeriodType) => {
    switch (p) {
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case '90d':
        return 'Last 90 Days';
      case 'ytd':
        return 'Year to Date';
      case 'all':
        return 'All Time';
      default:
        return 'Custom';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Error loading analytics</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
          <Button onClick={fetchAnalyticsData} className="mt-4 w-full">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform-wide insights and metrics</p>
        </div>
      </div>

      {/* Period Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Period:</span>
            {(['7d', '30d', '90d', 'ytd', 'all'] as PeriodType[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {getPeriodLabel(p)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {paymentCollection
                ? formatCurrency(paymentCollection.totalCollected, currency)
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {revenueTrends.length > 0 ? `${revenueTrends.length} days recorded` : 'No data'}
            </p>
          </CardContent>
        </Card>

        {/* Outstanding */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {paymentCollection
                ? formatCurrency(paymentCollection.outstanding, currency)
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentCollection ? `${paymentCollection.outstanding ? 'Needs payment' : 'Up to date'}` : 'No data'}
            </p>
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {paymentCollection
                ? `${Math.round(paymentCollection.collectionRate * 100)}%`
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentCollection && paymentCollection.collectionRate > 0.8
                ? 'Excellent'
                : paymentCollection && paymentCollection.collectionRate > 0.6
                  ? 'Good'
                  : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>

        {/* Total Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoiceDistribution.reduce((sum, item) => sum + item.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoiceDistribution.length} status types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue Trends
            </CardTitle>
            <CardDescription>Income over {getPeriodLabel(period).toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueTrends.length > 0 ? (
              <div className="space-y-4">
                <RevenueChart data={revenueTrends} currency={currency} />
                <div className="text-sm text-muted-foreground">
                  <p>
                    Total Revenue:{' '}
                    <span className="font-semibold">
                      {formatCurrency(
                        revenueTrends.reduce((sum, item) => sum + item.amount, 0),
                        currency
                      )}
                    </span>
                  </p>
                  <p>
                    Average Daily:{' '}
                    <span className="font-semibold">
                      {formatCurrency(
                        revenueTrends.reduce((sum, item) => sum + item.amount, 0) / revenueTrends.length,
                        currency
                      )}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Invoice Distribution
            </CardTitle>
            <CardDescription>Status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {invoiceDistribution.length > 0 ? (
              <InvoiceDistributionChart data={invoiceDistribution} currency={currency} />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No invoice data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Companies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Top Companies by Revenue
          </CardTitle>
          <CardDescription>Ranked by collected revenue</CardDescription>
        </CardHeader>
        <CardContent>
          {topCompanies.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Collection Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCompanies.map((company, index) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                            {index + 1}
                          </Badge>
                          <span className="font-medium">{company.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(company.revenue, currency)}
                      </TableCell>
                      <TableCell className="text-right">{company.invoices}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{Math.round(company.collectionRate * 100)}%</span>
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                company.collectionRate > 0.8
                                  ? 'bg-green-600'
                                  : company.collectionRate > 0.6
                                    ? 'bg-yellow-600'
                                    : 'bg-red-600'
                              }`}
                              style={{ width: `${company.collectionRate * 100}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No company data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Status Breakdown */}
      {invoiceDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Breakdown</CardTitle>
            <CardDescription>Detailed invoice statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {invoiceDistribution.map((item) => (
                <div key={item.status} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{item.status}</p>
                    <p className="text-sm text-muted-foreground">{item.count} invoices</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(item.amount, currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(
                        (item.amount /
                          invoiceDistribution.reduce((sum, i) => sum + i.amount, 0)) *
                          100
                      )}
                      % of total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
