'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, DollarSign, Mail, Phone, ExternalLink } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { Occupancy } from '@/types';
import { formatCurrency } from '@/lib/currency';

interface ApartmentOccupancyCardProps {
  occupancy: Occupancy;
  onEndLease?: () => void;
  onCancelLease?: () => void;
}

export function ApartmentOccupancyCard({
  occupancy,
  onEndLease,
  onCancelLease,
}: ApartmentOccupancyCardProps) {
  const router = useRouter();

  if (!occupancy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Occupancy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This apartment is currently vacant.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { tenant, status, leaseStartDate, leaseEndDate, monthlyRent, securityDeposit, moveInDate } = occupancy;

  const daysRemaining = differenceInDays(new Date(leaseEndDate), new Date());
  const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;
  const isExpired = daysRemaining < 0;

  const getStatusBadge = () => {
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Current Occupancy</CardTitle>
        {getStatusBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tenant Information */}
        {tenant && (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">
                    {tenant.firstName} {tenant.lastName}
                  </p>
                </div>
                {tenant.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{tenant.email}</span>
                  </div>
                )}
                {tenant.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{tenant.phone}</span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/tenants/${tenant.id}`)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Lease Details */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Lease Start</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {format(new Date(leaseStartDate), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Lease End</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {format(new Date(leaseEndDate), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {moveInDate && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Move-in Date</p>
              <p className="text-sm">
                {format(new Date(moveInDate), 'MMM dd, yyyy')}
              </p>
            </div>
          )}

          {status === 'active' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Days Remaining</p>
              <p className={`text-sm font-medium ${isExpiringSoon || isExpired ? 'text-orange-600' : ''}`}>
                {isExpired
                  ? `Expired ${Math.abs(daysRemaining)} days ago`
                  : `${daysRemaining} days`}
                {isExpiringSoon && !isExpired && (
                  <span className="text-xs text-orange-600 ml-2">(Expiring soon)</span>
                )}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Financial Details */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Monthly Rent</p>
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm font-medium">{formatCurrency(monthlyRent)}</p>
              </div>
            </div>
            {securityDeposit && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Security Deposit</p>
                <p className="text-sm">{formatCurrency(securityDeposit)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {status === 'active' && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => router.push(`/occupancies/${occupancy.id}`)}
              >
                View Full Details
              </Button>
              {onEndLease && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onEndLease}
                >
                  End Lease
                </Button>
              )}
            </div>
          </>
        )}

        {status === 'pending' && onCancelLease && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => router.push(`/occupancies/${occupancy.id}`)}
              >
                View Full Details
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onCancelLease}
              >
                Cancel Lease
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
