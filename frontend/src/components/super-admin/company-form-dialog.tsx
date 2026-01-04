'use client';

/**
 * Company Form Dialog Component
 *
 * Features:
 * - Create new company with owner user
 * - Edit existing company details
 * - Auto-slug generation from company name
 * - Form validation with Zod
 * - Currency and timezone selection
 * - Loading states and error handling
 * - Material design with smooth animations
 *
 * @author george1806
 */

import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { superAdminCompanyService } from '@/lib/services/super-admin/SuperAdminCompanyService';
import { getApiErrorMessage } from '@/lib/api';
import type { Company } from '@/types/super-admin/company.types';
import { Loader2, Building2, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

/**
 * Supported currencies
 */
const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'KES', label: 'KES - Kenyan Shilling' },
  { value: 'TZS', label: 'TZS - Tanzanian Shilling' },
  { value: 'UGX', label: 'UGX - Ugandan Shilling' },
  { value: 'ZAR', label: 'ZAR - South African Rand' },
  { value: 'NGN', label: 'NGN - Nigerian Naira' },
  { value: 'GHS', label: 'GHS - Ghanaian Cedi' },
  { value: 'RWF', label: 'RWF - Rwandan Franc' },
  { value: 'ETB', label: 'ETB - Ethiopian Birr' },
];

/**
 * Common timezones
 */
const TIMEZONES = [
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)' },
  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)' },
  { value: 'Africa/Cairo', label: 'Africa/Cairo (EET)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
];

/**
 * Form validation schema for creating a company
 */
const createCompanyFormSchema = z.object({
  // Company Details
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  country: z.string().optional(),

  // Owner Details (only for create)
  ownerFirstName: z.string().min(2, 'First name is required'),
  ownerLastName: z.string().min(2, 'Last name is required'),
  ownerEmail: z.string().email('Invalid email address'),
  ownerPassword: z.string().min(8, 'Password must be at least 8 characters'),
  ownerPhone: z.string().optional(),
});

/**
 * Form validation schema for updating a company
 */
const updateCompanyFormSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  country: z.string().optional(),
});

type CreateCompanyFormData = z.infer<typeof createCompanyFormSchema>;
type UpdateCompanyFormData = z.infer<typeof updateCompanyFormSchema>;

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  company?: Company | null;
}

/**
 * Generate slug from company name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  onSuccess,
  company,
}: CompanyFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditing = !!company;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateCompanyFormData | UpdateCompanyFormData>({
    resolver: zodResolver(isEditing ? updateCompanyFormSchema : createCompanyFormSchema) as any,
    defaultValues: company
      ? {
          name: company.name,
          slug: company.slug,
          email: company.email || '',
          phone: company.phone || '',
          currency: company.currency || 'USD',
          timezone: company.timezone || 'Africa/Nairobi',
          country: company.country || 'Tanzania',
        }
      : {
          name: '',
          slug: '',
          email: '',
          phone: '',
          currency: 'USD',
          timezone: 'Africa/Nairobi',
          country: 'Tanzania',
          ownerFirstName: '',
          ownerLastName: '',
          ownerEmail: '',
          ownerPassword: '',
          ownerPhone: '',
        },
  });

  const watchName = watch('name');
  const [currency, setCurrency] = useState(company?.currency || 'USD');
  const [timezone, setTimezone] = useState(company?.timezone || 'Africa/Nairobi');
  const [country, setCountry] = useState(company?.country || 'Tanzania');

  // Auto-generate slug from company name
  useEffect(() => {
    if (!isEditing && watchName) {
      const slug = generateSlug(watchName);
      setValue('slug', slug);
    }
  }, [watchName, isEditing, setValue]);

  // Reset form when dialog opens or company changes
  useEffect(() => {
    if (open && company) {
      reset({
        name: company.name,
        slug: company.slug,
        email: company.email || '',
        phone: company.phone || '',
        currency: company.currency || 'USD',
        timezone: company.timezone || 'Africa/Nairobi',
        country: company.country || 'Tanzania',
      });
      setCurrency(company.currency || 'USD');
      setTimezone(company.timezone || 'Africa/Nairobi');
      setCountry(company.country || 'Tanzania');
    } else if (open && !company) {
      reset({
        name: '',
        slug: '',
        email: '',
        phone: '',
        currency: 'USD',
        timezone: 'Africa/Nairobi',
        country: 'Tanzania',
        ownerFirstName: '',
        ownerLastName: '',
        ownerEmail: '',
        ownerPassword: '',
        ownerPhone: '',
      });
      setCurrency('USD');
      setTimezone('Africa/Nairobi');
      setCountry('Tanzania');
    }
  }, [open, company, reset]);

  const onSubmit = async (data: CreateCompanyFormData | UpdateCompanyFormData) => {
    try {
      setSubmitting(true);

      if (isEditing && company) {
        // Update existing company
        const updateData = data as UpdateCompanyFormData;
        const payload: any = {
          name: updateData.name.trim(),
          email: updateData.email.trim(),
          phone: updateData.phone?.trim() || undefined,
          currency: currency,
          timezone: timezone,
          country: country,
        };

        await superAdminCompanyService.updateCompany(company.id, payload);
        toast({
          title: 'Success',
          description: `Company "${updateData.name}" updated successfully`,
        });
      } else {
        // Create new company with owner
        const createData = data as CreateCompanyFormData;
        const payload = {
          name: createData.name.trim(),
          slug: createData.slug.trim(),
          email: createData.email.trim(),
          phone: createData.phone?.trim() || undefined,
          currency: currency,
          timezone: timezone,
          country: country,
          ownerFirstName: createData.ownerFirstName.trim(),
          ownerLastName: createData.ownerLastName.trim(),
          ownerEmail: createData.ownerEmail.trim(),
          ownerPassword: createData.ownerPassword,
          ownerPhone: createData.ownerPhone?.trim() || undefined,
        };

        await superAdminCompanyService.createCompany(payload);
        toast({
          title: 'Success',
          description: `Company "${createData.name}" created successfully with owner account`,
        });
      }

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to save company:', error);
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {isEditing ? 'Edit Company' : 'Create New Company'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the company details below'
              : 'Fill in the details to create a new company with an owner account'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Company Details
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Acme Properties"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm font-medium">
                Slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="slug"
                placeholder="e.g., acme-properties"
                {...register('slug')}
                className={errors.slug ? 'border-destructive' : ''}
                disabled={isEditing} // Slug cannot be changed after creation
              />
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {isEditing
                  ? 'Slug cannot be changed after creation'
                  : 'Auto-generated from company name. Only lowercase letters, numbers, and hyphens.'}
              </p>
            </div>

            {/* Email & Phone Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Company Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@company.com"
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  {...register('phone')}
                />
              </div>
            </div>

            {/* Currency & Timezone Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-medium">
                  Currency
                </Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm font-medium">
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm font-medium">
                Country
              </Label>
              <Input
                id="country"
                placeholder="e.g., Tanzania"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>

          {/* Owner Details Section (Create Only) */}
          {!isEditing && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <User className="h-4 w-4" />
                  Owner Account
                </div>
                <p className="text-sm text-muted-foreground">
                  Create the owner user account for this company
                </p>

                {/* Owner Name Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerFirstName" className="text-sm font-medium">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ownerFirstName"
                      placeholder="John"
                      {...register('ownerFirstName' as any)}
                      className={errors.ownerFirstName ? 'border-destructive' : ''}
                    />
                    {errors.ownerFirstName && (
                      <p className="text-sm text-destructive">{errors.ownerFirstName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ownerLastName" className="text-sm font-medium">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ownerLastName"
                      placeholder="Doe"
                      {...register('ownerLastName' as any)}
                      className={errors.ownerLastName ? 'border-destructive' : ''}
                    />
                    {errors.ownerLastName && (
                      <p className="text-sm text-destructive">{errors.ownerLastName.message}</p>
                    )}
                  </div>
                </div>

                {/* Owner Email */}
                <div className="space-y-2">
                  <Label htmlFor="ownerEmail" className="text-sm font-medium">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    placeholder="owner@company.com"
                    {...register('ownerEmail' as any)}
                    className={errors.ownerEmail ? 'border-destructive' : ''}
                  />
                  {errors.ownerEmail && (
                    <p className="text-sm text-destructive">{errors.ownerEmail.message}</p>
                  )}
                </div>

                {/* Owner Password & Phone Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerPassword" className="text-sm font-medium">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ownerPassword"
                      type="password"
                      placeholder="Min. 8 characters"
                      {...register('ownerPassword' as any)}
                      className={errors.ownerPassword ? 'border-destructive' : ''}
                    />
                    {errors.ownerPassword && (
                      <p className="text-sm text-destructive">{errors.ownerPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ownerPhone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <Input
                      id="ownerPhone"
                      type="tel"
                      placeholder="+1234567890"
                      {...register('ownerPhone' as any)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-[120px]">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{isEditing ? 'Update Company' : 'Create Company'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
