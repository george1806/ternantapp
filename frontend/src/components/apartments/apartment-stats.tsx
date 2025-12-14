'use client';

import { useEffect, useState } from 'react';
import { Home, CheckCircle2, Users, Wrench, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apartmentsService } from '@/services/apartments.service';

interface ApartmentStats {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  reserved: number;
  occupancyRate: number;
}

interface ApartmentStatsProps {
  compoundId?: string;
}

export function ApartmentStats({ compoundId }: ApartmentStatsProps) {
  const [stats, setStats] = useState<ApartmentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compoundId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await apartmentsService.getStats({
        compoundId: compoundId === 'all' ? undefined : compoundId,
      });

      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch apartment stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
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

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {/* Total Apartments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Units</CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.occupancyRate.toFixed(1)}% occupied
          </p>
        </CardContent>
      </Card>

      {/* Available */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          <p className="text-xs text-muted-foreground mt-1">Ready to occupy</p>
        </CardContent>
      </Card>

      {/* Occupied */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Occupied</CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.occupied}</div>
          <p className="text-xs text-muted-foreground mt-1">Currently rented</p>
        </CardContent>
      </Card>

      {/* Maintenance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
          <Wrench className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.maintenance}</div>
          <p className="text-xs text-muted-foreground mt-1">Under repair</p>
        </CardContent>
      </Card>

      {/* Reserved */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reserved</CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.reserved}</div>
          <p className="text-xs text-muted-foreground mt-1">Pending move-in</p>
        </CardContent>
      </Card>
    </div>
  );
}
