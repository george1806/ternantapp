'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 10;

  useEffect(() => {
    setCurrentPage(1);
    setCompounds([]);
    fetchCompounds(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const fetchCompounds = async (page: number = currentPage, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const filters: CompoundFilters = {
        page,
        limit,
        search: searchQuery || undefined,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const response = await compoundsService.getAll(filters);

      if (response.data?.data) {
        if (append) {
          setCompounds(prev => [...prev, ...response.data.data]);
        } else {
          setCompounds(response.data.data);
        }
        setTotal(response.data.meta?.total || 0);
        setTotalPages(response.data.meta?.totalPages || 1);
      } else {
        console.warn('Properties endpoint not available, using empty state');
        if (!append) {
          setCompounds([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch compounds:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
      if (!append) {
        setCompounds([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchCompounds(nextPage, true);
  };

  const getOccupancyRate = (compound: Compound): string => {
    if (!compound.totalUnits || compound.totalUnits === 0) return '0';
    const occupied = compound.totalUnits - (compound.vacantUnits || 0);
    return ((occupied / compound.totalUnits) * 100).toFixed(1);
  };

  const getOccupancyBadge = (rate: number) => {
    if (rate >= 90) return <Badge variant="success" className="opacity-80">{rate}% Occupied</Badge>;
    if (rate >= 70) return <Badge variant="default" className="opacity-80">{rate}% Occupied</Badge>;
    if (rate >= 50) return <Badge variant="warning" className="opacity-80">{rate}% Occupied</Badge>;
    return <Badge variant="destructive" className="opacity-80">{rate}% Occupied</Badge>;
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

      {/* Properties Grid */}
      {compounds.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">All Properties</h2>
              <p className="text-muted-foreground mt-1">
                {total} {total === 1 ? 'property' : 'properties'} total
              </p>
            </div>
          </div>

          {/* Properties List */}
          <div className="space-y-3">
            {compounds.map((compound) => {
              const occupancyRate = parseFloat(getOccupancyRate(compound));
              const occupied = (compound.totalUnits || 0) - (compound.vacantUnits || 0);

              return (
                <Card
                  key={compound.id}
                  className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/properties/${compound.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 shrink-0">
                        <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold truncate">
                              {compound.name}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                              <p className="text-sm text-muted-foreground truncate">
                                {compound.city}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {getOccupancyBadge(occupancyRate)}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="outline" className="font-normal">
                            Total: <span className="font-semibold ml-1 text-foreground">{compound.totalUnits || 0}</span>
                          </Badge>
                          <Badge variant="outline" className="font-normal">
                            Rented: <span className="font-semibold ml-1 text-emerald-600 dark:text-emerald-500">{occupied}</span>
                          </Badge>
                          <Badge variant="outline" className="font-normal">
                            Vacant: <span className="font-semibold ml-1 text-amber-600 dark:text-amber-500">{compound.vacantUnits || 0}</span>
                          </Badge>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/properties/${compound.id}`);
                            }}
                          >
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProperty(compound);
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
                              handleDeleteProperty(compound);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Load More */}
          {currentPage < totalPages && (
            <div className="flex flex-col items-center gap-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {compounds.length} of {total} properties
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
