'use client';

/**
 * Super Admin - Companies List Page
 * Manages all companies in the platform
 */

import { useEffect, useState } from 'react';
import { Plus, Search, Building2, Users, Power, PowerOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { superAdminCompanyService } from '@/lib/services/super-admin/SuperAdminCompanyService';
import type { Company, CompanyFilters } from '@/types/super-admin/company.types';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function CompaniesListPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CompanyFilters>({
    page: 1,
    limit: 20,
    search: '',
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.status]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await superAdminCompanyService.getCompanies(filters);
      setCompanies(response.data);
      setTotalPages(response.meta.totalPages);
      setTotalCompanies(response.meta.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load companies');
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters({ ...filters, page: 1 });
    loadCompanies();
  };

  const handleToggleStatus = async (company: Company) => {
    try {
      await superAdminCompanyService.toggleCompanyStatus(
        company.id,
        !company.isActive
      );
      loadCompanies();
    } catch (err: any) {
      alert(err.message || 'Failed to update company status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-1">
            Manage all companies on the platform ({totalCompanies} total)
          </p>
        </div>
        <Link href="/super-admin/companies/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, slug, or email..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={handleSearch}>Search</Button>
            <select
              value={filters.status || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as 'active' | 'inactive' | undefined,
                  page: 1,
                })
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Suspended</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
            <Button onClick={loadCompanies} className="mt-4 w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && <CompaniesListSkeleton />}

      {/* Companies List */}
      {!loading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>

          {companies.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No companies found
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by creating your first company
                </p>
                <Link href="/super-admin/companies/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm">
                Page {filters.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={filters.page === totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface CompanyCardProps {
  company: Company;
  onToggleStatus: (company: Company) => void;
}

function CompanyCard({ company, onToggleStatus }: CompanyCardProps) {
  const service = superAdminCompanyService;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {company.name}
            </h3>
            <p className="text-sm text-gray-600">@{company.slug}</p>
          </div>
          <Badge variant={service.getStatusColor(company.isActive)}>
            {service.getStatusLabel(company.isActive)}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{company.users?.length || 0} users</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-mono">{company.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Created {service.formatDate(company.createdAt)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/super-admin/companies/${company.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
          <Button
            variant={company.isActive ? 'destructive' : 'default'}
            size="icon"
            onClick={() => onToggleStatus(company)}
            title={company.isActive ? 'Suspend' : 'Activate'}
          >
            {company.isActive ? (
              <PowerOff className="h-4 w-4" />
            ) : (
              <Power className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CompaniesListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
