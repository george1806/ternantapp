'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { OccupancyTrendChart } from './occupancy-trend-chart';
import { PropertyComparisonChart } from './property-comparison-chart';
import { reportsService, type OccupancyAnalytics } from '@/services/reports.service';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export function OccupancyReportSection() {
  const [occupancyData, setOccupancyData] = useState<OccupancyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await reportsService.getOccupancyAnalytics();
      setOccupancyData(response.data.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load occupancy data',
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
      const blob = await reportsService.exportToCSV('occupancy');
      reportsService.downloadCSV(blob, `occupancy-report-${Date.now()}.csv`);
      toast({
        title: 'Success',
        description: 'Occupancy report exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export occupancy report',
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

  if (!occupancyData) {
    return <div>No occupancy data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Occupancy Analysis</h2>
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
              Occupancy Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportsService.formatPercentage(occupancyData.currentOccupancyRate)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Occupied Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {occupancyData.occupiedUnits} / {occupancyData.totalUnits}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vacant Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {occupancyData.vacantUnits}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Lease Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {occupancyData.averageLeaseDuration.toFixed(1)} mo
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <OccupancyTrendChart data={occupancyData.monthlyTrend} />
        <PropertyComparisonChart data={occupancyData.byCompound} metric="occupancy" />
      </div>

      {/* Property Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Property-Level Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Property</th>
                  <th className="text-right p-3 font-semibold">Total Units</th>
                  <th className="text-right p-3 font-semibold">Occupied</th>
                  <th className="text-right p-3 font-semibold">Vacant</th>
                  <th className="text-right p-3 font-semibold">Occupancy Rate</th>
                </tr>
              </thead>
              <tbody>
                {occupancyData.byCompound.map((compound) => {
                  const vacant = compound.totalUnits - compound.occupied;
                  return (
                    <tr key={compound.compoundId} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{compound.compoundName}</td>
                      <td className="p-3 text-right">{compound.totalUnits}</td>
                      <td className="p-3 text-right text-green-600">{compound.occupied}</td>
                      <td className="p-3 text-right text-orange-600">{vacant}</td>
                      <td className="p-3 text-right">
                        <span
                          className={
                            compound.occupancyRate >= 90
                              ? 'text-green-600 font-semibold'
                              : compound.occupancyRate >= 70
                                ? 'text-orange-600 font-semibold'
                                : 'text-red-600 font-semibold'
                          }
                        >
                          {reportsService.formatPercentage(compound.occupancyRate)}
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
