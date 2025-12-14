'use client';

import { useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { invoicesService } from '@/services/invoices.service';
import { getApiErrorMessage } from '@/lib/api';

interface SendInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoiceNumber: string;
    tenant?: {
      firstName: string;
      lastName: string;
      email: string;
    };
    totalAmount: number;
  };
  onSuccess?: () => void;
}

export function SendInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: SendInvoiceDialogProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const handleSend = async () => {
    try {
      setSending(true);

      await invoicesService.send(invoice.id, {
        message: customMessage || undefined,
      });

      toast({
        title: 'Success',
        description: `Invoice #${invoice.invoiceNumber} sent to ${invoice.tenant?.email}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (!invoice.tenant) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Send Invoice</DialogTitle>
            <DialogDescription>
              This invoice does not have an associated tenant or tenant email address.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Invoice</DialogTitle>
          <DialogDescription>
            Send invoice #{invoice.invoiceNumber} to the tenant via email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Recipient</span>
            </div>
            <div>
              <div className="font-medium">
                {invoice.tenant.firstName} {invoice.tenant.lastName}
              </div>
              <div className="text-sm text-muted-foreground">{invoice.tenant.email}</div>
            </div>
          </div>

          {/* Invoice Preview */}
          <div className="p-4 border rounded-lg space-y-2">
            <div className="text-sm text-muted-foreground">Invoice Details</div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Invoice #{invoice.invoiceNumber}</span>
              <span className="font-semibold">${invoice.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to include in the email..."
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              This message will be included at the top of the email
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Send Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
