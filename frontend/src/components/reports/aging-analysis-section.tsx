'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw } from 'lucide-react';
import { reportsService, type AgingAnalysisReport } from '@/services/reports.service';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const AGING_COLORS: Record<string, string> = {
  current: '#82ca9d',
  '1-30': '#ffc658',
  '31-60': '#ff8042',
  '61-90': '#ff6b6b',
  '90+': '#c92a2a',
};

export function AgingAnalysisSection() {
  const [agingData, setAgingData] = useState<AgingAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await reportsService.getAgingAnalysisReport();
      setAgingData(response.data.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load aging analysis data',
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
      const blob = await reportsService.exportToCSV('aging-analysis');
      reportsService.downloadCSV(blob, `aging-analysis-${Date.now()}.csv`);
      toast({
        title: 'Success',
        description: 'Aging analysis report exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
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
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!agingData) {
    return <div>No aging analysis data available</div>;
  }

  // Transform summary data for bar chart
  const chartData = [
    { bucket: 'Current', amount: agingData.summary.current, color: AGING_COLORS.current },
    { bucket: '1-30 Days', amount: agingData.summary.days30, color: AGING_COLORS['1-30'] },
    { bucket: '31-60 Days', amount: agingData.summary.days60, color: AGING_COLORS['31-60'] },
    { bucket: '61-90 Days', amount: agingData.summary.days90, color: AGING_COLORS['61-90'] },
    { bucket: '90+ Days', amount: agingData.summary.days90Plus, color: AGING_COLORS['90+'] },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Aging Analysis Report</h2>
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

      {/* Summary Cards by Aging Bucket */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportsService.formatCurrency(agingData.summary.total)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Current</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reportsService.formatCurrency(agingData.summary.current)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">1-30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {reportsService.formatCurrency(agingData.summary.days30)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">31-60 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {reportsService.formatCurrency(agingData.summary.days60)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">90+ Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {reportsService.formatCurrency(agingData.summary.days90Plus)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Distribution Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Aging Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis tickFormatter={(value) => reportsService.formatCurrency(value)} />
              <Tooltip
                formatter={(value: number) => reportsService.formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <Bar dataKey="amount" name="Outstanding Amount" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Overdue Invoices Detail ({agingData.details.length} invoices)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {agingData.details.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-6">
              No overdue invoices
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Tenant</th>
                    <th className="text-left p-3 font-semibold">Invoice #</th>
                    <th className="text-right p-3 font-semibold">Invoice Date</th>
                    <th className="text-right p-3 font-semibold">Due Date</th>
                    <th className="text-right p-3 font-semibold">Amount Due</th>
                    <th className="text-right p-3 font-semibold">Days Overdue</th>
                    <th className="text-center p-3 font-semibold">Aging Bucket</th>
                  </tr>
                </thead>
                <tbody>
                  {agingData.details.map((detail) => (
                    <tr key={detail.invoiceNumber} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{detail.tenantName}</td>
                      <td className="p-3">{detail.invoiceNumber}</td>
                      <td className="p-3 text-right">
                        {new Date(detail.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        {new Date(detail.dueDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {reportsService.formatCurrency(detail.amountDue)}
                      </td>
                      <td className="p-3 text-right">
                        <Badge
                          variant={detail.daysOverdue > 60 ? 'destructive' : 'default'}
                          className={
                            detail.daysOverdue <= 0
                              ? 'bg-green-500'
                              : detail.daysOverdue <= 30
                                ? 'bg-yellow-500'
                                : detail.daysOverdue <= 60
                                  ? 'bg-orange-500'
                                  : ''
                          }
                        >
                          {detail.daysOverdue} days
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: AGING_COLORS[detail.agingBucket],
                            color: AGING_COLORS[detail.agingBucket],
                          }}
                        >
                          {detail.agingBucket}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
