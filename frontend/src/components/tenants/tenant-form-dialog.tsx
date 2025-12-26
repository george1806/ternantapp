'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
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
import { TenantSuccessDialog } from './tenant-success-dialog';

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
  phone: z.string().optional().refine((val) => !val || val.length >= 10, {
    message: 'Phone number must be at least 10 characters if provided',
  }),
  idNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  employerName: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  status: z.enum(['active', 'inactive', 'blacklisted']),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tenant?: Tenant;
  onCreateLease?: (tenantId: string) => void;
}

export function TenantFormDialog({
  open,
  onOpenChange,
  onSuccess,
  tenant,
  onCreateLease,
}: TenantFormDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
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
          phone: tenant.phone || '',
          idNumber: tenant.idNumber || '',
          dateOfBirth: tenant.dateOfBirth || '',
          employerName: tenant.employerName || '',
          emergencyContactName: tenant.emergencyContactName || '',
          emergencyContactPhone: tenant.emergencyContactPhone || '',
          emergencyContactRelationship: tenant.emergencyContactRelationship || '',
          status: tenant.status,
        }
      : {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          idNumber: '',
          dateOfBirth: '',
          employerName: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          emergencyContactRelationship: '',
          status: 'active',
        },
  });

  const statusValue = watch('status');

  // Reset form with tenant values when dialog opens or tenant changes
  useEffect(() => {
    if (open && tenant) {
      // Pre-fill form with current tenant values
      reset({
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
        phone: tenant.phone || '',
        idNumber: tenant.idNumber || '',
        dateOfBirth: tenant.dateOfBirth || '',
        employerName: tenant.employerName || '',
        emergencyContactName: tenant.emergencyContactName || '',
        emergencyContactPhone: tenant.emergencyContactPhone || '',
        emergencyContactRelationship: tenant.emergencyContactRelationship || '',
        status: tenant.status,
      });
    } else if (open && !tenant) {
      // Reset to empty form for creating new tenant
      reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        idNumber: '',
        dateOfBirth: '',
        employerName: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        status: 'active',
      });
    }
  }, [open, tenant, reset]);

  const onSubmit = async (data: TenantFormData) => {
    try {
      setSubmitting(true);

      // Build payload - only include fields with values (not empty strings)
      const cleanedData: any = {};

      // Required fields
      if (data.firstName && data.firstName.trim()) {
        cleanedData.firstName = data.firstName.trim();
      }
      if (data.lastName && data.lastName.trim()) {
        cleanedData.lastName = data.lastName.trim();
      }
      if (data.email && data.email.trim()) {
        cleanedData.email = data.email.trim();
      }

      // Optional fields - only include if not empty
      if (data.phone && data.phone.trim()) {
        cleanedData.phone = data.phone.trim();
      }
      if (data.idNumber && data.idNumber.trim()) {
        cleanedData.idNumber = data.idNumber.trim();
      }
      if (data.dateOfBirth && data.dateOfBirth.trim()) {
        cleanedData.dateOfBirth = data.dateOfBirth.trim();
      }
      if (data.employerName && data.employerName.trim()) {
        cleanedData.employerName = data.employerName.trim();
      }
      if (data.emergencyContactName && data.emergencyContactName.trim()) {
        cleanedData.emergencyContactName = data.emergencyContactName.trim();
      }
      if (data.emergencyContactPhone && data.emergencyContactPhone.trim()) {
        cleanedData.emergencyContactPhone = data.emergencyContactPhone.trim();
      }
      if (data.emergencyContactRelationship && data.emergencyContactRelationship.trim()) {
        cleanedData.emergencyContactRelationship = data.emergencyContactRelationship.trim();
      }

      // Status
      cleanedData.status = data.status;

      if (isEditing && tenant) {
        await tenantsService.update(tenant.id, cleanedData);
        toast({
          title: 'Success',
          description: 'Tenant updated successfully',
        });
        reset();
        onOpenChange(false);
        onSuccess();
      } else {
        // Create new tenant
        const response = await tenantsService.create(cleanedData);
        const newTenant = response.data;

        // Store created tenant and show success dialog
        setCreatedTenant(newTenant);
        setShowSuccessDialog(true);

        reset();
        onOpenChange(false);
        onSuccess();
      }
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

  const handleCreateLease = () => {
    if (createdTenant && onCreateLease) {
      onCreateLease(createdTenant.id);
    }
  };

  const handleViewTenant = () => {
    if (createdTenant) {
      router.push(`/tenants/${createdTenant.id}`);
    }
  };

  return (
    <>
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
                  Phone
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

            {/* Status Row */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={statusValue}
                onValueChange={(value) => setValue('status', value as 'active' | 'inactive' | 'blacklisted')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blacklisted">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Employment Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Employment Information</h3>

            <div className="space-y-2">
              <Label htmlFor="employerName" className="text-sm font-medium">
                Employer Name
              </Label>
              <Input
                id="employerName"
                placeholder="e.g., Tech Company Ltd"
                {...register('employerName')}
              />
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
              <Label htmlFor="emergencyContactRelationship" className="text-sm font-medium">
                Relationship
              </Label>
              <Input
                id="emergencyContactRelationship"
                placeholder="e.g., Spouse, Parent, Sibling"
                {...register('emergencyContactRelationship')}
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

      <TenantSuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        tenant={createdTenant}
        onCreateLease={handleCreateLease}
        onViewTenant={handleViewTenant}
      />
    </>
  );
}
