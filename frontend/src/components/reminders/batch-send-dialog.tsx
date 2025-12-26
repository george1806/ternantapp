'use client';

import { useState } from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { remindersService, type BatchSendResponse } from '@/services/reminders.service';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';

interface BatchSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BatchSendDialog({ open, onOpenChange, onSuccess }: BatchSendDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [reminderType, setReminderType] = useState<'DUE_SOON' | 'OVERDUE'>('DUE_SOON');
  const [result, setResult] = useState<BatchSendResponse | null>(null);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setResult(null);

      const response = await remindersService.batchSend({
        type: reminderType,
        dryRun,
      });

      setResult(response.data);

      if (!dryRun) {
        toast({
          title: 'Success',
          description: `${response.data.totalQueued} reminders queued for sending`,
        });

        if (onSuccess) {
          onSuccess();
        }

        // Close dialog after actual send
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        toast({
          title: 'Dry Run Complete',
          description: `Would send ${response.data.totalQueued} reminders. Disable dry-run to actually send.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setDryRun(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch Send Reminders</DialogTitle>
          <DialogDescription>
            Send reminders to multiple tenants at once based on invoice status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reminder Type */}
          <div className="space-y-2">
            <Label htmlFor="reminderType">Reminder Type</Label>
            <Select
              value={reminderType}
              onValueChange={(value: 'DUE_SOON' | 'OVERDUE') => setReminderType(value)}
            >
              <SelectTrigger id="reminderType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DUE_SOON">Due Soon (Rent due in next few days)</SelectItem>
                <SelectItem value="OVERDUE">Overdue (Rent payment is late)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dry Run Toggle */}
          <div className="flex items-center justify-between space-x-2 rounded-md border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="dryRun" className="text-base">
                Dry Run Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Preview what would be sent without actually sending emails
              </p>
            </div>
            <Switch id="dryRun" checked={dryRun} onCheckedChange={setDryRun} />
          </div>

          {/* Warning for actual send */}
          {!dryRun && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This will send actual emails to tenants. Make sure you've
                tested with dry-run mode first.
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {result && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Eligible:</span>
                    <span>{result.totalEligible}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {dryRun ? 'Would Queue:' : 'Queued:'}
                    </span>
                    <span className="text-green-600 font-bold">{result.totalQueued}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Skipped:</span>
                    <span className="text-yellow-600">{result.totalSkipped}</span>
                  </div>

                  {result.skippedReasons && Object.keys(result.skippedReasons).length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Skip Reasons:</p>
                      <div className="space-y-1">
                        {Object.entries(result.skippedReasons).map(([reason, count]) => (
                          <div key={reason} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{reason}:</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.reminders && result.reminders.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">
                        {dryRun ? 'Would Send To:' : 'Sent To:'}
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {result.reminders.slice(0, 10).map((reminder, index) => (
                          <div key={index} className="text-sm flex justify-between">
                            <span className="truncate">{reminder.tenantName}</span>
                            <span className="text-muted-foreground ml-2">{reminder.recipient}</span>
                          </div>
                        ))}
                        {result.reminders.length > 10 && (
                          <p className="text-xs text-muted-foreground">
                            ... and {result.reminders.length - 10} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {result && !dryRun ? 'Close' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Send className="h-4 w-4 mr-2" />
            {loading
              ? 'Processing...'
              : dryRun
              ? 'Preview (Dry Run)'
              : 'Send Reminders'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
