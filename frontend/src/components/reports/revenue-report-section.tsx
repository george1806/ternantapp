'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { RevenueTrendChart } from './revenue-trend-chart';
import { PaymentMethodsChart } from './payment-methods-chart';
import { reportsService, type RevenueAnalytics } from '@/services/reports.service';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export function RevenueReportSection() {
  const [revenueData, setRevenueData] = useState<RevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await reportsService.getRevenueAnalytics();
      setRevenueData(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load revenue data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await reportsService.exportToCSV('revenue');
      reportsService.downloadCSV(blob, `revenue-report-${Date.now()}.csv`);
      toast({
        title: 'Success',
        description: 'Revenue report exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export revenue report',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!revenueData) {
    return <div>No revenue data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Revenue Analysis</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportsService.formatCurrency(revenueData.totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reportsService.formatCurrency(revenueData.totalPaid)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {reportsService.formatCurrency(revenueData.totalOutstanding)}
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
            <div className="text-2xl font-bold">
              {reportsService.formatPercentage(revenueData.collectionRate)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <RevenueTrendChart data={revenueData.monthlyTrend} />
        <PaymentMethodsChart data={revenueData.byPaymentMethod} />
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Monthly Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Month</th>
                  <th className="text-right p-3 font-semibold">Revenue</th>
                  <th className="text-right p-3 font-semibold">Collected</th>
                  <th className="text-right p-3 font-semibold">Outstanding</th>
                  <th className="text-right p-3 font-semibold">Collection %</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.monthlyTrend.map((trend) => {
                  const collectionPct =
                    trend.revenue > 0 ? (trend.collected / trend.revenue) * 100 : 0;
                  return (
                    <tr key={trend.month} className="border-b hover:bg-muted/50">
                      <td className="p-3">{trend.month}</td>
                      <td className="p-3 text-right">
                        {reportsService.formatCurrency(trend.revenue)}
                      </td>
                      <td className="p-3 text-right text-green-600">
                        {reportsService.formatCurrency(trend.collected)}
                      </td>
                      <td className="p-3 text-right text-orange-600">
                        {reportsService.formatCurrency(trend.outstanding)}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={
                            collectionPct >= 90
                              ? 'text-green-600'
                              : collectionPct >= 70
                                ? 'text-orange-600'
                                : 'text-red-600'
                          }
                        >
                          {reportsService.formatPercentage(collectionPct)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
