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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { occupanciesService } from '@/services/occupancies.service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { Occupancy } from '@/types';
import { format } from 'date-fns';

const endLeaseSchema = z.object({
  moveOutDate: z.string().min(1, 'Move-out date is required'),
  notes: z.string().optional(),
});

type EndLeaseFormData = z.infer<typeof endLeaseSchema>;

interface EndLeaseDialogProps {
  occupancy: Occupancy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EndLeaseDialog({
  occupancy,
  open,
  onOpenChange,
  onSuccess,
}: EndLeaseDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EndLeaseFormData>({
    resolver: zodResolver(endLeaseSchema),
    defaultValues: {
      moveOutDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const endLeaseMutation = useMutation({
    mutationFn: (data: { moveOutDate: string; notes?: string }) =>
      occupanciesService.endLease(occupancy.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occupancies'] });
      queryClient.invalidateQueries({ queryKey: ['occupancies', occupancy.id] });
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
      queryClient.invalidateQueries({ queryKey: ['apartment-occupancy', occupancy.apartmentId] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Lease ended successfully');
      reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to end lease');
    },
  });

  const onSubmit = (data: EndLeaseFormData) => {
    endLeaseMutation.mutate({
      moveOutDate: data.moveOutDate,
      notes: data.notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>End Lease</DialogTitle>
          <DialogDescription>
            End the lease for {occupancy.tenant?.firstName} {occupancy.tenant?.lastName} at Unit{' '}
            {occupancy.apartment?.unitNumber}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will mark the lease as ended and make the apartment available. The security
            deposit will need to be processed separately.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Move-out Date */}
          <div className="space-y-2">
            <Label htmlFor="moveOutDate">
              Move-out Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="moveOutDate"
              type="date"
              max={format(new Date(), 'yyyy-MM-dd')}
              {...register('moveOutDate')}
            />
            {errors.moveOutDate && (
              <p className="text-sm text-red-500">{errors.moveOutDate.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Lease started: {format(new Date(occupancy.leaseStartDate), 'MMM dd, yyyy')}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Final Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Final inspection notes, damages, deposit deductions, etc."
              {...register('notes')}
            />
            <p className="text-xs text-muted-foreground">
              Document any damages, cleaning issues, or other important details.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Ending Lease...' : 'End Lease'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
