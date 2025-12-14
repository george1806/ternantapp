'use client';

import { useEffect, useState } from 'react';
import { FileText, AlertCircle, ArrowRight, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { invoicesService } from '@/services/invoices.service';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import type { Invoice } from '@/types';
import { differenceInDays, parseISO, format } from 'date-fns';
import Link from 'next/link';

export function DueSoonInvoicesWidget() {
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDueSoonInvoices();
  }, []);

  const fetchDueSoonInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoicesService.getDueSoon(7);

      if (response.data?.data) {
        // Take only first 5 for the widget
        setInvoices(response.data.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch due soon invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilDue = (dueDate: string): number => {
    return differenceInDays(parseISO(dueDate), new Date());
  };

  const getDueBadge = (days: number) => {
    if (days < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (days === 0) {
      return <Badge variant="destructive">Due Today</Badge>;
    } else if (days <= 2) {
      return <Badge variant="warning">{days}d left</Badge>;
    } else {
      return <Badge variant="default">{days}d left</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'pending':
        return <Badge variant="default">Pending</Badge>;
      case 'sent':
        return <Badge variant="default">Sent</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Due Soon Invoices
          </CardTitle>
          <CardDescription>Invoices due in the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No invoices due in the next 7 days
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          Due Soon Invoices
        </CardTitle>
        <CardDescription>Invoices due in the next 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const daysLeft = getDaysUntilDue(invoice.dueDate);

            return (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">#{invoice.invoiceNumber}</p>
                    {getDueBadge(daysLeft)}
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    {invoice.occupancy?.tenant && (
                      <span>
                        {invoice.occupancy.tenant.firstName} {invoice.occupancy.tenant.lastName}
                      </span>
                    )}
                    {invoice.occupancy?.apartment && (
                      <>
                        <span>•</span>
                        <span>Unit {invoice.occupancy.apartment.unitNumber}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {formatCurrency(invoice.totalAmount, currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Due: {format(parseISO(invoice.dueDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                <Link href={`/invoices/${invoice.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        {/* View All Link */}
        <div className="mt-4 pt-4 border-t">
          <Link href="/invoices?status=pending,sent">
            <Button variant="outline" className="w-full" size="sm">
              View All Pending Invoices
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
