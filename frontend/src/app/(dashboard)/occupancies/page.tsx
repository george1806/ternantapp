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
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 10;

  useEffect(() => {
    fetchCompounds();
     
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setOccupancies([]);
    fetchOccupancies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, compoundFilter, statusFilter]);

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

  const fetchOccupancies = async (page: number = currentPage, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const filters: OccupancyFilters = {
        page,
        limit,
        search: searchQuery || undefined,
        compoundId: compoundFilter === 'all' ? undefined : compoundFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortBy: 'leaseStartDate',
        sortOrder: 'DESC',
      };

      const response = await occupanciesService.getAll(filters);

      if (response.data?.data) {
        if (append) {
          setOccupancies(prev => [...prev, ...response.data.data]);
        } else {
          setOccupancies(response.data.data);
        }
        setTotal(response.data.meta?.total || 0);
        setTotalPages(response.data.meta?.totalPages || 1);
      } else {
        console.warn('Occupancies endpoint not available');
        if (!append) {
          setOccupancies([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch occupancies:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
      if (!append) {
        setOccupancies([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchOccupancies(nextPage, true);
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

      {/* Occupancies List */}
      {occupancies.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">All Occupancies</h2>
              <p className="text-muted-foreground mt-1">
                {total} {total === 1 ? 'lease agreement' : 'lease agreements'} total
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {occupancies.map((occupancy) => (
              <Card
                key={occupancy.id}
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => window.location.href = `/occupancies/${occupancy.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 shrink-0">
                      <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate">
                            {occupancy.tenant
                              ? `${occupancy.tenant.firstName} ${occupancy.tenant.lastName}`
                              : 'No Tenant'}
                          </h3>
                          {occupancy.apartment && (
                            <p className="text-sm text-muted-foreground truncate">
                              Unit {occupancy.apartment.unitNumber}
                              {occupancy.apartment.compound && ` • ${occupancy.apartment.compound.name}`}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col gap-1 items-end">
                          {getStatusBadge(occupancy.status)}
                          {getLeaseStatusBadge(occupancy)}
                        </div>
                      </div>

                      {/* Lease Details */}
                      <div className="flex flex-wrap gap-2 mb-3 text-sm">
                        <Badge variant="outline" className="font-normal gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(occupancy.leaseStartDate), 'MMM d, yy')} - {format(parseISO(occupancy.leaseEndDate), 'MMM d, yy')}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          <span className="font-semibold text-blue-600 dark:text-blue-500">{formatCurrency(occupancy.monthlyRent, currency)}</span>/mo
                        </Badge>
                        {occupancy.securityDeposit && (
                          <Badge variant="outline" className="font-normal">
                            Deposit: <span className="font-semibold text-foreground">{formatCurrency(occupancy.securityDeposit, currency)}</span>
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/occupancies/${occupancy.id}`;
                          }}
                        >
                          View Details
                        </Button>
                        {occupancy.status === 'pending' && occupancy.securityDeposit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecordDeposit(occupancy);
                            }}
                            className="gap-1"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Record Deposit</span>
                          </Button>
                        )}
                        {occupancy.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEndOccupancy(occupancy);
                            }}
                          >
                            End Lease
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOccupancy(occupancy);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          {currentPage < totalPages && (
            <div className="flex flex-col items-center gap-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {occupancies.length} of {total} occupancies
              </p>
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full sm:w-auto min-w-[200px]"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
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
