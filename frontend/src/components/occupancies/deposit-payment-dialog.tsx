'use client';

import { useState } from 'react';
import { Loader2, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { occupanciesService } from '@/services/occupancies.service';
import { getApiErrorMessage } from '@/lib/api';
import type { Occupancy } from '@/types';

interface DepositPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occupancy: Occupancy;
  onSuccess?: () => void;
}

export function DepositPaymentDialog({
  open,
  onOpenChange,
  occupancy,
  onSuccess,
}: DepositPaymentDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState(occupancy.securityDeposit?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'MOBILE' | 'CARD' | 'OTHER'>('BANK');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid deposit amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      await occupanciesService.recordDepositPayment(occupancy.id, {
        amount: parseFloat(amount),
        paymentMethod,
        paymentDate,
        reference: reference || undefined,
        notes: notes || undefined,
      });

      toast({
        title: 'Success',
        description: 'Deposit payment recorded successfully',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error recording deposit payment:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Deposit Payment</DialogTitle>
          <DialogDescription>
            Record security deposit payment for {occupancy.tenant?.firstName} {occupancy.tenant?.lastName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Occupancy Info */}
          <div className="p-4 bg-muted rounded-lg space-y-1">
            <div className="text-sm font-medium">
              {occupancy.tenant?.firstName} {occupancy.tenant?.lastName}
            </div>
            <div className="text-sm text-muted-foreground">
              Unit {occupancy.apartment?.unitNumber} • {occupancy.apartment?.compound?.name}
            </div>
            {occupancy.securityDeposit && (
              <div className="text-sm font-medium text-primary mt-2">
                Security Deposit: ${occupancy.securityDeposit.toLocaleString()}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Deposit Amount <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                required
                disabled={submitting}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              Payment Method <span className="text-destructive">*</span>
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(value: any) => setPaymentMethod(value)}
              disabled={submitting}
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK">Bank Transfer</SelectItem>
                <SelectItem value="MOBILE">Mobile Money</SelectItem>
                <SelectItem value="CARD">Card Payment</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">
              Payment Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference Number (Optional)</Label>
            <Input
              id="reference"
              type="text"
              placeholder="e.g., Transaction ID, Receipt #"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this payment..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
