'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  Home,
  Calendar,
  DollarSign,
  FileText,
  Edit,
  XCircle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { occupanciesService } from '@/services/occupancies.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, differenceInDays } from 'date-fns';
import { formatCurrency } from '@/lib/currency';
import { EndLeaseDialog } from '@/components/occupancies/end-lease-dialog';
import { CancelLeaseDialog } from '@/components/occupancies/cancel-lease-dialog';

/**
 * Occupancy Detail Page
 *
 * Displays detailed information about a single occupancy including:
 * - Lease details and status
 * - Tenant information
 * - Apartment information
 * - Financial summary
 * - Actions (End lease, Cancel lease)
 */

export default function OccupancyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showEndLeaseDialog, setShowEndLeaseDialog] = useState(false);
  const [showCancelLeaseDialog, setShowCancelLeaseDialog] = useState(false);

  const occupancyId = params.id as string;

  // Fetch occupancy details
  const { data: occupancyData, isLoading } = useQuery({
    queryKey: ['occupancies', occupancyId],
    queryFn: () => occupanciesService.getById(occupancyId),
    enabled: !!occupancyId,
  });

  const occupancy = occupancyData?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!occupancy) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">Occupancy not found</p>
        <Button onClick={() => router.push('/occupancies')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Occupancies
        </Button>
      </div>
    );
  }

  const { tenant, apartment, status, leaseStartDate, leaseEndDate, monthlyRent, securityDeposit, depositPaid, moveInDate, moveOutDate, notes } = occupancy;

  const daysRemaining = differenceInDays(new Date(leaseEndDate), new Date());
  const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;
  const isExpired = daysRemaining < 0;
  const leaseDuration = differenceInDays(new Date(leaseEndDate), new Date(leaseStartDate));

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/occupancies')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
              Lease Details
            </h1>
            {tenant && apartment && (
              <p className="text-sm sm:text-base text-muted-foreground truncate">
                {tenant.firstName} {tenant.lastName} - Unit {apartment.unitNumber}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {getStatusBadge()}
          {status === 'active' && (
            <>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="secondary" onClick={() => setShowEndLeaseDialog(true)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                End Lease
              </Button>
            </>
          )}
          {status === 'pending' && (
            <>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setShowCancelLeaseDialog(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Lease
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyRent)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Deposit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityDeposit ? formatCurrency(securityDeposit) : 'N/A'}
            </div>
            {securityDeposit && depositPaid !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                Paid: {formatCurrency(depositPaid)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lease Duration</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(leaseDuration / 30)} months
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {leaseDuration} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {status === 'active' ? 'Days Remaining' : 'Status'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {status === 'active' ? (
              <>
                <div className={`text-2xl font-bold ${isExpiringSoon || isExpired ? 'text-orange-600' : ''}`}>
                  {isExpired
                    ? `${Math.abs(daysRemaining)}`
                    : daysRemaining}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isExpired ? 'Expired days ago' : isExpiringSoon ? 'Expiring soon' : 'days'}
                </p>
              </>
            ) : (
              <div className="text-2xl font-bold capitalize">{status}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Lease Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lease Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Lease Start</p>
                  <p className="text-base">
                    {format(new Date(leaseStartDate), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Lease End</p>
                  <p className="text-base">
                    {format(new Date(leaseEndDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {moveInDate && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Move-in Date</p>
                    <p className="text-base">
                      {format(new Date(moveInDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </>
              )}

              {moveOutDate && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Move-out Date</p>
                    <p className="text-base">
                      {format(new Date(moveOutDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </>
              )}

              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Rent</p>
                  <p className="text-base font-semibold">{formatCurrency(monthlyRent)}</p>
                </div>
                {securityDeposit && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Security Deposit</p>
                    <p className="text-base">{formatCurrency(securityDeposit)}</p>
                  </div>
                )}
              </div>

              {depositPaid !== undefined && securityDeposit && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Deposit Paid</p>
                    <p className="text-base">{formatCurrency(depositPaid)}</p>
                    {depositPaid < securityDeposit && (
                      <p className="text-xs text-orange-600 mt-1">
                        Balance: {formatCurrency(securityDeposit - depositPaid)}
                      </p>
                    )}
                  </div>
                </>
              )}

              {notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-base text-muted-foreground">{notes}</p>
                  </div>
                </>
              )}

              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-base">
                  {format(new Date(occupancy.createdAt), 'PPP')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Tenant Information */}
          {tenant && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Tenant Information
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/tenants/${tenant.id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-base font-semibold">
                    {tenant.firstName} {tenant.lastName}
                  </p>
                </div>

                {tenant.email && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-base">{tenant.email}</p>
                    </div>
                  </>
                )}

                {tenant.phone && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="text-base">{tenant.phone}</p>
                    </div>
                  </>
                )}

                {tenant.idNumber && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">ID Number</p>
                      <p className="text-base">{tenant.idNumber}</p>
                    </div>
                  </>
                )}

                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={tenant.status === 'active' ? 'success' : 'secondary'} className="mt-1">
                    {tenant.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Apartment Information */}
          {apartment && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Apartment Information
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/apartments/${apartment.id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unit Number</p>
                    <p className="text-base font-semibold">{apartment.unitNumber}</p>
                  </div>
                  {apartment.floor !== null && apartment.floor !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Floor</p>
                      <p className="text-base">{apartment.floor}</p>
                    </div>
                  )}
                </div>

                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bedrooms</p>
                    <p className="text-base">{apartment.bedrooms}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bathrooms</p>
                    <p className="text-base">{apartment.bathrooms}</p>
                  </div>
                </div>

                {apartment.areaSqm && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Area</p>
                      <p className="text-base">{apartment.areaSqm} m²</p>
                    </div>
                  </>
                )}

                {apartment.compound && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Property</p>
                      <p className="text-base">{apartment.compound.name}</p>
                    </div>
                  </>
                )}

                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={apartment.status === 'available' ? 'success' : 'default'} className="mt-1">
                    {apartment.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* End Lease Dialog */}
      {occupancy && (
        <EndLeaseDialog
          occupancy={occupancy}
          open={showEndLeaseDialog}
          onOpenChange={setShowEndLeaseDialog}
          onSuccess={() => router.push('/occupancies')}
        />
      )}

      {/* Cancel Lease Dialog */}
      {occupancy && (
        <CancelLeaseDialog
          occupancy={occupancy}
          open={showCancelLeaseDialog}
          onOpenChange={setShowCancelLeaseDialog}
          onSuccess={() => router.push('/occupancies')}
        />
      )}
    </div>
  );
}
