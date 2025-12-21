'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { tenantsService } from '@/services/tenants.service';
import { occupanciesService } from '@/services/occupancies.service';
import type { Apartment } from '@/types';

const assignSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  leaseStartDate: z.string().min(1, 'Lease start date is required'),
  leaseEndDate: z.string().min(1, 'Lease end date is required'),
  monthlyRent: z.string().min(1, 'Monthly rent is required'),
  securityDeposit: z.string().optional(),
  depositPaid: z.string().optional(),
  moveInDate: z.string().optional(),
  notes: z.string().optional(),
});

type AssignFormData = z.infer<typeof assignSchema>;

interface QuickAssignDialogProps {
  apartment: Apartment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function QuickAssignDialog({
  apartment,
  open,
  onOpenChange,
  onSuccess,
}: QuickAssignDialogProps) {
  const queryClient = useQueryClient();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AssignFormData>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      monthlyRent: apartment.monthlyRent.toString(),
    },
  });

  // Fetch active tenants
  const { data: tenantsData } = useQuery({
    queryKey: ['tenants', 'active'],
    queryFn: () => tenantsService.getAll({ status: 'active', limit: 100 }),
  });

  const tenants = tenantsData?.data?.data || [];

  const createOccupancyMutation = useMutation({
    mutationFn: occupanciesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occupancies'] });
      queryClient.invalidateQueries({ queryKey: ['apartments', apartment.id] });
      queryClient.invalidateQueries({ queryKey: ['apartment-occupancy', apartment.id] });
      toast.success('Tenant assigned successfully');
      reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign tenant');
    },
  });

  const onSubmit = (data: AssignFormData) => {
    const payload = {
      apartmentId: apartment.id,
      tenantId: data.tenantId,
      leaseStartDate: data.leaseStartDate,
      leaseEndDate: data.leaseEndDate,
      monthlyRent: parseFloat(data.monthlyRent),
      securityDeposit: data.securityDeposit ? parseFloat(data.securityDeposit) : undefined,
      depositPaid: data.depositPaid ? parseFloat(data.depositPaid) : undefined,
      moveInDate: data.moveInDate || undefined,
      notes: data.notes || undefined,
    };

    createOccupancyMutation.mutate(payload);
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        monthlyRent: apartment.monthlyRent.toString(),
      });
      setSelectedTenantId('');
    }
  }, [open, apartment.monthlyRent, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Tenant to {apartment.unitNumber}</DialogTitle>
          <DialogDescription>
            Create a new lease agreement for this apartment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tenant Selection */}
          <div className="space-y-2">
            <Label htmlFor="tenantId">
              Tenant <span className="text-red-500">*</span>
            </Label>
            <Combobox
              options={tenants.map((tenant): ComboboxOption => ({
                value: tenant.id,
                label: `${tenant.firstName} ${tenant.lastName}`,
                sublabel: tenant.email,
                disabled: tenant.status !== 'active',
              }))}
              value={selectedTenantId}
              onValueChange={(value) => {
                setSelectedTenantId(value);
                setValue('tenantId', value);
              }}
              placeholder="Select tenant..."
              searchPlaceholder="Search by name or email..."
              emptyText="No active tenants found"
            />
            {errors.tenantId && (
              <p className="text-sm text-red-500">{errors.tenantId.message}</p>
            )}
          </div>

          {/* Lease Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leaseStartDate">
                Lease Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="leaseStartDate"
                type="date"
                {...register('leaseStartDate')}
              />
              {errors.leaseStartDate && (
                <p className="text-sm text-red-500">{errors.leaseStartDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaseEndDate">
                Lease End Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="leaseEndDate"
                type="date"
                {...register('leaseEndDate')}
              />
              {errors.leaseEndDate && (
                <p className="text-sm text-red-500">{errors.leaseEndDate.message}</p>
              )}
            </div>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyRent">
                Monthly Rent <span className="text-red-500">*</span>
              </Label>
              <Input
                id="monthlyRent"
                type="number"
                step="0.01"
                {...register('monthlyRent')}
              />
              {errors.monthlyRent && (
                <p className="text-sm text-red-500">{errors.monthlyRent.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="securityDeposit">Security Deposit</Label>
              <Input
                id="securityDeposit"
                type="number"
                step="0.01"
                {...register('securityDeposit')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depositPaid">Deposit Paid</Label>
              <Input
                id="depositPaid"
                type="number"
                step="0.01"
                {...register('depositPaid')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="moveInDate">Move-in Date</Label>
              <Input
                id="moveInDate"
                type="date"
                {...register('moveInDate')}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Additional notes about this lease..."
              {...register('notes')}
            />
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
              {isSubmitting ? 'Assigning...' : 'Assign Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
