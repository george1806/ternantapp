'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Mail, DollarSign, Calendar, FileText, Edit } from 'lucide-react';
import { invoicesService } from '@/services/invoices.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';
import { format } from 'date-fns';
import type { Invoice } from '@/types';
import { InvoiceFormDialog } from '@/components/invoices/invoice-form-dialog';

/**
 * Invoice Detail Page
 *
 * Displays detailed information about a single invoice
 */

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadInvoice(params.id as string);
    }
  }, [params.id]);

  const loadInvoice = async (id: string) => {
    try {
      setLoading(true);
      const response = await invoicesService.getById(id);
      // Backend returns invoice directly, not wrapped in { data: invoice }
      setInvoice(response.data as any);
    } catch (error) {
      console.error('Failed to load invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getApiErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      toast({
        title: 'Downloading...',
        description: 'Generating PDF invoice...',
      });
      const response = await invoicesService.downloadPdf(invoice.id);
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: 'Success',
        description: 'Invoice downloaded successfully!',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;

    // Confirm before sending
    if (!confirm(`Send invoice ${invoice.invoiceNumber} to ${invoice.tenant?.email || 'tenant'}?`)) {
      return;
    }

    try {
      toast({
        title: 'Sending...',
        description: 'Sending invoice to tenant...',
      });

      await invoicesService.send(invoice.id);

      toast({
        title: 'Success',
        description: 'Invoice sent successfully!',
      });

      // Reload invoice and email logs
      loadInvoice(invoice.id);
      loadEmailLogs(invoice.id);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleResendInvoice = async () => {
    if (!invoice) return;

    // Confirm before resending
    if (!confirm(`Resend invoice ${invoice.invoiceNumber} to ${invoice.tenant?.email || 'tenant'}?`)) {
      return;
    }

    try {
      toast({
        title: 'Resending...',
        description: 'Resending invoice to tenant...',
      });

      await invoicesService.resend(invoice.id);

      toast({
        title: 'Success',
        description: 'Invoice resent successfully!',
      });

      // Reload email logs to show the new send
      loadEmailLogs(invoice.id);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getApiErrorMessage(error),
      });
    }
  };

  const loadEmailLogs = async (id: string) => {
    try {
      setLoadingEmailLogs(true);
      const response = await invoicesService.getEmailLogs(id);
      setEmailLogs(response.data || []);
    } catch (error) {
      console.error('Failed to load email logs:', error);
    } finally {
      setLoadingEmailLogs(false);
    }
  };

  useEffect(() => {
    if (invoice && ['sent', 'overdue', 'paid'].includes(invoice.status)) {
      loadEmailLogs(invoice.id);
    }
  }, [invoice?.id, invoice?.status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'sent':
        return 'bg-blue-500';
      case 'draft':
        return 'bg-gray-500';
      case 'overdue':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button onClick={() => router.push('/invoices')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>
      </div>
    );
  }

  const totalAmount = invoice.totalAmount || 0;
  const amountPaid = invoice.amountPaid || 0;
  const outstandingAmount = totalAmount - amountPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/invoices')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">Invoice {invoice.invoiceNumber || 'N/A'}</h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate">
              {invoice.occupancy?.tenant?.firstName} {invoice.occupancy?.tenant?.lastName}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <span
            className={`px-3 py-1 rounded-full text-white text-xs sm:text-sm font-medium ${getStatusColor(invoice.status)}`}
          >
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
          {(invoice.status === 'draft' || invoice.status === 'sent') && (
            <>
              <Button variant="outline" onClick={() => setEditDialogOpen(true)} className="hidden sm:flex">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="icon" onClick={() => setEditDialogOpen(true)} className="sm:hidden">
                <Edit className="h-4 w-4" />
              </Button>
            </>
          )}
          {invoice.status === 'draft' && (
            <>
              <Button onClick={handleSendInvoice} className="hidden sm:flex">
                <Mail className="mr-2 h-4 w-4" />
                Send Invoice
              </Button>
              <Button size="icon" onClick={handleSendInvoice} className="sm:hidden">
                <Mail className="h-4 w-4" />
              </Button>
            </>
          )}
          {['sent', 'overdue', 'paid'].includes(invoice.status) && (
            <>
              <Button variant="outline" onClick={handleResendInvoice} className="hidden sm:flex">
                <Mail className="mr-2 h-4 w-4" />
                Resend Invoice
              </Button>
              <Button variant="outline" size="icon" onClick={handleResendInvoice} className="sm:hidden">
                <Mail className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleDownloadPdf} className="hidden sm:flex">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownloadPdf} className="sm:hidden">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${amountPaid.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${outstandingAmount > 0 ? 'text-red-500' : 'text-green-500'}`}>
              ${outstandingAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM dd, yyyy') : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
              <p className="text-base font-mono">{invoice.invoiceNumber}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Invoice Date</p>
              <p className="text-base">{format(new Date(invoice.invoiceDate), 'PPP')}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Due Date</p>
              <p className="text-base">{format(new Date(invoice.dueDate), 'PPP')}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-base capitalize">{invoice.status}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-base">{format(new Date(invoice.createdAt), 'PPP')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenant & Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.tenant && (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tenant Name</p>
                  <p className="text-base">
                    {invoice.tenant.firstName} {invoice.tenant.lastName}
                  </p>
                </div>

                {invoice.tenant.email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-base break-all">{invoice.tenant.email}</p>
                  </div>
                )}

                {invoice.tenant.phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="text-base">{invoice.tenant.phone}</p>
                  </div>
                )}
              </>
            )}

            {invoice.occupancy?.apartment && (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unit Number</p>
                  <p className="text-base">{invoice.occupancy.apartment.unitNumber}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Property</p>
                  <p className="text-base">{invoice.occupancy.apartment.compound?.name || 'N/A'}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems?.map((item, index) => {
                const itemQuantity = item.quantity || 0;
                const itemPrice = item.unitPrice || 0;
                const itemTotal = itemQuantity * itemPrice;

                return (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.description || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground capitalize">{item.type || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{itemQuantity}</TableCell>
                    <TableCell className="text-right">${itemPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${itemTotal.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="border-t-2">
                <TableCell colSpan={3} className="text-right font-bold">
                  Total
                </TableCell>
                <TableCell className="text-right font-bold text-lg">
                  ${totalAmount.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Email Send History */}
      {['sent', 'overdue', 'paid'].includes(invoice.status) && (
        <Card>
          <CardHeader>
            <CardTitle>Email Send History</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEmailLogs ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Loading send history...</p>
              </div>
            ) : emailLogs.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No email send history available.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.sentAt ? format(new Date(log.sentAt), 'PPp') : 'N/A'}
                      </TableCell>
                      <TableCell>{log.recipient}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.status === 'sent' || log.status === 'delivered'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'failed' || log.status === 'bounced'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.isResend
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {log.isResend ? 'Resend' : 'First Send'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <InvoiceFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          loadInvoice(params.id as string);
          setEditDialogOpen(false);
        }}
        invoice={invoice}
      />
    </div>
  );
}
