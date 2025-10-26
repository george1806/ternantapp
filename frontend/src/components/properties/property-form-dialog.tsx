'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useToast } from '@/hooks/use-toast';
import { compoundsService } from '@/services/compounds.service';
import { getApiErrorMessage } from '@/lib/api';
import type { Compound } from '@/types';
import { Loader2 } from 'lucide-react';

/**
 * Property Form Dialog Component
 *
 * Features:
 * - Create new compound
 * - Edit existing compound
 * - Form validation with Zod
 * - Loading states
 * - Error handling
 * - Elegant UI with smooth animations
 */

// Form validation schema
const propertyFormSchema = z.object({
  name: z.string().min(2, 'Property name must be at least 2 characters'),
  addressLine: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  region: z.string().optional(),
  country: z.string().min(2, 'Country is required'),
  notes: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  compound?: Compound;
}

export function PropertyFormDialog({
  open,
  onOpenChange,
  onSuccess,
  compound,
}: PropertyFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditing = !!compound;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema) as any,
    defaultValues: compound
      ? {
          name: compound.name,
          addressLine: compound.address || compound.addressLine || '',
          city: compound.city,
          region: compound.region || '',
          country: compound.country,
          notes: compound.notes || compound.description || '',
        }
      : {
          name: '',
          addressLine: '',
          city: '',
          region: '',
          country: 'Kenya',
          notes: '',
        },
  });

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setSubmitting(true);

      if (isEditing && compound) {
        await compoundsService.update(compound.id, data);
        toast({
          title: 'Success',
          description: 'Property updated successfully',
        });
      } else {
        await compoundsService.create(data);
        toast({
          title: 'Success',
          description: 'Property created successfully',
        });
      }

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to save property:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEditing ? 'Edit Property' : 'Add New Property'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the property details below'
              : 'Fill in the details to add a new property compound'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Property Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Property Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Sunrise Apartments"
              {...register('name')}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="addressLine" className="text-sm font-medium">
              Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="addressLine"
              placeholder="e.g., 123 Main Street"
              {...register('addressLine')}
              className={errors.addressLine ? 'border-destructive' : ''}
            />
            {errors.addressLine && (
              <p className="text-sm text-destructive">{errors.addressLine.message}</p>
            )}
          </div>

          {/* Location Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                placeholder="e.g., Nairobi"
                {...register('city')}
                className={errors.city ? 'border-destructive' : ''}
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="region" className="text-sm font-medium">
                Region / State
              </Label>
              <Input id="region" placeholder="e.g., Nairobi County" {...register('region')} />
            </div>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm font-medium">
              Country <span className="text-destructive">*</span>
            </Label>
            <Input
              id="country"
              placeholder="e.g., Kenya"
              {...register('country')}
              className={errors.country ? 'border-destructive' : ''}
            />
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Optional property notes..."
              {...register('notes')}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-[100px]">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>{isEditing ? 'Update' : 'Create'} Property</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
