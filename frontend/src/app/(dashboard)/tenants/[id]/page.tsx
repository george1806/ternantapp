'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Building2,
  Edit,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Home
} from 'lucide-react';
import { tenantsService } from '@/services/tenants.service';
import { occupanciesService } from '@/services/occupancies.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, differenceInYears } from 'date-fns';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';

/**
 * Tenant Detail Page
 *
 * Displays detailed information about a single tenant including:
 * - Basic tenant details
 * - Current active lease information
 * - Complete lease history
 * - Contact and emergency information
 */

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const tenantId = params.id as string;

  // Fetch tenant details
  const { data: tenantData, isLoading: loadingTenant } = useQuery({
    queryKey: ['tenants', tenantId],
    queryFn: () => tenantsService.getById(tenantId),
    enabled: !!tenantId,
  });

  // Fetch tenant occupancies/lease history
  const { data: occupanciesData, isLoading: loadingOccupancies } = useQuery({
    queryKey: ['tenant-occupancies', tenantId],
    queryFn: () => occupanciesService.getByTenant(tenantId),
    enabled: !!tenantId,
  });

  const tenant = tenantData?.data?.data;
  const occupancies = occupanciesData?.data?.data || [];

  // Calculate stats from occupancies
  const activeOccupancy = occupancies.find((occ) => occ.status === 'active');
  const totalLeases = occupancies.length;
  const completedLeases = occupancies.filter((occ) => occ.status === 'ended').length;
  const cancelledLeases = occupancies.filter((occ) => occ.status === 'cancelled').length;

  if (loadingTenant) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">Tenant not found</p>
        <Button onClick={() => router.push('/tenants')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tenants
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'blacklisted':
        return <Badge variant="destructive">Blacklisted</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getOccupancyStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'ended':
        return <Badge variant="secondary">Ended</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    try {
      return differenceInYears(new Date(), new Date(dateOfBirth));
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/tenants')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
              {tenant.firstName} {tenant.lastName}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground flex items-center gap-2 truncate">
              <Mail className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">{tenant.email}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {getStatusBadge(tenant.status)}
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
            <CardTitle className="text-sm font-medium">Total Leases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeases}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Lease</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOccupancy ? 'Yes' : 'No'}</div>
            {activeOccupancy && (
              <p className="text-xs text-muted-foreground mt-1">
                Unit {activeOccupancy.apartment?.unitNumber}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedLeases}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cancelledLeases}</div>
          </CardContent>
        </Card>
      </div>

      {/* Current Active Lease Alert */}
      {activeOccupancy && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Home className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Currently Leasing Unit {activeOccupancy.apartment?.unitNumber}
                  </p>
                  {getOccupancyStatusBadge(activeOccupancy.status)}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p>Monthly Rent: {formatCurrency(activeOccupancy.monthlyRent)}</p>
                  <p>Lease Period: {format(new Date(activeOccupancy.leaseStartDate), 'PP')} - {format(new Date(activeOccupancy.leaseEndDate), 'PP')}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white dark:bg-gray-900"
                    asChild
                  >
                    <Link href={`/occupancies/${activeOccupancy.id}`}>
                      View Lease Details
                    </Link>
                  </Button>
                  {activeOccupancy.apartment && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white dark:bg-gray-900"
                      asChild
                    >
                      <Link href={`/apartments/${activeOccupancy.apartmentId}`}>
                        View Apartment
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">Lease History</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">First Name</p>
                    <p className="text-base">{tenant.firstName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                    <p className="text-base">{tenant.lastName}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {tenant.email}
                  </p>
                </div>

                {tenant.phone && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="text-base flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {tenant.phone}
                      </p>
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

                {tenant.dateOfBirth && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                      <p className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(tenant.dateOfBirth), 'PPP')}
                        {calculateAge(tenant.dateOfBirth) && (
                          <span className="text-sm text-muted-foreground">
                            ({calculateAge(tenant.dateOfBirth)} years old)
                          </span>
                        )}
                      </p>
                    </div>
                  </>
                )}

                {tenant.employerName && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Employer</p>
                      <p className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {tenant.employerName}
                      </p>
                    </div>
                  </>
                )}

                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(tenant.status)}</div>
                </div>

                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Registered</p>
                  <p className="text-base">
                    {format(new Date(tenant.createdAt), 'PPP')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenant.emergencyContactName ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Contact Name</p>
                      <p className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        {tenant.emergencyContactName}
                      </p>
                    </div>

                    {tenant.emergencyContactPhone && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Contact Phone</p>
                          <p className="text-base flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {tenant.emergencyContactPhone}
                          </p>
                        </div>
                      </>
                    )}

                    {tenant.emergencyContactRelationship && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Relationship</p>
                          <p className="text-base">{tenant.emergencyContactRelationship}</p>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No emergency contact information provided
                  </p>
                )}

                {tenant.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <p className="text-base text-muted-foreground whitespace-pre-wrap">
                        {tenant.notes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lease History Tab */}
        <TabsContent value="history" className="space-y-4">
          {loadingOccupancies ? (
            <Skeleton className="h-96 w-full" />
          ) : occupancies.length > 0 ? (
            <div className="space-y-4">
              {occupancies.map((occupancy) => (
                <Card key={occupancy.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <Home className="h-5 w-5" />
                              Unit {occupancy.apartment?.unitNumber || 'N/A'}
                            </h3>
                            {occupancy.apartment?.compound && (
                              <p className="text-sm text-muted-foreground">
                                {occupancy.apartment.compound.name}
                              </p>
                            )}
                          </div>
                          {getOccupancyStatusBadge(occupancy.status)}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Lease Period</p>
                            <p className="font-medium">
                              {format(new Date(occupancy.leaseStartDate), 'PP')} - {format(new Date(occupancy.leaseEndDate), 'PP')}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Monthly Rent</p>
                            <p className="font-medium">{formatCurrency(occupancy.monthlyRent)}</p>
                          </div>
                          {occupancy.securityDeposit && (
                            <div>
                              <p className="text-muted-foreground">Security Deposit</p>
                              <p className="font-medium">{formatCurrency(occupancy.securityDeposit)}</p>
                            </div>
                          )}
                          {occupancy.moveInDate && (
                            <div>
                              <p className="text-muted-foreground">Move-In Date</p>
                              <p className="font-medium">{format(new Date(occupancy.moveInDate), 'PP')}</p>
                            </div>
                          )}
                          {occupancy.moveOutDate && (
                            <div>
                              <p className="text-muted-foreground">Move-Out Date</p>
                              <p className="font-medium">{format(new Date(occupancy.moveOutDate), 'PP')}</p>
                            </div>
                          )}
                        </div>

                        {occupancy.notes && (
                          <div className="pt-2">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {occupancy.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:items-end">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/occupancies/${occupancy.id}`}>
                            View Details
                          </Link>
                        </Button>
                        {occupancy.apartment && (
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/apartments/${occupancy.apartmentId}`}>
                              View Apartment
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                  <h3 className="mt-4 text-lg font-semibold">No Lease History</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    This tenant has no lease history yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
