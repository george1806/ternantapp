'use client';

/**
 * Super Admin - Create Company Page
 * Form to create a new company with owner
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, User, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { superAdminCompanyService } from '@/lib/services/super-admin/SuperAdminCompanyService';
import type { CreateCompanyDto } from '@/types/super-admin/company.types';
import Link from 'next/link';

export default function CreateCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCompanyDto>({
    name: '',
    slug: '',
    email: '',
    phone: '',
    currency: 'USD',
    timezone: 'UTC',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerPhone: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateCompanyDto, string>>>({});

  const handleChange = (field: keyof CreateCompanyDto, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors((prev) => ({ ...prev, [field]: '' }));

    // Auto-generate slug from company name
    if (field === 'name' && !formData.slug) {
      const slug = superAdminCompanyService.generateSlug(value);
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateCompanyDto, string>> = {};

    // Company validations
    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    }
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!superAdminCompanyService.isValidSlug(formData.slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Company email is required';
    } else if (!superAdminCompanyService.isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Owner validations
    if (!formData.ownerFirstName.trim()) {
      newErrors.ownerFirstName = 'First name is required';
    }
    if (!formData.ownerLastName.trim()) {
      newErrors.ownerLastName = 'Last name is required';
    }
    if (!formData.ownerEmail.trim()) {
      newErrors.ownerEmail = 'Owner email is required';
    } else if (!superAdminCompanyService.isValidEmail(formData.ownerEmail)) {
      newErrors.ownerEmail = 'Invalid email format';
    }
    if (!formData.ownerPassword.trim()) {
      newErrors.ownerPassword = 'Password is required';
    } else if (formData.ownerPassword.length < 8) {
      newErrors.ownerPassword = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await superAdminCompanyService.createCompany(formData);
      router.push(`/super-admin/companies/${result.company.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create company');
      console.error('Error creating company:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/super-admin/companies"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Company</h1>
        <p className="text-gray-600 mt-1">
          Add a new company to the platform with an owner account
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Company Name"
                required
                error={errors.name}
              >
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Acme Properties"
                />
              </FormField>

              <FormField
                label="Slug"
                required
                error={errors.slug}
                hint="Used in URLs (lowercase, hyphens only)"
              >
                <Input
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  placeholder="acme-properties"
                />
              </FormField>

              <FormField
                label="Company Email"
                required
                error={errors.email}
              >
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@acme.com"
                />
              </FormField>

              <FormField
                label="Phone"
                error={errors.phone}
              >
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1234567890"
                />
              </FormField>

              <FormField
                label="Currency"
                required
                error={errors.currency}
              >
                <select
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="KES">KES - Kenyan Shilling</option>
                </select>
              </FormField>

              <FormField
                label="Timezone"
                required
                error={errors.timezone}
              >
                <select
                  value={formData.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Africa/Nairobi">Africa/Nairobi</option>
                </select>
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Owner Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Owner Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="First Name"
                required
                error={errors.ownerFirstName}
              >
                <Input
                  value={formData.ownerFirstName}
                  onChange={(e) => handleChange('ownerFirstName', e.target.value)}
                  placeholder="John"
                />
              </FormField>

              <FormField
                label="Last Name"
                required
                error={errors.ownerLastName}
              >
                <Input
                  value={formData.ownerLastName}
                  onChange={(e) => handleChange('ownerLastName', e.target.value)}
                  placeholder="Doe"
                />
              </FormField>

              <FormField
                label="Email"
                required
                error={errors.ownerEmail}
              >
                <Input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => handleChange('ownerEmail', e.target.value)}
                  placeholder="john@acme.com"
                />
              </FormField>

              <FormField
                label="Phone"
                error={errors.ownerPhone}
              >
                <Input
                  value={formData.ownerPhone}
                  onChange={(e) => handleChange('ownerPhone', e.target.value)}
                  placeholder="+1234567890"
                />
              </FormField>

              <FormField
                label="Password"
                required
                error={errors.ownerPassword}
                hint="Minimum 8 characters"
              >
                <Input
                  type="password"
                  value={formData.ownerPassword}
                  onChange={(e) => handleChange('ownerPassword', e.target.value)}
                  placeholder="••••••••"
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/super-admin/companies')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Company'}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function FormField({ label, required, error, hint, children }: FormFieldProps) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      {hint && !error && <p className="text-sm text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
