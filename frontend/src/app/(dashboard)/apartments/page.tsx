'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Home, Eye, Trash2, Pencil } from 'lucide-react';
import { apartmentsService, type ApartmentFilters } from '@/services/apartments.service';
import { compoundsService } from '@/services/compounds.service';
import type { Apartment, Compound } from '@/types';
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
import Link from 'next/link';
import { ApartmentFormDialog } from '@/components/apartments/apartment-form-dialog';

/**
 * Apartments/Units Management Page
 *
 * Features:
 * - List all apartments/units across all company properties
 * - Filter by compound (property)
 * - Filter by status (available, occupied, maintenance, reserved)
 * - Search by unit number
 * - Stats showing total, available, occupied units
 * - Company-scoped data (JWT automatically filters by companyId)
 */

export default function ApartmentsPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [compoundFilter, setCompoundFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'available' | 'occupied' | 'maintenance' | 'reserved' | 'all'>('all');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchCompounds();
     
  }, []);

  useEffect(() => {
    fetchApartments();
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

  const fetchApartments = async () => {
    try {
      setLoading(true);

      const filters: ApartmentFilters = {
        page: currentPage,
        limit,
        search: searchQuery || undefined,
        compoundId: compoundFilter === 'all' ? undefined : compoundFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const response = await apartmentsService.getAll(filters);

      if (response.data?.data) {
        setApartments(response.data.data);
        setTotal(response.data.meta?.total || 0);
        setTotalPages(response.data.meta?.totalPages || 1);
      } else {
        console.warn('Apartments endpoint not available');
        setApartments([]);
      }
    } catch (error) {
      console.error('Failed to fetch apartments:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
      setApartments([]);
    } finally {
      setLoading(false);
    }
  };

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
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDeleteApartment = async (apartment: Apartment) => {
    if (!confirm(`Delete Unit ${apartment.unitNumber}?`)) return;

    try {
      await apartmentsService.delete(apartment.id);
      toast({ title: 'Success', description: 'Apartment deleted successfully' });
      fetchApartments();
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleOpenCreateDialog = () => {
    setSelectedApartment(null);
    setFormDialogOpen(true);
  };

  const handleOpenEditDialog = (apartment: Apartment) => {
    setSelectedApartment(apartment);
    setFormDialogOpen(true);
  };

  const handleFormSuccess = () => {
    fetchApartments();
  };

  const getTotalStats = () => {
    const totalUnits = apartments.length;
    const available = apartments.filter((a) => a.status === 'available').length;
    const occupied = apartments.filter((a) => a.status === 'occupied').length;
    const maintenance = apartments.filter((a) => a.status === 'maintenance').length;

    return { totalUnits, available, occupied, maintenance };
  };

  const stats = getTotalStats();

  if (loading && apartments.length === 0) {
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
          <h1 className="text-3xl font-bold tracking-tight">Apartments / Units</h1>
          <p className="text-muted-foreground mt-1">Manage units within your properties</p>
        </div>
        <Button className="gap-2" onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4" />
          Add Unit
        </Button>
      </div>

      {/* Stats Cards */}
      {apartments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Units</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all properties</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <Home className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.available}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready for occupancy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupied</CardTitle>
              <Home className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.occupied}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently rented</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
              <Home className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.maintenance}</div>
              <p className="text-xs text-muted-foreground mt-1">Under repair</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by unit number..."
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
                variant={statusFilter === 'available' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('available');
                  setCurrentPage(1);
                }}
              >
                Available
              </Button>
              <Button
                variant={statusFilter === 'occupied' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('occupied');
                  setCurrentPage(1);
                }}
              >
                Occupied
              </Button>
              <Button
                variant={statusFilter === 'maintenance' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('maintenance');
                  setCurrentPage(1);
                }}
              >
                Maintenance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!loading && apartments.length === 0 && !searchQuery && statusFilter === 'all' && compoundFilter === 'all' && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Home className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No apartments yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
              Add units to your properties to start managing apartments
            </p>
            <Button className="gap-2" onClick={handleOpenCreateDialog}>
              <Plus className="h-4 w-4" />
              Add Your First Unit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Search Results */}
      {!loading && apartments.length === 0 && (searchQuery || statusFilter !== 'all' || compoundFilter !== 'all') && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No apartments found</h3>
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

      {/* Apartments Table */}
      {apartments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Units</CardTitle>
            <CardDescription>{total} total apartments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Unit Number</TableHead>
                    <TableHead className="font-semibold">Property</TableHead>
                    <TableHead className="font-semibold">Details</TableHead>
                    <TableHead className="font-semibold text-right">Monthly Rent</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apartments.map((apartment) => (
                    <TableRow key={apartment.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Unit {apartment.unitNumber}</span>
                        </div>
                        {apartment.floor && (
                          <p className="text-xs text-muted-foreground mt-1">Floor {apartment.floor}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {apartment.compound ? (
                          <Link
                            href={`/properties/${apartment.compound.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {apartment.compound.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-3">
                            <span>{apartment.bedrooms} BR</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{apartment.bathrooms} BA</span>
                            {apartment.areaSqm && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span>{apartment.areaSqm} m²</span>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{formatCurrency(apartment.monthlyRent)}</div>
                        <div className="text-xs text-muted-foreground">per month</div>
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(apartment.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/apartments/${apartment.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditDialog(apartment)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteApartment(apartment)}
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
                  of {total} apartments
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

      {/* Apartment Form Dialog */}
      <ApartmentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        apartment={selectedApartment}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
