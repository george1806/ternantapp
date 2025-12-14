'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, DollarSign, Calendar, CreditCard, Eye } from 'lucide-react';
import { paymentsService, type PaymentFilters } from '@/services/payments.service';
import type { Payment } from '@/types';
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { PaymentFormDialog } from '@/components/payments/payment-form-dialog';
import { PaymentStatsCards } from '@/components/payments/payment-stats-cards';
import Link from 'next/link';

/**
 * Payments Page
 *
 * Features:
 * - List all payments with pagination
 * - Search by reference or tenant
 * - Filter by payment method (mpesa, bank_transfer, cash, cheque, other)
 * - Statistics cards showing total payments
 * - Payment method badges with icons
 * - Responsive design
 * - Real-time backend integration
 */

export default function PaymentsPage() {
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'CASH' | 'BANK' | 'MOBILE' | 'CARD' | 'OTHER' | 'all'>('all');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery, methodFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const filters: PaymentFilters = {
        page: currentPage,
        limit,
        search: searchQuery || undefined,
        method: methodFilter === 'all' ? undefined : methodFilter,
        sortBy: 'paymentDate',
        sortOrder: 'DESC',
      };

      const response = await paymentsService.getAll(filters);

      if (response.data?.data) {
        setPayments(response.data.data);
        setTotal(response.data.meta?.total || 0);
        setTotalPages(response.data.meta?.totalPages || 1);
      } else {
        console.warn('Payments endpoint not available');
        setPayments([]);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Badge variant="warning" className="gap-1"><DollarSign className="h-3 w-3" /> Cash</Badge>;
      case 'BANK':
        return <Badge variant="default" className="gap-1"><CreditCard className="h-3 w-3" /> Bank Transfer</Badge>;
      case 'MOBILE':
        return <Badge variant="success" className="gap-1"><CreditCard className="h-3 w-3" /> Mobile Money</Badge>;
      case 'CARD':
        return <Badge variant="secondary" className="gap-1"><CreditCard className="h-3 w-3" /> Card</Badge>;
      case 'OTHER':
        return <Badge variant="outline" className="gap-1"><CreditCard className="h-3 w-3" /> Other</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Track and manage payment transactions</p>
        </div>
        <Button className="gap-2" onClick={() => setPaymentDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Payment Analytics Stats */}
      <PaymentStatsCards />

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by reference or tenant..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={methodFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setMethodFilter('all');
                  setCurrentPage(1);
                }}
              >
                All
              </Button>
              <Button
                variant={methodFilter === 'MOBILE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setMethodFilter('MOBILE');
                  setCurrentPage(1);
                }}
              >
                Mobile Money
              </Button>
              <Button
                variant={methodFilter === 'BANK' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setMethodFilter('BANK');
                  setCurrentPage(1);
                }}
              >
                Bank
              </Button>
              <Button
                variant={methodFilter === 'CASH' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setMethodFilter('CASH');
                  setCurrentPage(1);
                }}
              >
                Cash
              </Button>
              <Button
                variant={methodFilter === 'CARD' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setMethodFilter('CARD');
                  setCurrentPage(1);
                }}
              >
                Card
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!loading && payments.length === 0 && !searchQuery && methodFilter === 'all' && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <DollarSign className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No payments yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
              Record your first payment to start tracking transactions
            </p>
            <Button className="gap-2" onClick={() => setPaymentDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Record Your First Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Form Dialog */}
      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={fetchPayments}
      />

      {/* No Search Results */}
      {!loading && payments.length === 0 && (searchQuery || methodFilter !== 'all') && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payments found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setMethodFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Payments</CardTitle>
            <CardDescription>{total} total payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Reference</TableHead>
                    <TableHead className="font-semibold">Invoice</TableHead>
                    <TableHead className="font-semibold">Payment Date</TableHead>
                    <TableHead className="font-semibold">Payment Method</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-medium text-sm">{payment.reference}</div>
                      </TableCell>
                      <TableCell>
                        {payment.invoice ? (
                          <Link
                            href={`/invoices/${payment.invoice.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            #{payment.invoice.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(payment.paymentDate)}
                        </div>
                      </TableCell>
                      <TableCell>{getPaymentMethodBadge(payment.paymentMethod)}</TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium text-green-600">{formatCurrency(payment.amount, currency)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {payment.notes || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3.5 w-3.5" />
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
                  of {total} payments
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
    </div>
  );
}
