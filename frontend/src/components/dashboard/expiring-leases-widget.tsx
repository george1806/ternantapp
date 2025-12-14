'use client';

import { useEffect, useState } from 'react';
import { Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { occupanciesService } from '@/services/occupancies.service';
import type { Occupancy } from '@/types';
import { differenceInDays, parseISO, format } from 'date-fns';
import Link from 'next/link';

export function ExpiringLeasesWidget() {
  const [occupancies, setOccupancies] = useState<Occupancy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiringLeases();
  }, []);

  const fetchExpiringLeases = async () => {
    try {
      setLoading(true);
      const response = await occupanciesService.getExpiring(30);

      if (response.data?.data) {
        // Take only first 5 for the widget
        setOccupancies(response.data.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch expiring leases:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (leaseEndDate: string): number => {
    return differenceInDays(parseISO(leaseEndDate), new Date());
  };

  const getExpiryBadge = (days: number) => {
    if (days < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (days <= 7) {
      return <Badge variant="destructive">{days}d left</Badge>;
    } else if (days <= 14) {
      return <Badge variant="warning">{days}d left</Badge>;
    } else {
      return <Badge variant="default">{days}d left</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (occupancies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Expiring Leases
          </CardTitle>
          <CardDescription>Leases expiring in the next 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No leases expiring in the next 30 days
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          Expiring Leases
        </CardTitle>
        <CardDescription>Leases expiring in the next 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {occupancies.map((occupancy) => {
            const daysLeft = getDaysUntilExpiry(occupancy.leaseEndDate);

            return (
              <div
                key={occupancy.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">
                      {occupancy.tenant?.firstName} {occupancy.tenant?.lastName}
                    </p>
                    {getExpiryBadge(daysLeft)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Unit {occupancy.apartment?.unitNumber}</span>
                    {occupancy.apartment?.compound && (
                      <>
                        <span>•</span>
                        <span>{occupancy.apartment.compound.name}</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Expires: {format(parseISO(occupancy.leaseEndDate), 'MMM d, yyyy')}
                  </div>
                </div>
                <Link href={`/occupancies/${occupancy.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        {/* View All Link */}
        <div className="mt-4 pt-4 border-t">
          <Link href="/occupancies?status=active&expiring=30">
            <Button variant="outline" className="w-full" size="sm">
              View All Expiring Leases
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
