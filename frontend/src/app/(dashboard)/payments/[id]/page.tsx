'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  DollarSign,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  Printer,
  Copy,
  Check,
  Edit,
  Trash2,
} from 'lucide-react';
import { paymentsService } from '@/services/payments.service';
import { invoicesService } from '@/services/invoices.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { PaymentFormDialog } from '@/components/payments/payment-form-dialog';
import { DeletePaymentDialog } from '@/components/payments/delete-payment-dialog';
import type { Payment, Invoice } from '@/types';

/**
 * Payment Detail Page
 *
 * Features:
 * - Display payment receipt
 * - Show related invoice details
 * - Payment method and reference info
 * - Print and download payment receipt
 * - Copy payment details
 */

interface PaymentDetail extends Payment {
  invoiceDetails?: Partial<Invoice>;
}

export default function PaymentDetailPage() {
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;

  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceNotFound, setInvoiceNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);

      // Fetch payment
      const paymentResponse = await paymentsService.getById(paymentId);

      if (paymentResponse.data) {
        setPayment(paymentResponse.data);

        // Fetch related invoice
        if (paymentResponse.data.invoiceId) {
          try {
            const invoiceResponse = await invoicesService.getById(paymentResponse.data.invoiceId);
            if (invoiceResponse.data) {
              setInvoice(invoiceResponse.data);
              setInvoiceNotFound(false);
            }
          } catch (error: any) {
            // Invoice was deleted or doesn't exist - this is OK, payment is still valid
            if (error?.response?.status === 404) {
              setInvoiceNotFound(true);
              setInvoice(null);
            } else {
              console.error('Failed to fetch invoice:', error);
            }
          }
        } else {
          // Payment has no associated invoice
          setInvoice(null);
          setInvoiceNotFound(false);
        }
      } else {
        toast({
          title: 'Error',
          description: 'Payment not found',
          variant: 'destructive',
        });
        router.push('/payments');
      }
    } catch (error) {
      console.error('Failed to fetch payment:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
      router.push('/payments');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!payment) return;

    // Create comprehensive receipt content
    const receiptContent = `
═══════════════════════════════════════════════════════════════
                        PAYMENT RECEIPT
═══════════════════════════════════════════════════════════════

Receipt Date: ${formatDate(new Date())}
Payment ID: ${payment.id}

───────────────────────────────────────────────────────────────
PAYMENT DETAILS
───────────────────────────────────────────────────────────────
Amount Paid:       ${formatCurrency(payment.amount, currency)}
Payment Method:    ${payment.method}
Payment Date:      ${formatDate(payment.paidAt)}
Reference:         ${payment.reference || 'N/A'}
${payment.notes ? `\nNotes:\n${payment.notes}\n` : ''}
${invoice?.tenant ? `
───────────────────────────────────────────────────────────────
TENANT INFORMATION
───────────────────────────────────────────────────────────────
Name:              ${invoice.tenant.firstName} ${invoice.tenant.lastName}
${invoice.tenant.email ? `Email:             ${invoice.tenant.email}\n` : ''}${invoice.tenant.phone ? `Phone:             ${invoice.tenant.phone}\n` : ''}` : ''}
${invoice?.occupancy?.apartment ? `
───────────────────────────────────────────────────────────────
PROPERTY & UNIT DETAILS
───────────────────────────────────────────────────────────────
Unit Number:       ${invoice.occupancy.apartment.unitNumber}
${invoice.occupancy.apartment.compound ? `Property Name:     ${invoice.occupancy.apartment.compound.name}
Address:           ${invoice.occupancy.apartment.compound.addressLine}
                   ${invoice.occupancy.apartment.compound.city}, ${invoice.occupancy.apartment.compound.country}
` : ''}${invoice.occupancy.apartment.bedrooms !== undefined ? `Bedrooms:          ${invoice.occupancy.apartment.bedrooms}\n` : ''}${invoice.occupancy.apartment.bathrooms !== undefined ? `Bathrooms:         ${invoice.occupancy.apartment.bathrooms}\n` : ''}${invoice.occupancy.apartment.floor !== undefined ? `Floor:             ${invoice.occupancy.apartment.floor}\n` : ''}${invoice.occupancy.monthlyRent ? `Monthly Rent:      ${formatCurrency(invoice.occupancy.monthlyRent, currency)}\n` : ''}` : ''}
${invoice ? `
───────────────────────────────────────────────────────────────
INVOICE DETAILS
───────────────────────────────────────────────────────────────
Invoice Number:    ${invoice.invoiceNumber}
Invoice Date:      ${formatDate(invoice.invoiceDate)}
Due Date:          ${formatDate(invoice.dueDate)}
Invoice Amount:    ${formatCurrency(invoice.totalAmount, currency)}
Amount Paid:       ${formatCurrency(invoice.amountPaid, currency)}
Outstanding:       ${formatCurrency(invoice.totalAmount - invoice.amountPaid, currency)}
Status:            ${invoice.status.toUpperCase()}
` : invoiceNotFound ? `
───────────────────────────────────────────────────────────────
INVOICE DETAILS
───────────────────────────────────────────────────────────────
Associated invoice no longer exists
` : ''}
═══════════════════════════════════════════════════════════════
This is an automated receipt. Please keep for your records.
═══════════════════════════════════════════════════════════════
    `.trim();

    // Create download link
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(receiptContent));
    element.setAttribute('download', `payment-receipt-${payment.reference || payment.id}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: 'Success',
      description: 'Receipt downloaded successfully',
    });
  };

  const handleCopyReference = () => {
    if (payment?.reference) {
      navigator.clipboard.writeText(payment.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEditSuccess = () => {
    fetchPaymentDetails();
  };

  const handleDeleteConfirm = async () => {
    if (!payment) return;

    try {
      await paymentsService.delete(payment.id);
      toast({
        title: 'Success',
        description: 'Payment deleted successfully',
      });
      router.push('/payments');
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return '💵';
      case 'BANK':
        return '🏦';
      case 'MOBILE':
        return '📱';
      case 'CARD':
        return '💳';
      default:
        return '💰';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!payment) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Payment not found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            The payment you're looking for doesn't exist or has been deleted
          </p>
          <Button onClick={() => router.push('/payments')}>Back to Payments</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/payments')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Receipt</h1>
            <p className="text-muted-foreground">
              {formatDate(new Date().toISOString())}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {payment.isActive ? (
            <>
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          ) : (
            <Badge variant="destructive">Deleted</Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" onClick={handleDownloadReceipt} className="gap-2">
          <Download className="h-4 w-4" />
          Download Receipt
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Receipt Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Payment Confirmed</CardTitle>
                  <CardDescription>
                    Reference: {payment.reference || 'N/A'}
                  </CardDescription>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Display */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <p className="text-sm text-green-700 font-medium mb-2">Amount Paid</p>
                <p className="text-4xl font-bold text-green-900">
                  {formatCurrency(payment.amount, currency)}
                </p>
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Payment Method</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl">{getPaymentMethodIcon(payment.method)}</span>
                    <span className="font-semibold">{payment.method}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Payment Date</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{formatDate(payment.paidAt)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Reference Number */}
              {payment.reference && (
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-2">Reference Number</p>
                  <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg">
                    <code className="font-mono font-medium flex-1">{payment.reference}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyReference}
                      className="gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes */}
              {payment.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-2">Notes</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                      {payment.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details */}
          {invoice ? (
            <Card>
              <CardHeader>
                <CardTitle>Related Invoice</CardTitle>
                <CardDescription>
                  Invoice #{invoice.invoiceNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Number</p>
                    <p className="font-semibold mt-1">#{invoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Date</p>
                    <p className="font-semibold mt-1">{formatDate(invoice.invoiceDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-semibold mt-1">{formatDate(invoice.dueDate)}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Amount</p>
                    <p className="font-semibold mt-1">
                      {formatCurrency(invoice.totalAmount, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="font-semibold text-green-600 mt-1">
                      {formatCurrency(invoice.amountPaid, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className={`font-semibold mt-1 ${invoice.totalAmount - invoice.amountPaid > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(invoice.totalAmount - invoice.amountPaid, currency)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={invoice.status === 'paid' ? 'success' : 'default'}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-2 gap-2"
                  onClick={() => router.push(`/invoices/${invoice.id}`)}
                >
                  <FileText className="h-4 w-4" />
                  View Full Invoice
                </Button>
              </CardContent>
            </Card>
          ) : invoiceNotFound ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Invoice Not Found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  This payment was associated with an invoice that has been deleted or no longer exists.
                  The payment record remains valid.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          {/* Tenant Information Card */}
          {invoice?.tenant && (
            <Card>
              <CardHeader>
                <CardTitle>Tenant Information</CardTitle>
                <CardDescription>Payment made by</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold mt-1">
                    {invoice.tenant.firstName} {invoice.tenant.lastName}
                  </p>
                </div>

                {invoice.tenant.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium mt-1 text-sm break-all">
                      {invoice.tenant.email}
                    </p>
                  </div>
                )}

                {invoice.tenant.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium mt-1">{invoice.tenant.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Property & Unit Details Card */}
          {invoice?.occupancy?.apartment && (
            <Card>
              <CardHeader>
                <CardTitle>Property & Unit Details</CardTitle>
                <CardDescription>Payment for</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Unit Number</p>
                  <p className="font-semibold mt-1">
                    {invoice.occupancy.apartment.unitNumber}
                  </p>
                </div>

                {invoice.occupancy.apartment.compound && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Property Name</p>
                      <p className="font-medium mt-1">
                        {invoice.occupancy.apartment.compound.name}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium mt-1 text-sm">
                        {invoice.occupancy.apartment.compound.addressLine}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {invoice.occupancy.apartment.compound.city}, {invoice.occupancy.apartment.compound.country}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  {invoice.occupancy.apartment.bedrooms !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p className="font-medium mt-1">
                        {invoice.occupancy.apartment.bedrooms}
                      </p>
                    </div>
                  )}

                  {invoice.occupancy.apartment.bathrooms !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p className="font-medium mt-1">
                        {invoice.occupancy.apartment.bathrooms}
                      </p>
                    </div>
                  )}

                  {invoice.occupancy.apartment.floor !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Floor</p>
                      <p className="font-medium mt-1">
                        {invoice.occupancy.apartment.floor}
                      </p>
                    </div>
                  )}

                  {invoice.occupancy.monthlyRent && (
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Rent</p>
                      <p className="font-medium mt-1">
                        {formatCurrency(invoice.occupancy.monthlyRent, currency)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Payment ID</p>
                <p className="font-mono text-sm font-semibold mt-1 break-all">{payment.id}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(payment.amount, currency)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-semibold mt-1">{payment.method}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Date & Time</p>
                <p className="font-semibold mt-1">{formatDate(payment.paidAt)}</p>
              </div>

              {payment.reference && (
                <div>
                  <p className="text-sm text-muted-foreground">Reference</p>
                  <p className="font-mono text-sm font-semibold mt-1 break-all">{payment.reference}</p>
                </div>
              )}

              <Separator />

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Payment Recorded</p>
                  <p className="text-xs text-green-800 mt-0.5">
                    This payment has been successfully recorded in the system
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Payment Dialog */}
      {payment && (
        <>
          <PaymentFormDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            payment={payment}
            onSuccess={handleEditSuccess}
          />

          <DeletePaymentDialog
            payment={payment}
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={handleDeleteConfirm}
          />
        </>
      )}
    </div>
  );
}
