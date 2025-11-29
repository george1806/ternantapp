'use client';

import { useEffect, useState } from 'react';
import { Save, User, Building2, Mail, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { userService } from '@/services/user.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { getAvailableCurrencies, getCurrenciesByRegion, type Currency } from '@/lib/currency';

/**
 * Settings Page
 *
 * Features:
 * - Company profile settings
 * - User profile settings
 * - Password change
 * - Notification preferences
 * - System configuration
 */

interface CompanyProfile {
  name: string;
  email: string;
  phone: string;
  currency: Currency;
  timezone: string;
  address: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  website?: string;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  invoiceReminders: boolean;
  paymentConfirmations: boolean;
  leaseExpiry: boolean;
  maintenanceAlerts: boolean;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Company Profile State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    name: '',
    email: '',
    phone: '',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    address: '',
    city: '',
    region: '',
    country: '',
    postalCode: '',
    website: '',
  });

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState<PasswordChange>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification Settings State
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    invoiceReminders: true,
    paymentConfirmations: true,
    leaseExpiry: true,
    maintenanceAlerts: true,
  });

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const [userRes, companyRes, notificationsRes] = await Promise.all([
        userService.getProfile(),
        userService.getCompanyProfile(),
        userService.getNotificationSettings(),
      ]);

      if (userRes.data?.data) {
        setUserProfile({
          firstName: userRes.data.data.firstName || '',
          lastName: userRes.data.data.lastName || '',
          email: userRes.data.data.email || '',
          phone: userRes.data.data.phone || '',
        });
      }

      if (companyRes.data?.data) {
        setCompanyProfile({
          name: companyRes.data.data.name || '',
          email: companyRes.data.data.email || '',
          phone: companyRes.data.data.phone || '',
          currency: companyRes.data.data.currency || 'KES',
          timezone: companyRes.data.data.timezone || 'Africa/Nairobi',
          address: companyRes.data.data.address || '',
          city: companyRes.data.data.city || '',
          region: companyRes.data.data.region || '',
          country: companyRes.data.data.country || '',
          postalCode: companyRes.data.data.postalCode || '',
          website: companyRes.data.data.website || '',
        });
      }

      if (notificationsRes.data?.data) {
        setNotifications({
          emailNotifications: notificationsRes.data.data.emailNotifications ?? true,
          invoiceReminders: notificationsRes.data.data.invoiceReminders ?? true,
          paymentConfirmations: notificationsRes.data.data.paymentConfirmations ?? true,
          leaseExpiry: notificationsRes.data.data.leaseExpiry ?? true,
          maintenanceAlerts: notificationsRes.data.data.maintenanceAlerts ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompanyProfile = async () => {
    try {
      setSaving(true);
      await userService.updateCompanyProfile(companyProfile);

      toast({
        title: 'Success',
        description: 'Company profile updated successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUserProfile = async () => {
    try {
      setSaving(true);
      const response = await userService.updateProfile(userProfile);

      if (response.data?.data) {
        useAuthStore.setState({
          user: {
            ...user,
            ...response.data.data,
          },
        });
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await userService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      toast({
        title: 'Success',
        description: 'Password changed successfully!',
      });

      // Clear password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      await userService.updateNotificationSettings(notifications);

      toast({
        title: 'Success',
        description: 'Notification preferences updated successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and application preferences
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* User Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile
              </CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={userProfile.firstName}
                    onChange={(e) => setUserProfile({ ...userProfile, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={userProfile.lastName}
                    onChange={(e) => setUserProfile({ ...userProfile, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userPhone">Phone Number</Label>
                  <Input
                    id="userPhone"
                    type="tel"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveUserProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Profile Tab */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Update your company details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyProfile.name}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, name: e.target.value })}
                    placeholder="Acme Property Management"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyProfile.email}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, email: e.target.value })}
                    placeholder="info@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Phone</Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={companyProfile.phone}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Operating Currency</Label>
                  <Select
                    value={companyProfile.currency}
                    onValueChange={(value) => setCompanyProfile({ ...companyProfile, currency: value as Currency })}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(getCurrenciesByRegion()).map(([region, currencies]) => (
                        <div key={region}>
                          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                            {region}
                          </div>
                          {currencies.map((curr) => (
                            <SelectItem key={curr.code} value={curr.code}>
                              {curr.code} - {curr.name} ({curr.symbol})
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    This currency will be used for all amounts in your account
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={companyProfile.timezone}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, timezone: e.target.value })}
                    placeholder="Africa/Nairobi"
                  />
                  <p className="text-sm text-muted-foreground">
                    IANA timezone identifier (e.g., Africa/Nairobi, America/New_York)
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={companyProfile.address}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={companyProfile.city}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, city: e.target.value })}
                    placeholder="New York"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">State/Region</Label>
                  <Input
                    id="region"
                    value={companyProfile.region}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, region: e.target.value })}
                    placeholder="NY"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={companyProfile.country}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, country: e.target.value })}
                    placeholder="United States"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={companyProfile.postalCode}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, postalCode: e.target.value })}
                    placeholder="10001"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={companyProfile.website}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                    placeholder="https://company.com"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveCompanyProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Company Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Change your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password"
                  />
                  <p className="text-sm text-muted-foreground">
                    Minimum 8 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleChangePassword} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email Notifications</div>
                    <div className="text-sm text-muted-foreground">
                      Receive email notifications for important events
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailNotifications}
                    onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Invoice Reminders</div>
                    <div className="text-sm text-muted-foreground">
                      Get notified about upcoming and overdue invoices
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.invoiceReminders}
                    onChange={(e) => setNotifications({ ...notifications, invoiceReminders: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Payment Confirmations</div>
                    <div className="text-sm text-muted-foreground">
                      Receive confirmation when payments are received
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.paymentConfirmations}
                    onChange={(e) => setNotifications({ ...notifications, paymentConfirmations: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Lease Expiry Alerts</div>
                    <div className="text-sm text-muted-foreground">
                      Get notified when leases are about to expire
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.leaseExpiry}
                    onChange={(e) => setNotifications({ ...notifications, leaseExpiry: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Maintenance Alerts</div>
                    <div className="text-sm text-muted-foreground">
                      Receive notifications about maintenance requests
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.maintenanceAlerts}
                    onChange={(e) => setNotifications({ ...notifications, maintenanceAlerts: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveNotifications} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
