'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { reportsService, type LeaseExpirationReport } from '@/services/reports.service';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export function LeaseExpirationSection() {
  const [expiringLeases, setExpiringLeases] = useState<LeaseExpirationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [daysAhead] = useState(90);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await reportsService.getLeaseExpirationReport(daysAhead);
      setExpiringLeases(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load lease expiration data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [daysAhead]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await reportsService.exportToCSV('lease-expiration', { daysAhead });
      reportsService.downloadCSV(blob, `lease-expiration-${Date.now()}.csv`);
      toast({
        title: 'Success',
        description: 'Lease expiration report exported successfully',
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

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Critical
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="gap-1 bg-orange-500 hover:bg-orange-600">
            <AlertCircle className="h-3 w-3" />
            Warning
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Info className="h-3 w-3" />
            Normal
          </Badge>
        );
    }
  };

  const criticalCount = expiringLeases.filter((l) => l.daysUntilExpiration <= 30).length;
  const warningCount = expiringLeases.filter(
    (l) => l.daysUntilExpiration > 30 && l.daysUntilExpiration <= 60
  ).length;
  const normalCount = expiringLeases.filter((l) => l.daysUntilExpiration > 60).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Lease Expiration Report</h2>
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

      {/* Summary Cards by Urgency */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Expiring in 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Expiring in 31-60 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{warningCount}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              Expiring in 61-90 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{normalCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Leases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Expiring Leases ({expiringLeases.length} total)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {expiringLeases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-6">
              No leases expiring in the next {daysAhead} days
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Tenant</th>
                    <th className="text-left p-3 font-semibold">Unit</th>
                    <th className="text-left p-3 font-semibold">Property</th>
                    <th className="text-right p-3 font-semibold">Expiration Date</th>
                    <th className="text-right p-3 font-semibold">Days Left</th>
                    <th className="text-right p-3 font-semibold">Monthly Rent</th>
                    <th className="text-left p-3 font-semibold">Contact</th>
                    <th className="text-center p-3 font-semibold">Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringLeases.map((lease) => (
                    <tr key={lease.occupancyId} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{lease.tenantName}</td>
                      <td className="p-3">{lease.apartmentUnit}</td>
                      <td className="p-3">{lease.propertyName}</td>
                      <td className="p-3 text-right">
                        {new Date(lease.leaseEndDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={
                            lease.daysUntilExpiration <= 30
                              ? 'text-red-600 font-semibold'
                              : lease.daysUntilExpiration <= 60
                                ? 'text-orange-600 font-semibold'
                                : 'text-blue-600'
                          }
                        >
                          {lease.daysUntilExpiration} days
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {reportsService.formatCurrency(lease.monthlyRent)}
                      </td>
                      <td className="p-3">
                        <div className="text-xs">
                          <div>{lease.tenantPhone}</div>
                          <div className="text-muted-foreground">{lease.tenantEmail}</div>
                        </div>
                      </td>
                      <td className="p-3 text-center">{getUrgencyBadge(lease.urgency)}</td>
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
