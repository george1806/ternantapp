'use client';

/**
 * Super Admin - Company Details Page
 * Shows detailed information about a specific company
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  Home,
  TrendingUp,
  DollarSign,
  FileText,
  ArrowLeft,
  Power,
  PowerOff,
  Edit,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { superAdminCompanyService } from '@/lib/services/super-admin/SuperAdminCompanyService';
import type { Company, CompanyStats } from '@/types/super-admin/company.types';
import Link from 'next/link';

export default function CompanyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadCompanyDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadCompanyDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const [companyData, statsData] = await Promise.all([
        superAdminCompanyService.getCompanyById(companyId),
        superAdminCompanyService.getCompanyStats(companyId),
      ]);
      setCompany(companyData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load company details');
      console.error('Error loading company details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!company) return;
    try {
      await superAdminCompanyService.toggleCompanyStatus(
        company.id,
        !company.isActive
      );
      loadCompanyDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to update company status');
    }
  };

  if (loading) {
    return <DetailsPageSkeleton />;
  }

  if (error || !company || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error || 'Company not found'}</p>
            <Button onClick={() => router.push('/super-admin/companies')}>
              Back to Companies
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const service = superAdminCompanyService;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/super-admin/companies"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
              <Badge variant={service.getStatusColor(company.isActive)}>
                {service.getStatusLabel(company.isActive)}
              </Badge>
            </div>
            <p className="text-gray-600">@{company.slug}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/super-admin/companies/${company.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant={company.isActive ? 'destructive' : 'default'}
              onClick={handleToggleStatus}
            >
              {company.isActive ? (
                <>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Suspend
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Email" value={company.email} />
            <InfoRow label="Phone" value={company.phone || 'Not set'} />
            <InfoRow label="Currency" value={company.currency} />
            <InfoRow label="Timezone" value={company.timezone} />
            <InfoRow label="Created" value={service.formatDateTime(company.createdAt)} />
            <InfoRow
              label="Last Activity"
              value={service.formatDateTime(stats.lastActivity)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {company.users && company.users.length > 0 ? (
                company.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 text-center py-4">No users yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Properties"
          value={stats.totalProperties}
          icon={Building2}
          color="blue"
        />
        <StatsCard
          title="Apartments"
          value={stats.totalApartments}
          icon={Home}
          subtitle={`${stats.occupancyRate}% occupied`}
          color="green"
        />
        <StatsCard
          title="Tenants"
          value={stats.totalTenants}
          icon={Users}
          subtitle={`${stats.activeTenants} active`}
          color="purple"
        />
        <StatsCard
          title="Invoices"
          value={stats.totalInvoices}
          icon={FileText}
          subtitle={`${stats.paidInvoices} paid`}
          color="orange"
        />
      </div>

      {/* Financial Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {service.formatCurrency(stats.totalRevenue, company.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {service.formatCurrency(stats.outstandingBalance, company.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Paid</span>
                <span className="font-medium text-green-600">{stats.paidInvoices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="font-medium text-blue-600">{stats.pendingInvoices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Overdue</span>
                <span className="font-medium text-red-600">{stats.overdueInvoices}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: any;
  subtitle?: string;
  color?: string;
}

function StatsCard({ title, value, icon: Icon, subtitle, color = 'blue' }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function DetailsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
