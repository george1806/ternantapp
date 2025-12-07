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
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
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

      if (paymentResponse.data?.data) {
        const paymentData = paymentResponse.data.data;
        setPayment(paymentData);

        // Fetch related invoice
        if (paymentData.invoiceId) {
          try {
            const invoiceResponse = await invoicesService.getById(paymentData.invoiceId);
            if (invoiceResponse.data?.data) {
              setInvoice(invoiceResponse.data.data);
            }
          } catch (error) {
            console.error('Failed to fetch invoice:', error);
          }
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

    // Create receipt content
    const receiptContent = `
PAYMENT RECEIPT
===============================

Payment ID: ${payment.id}
Date: ${formatDate(new Date())}
Reference: ${payment.reference || 'N/A'}

PAYMENT DETAILS
===============================
Amount: ${formatCurrency(payment.amount, currency)}
Payment Method: ${payment.method}
Paid Date: ${formatDate(payment.paidAt)}

${invoice ? `
INVOICE DETAILS
===============================
Invoice #: ${invoice.invoiceNumber}
Invoice Date: ${formatDate(invoice.issueDate)}
Invoice Amount: ${formatCurrency(invoice.totalAmount, currency)}
Status: ${invoice.status}
` : ''}

NOTES
===============================
${payment.notes || 'No notes'}

===============================
This is an automated receipt. Please keep for your records.
    `;

    // Create download link
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(receiptContent));
    element.setAttribute('download', `payment-receipt-${payment.id}.txt`);
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
          {invoice && (
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
                    <p className="font-semibold mt-1">{formatDate(invoice.issueDate)}</p>
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
                      {formatCurrency(invoice.paidAmount, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className={`font-semibold mt-1 ${invoice.totalAmount - invoice.paidAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(invoice.totalAmount - invoice.paidAmount, currency)}
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
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
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
    </div>
  );
}
