'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { getApiErrorMessage } from '@/lib/api';
import { occupanciesService, type CreateOccupancyDto } from '@/services/occupancies.service';
import { apartmentsService } from '@/services/apartments.service';
import { tenantsService } from '@/services/tenants.service';
import { compoundsService } from '@/services/compounds.service';
import type { Occupancy, Apartment, Tenant, Compound } from '@/types';
import { Loader2 } from 'lucide-react';

const occupancyFormSchema = z.object({
  compoundId: z.string().optional(),
  apartmentId: z.string().min(1, 'Apartment is required'),
  tenantId: z.string().min(1, 'Tenant is required'),
  leaseStartDate: z.string().min(1, 'Lease start date is required'),
  leaseEndDate: z.string().min(1, 'Lease end date is required'),
  monthlyRent: z.coerce.number().min(0, 'Monthly rent must be 0 or more'),
  securityDeposit: z.coerce.number().min(0, 'Security deposit must be 0 or more').optional().nullable(),
  depositPaid: z.coerce.number().min(0, 'Deposit paid must be 0 or more').optional().nullable(),
  moveInDate: z.string().optional(),
  status: z.enum(['pending', 'active', 'ended', 'cancelled']).optional(),
  notes: z.string().optional(),
});

type OccupancyFormData = z.infer<typeof occupancyFormSchema>;

interface OccupancyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occupancy?: Occupancy | null;
  onSuccess: () => void;
  preselectedApartmentId?: string;
  preselectedTenantId?: string;
}

export function OccupancyFormDialog({
  open,
  onOpenChange,
  occupancy,
  onSuccess,
  preselectedApartmentId,
  preselectedTenantId,
}: OccupancyFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingCompounds, setLoadingCompounds] = useState(true);
  const [loadingApartments, setLoadingApartments] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);

  const isEditing = !!occupancy;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<OccupancyFormData>({
    resolver: zodResolver(occupancyFormSchema) as any,
    defaultValues: {
      compoundId: '',
      apartmentId: preselectedApartmentId || '',
      tenantId: preselectedTenantId || '',
      leaseStartDate: '',
      leaseEndDate: '',
      monthlyRent: 0,
      securityDeposit: null,
      depositPaid: null,
      moveInDate: '',
      status: 'pending',
      notes: '',
    },
  });

  const selectedCompoundId = watch('compoundId');
  const selectedApartmentId = watch('apartmentId');
  const selectedTenantId = watch('tenantId');
  const selectedStatus = watch('status');

  useEffect(() => {
    if (open) {
      fetchCompounds();
      fetchTenants();
      if (occupancy) {
        setValue('apartmentId', occupancy.apartmentId);
        setValue('tenantId', occupancy.tenantId);
        setValue('leaseStartDate', occupancy.leaseStartDate.split('T')[0]);
        setValue('leaseEndDate', occupancy.leaseEndDate.split('T')[0]);
        setValue('monthlyRent', occupancy.monthlyRent);
        setValue('securityDeposit', occupancy.securityDeposit || null);
        setValue('depositPaid', occupancy.depositPaid || null);
        setValue('moveInDate', occupancy.moveInDate ? occupancy.moveInDate.split('T')[0] : '');
        setValue('status', occupancy.status);
        setValue('notes', occupancy.notes || '');

        // Set compound if apartment has one
        if (occupancy.apartment?.compoundId) {
          setValue('compoundId', occupancy.apartment.compoundId);
        }
      } else {
        if (preselectedApartmentId) {
          setValue('apartmentId', preselectedApartmentId);
        }
        if (preselectedTenantId) {
          setValue('tenantId', preselectedTenantId);
        }
      }
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, occupancy, preselectedApartmentId, preselectedTenantId, setValue, reset]);

  useEffect(() => {
    if (selectedCompoundId) {
      fetchApartmentsByCompound(selectedCompoundId);
    } else {
      fetchAllApartments();
    }
     
  }, [selectedCompoundId]);

  // Auto-fill monthly rent when apartment is selected
  useEffect(() => {
    if (selectedApartmentId && apartments.length > 0) {
      const apartment = apartments.find((a) => a.id === selectedApartmentId);
      if (apartment && !isEditing) {
        setValue('monthlyRent', apartment.monthlyRent);
      }
    }
     
  }, [selectedApartmentId, apartments, isEditing, setValue]);

  const fetchCompounds = async () => {
    try {
      setLoadingCompounds(true);
      const response = await compoundsService.getAll({ limit: 100 });
      if (response.data?.data) {
        setCompounds(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch compounds:', error);
      toast({
        title: 'Error',
        description: 'Failed to load properties',
        variant: 'destructive',
      });
    } finally {
      setLoadingCompounds(false);
    }
  };

  const fetchAllApartments = async () => {
    try {
      setLoadingApartments(true);
      const response = await apartmentsService.getAll({ limit: 100, status: 'available' });
      if (response.data?.data) {
        setApartments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch apartments:', error);
    } finally {
      setLoadingApartments(false);
    }
  };

  const fetchApartmentsByCompound = async (compoundId: string) => {
    try {
      setLoadingApartments(true);
      const response = await apartmentsService.getByCompound(compoundId, { limit: 100 });
      if (response.data?.data) {
        setApartments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch apartments:', error);
    } finally {
      setLoadingApartments(false);
    }
  };

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const response = await tenantsService.getAll({ limit: 100, status: 'active' });
      if (response.data?.data) {
        setTenants(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tenants',
        variant: 'destructive',
      });
    } finally {
      setLoadingTenants(false);
    }
  };

  const onSubmit = async (data: OccupancyFormData) => {
    try {
      setSubmitting(true);

      const payload: CreateOccupancyDto = {
        apartmentId: data.apartmentId,
        tenantId: data.tenantId,
        leaseStartDate: data.leaseStartDate,
        leaseEndDate: data.leaseEndDate,
        monthlyRent: data.monthlyRent,
        securityDeposit: data.securityDeposit || undefined,
        depositPaid: data.depositPaid || undefined,
        moveInDate: data.moveInDate || undefined,
        status: data.status,
        notes: data.notes || undefined,
      };

      if (isEditing && occupancy) {
        await occupanciesService.update(occupancy.id, payload);
        toast({
          title: 'Success',
          description: 'Occupancy updated successfully',
        });
      } else {
        await occupanciesService.create(payload);
        toast({
          title: 'Success',
          description: 'Tenant assigned to apartment successfully',
        });
      }

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to save occupancy:', error);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Occupancy' : 'Assign Tenant to Apartment'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update occupancy/lease details'
              : 'Create a new lease agreement by assigning a tenant to an apartment'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Property Filter (Optional) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="compoundId">Filter by Property (Optional)</Label>
              {loadingCompounds ? (
                <div className="flex items-center justify-center py-3 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select
                  value={selectedCompoundId}
                  onValueChange={(value) => setValue('compoundId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Properties</SelectItem>
                    {compounds.map((compound) => (
                      <SelectItem key={compound.id} value={compound.id}>
                        {compound.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Apartment and Tenant Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="apartmentId">
                Apartment <span className="text-destructive">*</span>
              </Label>
              {loadingApartments ? (
                <div className="flex items-center justify-center py-3 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select
                  value={selectedApartmentId}
                  onValueChange={(value) => setValue('apartmentId', value)}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select apartment" />
                  </SelectTrigger>
                  <SelectContent>
                    {apartments.map((apartment) => (
                      <SelectItem key={apartment.id} value={apartment.id}>
                        Unit {apartment.unitNumber}
                        {apartment.compound && ` - ${apartment.compound.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.apartmentId && (
                <p className="text-sm text-destructive">{errors.apartmentId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantId">
                Tenant <span className="text-destructive">*</span>
              </Label>
              {loadingTenants ? (
                <div className="flex items-center justify-center py-3 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select
                  value={selectedTenantId}
                  onValueChange={(value) => setValue('tenantId', value)}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.firstName} {tenant.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.tenantId && (
                <p className="text-sm text-destructive">{errors.tenantId.message}</p>
              )}
            </div>
          </div>

          {/* Lease Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leaseStartDate">
                Lease Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="leaseStartDate"
                type="date"
                {...register('leaseStartDate')}
              />
              {errors.leaseStartDate && (
                <p className="text-sm text-destructive">{errors.leaseStartDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaseEndDate">
                Lease End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="leaseEndDate"
                type="date"
                {...register('leaseEndDate')}
              />
              {errors.leaseEndDate && (
                <p className="text-sm text-destructive">{errors.leaseEndDate.message}</p>
              )}
            </div>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyRent">
                Monthly Rent <span className="text-destructive">*</span>
              </Label>
              <Input
                id="monthlyRent"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('monthlyRent')}
              />
              {errors.monthlyRent && (
                <p className="text-sm text-destructive">{errors.monthlyRent.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="securityDeposit">Security Deposit</Label>
              <Input
                id="securityDeposit"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('securityDeposit')}
              />
              {errors.securityDeposit && (
                <p className="text-sm text-destructive">{errors.securityDeposit.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="depositPaid">Deposit Paid</Label>
              <Input
                id="depositPaid"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('depositPaid')}
              />
              {errors.depositPaid && (
                <p className="text-sm text-destructive">{errors.depositPaid.message}</p>
              )}
            </div>
          </div>

          {/* Move-in Date and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="moveInDate">Move-in Date</Label>
              <Input
                id="moveInDate"
                type="date"
                {...register('moveInDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue('status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this occupancy..."
              rows={3}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Assigning...'}
                </>
              ) : (
                <>{isEditing ? 'Update Occupancy' : 'Assign Tenant'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
