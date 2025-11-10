'use client';

/**
 * Super Admin - Edit User
 * Edit user details and manage user account
 *
 * Author: george1806
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Mail,
  User as UserIcon,
  Shield,
  Power,
  PowerOff,
  Trash2,
  Key,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { superAdminUserService } from '@/lib/services/super-admin/SuperAdminUserService';
import { superAdminCompanyService } from '@/lib/services/super-admin/SuperAdminCompanyService';
import { UserRole, UserStatus, type User } from '@/types/super-admin/user.types';
import type { Company } from '@/types/super-admin/company.types';
import Link from 'next/link';

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.id as string;
  const userId = params?.userId as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: UserRole.STAFF,
    status: UserStatus.ACTIVE,
    phone: '',
  });

  const [formErrors, setFormErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  useEffect(() => {
    if (companyId && userId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [companyData, userData] = await Promise.all([
        superAdminCompanyService.getCompanyById(companyId),
        superAdminUserService.getUserById(userId),
      ]);
      setCompany(companyData);
      setUser(userData);
      setFormData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        status: userData.status,
        phone: userData.profile?.phone || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load user');
      console.error('Error loading user:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors = {
      firstName: '',
      lastName: '',
      email: '',
    };
    let isValid = true;

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
      isValid = false;
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
      isValid = false;
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      await superAdminUserService.updateUser(userId, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        status: formData.status,
        phone: formData.phone.trim() || undefined,
      });
      router.push(`/super-admin/companies/${companyId}/users`);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to update user';
      if (errorMessage.includes('email') || errorMessage.includes('already exists')) {
        setFormErrors({ ...formErrors, email: 'Email already exists' });
      } else {
        alert(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!user) return;
    if (
      !confirm(
        `Are you sure you want to suspend ${user.firstName} ${user.lastName}? They will not be able to log in.`
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      await superAdminUserService.suspendUser(userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateUser = async () => {
    if (!user) return;
    try {
      setActionLoading(true);
      await superAdminUserService.activateUser(userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to activate user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setActionLoading(true);
      await superAdminUserService.deleteUser(userId);
      setDeleteDialogOpen(false);
      router.push(`/super-admin/companies/${companyId}/users`);
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      alert('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    try {
      setActionLoading(true);
      await superAdminUserService.resetPassword(userId, newPassword);
      setResetPasswordDialogOpen(false);
      setNewPassword('');
      alert('Password reset successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !company || !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">
              {error || 'User or company not found'}
            </p>
            <Button onClick={() => router.push('/super-admin/companies')}>
              Back to Companies
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500 text-white';
      case 'SUSPENDED':
        return 'bg-red-500 text-white';
      case 'INACTIVE':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/super-admin/companies/${companyId}/users`}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Edit User: {user.firstName} {user.lastName}
              </h1>
              <Badge className="bg-purple-500 text-white">Super Admin</Badge>
            </div>
            <p className="text-gray-600">
              Manage user account for <strong>{company.name}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            {user.status === 'ACTIVE' ? (
              <Button
                variant="outline"
                onClick={handleSuspendUser}
                disabled={actionLoading}
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <PowerOff className="h-4 w-4 mr-2" />
                Suspend User
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleActivateUser}
                disabled={actionLoading}
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <Power className="h-4 w-4 mr-2" />
                Activate User
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={actionLoading}
              className="border-red-500 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </Button>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <UserIcon className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-xs">{user.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Last Login</p>
                <p className="text-sm font-medium">
                  {user.lastLoginAt
                    ? superAdminUserService.formatDate(user.lastLoginAt)
                    : 'Never'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={getStatusBadgeColor(user.status)}>
                  {superAdminUserService.getStatusDisplay(user.status)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <form onSubmit={handleSubmit}>
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* First Name & Last Name */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => {
                      setFormData({ ...formData, firstName: e.target.value });
                      setFormErrors({ ...formErrors, firstName: '' });
                    }}
                    className="pl-10"
                  />
                </div>
                {formErrors.firstName && (
                  <p className="text-sm text-destructive">{formErrors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData({ ...formData, lastName: e.target.value });
                      setFormErrors({ ...formErrors, lastName: '' });
                    }}
                    className="pl-10"
                  />
                </div>
                {formErrors.lastName && (
                  <p className="text-sm text-destructive">{formErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setFormErrors({ ...formErrors, email: '' });
                  }}
                  className="pl-10"
                />
              </div>
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+254712345678"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as UserRole })
                }
              >
                <SelectTrigger id="role">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.OWNER}>Owner - Full access</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>
                    Admin - Manage properties & tenants
                  </SelectItem>
                  <SelectItem value={UserRole.STAFF}>Staff - Basic access</SelectItem>
                  <SelectItem value={UserRole.AUDITOR}>
                    Auditor - Read-only access
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as UserStatus })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserStatus.ACTIVE}>
                    Active - Can log in
                  </SelectItem>
                  <SelectItem value={UserStatus.SUSPENDED}>
                    Suspended - Cannot log in
                  </SelectItem>
                  <SelectItem value={UserStatus.INACTIVE}>
                    Inactive - Dormant account
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Password Button */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <Key className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">
                      Reset Password
                    </h4>
                    <p className="text-sm text-yellow-700">
                      Generate a new password for this user. They will need to use the
                      new password on their next login.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetPasswordDialogOpen(true)}
                  disabled={actionLoading}
                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/super-admin/companies/${companyId}/users`)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>
                {user.firstName} {user.lastName}
              </strong>{' '}
              ({user.email})? This action cannot be undone and will permanently remove
              the user and all their associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading}
            >
              {actionLoading ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <AlertDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new password for <strong>{user.email}</strong>. The password must
              be at least 8 characters long.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewPassword('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              className="bg-yellow-600 hover:bg-yellow-700"
              disabled={actionLoading}
            >
              {actionLoading ? 'Resetting...' : 'Reset Password'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
