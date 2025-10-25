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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { tenantsService } from '@/services/tenants.service';
import { getApiErrorMessage } from '@/lib/api';
import type { Tenant } from '@/types';
import { Loader2 } from 'lucide-react';

/**
 * Tenant Form Dialog Component
 *
 * Features:
 * - Create new tenant
 * - Edit existing tenant
 * - Comprehensive form validation with Zod
 * - Loading states
 * - Error handling
 * - Elegant UI with smooth animations
 * - Emergency contact information
 */

// Form validation schema
const tenantFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  idNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  occupation: z.string().optional(),
  employer: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tenant?: Tenant;
}

export function TenantFormDialog({
  open,
  onOpenChange,
  onSuccess,
  tenant,
}: TenantFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditing = !!tenant;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: tenant
      ? {
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          phone: tenant.phone,
          idNumber: tenant.idNumber || '',
          dateOfBirth: tenant.dateOfBirth || '',
          nationality: tenant.nationality || '',
          occupation: tenant.occupation || '',
          employer: tenant.employer || '',
          emergencyContactName: tenant.emergencyContactName || '',
          emergencyContactPhone: tenant.emergencyContactPhone || '',
          emergencyContactRelation: tenant.emergencyContactRelation || '',
          status: tenant.status,
        }
      : {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          idNumber: '',
          dateOfBirth: '',
          nationality: 'Kenyan',
          occupation: '',
          employer: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          emergencyContactRelation: '',
          status: 'active',
        },
  });

  const statusValue = watch('status');

  const onSubmit = async (data: TenantFormData) => {
    try {
      setSubmitting(true);

      if (isEditing && tenant) {
        await tenantsService.update(tenant.id, data);
        toast({
          title: 'Success',
          description: 'Tenant updated successfully',
        });
      } else {
        await tenantsService.create(data);
        toast({
          title: 'Success',
          description: 'Tenant created successfully',
        });
      }

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to save tenant:', error);
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEditing ? 'Edit Tenant' : 'Add New Tenant'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the tenant details below'
              : 'Fill in the details to add a new tenant'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>

            {/* Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  placeholder="e.g., John"
                  {...register('firstName')}
                  className={errors.firstName ? 'border-destructive' : ''}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="e.g., Doe"
                  {...register('lastName')}
                  className={errors.lastName ? 'border-destructive' : ''}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Contact Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., john.doe@example.com"
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="e.g., +254712345678"
                  {...register('phone')}
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* ID & DOB Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idNumber" className="text-sm font-medium">
                  ID Number
                </Label>
                <Input
                  id="idNumber"
                  placeholder="e.g., 12345678"
                  {...register('idNumber')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-sm font-medium">
                  Date of Birth
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                />
              </div>
            </div>

            {/* Nationality & Status Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nationality" className="text-sm font-medium">
                  Nationality
                </Label>
                <Input
                  id="nationality"
                  placeholder="e.g., Kenyan"
                  {...register('nationality')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={statusValue}
                  onValueChange={(value) => setValue('status', value as 'active' | 'inactive')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Employment Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Employment Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="occupation" className="text-sm font-medium">
                  Occupation
                </Label>
                <Input
                  id="occupation"
                  placeholder="e.g., Software Engineer"
                  {...register('occupation')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employer" className="text-sm font-medium">
                  Employer
                </Label>
                <Input
                  id="employer"
                  placeholder="e.g., Tech Company Ltd"
                  {...register('employer')}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Emergency Contact</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName" className="text-sm font-medium">
                  Contact Name
                </Label>
                <Input
                  id="emergencyContactName"
                  placeholder="e.g., Jane Doe"
                  {...register('emergencyContactName')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone" className="text-sm font-medium">
                  Contact Phone
                </Label>
                <Input
                  id="emergencyContactPhone"
                  placeholder="e.g., +254712345678"
                  {...register('emergencyContactPhone')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContactRelation" className="text-sm font-medium">
                Relationship
              </Label>
              <Input
                id="emergencyContactRelation"
                placeholder="e.g., Spouse, Parent, Sibling"
                {...register('emergencyContactRelation')}
              />
            </div>
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
                <>{isEditing ? 'Update' : 'Create'} Tenant</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
