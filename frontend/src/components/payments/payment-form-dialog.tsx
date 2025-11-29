'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { paymentsService } from '@/services/payments.service';
import { invoicesService } from '@/services/invoices.service';
import { getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Invoice } from '@/types';
import { Loader2 } from 'lucide-react';

/**
 * Payment Form Dialog Component
 *
 * Features:
 * - Record new payment against an invoice
 * - Select payment method (CASH, BANK, MOBILE, CARD, OTHER)
 * - Add reference number and notes
 * - Comprehensive form validation with Zod
 * - Load unpaid invoices from backend
 * - Real-time amount calculation
 * - Loading states and error handling
 */

const paymentFormSchema = z.object({
  invoiceId: z.string().min(1, 'Please select an invoice'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paidAt: z.string().min(1, 'Payment date is required'),
  method: z.enum(['CASH', 'BANK', 'MOBILE', 'CARD', 'OTHER'], {
    errorMap: () => ({ message: 'Please select a valid payment method' }),
  }),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: PaymentFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { toast } = useToast();
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      paidAt: new Date().toISOString().split('T')[0],
      method: 'CASH',
      reference: '',
      notes: '',
    },
  });

  const invoiceId = watch('invoiceId');
  const amount = watch('amount');

  // Load unpaid invoices when dialog opens
  useEffect(() => {
    if (open) {
      loadUnpaidInvoices();
    }
  }, [open]);

  // Update selected invoice when invoiceId changes
  useEffect(() => {
    if (invoiceId) {
      const invoice = invoices.find((inv) => inv.id === invoiceId);
      setSelectedInvoice(invoice || null);
      if (invoice) {
        const remainingAmount = invoice.totalAmount - invoice.paidAmount;
        setValue('amount', remainingAmount);
      }
    }
  }, [invoiceId, invoices, setValue]);

  const loadUnpaidInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const response = await invoicesService.getAll({
        status: 'sent',
        limit: 100,
        page: 1,
      });

      if (response.data?.data) {
        // Filter invoices that still have unpaid amount
        const unpaidInvoices = response.data.data.filter(
          (inv) => inv.totalAmount > inv.paidAmount
        );
        setInvoices(unpaidInvoices);

        if (unpaidInvoices.length === 0) {
          toast({
            title: 'Info',
            description: 'No unpaid invoices available',
            variant: 'default',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoadingInvoices(false);
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      setSubmitting(true);

      await paymentsService.create({
        invoiceId: data.invoiceId,
        amount: data.amount,
        paidAt: new Date(data.paidAt).toISOString(),
        method: data.method,
        reference: data.reference,
        notes: data.notes,
      });

      toast({
        title: 'Success',
        description: 'Payment recorded successfully!',
      });

      reset();
      setSelectedInvoice(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getInvoiceInfo = () => {
    if (!selectedInvoice) return null;
    const remaining = selectedInvoice.totalAmount - selectedInvoice.paidAmount;
    return {
      invoiceNumber: selectedInvoice.invoiceNumber,
      totalAmount: selectedInvoice.totalAmount,
      paidAmount: selectedInvoice.paidAmount,
      remaining,
    };
  };

  const info = getInvoiceInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment against an unpaid invoice
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Invoice Selection */}
          <div className="space-y-2">
            <Label htmlFor="invoiceId">Invoice *</Label>
            <select
              {...register('invoiceId')}
              id="invoiceId"
              disabled={loadingInvoices || submitting}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {loadingInvoices ? 'Loading invoices...' : 'Select an invoice'}
              </option>
              {invoices.map((invoice) => {
                const remaining = invoice.totalAmount - invoice.paidAmount;
                return (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} - {remaining.toFixed(2)} {currency} due
                  </option>
                );
              })}
            </select>
            {errors.invoiceId && (
              <span className="text-sm text-destructive">{errors.invoiceId.message}</span>
            )}
          </div>

          {/* Invoice Info */}
          {info && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-medium">{info.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">
                    {info.totalAmount.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="font-medium">
                    {info.paidAmount.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="border-t border-muted pt-1 flex justify-between">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-medium text-green-600">
                    {info.remaining.toFixed(2)} {currency}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({currency}) *</Label>
            <Input
              {...register('amount', { valueAsNumber: true })}
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              disabled={submitting}
            />
            {errors.amount && (
              <span className="text-sm text-destructive">{errors.amount.message}</span>
            )}
            {info && amount > info.remaining && (
              <span className="text-sm text-yellow-600">
                Amount exceeds remaining balance ({info.remaining.toFixed(2)} {currency})
              </span>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paidAt">Payment Date *</Label>
            <Input
              {...register('paidAt')}
              id="paidAt"
              type="date"
              disabled={submitting}
            />
            {errors.paidAt && (
              <span className="text-sm text-destructive">{errors.paidAt.message}</span>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="method">Payment Method *</Label>
            <select
              {...register('method')}
              id="method"
              disabled={submitting}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
              <option value="MOBILE">Mobile Money</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.method && (
              <span className="text-sm text-destructive">{errors.method.message}</span>
            )}
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference Number</Label>
            <Input
              {...register('reference')}
              id="reference"
              placeholder="e.g., TXN-2024-001 or check number"
              disabled={submitting}
            />
            {errors.reference && (
              <span className="text-sm text-destructive">{errors.reference.message}</span>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              {...register('notes')}
              id="notes"
              placeholder="Additional payment details..."
              disabled={submitting}
              rows={3}
            />
            {errors.notes && (
              <span className="text-sm text-destructive">{errors.notes.message}</span>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loadingInvoices}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
