'use client';

import { useEffect, useState } from 'react';
import { Home, Users, Calendar, AlertCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { occupanciesService } from '@/services/occupancies.service';

interface OccupancyStats {
  total: number;
  active: number;
  pending: number;
  ended: number;
  cancelled: number;
  expiringThisMonth: number;
  expiringNextMonth: number;
  averageLeaseDuration: number;
}

export function OccupancyStats() {
  const [stats, setStats] = useState<OccupancyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await occupanciesService.getStats();

      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch occupancy stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Format average lease duration from days to months
  const avgLeaseMonths = Math.round(stats.averageLeaseDuration / 30);

  return (
    <div className="grid gap-4 md:grid-cols-6">
      {/* Total Occupancies */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leases</CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">All occupancies</p>
        </CardContent>
      </Card>

      {/* Active */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active</CardTitle>
          <Users className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <p className="text-xs text-muted-foreground mt-1">Currently occupied</p>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Calendar className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          <p className="text-xs text-muted-foreground mt-1">Awaiting move-in</p>
        </CardContent>
      </Card>

      {/* Expiring This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.expiringThisMonth}</div>
          <p className="text-xs text-muted-foreground mt-1">Expiring soon</p>
        </CardContent>
      </Card>

      {/* Expiring Next Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Next Month</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.expiringNextMonth}</div>
          <p className="text-xs text-muted-foreground mt-1">Upcoming expiry</p>
        </CardContent>
      </Card>

      {/* Average Lease Duration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
          <Calendar className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{avgLeaseMonths}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {avgLeaseMonths === 1 ? 'month' : 'months'} average
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
