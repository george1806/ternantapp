'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Payment } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

/**
 * Delete Payment Dialog Component
 *
 * Features:
 * - Confirmation dialog for payment deletion
 * - Display payment amount and reference
 * - Show related invoice information
 * - Warning about reverting invoice balance
 * - Loading state during deletion
 */

interface DeletePaymentDialogProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeletePaymentDialog({
  payment,
  open,
  onOpenChange,
  onConfirm,
}: DeletePaymentDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Payment
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this payment? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Details */}
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="font-semibold text-destructive">
                {formatCurrency(payment.amount, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Reference:</span>
              <span className="font-medium">{payment.reference || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment Method:</span>
              <span className="font-medium">{payment.method}</span>
            </div>
            {payment.invoice && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Invoice:</span>
                <span className="font-medium">
                  #{payment.invoice.invoiceNumber}
                </span>
              </div>
            )}
          </div>

          {/* Warning Message */}
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Deleting this payment will revert the invoice balance
              and update the invoice status accordingly.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deleting ? 'Deleting...' : 'Delete Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
