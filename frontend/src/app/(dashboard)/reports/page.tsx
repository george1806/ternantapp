'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
} from 'lucide-react';
import { reportsService, type KPIData, type OccupancyReport, type RevenueReport } from '@/services/reports.service';
import { compoundsService } from '@/services/compounds.service';
import type { Compound } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

/**
 * Reports Page
 *
 * Features:
 * - KPI dashboard with key metrics
 * - Occupancy reports by property
 * - Revenue reports over time
 * - Export to CSV functionality
 * - Period filtering
 */

export default function ReportsPage() {
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [occupancyReport, setOccupancyReport] = useState<OccupancyReport[]>([]);
  const [revenueReport, setRevenueReport] = useState<RevenueReport[]>([]);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'kpis' | 'occupancy' | 'revenue'>('kpis');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      loadReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, selectedProperty]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadKPIs(),
        loadOccupancyReport(),
        loadRevenueReport(),
        loadProperties(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadKPIs = async () => {
    try {
      const response = await reportsService.getKPIs();
      setKpis(response.data.data);
    } catch (error) {
      console.error('Error loading KPIs:', error);
    }
  };

  const loadOccupancyReport = async () => {
    try {
      const dateRange = reportsService.getDateRange(selectedPeriod);
      const filters = {
        ...dateRange,
        ...(selectedProperty !== 'all' && { propertyId: selectedProperty }),
      };
      const response = await reportsService.getOccupancyReport(filters);
      setOccupancyReport(response.data.data);
    } catch (error) {
      console.error('Error loading occupancy report:', error);
    }
  };

  const loadRevenueReport = async () => {
    try {
      const dateRange = reportsService.getDateRange(selectedPeriod);
      const response = await reportsService.getRevenueReport({
        ...dateRange,
        period: 'monthly',
      });
      setRevenueReport(response.data.data);
    } catch (error) {
      console.error('Error loading revenue report:', error);
    }
  };

  const loadProperties = async () => {
    try {
      const response = await compoundsService.getAll();
      setCompounds(response.data.data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const loadReports = async () => {
    try {
      await Promise.all([
        loadOccupancyReport(),
        loadRevenueReport(),
      ]);
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleExport = async (reportType: 'occupancy' | 'revenue' | 'kpis') => {
    try {
      const dateRange = reportsService.getDateRange(selectedPeriod);
      const filters = {
        ...dateRange,
        ...(selectedProperty !== 'all' && { propertyId: selectedProperty }),
      };

      toast({
        title: 'Exporting...',
        description: 'Generating CSV file...',
      });

      const blob = await reportsService.exportToCSV(reportType, filters);
      const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
      reportsService.downloadCSV(blob, filename);

      toast({
        title: 'Success',
        description: 'Report exported successfully!',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    toast({
      title: 'Refreshing...',
      description: 'Loading latest data...',
    });
    await loadData();
    toast({
      title: 'Success',
      description: 'Data refreshed successfully!',
    });
  };

  const renderTrendIcon = (value: number) => {
    if (value > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (value < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">
            View comprehensive business insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Select
                value={selectedPeriod}
                onValueChange={(value: any) => setSelectedPeriod(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last 90 Days</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Property</label>
              <Select
                value={selectedProperty}
                onValueChange={setSelectedProperty}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {compounds.map((compound) => (
                    <SelectItem key={compound.id} value={compound.id}>
                      {compound.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'kpis'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('kpis')}
        >
          Key Metrics
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'occupancy'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('occupancy')}
        >
          Occupancy Report
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'revenue'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('revenue')}
        >
          Revenue Report
        </button>
      </div>

      {/* KPIs Tab */}
      {activeTab === 'kpis' && kpis && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.totalRevenue, currency)}</div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  {renderTrendIcon(kpis.revenueGrowth)}
                  <span>{Math.abs(kpis.revenueGrowth).toFixed(1)}% from last period</span>
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
                <div className="text-2xl font-bold">{kpis.occupancyRate.toFixed(1)}%</div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <span>{kpis.occupiedUnits} of {kpis.totalUnits} units occupied</span>
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
                <div className="text-2xl font-bold">{formatCurrency(kpis.monthlyRevenue, currency)}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Average rent: {formatCurrency(kpis.averageRent, currency)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Collection Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.collectionRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {kpis.overdueInvoices} overdue invoices
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.totalProperties}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {kpis.totalUnits} total units
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Tenants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.totalTenants}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {kpis.activeLeases} active leases
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.pendingInvoices}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Awaiting payment
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Expiring Leases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.expiringLeases}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Within 30 days
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => handleExport('kpis')}>
              <Download className="h-4 w-4 mr-2" />
              Export KPIs
            </Button>
          </div>
        </div>
      )}

      {/* Occupancy Report Tab */}
      {activeTab === 'occupancy' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Occupancy by Property</CardTitle>
                  <CardDescription>
                    Detailed occupancy metrics for each property
                  </CardDescription>
                </div>
                <Button onClick={() => handleExport('occupancy')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead className="text-right">Total Units</TableHead>
                    <TableHead className="text-right">Occupied</TableHead>
                    <TableHead className="text-right">Vacant</TableHead>
                    <TableHead className="text-right">Maintenance</TableHead>
                    <TableHead className="text-right">Occupancy Rate</TableHead>
                    <TableHead className="text-right">Avg. Rent</TableHead>
                    <TableHead className="text-right">Monthly Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {occupancyReport.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No occupancy data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    occupancyReport.map((report) => (
                      <TableRow key={report.propertyId}>
                        <TableCell className="font-medium">{report.propertyName}</TableCell>
                        <TableCell className="text-right">{report.totalUnits}</TableCell>
                        <TableCell className="text-right">{report.occupiedUnits}</TableCell>
                        <TableCell className="text-right">{report.vacantUnits}</TableCell>
                        <TableCell className="text-right">{report.maintenanceUnits}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-medium ${
                              report.occupancyRate >= 90
                                ? 'text-green-600'
                                : report.occupancyRate >= 70
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {report.occupancyRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(report.averageRent, currency)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(report.monthlyRevenue, currency)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Report Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Revenue Over Time</CardTitle>
                  <CardDescription>
                    Monthly revenue collection and performance
                  </CardDescription>
                </div>
                <Button onClick={() => handleExport('revenue')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Expected Revenue</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Collection Rate</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueReport.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No revenue data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    revenueReport.map((report, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {report.month} {report.year}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(report.expectedRevenue, currency)}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(report.collectedRevenue, currency)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(report.outstandingRevenue, currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-medium ${
                              report.collectionRate >= 90
                                ? 'text-green-600'
                                : report.collectionRate >= 70
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {report.collectionRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{report.invoicesCount}</TableCell>
                        <TableCell className="text-right">{report.paymentsCount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
