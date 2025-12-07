'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Plus,
  Printer,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { invoicesService } from '@/services/invoices.service';
import { paymentsService, type CreatePaymentDto } from '@/services/payments.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { PaymentFormDialog } from '@/components/payments/payment-form-dialog';
import type { Invoice, Payment } from '@/types';

/**
 * Invoice Detail Page
 *
 * Features:
 * - Display full invoice details
 * - Show invoice items/line items
 * - Payment history
 * - Record new payment
 * - Invoice actions (send, cancel, download PDF)
 * - Timeline of events
 * - Responsive design
 */

interface InvoiceDetail extends Invoice {
  items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    itemType: 'rent' | 'utility' | 'maintenance' | 'other';
  }>;
}

export default function InvoiceDetailPage() {
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoiceDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const response = await invoicesService.getById(invoiceId);

      if (response.data?.data) {
        setInvoice(response.data.data);
        fetchPayments();
      } else {
        toast({
          title: 'Error',
          description: 'Invoice not found',
          variant: 'destructive',
        });
        router.push('/invoices');
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
      router.push('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      const response = await paymentsService.getByInvoice(invoiceId);

      if (response.data?.data) {
        setPayments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      // Don't show error toast for this - it's optional data
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;

    try {
      setActionInProgress(true);
      await invoicesService.markAsSent(invoice.id);

      toast({
        title: 'Success',
        description: 'Invoice sent successfully',
      });

      fetchInvoiceDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice) return;
    if (!confirm('Are you sure you want to cancel this invoice?')) return;

    try {
      setActionInProgress(true);
      await invoicesService.cancel(invoice.id);

      toast({
        title: 'Success',
        description: 'Invoice cancelled successfully',
      });

      fetchInvoiceDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    try {
      setActionInProgress(true);
      const response = await invoicesService.downloadPdf(invoice.id);

      // Create a download link
      const url = window.URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Invoice PDF downloaded',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    if (!confirm(`Delete invoice #${invoice.invoiceNumber}?`)) return;

    try {
      setActionInProgress(true);
      await invoicesService.delete(invoice.id);

      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });

      router.push('/invoices');
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'draft':
        return <Clock className="h-5 w-5 text-gray-600" />;
      default:
        return <FileText className="h-5 w-5 text-blue-600" />;
    }
  };

  const remainingAmount = invoice ? invoice.totalAmount - invoice.paidAmount : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Invoice not found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            The invoice you're looking for doesn't exist or has been deleted
          </p>
          <Button onClick={() => router.push('/invoices')}>Back to Invoices</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/invoices')}
            disabled={actionInProgress}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Invoice #{invoice.invoiceNumber}</h1>
              {getStatusBadge(invoice.status)}
            </div>
            <p className="text-muted-foreground">
              {invoice.status === 'draft'
                ? 'Draft Invoice'
                : `Created on ${formatDate(invoice.createdAt)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {invoice.status === 'draft' && (
          <Button
            onClick={handleSendInvoice}
            disabled={actionInProgress}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Send Invoice
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleDownloadPDF}
          disabled={actionInProgress}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => window.print()}
          disabled={actionInProgress}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
        {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
          <Button
            variant="destructive"
            onClick={handleCancelInvoice}
            disabled={actionInProgress}
            className="gap-2 ml-auto"
          >
            <Trash2 className="h-4 w-4" />
            Cancel
          </Button>
        )}
        {invoice.status === 'draft' && (
          <Button
            variant="destructive"
            onClick={handleDeleteInvoice}
            disabled={actionInProgress}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Tenant Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.occupancy?.tenant ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Tenant Name</p>
                  <p className="font-medium">
                    {invoice.occupancy.tenant.firstName} {invoice.occupancy.tenant.lastName}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </p>
                    <p className="font-medium text-sm">{invoice.occupancy.tenant.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      Phone
                    </p>
                    <p className="font-medium text-sm">{invoice.occupancy.tenant.phone}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tenant information available</p>
            )}

            {/* Property Information */}
            <Separator />
            {invoice.occupancy?.apartment ? (
              <div className="space-y-3">
                <p className="font-semibold">Property Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Unit</p>
                    <p className="font-medium">{invoice.occupancy.apartment.unitNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                    <p className="font-medium">
                      {formatCurrency(invoice.occupancy.apartment.monthlyRent, currency)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No property information available</p>
            )}
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(invoice.status)}
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Issue Date:</span>
                <span className="text-sm font-medium">{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Due Date:</span>
                <span className="text-sm font-medium">{formatDate(invoice.dueDate)}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3 bg-muted p-3 rounded-lg">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Amount:</span>
                <span className="font-medium">{formatCurrency(invoice.totalAmount, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Paid Amount:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(invoice.paidAmount, currency)}
                </span>
              </div>
              {remainingAmount > 0 && (
                <div className="border-t border-muted pt-2 flex justify-between">
                  <span className="text-sm font-semibold">Outstanding:</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(remainingAmount, currency)}
                  </span>
                </div>
              )}
            </div>

            {remainingAmount > 0 && invoice.status !== 'cancelled' && (
              <Button
                className="w-full gap-2"
                onClick={() => setPaymentDialogOpen(true)}
                disabled={actionInProgress}
              >
                <Plus className="h-4 w-4" />
                Record Payment
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      {invoice.items && invoice.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
            <CardDescription>{invoice.items.length} item(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground capitalize">{item.itemType}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice, currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            {payments.length} payment(s) recorded
            {loadingPayments && ' (loading...)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPayments ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : payments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(payment.paidAt)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount, currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.method}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.reference || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {payment.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <DollarSign className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No payments recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment Form Dialog */}
      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={() => {
          fetchInvoiceDetails();
        }}
      />
    </div>
  );
}
