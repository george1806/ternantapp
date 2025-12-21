'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, DollarSign, ExternalLink } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { Occupancy } from '@/types';
import { formatCurrency } from '@/lib/currency';

interface ApartmentHistoryTimelineProps {
  occupancies: Occupancy[];
}

export function ApartmentHistoryTimeline({ occupancies }: ApartmentHistoryTimelineProps) {
  const router = useRouter();

  if (!occupancies || occupancies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Occupancy History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No occupancy history available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'ended':
        return <Badge variant="secondary">Ended</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const calculateDuration = (startDate: string, endDate: string, moveOutDate?: string) => {
    const start = new Date(startDate);
    const end = moveOutDate ? new Date(moveOutDate) : new Date(endDate);
    const days = differenceInDays(end, start);
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;

    if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays > 1 ? 's' : ''}` : ''}`;
    }
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Occupancy History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {occupancies.map((occupancy, index) => {
            const { tenant, status, leaseStartDate, leaseEndDate, monthlyRent, moveOutDate } = occupancy;
            const duration = calculateDuration(leaseStartDate, leaseEndDate, moveOutDate);
            const isLast = index === occupancies.length - 1;

            return (
              <div key={occupancy.id} className="relative">
                {/* Timeline dot and line */}
                <div className="absolute left-0 top-2 flex flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full border-2 ${
                      status === 'active'
                        ? 'border-green-500 bg-green-500'
                        : status === 'pending'
                        ? 'border-yellow-500 bg-yellow-500'
                        : status === 'cancelled'
                        ? 'border-red-500 bg-red-500'
                        : 'border-gray-300 bg-gray-300'
                    }`}
                  />
                  {!isLast && (
                    <div className="h-full w-0.5 bg-gray-200 mt-1" style={{ minHeight: '60px' }} />
                  )}
                </div>

                {/* Content */}
                <div className="ml-8 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(status)}
                        <span className="text-xs text-muted-foreground">
                          {duration}
                        </span>
                      </div>
                      {tenant && (
                        <div className="flex items-center gap-2 mt-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {tenant.firstName} {tenant.lastName}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/occupancies/${occupancy.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(leaseStartDate), 'MMM dd, yyyy')} -{' '}
                        {format(new Date(leaseEndDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    {moveOutDate && status === 'ended' && (
                      <div className="text-xs text-muted-foreground ml-5">
                        Moved out: {format(new Date(moveOutDate), 'MMM dd, yyyy')}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      <span>{formatCurrency(monthlyRent)}/month</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
