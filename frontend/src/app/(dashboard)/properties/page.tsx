'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Building2, MapPin, Pencil, Trash2 } from 'lucide-react';
import { compoundsService, type CompoundFilters } from '@/services/compounds.service';
import type { Compound } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';
import { PropertyFormDialog } from '@/components/properties/property-form-dialog';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import Link from 'next/link';

/**
 * Properties (Compounds) Page
 *
 * Features:
 * - List all compounds with stats
 * - Search and filter
 * - Create new compound dialog
 * - Edit/Delete actions
 * - Responsive design
 * - Real-time backend integration
 */

export default function PropertiesPage() {
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(true);
  const { debouncedValue: searchQuery, value: searchInput, setValue: setSearchInput, isDebouncing } = useDebouncedSearch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompound, setSelectedCompound] = useState<Compound | undefined>();
  const { toast } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchCompounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery]);

  const fetchCompounds = async () => {
    try {
      setLoading(true);

      const filters: CompoundFilters = {
        page: currentPage,
        limit,
        search: searchQuery || undefined,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const response = await compoundsService.getAll(filters);

      if (response.data?.data) {
        setCompounds(response.data.data);
        setTotal(response.data.meta?.total || 0);
        setTotalPages(response.data.meta?.totalPages || 1);
      } else {
        // Backend endpoint might not exist yet
        console.warn('Properties endpoint not available, using empty state');
        setCompounds([]);
      }
    } catch (error) {
      console.error('Failed to fetch compounds:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
      setCompounds([]);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyRate = (compound: Compound): string => {
    if (!compound.totalUnits || compound.totalUnits === 0) return '0';
    const occupied = compound.totalUnits - (compound.vacantUnits || 0);
    return ((occupied / compound.totalUnits) * 100).toFixed(1);
  };

  const getOccupancyBadge = (rate: number) => {
    if (rate >= 90) return <Badge variant="success">{rate}% Occupied</Badge>;
    if (rate >= 70) return <Badge variant="default">{rate}% Occupied</Badge>;
    if (rate >= 50) return <Badge variant="warning">{rate}% Occupied</Badge>;
    return <Badge variant="destructive">{rate}% Occupied</Badge>;
  };

  const handleAddProperty = () => {
    setSelectedCompound(undefined);
    setDialogOpen(true);
  };

  const handleEditProperty = (compound: Compound) => {
    setSelectedCompound(compound);
    setDialogOpen(true);
  };

  const handleDeleteProperty = async (compound: Compound) => {
    if (!confirm(`Are you sure you want to delete "${compound.name}"?`)) return;

    try {
      await compoundsService.delete(compound.id);
      toast({
        title: 'Success',
        description: 'Property deleted successfully',
      });
      fetchCompounds();
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleDialogSuccess = () => {
    fetchCompounds();
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground mt-1">
            Manage your compounds and apartments
          </p>
        </div>
        <Button className="gap-2" onClick={handleAddProperty}>
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by property name or location..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="pl-10"
              />
              {isDebouncing && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}
            </div>
            <Button variant="outline">
              <Building2 className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!loading && compounds.length === 0 && !searchQuery && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
              Get started by adding your first property compound. You&apos;ll be able to manage
              apartments, track occupancy, and more.
            </p>
            <Button className="gap-2" onClick={handleAddProperty}>
              <Plus className="h-4 w-4" />
              Add Your First Property
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Search Results */}
      {!loading && compounds.length === 0 && searchQuery && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No properties match your search &ldquo;{searchQuery}&rdquo;
            </p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Properties Table */}
      {compounds.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Properties</CardTitle>
                <CardDescription className="mt-1">
                  {total} {total === 1 ? 'property' : 'properties'} total
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Property Name</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold text-center">Total Units</TableHead>
                    <TableHead className="font-semibold text-center">Occupied</TableHead>
                    <TableHead className="font-semibold text-center">Vacant</TableHead>
                    <TableHead className="font-semibold text-center">Occupancy</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compounds.map((compound) => {
                    const occupancyRate = parseFloat(getOccupancyRate(compound));
                    const occupied = (compound.totalUnits || 0) - (compound.vacantUnits || 0);

                    return (
                      <TableRow key={compound.id} className="hover:bg-muted/30">
                        <TableCell>
                          <Link
                            href={`/properties/${compound.id}`}
                            className="font-medium text-primary hover:underline flex items-center gap-2"
                          >
                            <Building2 className="h-4 w-4" />
                            {compound.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {compound.city}, {compound.region || compound.country}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            {compound.totalUnits}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium text-green-600">{occupied}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium text-orange-600">
                            {compound.vacantUnits || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {getOccupancyBadge(occupancyRate)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/properties/${compound.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProperty(compound)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteProperty(compound)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * limit + 1} to{' '}
                  {Math.min(currentPage * limit, total)} of {total} properties
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
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
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

      {/* Property Form Dialog */}
      <PropertyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
        compound={selectedCompound}
      />
    </div>
  );
}
