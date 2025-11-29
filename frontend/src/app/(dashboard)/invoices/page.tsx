'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, FileText, Calendar, DollarSign, Eye, Trash2 } from 'lucide-react';
import { invoicesService, type InvoiceFilters } from '@/services/invoices.service';
import type { Invoice } from '@/types';
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
import { InvoiceFormDialog } from '@/components/invoices/invoice-form-dialog';
import Link from 'next/link';

/**
 * Invoices Page
 *
 * Features:
 * - List all invoices with pagination
 * - Search by invoice number or tenant name
 * - Filter by status (paid, pending, overdue, cancelled)
 * - Statistics cards showing total, paid, and outstanding amounts
 * - Status badges with color coding
 * - Responsive design
 * - Real-time backend integration
 */

export default function InvoicesPage() {
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'all'>('all');
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery, statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      const filters: InvoiceFilters = {
        page: currentPage,
        limit,
        search: searchQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortBy: 'issueDate',
        sortOrder: 'DESC',
      };

      const response = await invoicesService.getAll(filters);

      if (response.data?.data) {
        setInvoices(response.data.data);
        setTotal(response.data.meta?.total || 0);
        setTotalPages(response.data.meta?.totalPages || 1);
      } else {
        console.warn('Invoices endpoint not available');
        setInvoices([]);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'sent':
        return <Badge variant="default">Sent</Badge>;
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!confirm(`Delete invoice #${invoice.invoiceNumber}?`)) return;

    try {
      await invoicesService.delete(invoice.id);
      toast({ title: 'Success', description: 'Invoice deleted successfully' });
      fetchInvoices();
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const getTotalStats = () => {
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const paidAmount = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const pendingAmount = invoices
      .filter((inv) => inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'draft')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    return { totalAmount, paidAmount, pendingAmount };
  };

  const stats = getTotalStats();

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
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage rental invoices and payments</p>
        </div>
        <Button className="gap-2" onClick={() => setInvoiceDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      {invoices.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount, currency)}</div>
              <p className="text-xs text-muted-foreground mt-1">{invoices.length} invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount, currency)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {invoices.filter((i) => i.status === 'paid').length} paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.pendingAmount, currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {invoices.filter((i) => i.status === 'sent' || i.status === 'overdue' || i.status === 'draft').length}{' '}
                unpaid
              </p>
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
                placeholder="Search by invoice number or tenant name..."
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
                variant={statusFilter === 'paid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('paid');
                  setCurrentPage(1);
                }}
              >
                Paid
              </Button>
              <Button
                variant={statusFilter === 'sent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('sent');
                  setCurrentPage(1);
                }}
              >
                Sent
              </Button>
              <Button
                variant={statusFilter === 'overdue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('overdue');
                  setCurrentPage(1);
                }}
              >
                Overdue
              </Button>
              <Button
                variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('cancelled');
                  setCurrentPage(1);
                }}
              >
                Cancelled
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!loading && invoices.length === 0 && !searchQuery && statusFilter === 'all' && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
              Create your first invoice to start tracking rental payments
            </p>
            <Button className="gap-2" onClick={() => setInvoiceDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Your First Invoice
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Search Results */}
      {!loading && invoices.length === 0 && (searchQuery || statusFilter !== 'all') && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invoices Table */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <CardDescription>{total} total invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Invoice #</TableHead>
                    <TableHead className="font-semibold">Tenant</TableHead>
                    <TableHead className="font-semibold">Property</TableHead>
                    <TableHead className="font-semibold">Issue Date</TableHead>
                    <TableHead className="font-semibold">Due Date</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/30">
                      <TableCell>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          #{invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {invoice.occupancy?.tenant
                            ? `${invoice.occupancy.tenant.firstName} ${invoice.occupancy.tenant.lastName}`
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {invoice.occupancy?.apartment
                            ? `${invoice.occupancy.apartment.unitNumber}`
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(invoice.issueDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(invoice.dueDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{formatCurrency(invoice.totalAmount, currency)}</div>
                        {invoice.paidAmount > 0 && invoice.paidAmount < invoice.totalAmount && (
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(invoice.paidAmount, currency)} paid
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteInvoice(invoice)}
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
                  of {total} invoices
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

      {/* Invoice Form Dialog */}
      <InvoiceFormDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        onSuccess={fetchInvoices}
      />
    </div>
  );
}
