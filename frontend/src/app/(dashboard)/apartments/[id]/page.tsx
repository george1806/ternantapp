'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, DollarSign, Home, Edit, UserPlus, TrendingUp } from 'lucide-react';
import { apartmentsService } from '@/services/apartments.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';
import { ApartmentOccupancyCard } from '@/components/apartments/apartment-occupancy-card';
import { ApartmentHistoryTimeline } from '@/components/apartments/apartment-history-timeline';
import { QuickAssignDialog } from '@/components/apartments/quick-assign-dialog';
import { EndLeaseDialog } from '@/components/occupancies/end-lease-dialog';
import { CancelLeaseDialog } from '@/components/occupancies/cancel-lease-dialog';

/**
 * Apartment Detail Page
 *
 * Displays detailed information about a single apartment including:
 * - Basic apartment details
 * - Current occupancy information
 * - Financial summary
 * - Occupancy history
 */

export default function ApartmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showEndLeaseDialog, setShowEndLeaseDialog] = useState(false);
  const [showCancelLeaseDialog, setShowCancelLeaseDialog] = useState(false);

  const apartmentId = params.id as string;

  // Fetch apartment details
  const { data: apartmentData, isLoading: loadingApartment } = useQuery({
    queryKey: ['apartments', apartmentId],
    queryFn: () => apartmentsService.getById(apartmentId),
    enabled: !!apartmentId,
  });

  // Fetch current occupancy
  const { data: occupancyData, isLoading: loadingOccupancy } = useQuery({
    queryKey: ['apartment-occupancy', apartmentId],
    queryFn: () => apartmentsService.getCurrentOccupancy(apartmentId),
    enabled: !!apartmentId,
  });

  // Fetch occupancy history
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['apartment-history', apartmentId],
    queryFn: () => apartmentsService.getOccupancyHistory(apartmentId),
    enabled: !!apartmentId,
  });

  // Fetch financial summary
  const { data: financialData, isLoading: loadingFinancial } = useQuery({
    queryKey: ['apartment-financial', apartmentId],
    queryFn: () => apartmentsService.getFinancialSummary(apartmentId),
    enabled: !!apartmentId,
  });

  const apartment = apartmentData?.data;
  const currentOccupancy = occupancyData?.data?.data;
  const occupancyHistory = historyData?.data?.data || [];
  const financialSummary = financialData?.data?.data;

  if (loadingApartment) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">Apartment not found</p>
        <Button onClick={() => router.push('/apartments')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Apartments
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="success">Available</Badge>;
      case 'occupied':
        return <Badge variant="default">Occupied</Badge>;
      case 'maintenance':
        return <Badge variant="warning">Maintenance</Badge>;
      case 'reserved':
        return <Badge variant="secondary">Reserved</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const handleAssignSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['apartment-occupancy', apartmentId] });
    queryClient.invalidateQueries({ queryKey: ['apartment-history', apartmentId] });
    queryClient.invalidateQueries({ queryKey: ['apartments', apartmentId] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/apartments')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
              Unit {apartment.unitNumber}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">{apartment.compound?.name || 'No Property Assigned'}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {getStatusBadge(apartment.status)}
          {apartment.status === 'available' && (
            <Button onClick={() => setShowAssignDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Tenant
            </Button>
          )}
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
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
            <div className="text-2xl font-bold">{formatCurrency(apartment.monthlyRent)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bedrooms</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apartment.bedrooms}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bathrooms</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apartment.bathrooms}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Area</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apartment.areaSqm ? `${apartment.areaSqm} m²` : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      {loadingFinancial ? (
        <Skeleton className="h-48 w-full" />
      ) : financialSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(financialSummary.totalRevenue)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Current Monthly Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(financialSummary.currentMonthlyRevenue)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Days Rented</p>
                <p className="text-2xl font-bold">{financialSummary.totalDaysRented}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                <p className="text-2xl font-bold">{financialSummary.occupancyRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Apartment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Apartment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Floor</p>
                  <p className="text-base">{apartment.floor ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unit Number</p>
                  <p className="text-base">{apartment.unitNumber}</p>
                </div>
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

              {apartment.amenities && apartment.amenities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {apartment.amenities.map((amenity, index) => (
                        <Badge key={index} variant="secondary">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {apartment.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-base text-muted-foreground">{apartment.notes}</p>
                  </div>
                </>
              )}

              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-base">
                  {format(new Date(apartment.createdAt), 'PPP')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {apartment.compound ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Property Name</p>
                    <p className="text-base">{apartment.compound.name}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="text-base">
                      {apartment.compound.address}<br />
                      {apartment.compound.city}, {apartment.compound.region} {apartment.compound.postalCode}<br />
                      {apartment.compound.country}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No property assigned</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Current Occupancy */}
          {loadingOccupancy ? (
            <Skeleton className="h-64 w-full" />
          ) : currentOccupancy ? (
            <ApartmentOccupancyCard
              occupancy={currentOccupancy}
              onEndLease={() => setShowEndLeaseDialog(true)}
              onCancelLease={() => setShowCancelLeaseDialog(true)}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Occupancy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This apartment is currently vacant.
                </p>
                {apartment.status === 'available' && (
                  <Button onClick={() => setShowAssignDialog(true)} className="w-full">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign Tenant
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Occupancy History */}
          {loadingHistory ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ApartmentHistoryTimeline occupancies={occupancyHistory} />
          )}
        </div>
      </div>

      {/* Quick Assign Dialog */}
      <QuickAssignDialog
        apartment={apartment}
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        onSuccess={handleAssignSuccess}
      />

      {/* End Lease Dialog */}
      {currentOccupancy && (
        <EndLeaseDialog
          occupancy={currentOccupancy}
          open={showEndLeaseDialog}
          onOpenChange={setShowEndLeaseDialog}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['apartment-occupancy', apartmentId] });
            queryClient.invalidateQueries({ queryKey: ['apartment-history', apartmentId] });
            queryClient.invalidateQueries({ queryKey: ['apartments', apartmentId] });
          }}
        />
      )}

      {/* Cancel Lease Dialog */}
      {currentOccupancy && (
        <CancelLeaseDialog
          occupancy={currentOccupancy}
          open={showCancelLeaseDialog}
          onOpenChange={setShowCancelLeaseDialog}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['apartment-occupancy', apartmentId] });
            queryClient.invalidateQueries({ queryKey: ['apartment-history', apartmentId] });
            queryClient.invalidateQueries({ queryKey: ['apartments', apartmentId] });
          }}
        />
      )}
    </div>
  );
}
