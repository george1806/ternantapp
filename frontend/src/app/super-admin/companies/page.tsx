'use client';

/**
 * Super Admin - Companies Management Page
 *
 * Features:
 * - Card-based layout with load more pagination
 * - Debounced search functionality
 * - In-card action buttons (View, Edit, Delete)
 * - Dialog-based create/edit forms
 * - Real-time company statistics
 * - Responsive Material design
 * - Optimized performance with lazy loading
 *
 * @author george1806
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Building2,
  Users,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  AlertCircle
} from 'lucide-react';
import { superAdminCompanyService } from '@/lib/services/super-admin/SuperAdminCompanyService';
import type { Company, CompanyFilters } from '@/types/super-admin/company.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { CompanyFormDialog } from '@/components/super-admin/company-form-dialog';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

/**
 * Companies Management Page Component
 */
export default function CompaniesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { debouncedValue: searchQuery, value: searchInput, setValue: setSearchInput, isDebouncing } = useDebouncedSearch();

  // State management
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);

  const limit = 12;

  /**
   * Fetch companies with pagination
   */
  const fetchCompanies = async (page: number = currentPage, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const filters: CompanyFilters = {
        page,
        limit,
        search: searchQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      };

      const response = await superAdminCompanyService.getCompanies(filters);

      if (append) {
        setCompanies(prev => [...prev, ...response.data]);
      } else {
        setCompanies(response.data);
      }

      setTotal(response.meta.total);
      setTotalPages(response.meta.totalPages);
    } catch (error: any) {
      console.error('Failed to fetch companies:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load companies',
        variant: 'destructive',
      });
      if (!append) {
        setCompanies([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  /**
   * Load more companies
   */
  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchCompanies(nextPage, true);
  };

  /**
   * Handle search query changes
   */
  useEffect(() => {
    setCurrentPage(1);
    setCompanies([]);
    fetchCompanies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter]);

  /**
   * Handle create company
   */
  const handleCreate = () => {
    setSelectedCompany(null);
    setCreateDialogOpen(true);
  };

  /**
   * Handle edit company
   */
  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setEditDialogOpen(true);
  };

  /**
   * Handle delete company
   */
  const handleDelete = (company: Company) => {
    setDeletingCompany(company);
    setDeleteDialogOpen(true);
  };

  /**
   * Confirm delete company
   */
  const confirmDelete = async () => {
    if (!deletingCompany) return;

    try {
      await superAdminCompanyService.deleteCompany(deletingCompany.id);
      toast({
        title: 'Success',
        description: `Company "${deletingCompany.name}" deleted successfully`,
      });
      setDeleteDialogOpen(false);
      setDeletingCompany(null);
      fetchCompanies(1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete company',
        variant: 'destructive',
      });
    }
  };

  /**
   * Toggle company status (activate/suspend)
   */
  const handleToggleStatus = async (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await superAdminCompanyService.toggleCompanyStatus(company.id, !company.isActive);
      toast({
        title: 'Success',
        description: `Company ${company.isActive ? 'suspended' : 'activated'} successfully`,
      });
      fetchCompanies(currentPage);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update company status',
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle dialog success
   */
  const handleDialogSuccess = () => {
    fetchCompanies(1);
  };

  // Loading skeleton
  if (loading && companies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-20" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all companies on the platform
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by company name, slug, or email..."
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
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'active' | 'inactive' | 'all');
                setCurrentPage(1);
              }}
              className="px-4 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Suspended</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!loading && companies.length === 0 && !searchQuery && statusFilter === 'all' && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No companies yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
              Get started by creating your first company. Companies can manage their own properties,
              tenants, and billing.
            </p>
            <Button className="gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Create Your First Company
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Search Results */}
      {!loading && companies.length === 0 && (searchQuery || statusFilter !== 'all') && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No companies found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? `No companies match "${searchQuery}"`
                : `No ${statusFilter} companies found`
              }
            </p>
            <Button variant="outline" onClick={() => {
              setSearchInput('');
              setStatusFilter('all');
            }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Companies List */}
      {companies.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">All Companies</h2>
              <p className="text-muted-foreground mt-1">
                {total} {total === 1 ? 'company' : 'companies'} total
              </p>
            </div>
          </div>

          {/* Companies Cards */}
          <div className="space-y-3">
            {companies.map((company) => (
              <Card
                key={company.id}
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/super-admin/companies/${company.id}`)}
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
                            {company.name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            @{company.slug}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <Badge
                            variant={company.isActive ? "default" : "destructive"}
                            className="opacity-90"
                          >
                            {company.isActive ? 'Active' : 'Suspended'}
                          </Badge>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex flex-wrap gap-3 mb-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          <span>{company.users?.length || 0} users</span>
                        </div>
                        <div className="truncate">
                          {company.email}
                        </div>
                        <div className="text-xs">
                          Created {new Date(company.createdAt).toLocaleDateString()}
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
                            router.push(`/super-admin/companies/${company.id}`);
                          }}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(company);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={company.isActive ? "" : "text-green-600"}
                          onClick={(e) => handleToggleStatus(company, e)}
                          title={company.isActive ? 'Suspend Company' : 'Activate Company'}
                        >
                          {company.isActive ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(company);
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
                Showing {companies.length} of {total} companies
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

      {/* Create Company Dialog */}
      <CompanyFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      {/* Edit Company Dialog */}
      <CompanyFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleDialogSuccess}
        company={selectedCompany}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Company"
        description={
          deletingCompany
            ? `Are you sure you want to delete "${deletingCompany.name}"? This action cannot be undone and will affect all associated data.`
            : ''
        }
        itemName={deletingCompany?.name || ''}
      />
    </div>
  );
}
