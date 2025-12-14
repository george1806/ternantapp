'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Calendar, User, Home, DollarSign, Filter, Eye, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { occupanciesService, type OccupancyFilters } from '@/services/occupancies.service';
import { compoundsService } from '@/services/compounds.service';
import type { Occupancy, Compound } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { format, differenceInDays, parseISO } from 'date-fns';
import Link from 'next/link';
import { OccupancyFormDialog } from '@/components/occupancies/occupancy-form-dialog';
import { OccupancyStats } from '@/components/occupancies/occupancy-stats';
import { DepositPaymentDialog } from '@/components/occupancies/deposit-payment-dialog';

/**
 * Occupancies Management Page
 *
 * Core business logic: Manages tenant-apartment assignments (leases)
 * This is the critical piece that connects tenants to apartments
 *
 * Features:
 * - List all active leases across company properties
 * - Filter by property, apartment, tenant, status
 * - Show lease details (start date, end date, rent, deposit)
 * - Highlight expiring leases
 * - Create new occupancy (assign tenant to apartment)
 * - End occupancy (tenant move-out)
 * - Company-scoped data (JWT automatically filters by companyId)
 */

export default function OccupanciesPage() {
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';
  const [occupancies, setOccupancies] = useState<Occupancy[]>([]);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [compoundFilter, setCompoundFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'active' | 'ended' | 'cancelled' | 'all'>('all');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedOccupancy, setSelectedOccupancy] = useState<Occupancy | null>(null);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositOccupancy, setDepositOccupancy] = useState<Occupancy | null>(null);
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchCompounds();
     
  }, []);

  useEffect(() => {
    fetchOccupancies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery, compoundFilter, statusFilter]);

  const fetchCompounds = async () => {
    try {
      const response = await compoundsService.getAll({ limit: 100 });
      if (response.data?.data) {
        setCompounds(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch compounds:', error);
    }
  };

  const fetchOccupancies = async () => {
    try {
      setLoading(true);

      const filters: OccupancyFilters = {
        page: currentPage,
        limit,
        search: searchQuery || undefined,
        compoundId: compoundFilter === 'all' ? undefined : compoundFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortBy: 'leaseStartDate',
        sortOrder: 'DESC',
      };

      const response = await occupanciesService.getAll(filters);

      if (response.data?.data) {
        setOccupancies(response.data.data);
        setTotal(response.data.meta?.total || 0);
        setTotalPages(response.data.meta?.totalPages || 1);
      } else {
        console.warn('Occupancies endpoint not available');
        setOccupancies([]);
      }
    } catch (error) {
      console.error('Failed to fetch occupancies:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
      setOccupancies([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'pending':
        return <Badge variant="default">Pending</Badge>;
      case 'ended':
        return <Badge variant="secondary">Ended</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLeaseStatusBadge = (occupancy: Occupancy) => {
    if (occupancy.status !== 'active') return null;

    const today = new Date();
    const endDate = parseISO(occupancy.leaseEndDate);
    const daysUntilExpiry = differenceInDays(endDate, today);

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Expired</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge variant="warning" className="gap-1"><AlertCircle className="h-3 w-3" /> Expires in {daysUntilExpiry}d</Badge>;
    } else if (daysUntilExpiry <= 60) {
      return <Badge variant="default" className="gap-1"><Calendar className="h-3 w-3" /> Expires in {daysUntilExpiry}d</Badge>;
    }
    return null;
  };

  const handleEndOccupancy = async (occupancy: Occupancy) => {
    const moveOutDate = prompt('Enter move-out date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!moveOutDate) return;

    try {
      await occupanciesService.end(occupancy.id, moveOutDate);
      toast({ title: 'Success', description: 'Occupancy ended successfully' });
      fetchOccupancies();
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOccupancy = async (occupancy: Occupancy) => {
    if (!confirm(`Delete occupancy for ${occupancy.tenant?.firstName} ${occupancy.tenant?.lastName}?`)) return;

    try {
      await occupanciesService.delete(occupancy.id);
      toast({ title: 'Success', description: 'Occupancy deleted successfully' });
      fetchOccupancies();
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleOpenCreateDialog = () => {
    setSelectedOccupancy(null);
    setFormDialogOpen(true);
  };

  // const handleOpenEditDialog = (occupancy: Occupancy) => {
  //   setSelectedOccupancy(occupancy);
  //   setFormDialogOpen(true);
  // };

  const handleFormSuccess = () => {
    fetchOccupancies();
  };

  const handleRecordDeposit = (occupancy: Occupancy) => {
    setDepositOccupancy(occupancy);
    setDepositDialogOpen(true);
  };

  const handleDepositSuccess = () => {
    fetchOccupancies();
  };

  if (loading && occupancies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Occupancies / Leases</h1>
          <p className="text-muted-foreground mt-1">Manage tenant-apartment assignments</p>
        </div>
        <Button className="gap-2" onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4" />
          Assign Tenant
        </Button>
      </div>

      {/* Occupancy Statistics */}
      <OccupancyStats />

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by tenant name or unit number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            <Select
              value={compoundFilter}
              onValueChange={(value) => {
                setCompoundFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {compounds.map((compound) => (
                  <SelectItem key={compound.id} value={compound.id}>
                    {compound.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('active');
                  setCurrentPage(1);
                }}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('pending');
                  setCurrentPage(1);
                }}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === 'ended' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('ended');
                  setCurrentPage(1);
                }}
              >
                Ended
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!loading && occupancies.length === 0 && !searchQuery && statusFilter === 'all' && compoundFilter === 'all' && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Home className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No occupancies yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
              Start assigning tenants to apartments to create occupancies
            </p>
            <Button className="gap-2" onClick={handleOpenCreateDialog}>
              <Plus className="h-4 w-4" />
              Assign Your First Tenant
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Search Results */}
      {!loading && occupancies.length === 0 && (searchQuery || statusFilter !== 'all' || compoundFilter !== 'all') && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No occupancies found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setCompoundFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Occupancies Table */}
      {occupancies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Occupancies</CardTitle>
            <CardDescription>{total} total lease agreements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Tenant</TableHead>
                    <TableHead className="font-semibold">Unit</TableHead>
                    <TableHead className="font-semibold">Lease Period</TableHead>
                    <TableHead className="font-semibold text-right">Monthly Rent</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {occupancies.map((occupancy) => (
                    <TableRow key={occupancy.id} className="hover:bg-muted/30">
                      <TableCell>
                        {occupancy.tenant ? (
                          <Link
                            href={`/tenants/${occupancy.tenant.id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {occupancy.tenant.firstName} {occupancy.tenant.lastName}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                        {occupancy.tenant?.phone && (
                          <p className="text-xs text-muted-foreground mt-1">{occupancy.tenant.phone}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {occupancy.apartment ? (
                          <div>
                            <Link
                              href={`/apartments/${occupancy.apartment.id}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              Unit {occupancy.apartment.unitNumber}
                            </Link>
                            {occupancy.apartment.compound && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {occupancy.apartment.compound.name}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{format(parseISO(occupancy.leaseStartDate), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">to</span>
                            <span>{format(parseISO(occupancy.leaseEndDate), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{formatCurrency(occupancy.monthlyRent, currency)}</div>
                        {occupancy.securityDeposit && (
                          <div className="text-xs text-muted-foreground">
                            Deposit: {formatCurrency(occupancy.securityDeposit, currency)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {getStatusBadge(occupancy.status)}
                          {getLeaseStatusBadge(occupancy)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/occupancies/${occupancy.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          {occupancy.status === 'pending' && occupancy.securityDeposit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRecordDeposit(occupancy)}
                              className="text-primary"
                            >
                              <DollarSign className="h-3.5 w-3.5 mr-1" />
                              Record Deposit
                            </Button>
                          )}
                          {occupancy.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEndOccupancy(occupancy)}
                            >
                              End Lease
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteOccupancy(occupancy)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, total)}{' '}
                  of {total} occupancies
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Occupancy Form Dialog */}
      <OccupancyFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        occupancy={selectedOccupancy}
        onSuccess={handleFormSuccess}
      />

      {/* Deposit Payment Dialog */}
      {depositOccupancy && (
        <DepositPaymentDialog
          open={depositDialogOpen}
          onOpenChange={setDepositDialogOpen}
          occupancy={depositOccupancy}
          onSuccess={handleDepositSuccess}
        />
      )}
    </div>
  );
}
