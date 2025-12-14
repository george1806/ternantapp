'use client';

import { useEffect, useState } from 'react';
import { DollarSign, CreditCard, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { paymentsService } from '@/services/payments.service';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface PaymentStats {
  totalAmount: number;
  totalCount: number;
  byMethod: Record<string, { count: number; amount: number }>;
  averageAmount: number;
  largestPayment: number;
}

interface PaymentStatsCardsProps {
  dateFrom?: string;
  dateTo?: string;
}

export function PaymentStatsCards({ dateFrom, dateTo }: PaymentStatsCardsProps) {
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await paymentsService.getStats({
        dateFrom,
        dateTo,
      });

      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch payment stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Get top payment methods
  const methodEntries = Object.entries(stats.byMethod || {})
    .sort(([, a], [, b]) => b.amount - a.amount)
    .slice(0, 2);

  const getMethodIcon = (method: string) => {
    switch (method.toUpperCase()) {
      case 'CASH':
        return <DollarSign className="h-4 w-4 text-yellow-600" />;
      case 'BANK':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'MOBILE':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'CARD':
        return <CreditCard className="h-4 w-4 text-purple-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatMethodName = (method: string) => {
    switch (method.toUpperCase()) {
      case 'CASH':
        return 'Cash';
      case 'BANK':
        return 'Bank Transfer';
      case 'MOBILE':
        return 'Mobile Money';
      case 'CARD':
        return 'Card Payment';
      default:
        return method;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Total Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalAmount, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.totalCount} {stats.totalCount === 1 ? 'payment' : 'payments'}
          </p>
        </CardContent>
      </Card>

      {/* Average Payment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(stats.averageAmount, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Highest: {formatCurrency(stats.largestPayment, currency)}
          </p>
        </CardContent>
      </Card>

      {/* Top Payment Method 1 */}
      {methodEntries[0] && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {formatMethodName(methodEntries[0][0])}
            </CardTitle>
            {getMethodIcon(methodEntries[0][0])}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(methodEntries[0][1].amount, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {methodEntries[0][1].count} {methodEntries[0][1].count === 1 ? 'transaction' : 'transactions'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top Payment Method 2 */}
      {methodEntries[1] && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {formatMethodName(methodEntries[1][0])}
            </CardTitle>
            {getMethodIcon(methodEntries[1][0])}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(methodEntries[1][1].amount, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {methodEntries[1][1].count} {methodEntries[1][1].count === 1 ? 'transaction' : 'transactions'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Fallback if less than 2 methods */}
      {!methodEntries[1] && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats.byMethod || {}).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Object.keys(stats.byMethod || {}).length === 1 ? 'method used' : 'methods used'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
