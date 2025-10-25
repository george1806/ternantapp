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
import { apartmentsService, type CreateApartmentDto } from '@/services/apartments.service';
import { compoundsService } from '@/services/compounds.service';
import type { Apartment, Compound } from '@/types';
import { Loader2 } from 'lucide-react';

const apartmentFormSchema = z.object({
  compoundId: z.string().min(1, 'Property is required'),
  unitNumber: z.string().min(1, 'Unit number is required'),
  floor: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? null : Number(val),
    z.number().int().nullable().optional()
  ),
  bedrooms: z.preprocess(
    (val) => Number(val),
    z.number().int().min(0, 'Bedrooms must be 0 or more')
  ),
  bathrooms: z.preprocess(
    (val) => Number(val),
    z.number().int().min(0, 'Bathrooms must be 0 or more')
  ),
  areaSqm: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? null : Number(val),
    z.number().positive('Area must be positive').nullable().optional()
  ),
  monthlyRent: z.preprocess(
    (val) => Number(val),
    z.number().min(0, 'Monthly rent must be 0 or more')
  ),
  status: z.enum(['available', 'occupied', 'maintenance', 'reserved']).optional(),
  amenities: z.string().optional(),
  notes: z.string().optional(),
});

type ApartmentFormData = z.infer<typeof apartmentFormSchema>;

interface ApartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartment?: Apartment | null;
  onSuccess: () => void;
  preselectedCompoundId?: string;
}

export function ApartmentFormDialog({
  open,
  onOpenChange,
  apartment,
  onSuccess,
  preselectedCompoundId,
}: ApartmentFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loadingCompounds, setLoadingCompounds] = useState(true);

  const isEditing = !!apartment;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ApartmentFormData>({
    resolver: zodResolver(apartmentFormSchema) as any,
    defaultValues: {
      compoundId: preselectedCompoundId || '',
      unitNumber: '',
      floor: null,
      bedrooms: 1,
      bathrooms: 1,
      areaSqm: null,
      monthlyRent: 0,
      status: 'available',
      amenities: '',
      notes: '',
    },
  });

  const selectedCompoundId = watch('compoundId');
  const selectedStatus = watch('status');

  useEffect(() => {
    if (open) {
      fetchCompounds();
      if (apartment) {
        setValue('compoundId', apartment.compoundId);
        setValue('unitNumber', apartment.unitNumber);
        setValue('floor', apartment.floor || null);
        setValue('bedrooms', apartment.bedrooms);
        setValue('bathrooms', apartment.bathrooms);
        setValue('areaSqm', apartment.areaSqm || null);
        setValue('monthlyRent', apartment.monthlyRent);
        setValue('status', apartment.status);
        setValue('amenities', apartment.amenities?.join(', ') || '');
        setValue('notes', apartment.notes || '');
      } else if (preselectedCompoundId) {
        setValue('compoundId', preselectedCompoundId);
      }
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, apartment, preselectedCompoundId, setValue, reset]);

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

  const onSubmit = async (data: ApartmentFormData) => {
    try {
      setSubmitting(true);

      // Parse amenities from comma-separated string
      const amenitiesArray = data.amenities
        ? data.amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : [];

      const payload: CreateApartmentDto = {
        compoundId: data.compoundId,
        unitNumber: data.unitNumber,
        floor: data.floor || undefined,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        areaSqm: data.areaSqm || undefined,
        monthlyRent: data.monthlyRent,
        status: data.status,
        amenities: amenitiesArray.length > 0 ? amenitiesArray : undefined,
        notes: data.notes || undefined,
      };

      if (isEditing && apartment) {
        await apartmentsService.update(apartment.id, payload);
        toast({
          title: 'Success',
          description: 'Apartment updated successfully',
        });
      } else {
        await apartmentsService.create(payload);
        toast({
          title: 'Success',
          description: 'Apartment created successfully',
        });
      }

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to save apartment:', error);
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
          <DialogTitle>{isEditing ? 'Edit Apartment' : 'Add New Apartment'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update apartment/unit details'
              : 'Add a new apartment/unit to your property'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Property Selection */}
          <div className="space-y-2">
            <Label htmlFor="compoundId">
              Property <span className="text-destructive">*</span>
            </Label>
            {loadingCompounds ? (
              <div className="flex items-center justify-center py-3 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={selectedCompoundId}
                onValueChange={(value) => setValue('compoundId', value)}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {compounds.map((compound) => (
                    <SelectItem key={compound.id} value={compound.id}>
                      {compound.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.compoundId && (
              <p className="text-sm text-destructive">{errors.compoundId.message}</p>
            )}
          </div>

          {/* Basic Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitNumber">
                Unit Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unitNumber"
                placeholder="e.g., 101, A-12"
                {...register('unitNumber')}
              />
              {errors.unitNumber && (
                <p className="text-sm text-destructive">{errors.unitNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor">Floor</Label>
              <Input
                id="floor"
                type="number"
                placeholder="e.g., 1, 2, 3"
                {...register('floor')}
              />
              {errors.floor && (
                <p className="text-sm text-destructive">{errors.floor.message}</p>
              )}
            </div>
          </div>

          {/* Unit Specs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">
                Bedrooms <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bedrooms"
                type="number"
                min="0"
                placeholder="0"
                {...register('bedrooms')}
              />
              {errors.bedrooms && (
                <p className="text-sm text-destructive">{errors.bedrooms.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">
                Bathrooms <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bathrooms"
                type="number"
                min="0"
                placeholder="0"
                {...register('bathrooms')}
              />
              {errors.bathrooms && (
                <p className="text-sm text-destructive">{errors.bathrooms.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="areaSqm">Area (m²)</Label>
              <Input
                id="areaSqm"
                type="number"
                step="0.01"
                placeholder="e.g., 85.5"
                {...register('areaSqm')}
              />
              {errors.areaSqm && (
                <p className="text-sm text-destructive">{errors.areaSqm.message}</p>
              )}
            </div>
          </div>

          {/* Rent and Status */}
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="status">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue('status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              )}
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-2">
            <Label htmlFor="amenities">Amenities</Label>
            <Input
              id="amenities"
              placeholder="e.g., Balcony, Parking, Storage (comma-separated)"
              {...register('amenities')}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple amenities with commas
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this unit..."
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
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{isEditing ? 'Update Apartment' : 'Create Apartment'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
