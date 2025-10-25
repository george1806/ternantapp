'use client';

/**
 * Super Admin Dashboard
 * Shows platform-wide statistics and insights
 */

import { useEffect, useState } from 'react';
import { Building2, Users, Home, TrendingUp, DollarSign, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { superAdminCompanyService } from '@/lib/services/super-admin/SuperAdminCompanyService';
import type { PlatformStats } from '@/types/super-admin/company.types';
import { Skeleton } from '@/components/ui/skeleton';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlatformStats();
  }, []);

  const loadPlatformStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await superAdminCompanyService.getPlatformStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load platform statistics');
      console.error('Error loading platform stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
            <button
              onClick={loadPlatformStats}
              className="mt-4 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive overview of your property management platform
        </p>
      </div>

      {/* Company Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Companies"
          value={stats.companies.total}
          icon={Building2}
          description={`${stats.companies.active} active, ${stats.companies.suspended} suspended`}
          trend={
            stats.companies.total > 0
              ? superAdminCompanyService.calculatePercentage(
                  stats.companies.active,
                  stats.companies.total
                )
              : 0
          }
          trendLabel="Active Rate"
          color="blue"
        />

        <StatsCard
          title="Total Properties"
          value={stats.properties.total}
          icon={Home}
          description={`Avg ${stats.properties.averagePerCompany} per company`}
          color="green"
        />

        <StatsCard
          title="Total Apartments"
          value={stats.apartments.total}
          icon={Building2}
          description="Across all properties"
          color="purple"
        />

        <StatsCard
          title="Total Tenants"
          value={stats.tenants.total}
          icon={Users}
          description="Platform-wide"
          color="orange"
        />

        <StatsCard
          title="Platform Users"
          value={stats.users.total}
          icon={Users}
          description="Company staff members"
          color="indigo"
        />

        <StatsCard
          title="Total Revenue"
          value={superAdminCompanyService.formatCurrency(stats.financials.totalRevenue)}
          icon={DollarSign}
          description={`From ${stats.financials.totalInvoices} invoices`}
          trend={stats.financials.collectionRate}
          trendLabel="Collection Rate"
          color="emerald"
        />
      </div>

      {/* Financial Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Invoices</p>
              <p className="text-3xl font-bold">{stats.financials.totalInvoices}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Paid Invoices</p>
              <p className="text-3xl font-bold text-green-600">{stats.financials.paidInvoices}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Collection Rate</p>
              <p className="text-3xl font-bold text-blue-600">{stats.financials.collectionRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <QuickActionButton
              href="/super-admin/companies"
              icon={Building2}
              label="Manage Companies"
            />
            <QuickActionButton
              href="/super-admin/companies?filter=active"
              icon={TrendingUp}
              label="View Active Companies"
            />
            <QuickActionButton
              href="/super-admin/analytics"
              icon={BarChart3}
              label="View Analytics"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: any;
  description?: string;
  trend?: number;
  trendLabel?: string;
  color?: string;
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendLabel,
  color = 'blue',
}: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
            {trend !== undefined && trendLabel && (
              <p className="text-sm text-green-600 mt-2">
                {trend}% {trendLabel}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionButton({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: any;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
    >
      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
        <Icon className="h-5 w-5 text-purple-600" />
      </div>
      <span className="font-medium text-gray-900 group-hover:text-purple-900">
        {label}
      </span>
    </a>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Missing import from lucide-react
import { BarChart3 } from 'lucide-react';
