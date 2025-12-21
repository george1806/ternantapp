'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { occupanciesService } from '@/services/occupancies.service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { Occupancy } from '@/types';

const cancelLeaseSchema = z.object({
  reason: z.string().min(10, 'Please provide a detailed reason (at least 10 characters)'),
});

type CancelLeaseFormData = z.infer<typeof cancelLeaseSchema>;

interface CancelLeaseDialogProps {
  occupancy: Occupancy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CancelLeaseDialog({
  occupancy,
  open,
  onOpenChange,
  onSuccess,
}: CancelLeaseDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CancelLeaseFormData>({
    resolver: zodResolver(cancelLeaseSchema),
  });

  const cancelLeaseMutation = useMutation({
    mutationFn: (data: { reason: string }) =>
      occupanciesService.cancelLease(occupancy.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occupancies'] });
      queryClient.invalidateQueries({ queryKey: ['occupancies', occupancy.id] });
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
      queryClient.invalidateQueries({ queryKey: ['apartment-occupancy', occupancy.apartmentId] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Lease cancelled successfully');
      reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel lease');
    },
  });

  const onSubmit = (data: CancelLeaseFormData) => {
    cancelLeaseMutation.mutate({
      reason: data.reason,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Lease</DialogTitle>
          <DialogDescription>
            Cancel the lease for {occupancy.tenant?.firstName} {occupancy.tenant?.lastName} at Unit{' '}
            {occupancy.apartment?.unitNumber}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This action cannot be undone. The lease will be permanently marked as cancelled. The
            apartment will become available for new tenants.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Cancellation Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              rows={4}
              placeholder="Provide a detailed reason for cancelling this lease..."
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-sm text-red-500">{errors.reason.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Document why the lease is being cancelled. This is important for record-keeping and
              potential disputes.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Keep Lease
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Cancelling...' : 'Cancel Lease'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
