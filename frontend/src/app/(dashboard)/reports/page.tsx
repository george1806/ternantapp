'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { RevenueReportSection } from '@/components/reports/revenue-report-section';
import { OccupancyReportSection } from '@/components/reports/occupancy-report-section';
import { LeaseExpirationSection } from '@/components/reports/lease-expiration-section';
import { AgingAnalysisSection } from '@/components/reports/aging-analysis-section';
import { RevenueTrendChart } from '@/components/reports/revenue-trend-chart';
import { OccupancyTrendChart } from '@/components/reports/occupancy-trend-chart';
import { PaymentMethodsChart } from '@/components/reports/payment-methods-chart';
import { PropertyComparisonChart } from '@/components/reports/property-comparison-chart';
import { reportsService, type KPIData, type RevenueAnalytics, type OccupancyAnalytics } from '@/services/reports.service';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';

/**
 * Reports & Analytics Page
 *
 * Comprehensive reporting dashboard with:
 * - Overview dashboard with KPIs and charts
 * - Revenue analysis with trends
 * - Occupancy analysis with property breakdown
 * - Lease expiration tracking
 * - Aging analysis for AR management
 * - CSV export functionality
 */

export default function ReportsPage() {
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'USD';
  const [activeTab, setActiveTab] = useState('overview');
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueAnalytics | null>(null);
  const [occupancyData, setOccupancyData] = useState<OccupancyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      const [kpiResponse, revenueResponse, occupancyResponse] = await Promise.all([
        reportsService.getKPIs(),
        reportsService.getRevenueAnalytics(),
        reportsService.getOccupancyAnalytics(),
      ]);
      setKpis(kpiResponse.data);
      setRevenueData(revenueResponse.data);
      setOccupancyData(occupancyResponse.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load overview data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverviewData();
    }
  }, [activeTab]);

  const clearCache = async () => {
    try {
      await reportsService.clearCache();
      toast({
        title: 'Success',
        description: 'Reports cache cleared',
      });
      loadOverviewData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear cache',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Comprehensive insights into your property management performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearCache} className="text-sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Clear Cache</span>
            <span className="sm:hidden">Clear</span>
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 w-full gap-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs sm:text-sm">Revenue</TabsTrigger>
          <TabsTrigger value="occupancy" className="text-xs sm:text-sm">Occupancy</TabsTrigger>
          <TabsTrigger value="leases" className="text-xs sm:text-sm">Leases</TabsTrigger>
          <TabsTrigger value="aging" className="text-xs sm:text-sm">Aging</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Dashboard Style */}
        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-96" />
                <Skeleton className="h-96" />
              </div>
            </div>
          ) : (
            <>
              {/* KPI Cards Row */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reportsService.formatCurrency(kpis?.totalRevenue || 0, currency)}
                    </div>
                    <div className="flex items-center gap-1 text-sm mt-1">
                      {(kpis?.revenueGrowth || 0) >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span
                        className={
                          (kpis?.revenueGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {Math.abs(kpis?.revenueGrowth || 0).toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">vs prev period</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Occupancy Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reportsService.formatPercentage(kpis?.occupancyRate || 0)}
                    </div>
                    <div className="flex items-center gap-1 text-sm mt-1">
                      {(kpis?.occupancyTrend || 0) >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span
                        className={
                          (kpis?.occupancyTrend || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {Math.abs(kpis?.occupancyTrend || 0).toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Monthly Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reportsService.formatCurrency(kpis?.monthlyRevenue || 0, currency)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">MRR</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Collection Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reportsService.formatPercentage(kpis?.collectionRate || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {reportsService.formatCurrency(kpis?.totalRevenue || 0, currency)} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Properties
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis?.totalProperties || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpis?.totalUnits || 0} units
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Active Tenants
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis?.totalTenants || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpis?.activeLeases || 0} leases
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pending Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {kpis?.pendingInvoices || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpis?.overdueInvoices || 0} overdue
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Expiring Leases
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {kpis?.expiringLeases || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Next 30 days</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {revenueData && <RevenueTrendChart data={revenueData.monthlyTrend} currency={currency} />}
                {occupancyData && <OccupancyTrendChart data={occupancyData.monthlyTrend} />}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {revenueData && <PaymentMethodsChart data={revenueData.byPaymentMethod} currency={currency} />}
                {occupancyData && <PropertyComparisonChart data={occupancyData.byCompound} metric="occupancy" />}
              </div>
            </>
          )}
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <RevenueReportSection />
        </TabsContent>

        {/* Occupancy Tab */}
        <TabsContent value="occupancy">
          <OccupancyReportSection />
        </TabsContent>

        {/* Lease Expiration Tab */}
        <TabsContent value="leases">
          <LeaseExpirationSection />
        </TabsContent>

        {/* Aging Analysis Tab */}
        <TabsContent value="aging">
          <AgingAnalysisSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
