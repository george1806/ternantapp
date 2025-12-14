'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { remindersService, type Reminder } from '@/services/reminders.service';
import { getApiErrorMessage } from '@/lib/api';

const reminderSchema = z.object({
  type: z.enum(['rent_due', 'payment_received', 'lease_expiring', 'custom']),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  sendAt: z.string().min(1, 'Send date is required'),
  channel: z.enum(['email', 'sms', 'both']),
  tenantId: z.string().optional(),
  occupancyId: z.string().optional(),
  invoiceId: z.string().optional(),
});

type ReminderFormData = z.infer<typeof reminderSchema>;

interface ReminderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder?: Reminder | null;
  onSuccess?: () => void;
  defaultValues?: Partial<ReminderFormData>;
}

export function ReminderFormDialog({
  open,
  onOpenChange,
  reminder,
  onSuccess,
  defaultValues,
}: ReminderFormDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      type: 'custom',
      channel: 'email',
      ...defaultValues,
    },
  });

  const selectedType = watch('type');
  const selectedChannel = watch('channel');

  useEffect(() => {
    if (reminder) {
      // Editing existing reminder
      reset({
        type: reminder.type,
        subject: reminder.subject,
        message: reminder.message,
        sendAt: reminder.sendAt.split('T')[0] + 'T' + reminder.sendAt.split('T')[1]?.substring(0, 5) || '',
        channel: reminder.channel,
        tenantId: reminder.tenantId,
        occupancyId: reminder.occupancyId,
        invoiceId: reminder.invoiceId,
      });
    } else if (defaultValues) {
      reset({
        type: 'custom',
        channel: 'email',
        ...defaultValues,
      });
    } else {
      // New reminder
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const dateTimeString = tomorrow.toISOString().slice(0, 16);

      reset({
        type: 'custom',
        channel: 'email',
        sendAt: dateTimeString,
        subject: '',
        message: '',
      });
    }
  }, [reminder, defaultValues, reset, open]);

  const onSubmit = async (data: ReminderFormData) => {
    try {
      setIsLoading(true);

      if (reminder) {
        // Update existing reminder
        await remindersService.update(reminder.id, {
          subject: data.subject,
          message: data.message,
          sendAt: new Date(data.sendAt).toISOString(),
          channel: data.channel,
        });

        toast({
          title: 'Success',
          description: 'Reminder updated successfully',
        });
      } else {
        // Create new reminder
        await remindersService.create({
          type: data.type,
          subject: data.subject,
          message: data.message,
          sendAt: new Date(data.sendAt).toISOString(),
          channel: data.channel,
          tenantId: data.tenantId,
          occupancyId: data.occupancyId,
          invoiceId: data.invoiceId,
        });

        toast({
          title: 'Success',
          description: 'Reminder created successfully',
        });
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving reminder:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {reminder ? 'Edit Reminder' : 'Create New Reminder'}
          </DialogTitle>
          <DialogDescription>
            {reminder
              ? 'Update the reminder details'
              : 'Schedule an automated notification for your tenants'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Reminder Type</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setValue('type', value as any)}
              disabled={!!reminder || isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent_due">Rent Due</SelectItem>
                <SelectItem value="payment_received">Payment Received</SelectItem>
                <SelectItem value="lease_expiring">Lease Expiring</SelectItem>
                <SelectItem value="custom">Custom Message</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Payment Reminder: Rent Due Soon"
              {...register('subject')}
              disabled={isLoading}
            />
            {errors.subject && (
              <p className="text-sm text-destructive">{errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Dear [Tenant Name], this is a friendly reminder that your rent payment is due on [Due Date]..."
              rows={6}
              {...register('message')}
              disabled={isLoading}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              You can use placeholders like [Tenant Name], [Amount], [Due Date] in your message
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sendAt">Send Date & Time</Label>
              <Input
                id="sendAt"
                type="datetime-local"
                {...register('sendAt')}
                disabled={isLoading}
              />
              {errors.sendAt && (
                <p className="text-sm text-destructive">{errors.sendAt.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Send Via</Label>
              <Select
                value={selectedChannel}
                onValueChange={(value) => setValue('channel', value as any)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="both">Email & SMS</SelectItem>
                </SelectContent>
              </Select>
              {errors.channel && (
                <p className="text-sm text-destructive">{errors.channel.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reminder ? 'Update Reminder' : 'Create Reminder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
