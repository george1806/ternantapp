'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Users, Mail, Phone, Pencil, Trash2, Eye } from 'lucide-react';
import { tenantsService, type TenantFilters } from '@/services/tenants.service';
import type { Tenant } from '@/types';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';
import { getInitials } from '@/lib/utils';
import { TenantFormDialog } from '@/components/tenants/tenant-form-dialog';
import { OccupancyFormDialog } from '@/components/occupancies/occupancy-form-dialog';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import Link from 'next/link';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const { debouncedValue: searchQuery, value: searchInput, setValue: setSearchInput, isDebouncing } = useDebouncedSearch();
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>();
  const [occupancyDialogOpen, setOccupancyDialogOpen] = useState(false);
  const [preselectedTenantId, setPreselectedTenantId] = useState<string | undefined>();
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 10;

  useEffect(() => {
    setCurrentPage(1);
    setTenants([]);
    fetchTenants(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter]);

  const fetchTenants = async (page: number = currentPage, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const filters: TenantFilters = {
        page,
        limit,
        search: searchQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const response = await tenantsService.getAll(filters);

      if (response.data?.data) {
        if (append) {
          setTenants(prev => [...prev, ...response.data.data]);
        } else {
          setTenants(response.data.data);
        }
        setTotal(response.data.meta?.total || 0);
        setTotalPages(response.data.meta?.totalPages || 1);
      } else {
        console.warn('Tenants endpoint not available');
        if (!append) {
          setTenants([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
      if (!append) {
        setTenants([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchTenants(nextPage, true);
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="success">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const handleAddTenant = () => {
    setSelectedTenant(undefined);
    setDialogOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setDialogOpen(true);
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(`Delete ${tenant.firstName} ${tenant.lastName}?`)) return;

    try {
      await tenantsService.delete(tenant.id);
      toast({ title: 'Success', description: 'Tenant deleted successfully' });
      fetchTenants();
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleDialogSuccess = () => {
    fetchTenants();
  };

  const handleCreateLease = (tenantId: string) => {
    setPreselectedTenantId(tenantId);
    setOccupancyDialogOpen(true);
  };

  const handleOccupancySuccess = () => {
    fetchTenants();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground mt-1">Manage tenant information</p>
        </div>
        <Button className="gap-2" onClick={handleAddTenant}>
          <Plus className="h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
              {isDebouncing && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
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
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('inactive');
                  setCurrentPage(1);
                }}
              >
                Inactive
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!loading && tenants.length === 0 && !searchQuery && statusFilter === 'all' && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tenants yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
              Add your first tenant to get started
            </p>
            <Button className="gap-2" onClick={handleAddTenant}>
              <Plus className="h-4 w-4" />
              Add Your First Tenant
            </Button>
          </CardContent>
        </Card>
      )}

      {tenants.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">All Tenants</h2>
              <p className="text-muted-foreground mt-1">
                {total} {total === 1 ? 'tenant' : 'tenants'} total
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {tenants.map((tenant) => (
              <Card
                key={tenant.id}
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => window.location.href = `/tenants/${tenant.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(`${tenant.firstName} ${tenant.lastName}`)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate">
                            {tenant.firstName} {tenant.lastName}
                          </h3>
                          {tenant.idNumber && (
                            <p className="text-sm text-muted-foreground truncate">
                              ID: {tenant.idNumber}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {getStatusBadge(tenant.status)}
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{tenant.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{tenant.phone}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/tenants/${tenant.id}`;
                          }}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTenant(tenant);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTenant(tenant);
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
                Showing {tenants.length} of {total} tenants
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

      {/* Tenant Form Dialog */}
      <TenantFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
        tenant={selectedTenant}
        onCreateLease={handleCreateLease}
      />

      <OccupancyFormDialog
        open={occupancyDialogOpen}
        onOpenChange={setOccupancyDialogOpen}
        onSuccess={handleOccupancySuccess}
        preselectedTenantId={preselectedTenantId}
      />
    </div>
  );
}
