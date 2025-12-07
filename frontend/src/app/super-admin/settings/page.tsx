'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Settings,
  Mail,
  Lock,
  Zap,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react';
import { settingsService, type PlatformSettings } from '@/services/settings.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';

/**
 * Super Admin Settings Page
 *
 * Features:
 * - Platform configuration
 * - Email settings (SMTP)
 * - Security settings (rate limiting, session timeout)
 * - Feature flags
 * - Live updates
 * - Form validation with Zod
 */

const settingsFormSchema = z.object({
  appName: z.string().min(1, 'App name is required'),
  supportEmail: z.string().email('Invalid email address'),
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.number().min(1).max(65535, 'Invalid port'),
  smtpUser: z.string().min(1, 'SMTP user is required'),
  smtpPassword: z.string().min(1, 'SMTP password is required'),
  fromAddress: z.string().email('Invalid email address'),
  fromName: z.string().min(1, 'From name is required'),
  useTLS: z.boolean(),
});

type EmailSettingsData = z.infer<typeof emailSettingsSchema>;

const securitySettingsSchema = z.object({
  rateLimitPerMinute: z.number().min(1),
  sessionTimeoutMinutes: z.number().min(1),
  enforce2FA: z.boolean(),
  passwordMinLength: z.number().min(6).max(128),
});

type SecuritySettingsData = z.infer<typeof securitySettingsSchema>;

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const { toast } = useToast();

  const platformForm = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      appName: '',
      supportEmail: '',
      currency: 'KES',
      timezone: 'Africa/Nairobi',
    },
  });

  const emailForm = useForm<EmailSettingsData>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromAddress: '',
      fromName: '',
      useTLS: true,
    },
  });

  const securityForm = useForm<SecuritySettingsData>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      rateLimitPerMinute: 100,
      sessionTimeoutMinutes: 60,
      enforce2FA: false,
      passwordMinLength: 8,
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getSettings();

      if (response.data?.data) {
        const data = response.data.data;
        setSettings(data);

        // Update form values
        platformForm.reset({
          appName: data.appName || '',
          supportEmail: data.supportEmail || '',
          currency: data.currency || 'KES',
          timezone: data.timezone || 'Africa/Nairobi',
        });

        if (data.emailConfig) {
          emailForm.reset({
            smtpHost: data.emailConfig.smtpHost || '',
            smtpPort: data.emailConfig.smtpPort || 587,
            smtpUser: data.emailConfig.smtpUser || '',
            smtpPassword: data.emailConfig.smtpPassword || '',
            fromAddress: data.emailConfig.fromAddress || '',
            fromName: data.emailConfig.fromName || '',
            useTLS: data.emailConfig.useTLS ?? true,
          });
        }

        if (data.security) {
          securityForm.reset({
            rateLimitPerMinute: data.security.rateLimitPerMinute || 100,
            sessionTimeoutMinutes: data.security.sessionTimeoutMinutes || 60,
            enforce2FA: data.security.enforce2FA || false,
            passwordMinLength: data.security.passwordMinLength || 8,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onPlatformSubmit = async (data: SettingsFormData) => {
    try {
      setSaving(true);
      await settingsService.updateSettings(data);

      toast({
        title: 'Success',
        description: 'Platform settings updated successfully',
      });

      setSettings((prev) => (prev ? { ...prev, ...data } : null));
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

  const onEmailSubmit = async (data: EmailSettingsData) => {
    try {
      setSaving(true);
      await settingsService.updateSettings({
        emailConfig: data,
      });

      toast({
        title: 'Success',
        description: 'Email settings updated successfully',
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

  const onSecuritySubmit = async (data: SecuritySettingsData) => {
    try {
      setSaving(true);
      await settingsService.updateSettings({
        security: data,
      });

      toast({
        title: 'Success',
        description: 'Security settings updated successfully',
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

  const handleTestEmail = async () => {
    try {
      setTestingEmail(true);
      const response = await settingsService.testEmailConfig();

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Test email sent successfully',
        });
      } else {
        toast({
          title: 'Failed',
          description: response.data.message || 'Failed to send test email',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage platform configuration and preferences</p>
      </div>

      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="platform" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Platform</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
        </TabsList>

        {/* Platform Settings Tab */}
        <TabsContent value="platform">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Configure core application settings</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={platformForm.handleSubmit(onPlatformSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="appName">Application Name</Label>
                    <Input
                      {...platformForm.register('appName')}
                      id="appName"
                      placeholder="e.g., Ternant App"
                      disabled={saving}
                    />
                    {platformForm.formState.errors.appName && (
                      <p className="text-sm text-destructive">{platformForm.formState.errors.appName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      {...platformForm.register('supportEmail')}
                      id="supportEmail"
                      type="email"
                      placeholder="support@example.com"
                      disabled={saving}
                    />
                    {platformForm.formState.errors.supportEmail && (
                      <p className="text-sm text-destructive">{platformForm.formState.errors.supportEmail.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Input
                      {...platformForm.register('currency')}
                      id="currency"
                      placeholder="KES"
                      disabled={saving}
                    />
                    {platformForm.formState.errors.currency && (
                      <p className="text-sm text-destructive">{platformForm.formState.errors.currency.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      {...platformForm.register('timezone')}
                      id="timezone"
                      placeholder="Africa/Nairobi"
                      disabled={saving}
                    />
                    {platformForm.formState.errors.timezone && (
                      <p className="text-sm text-destructive">{platformForm.formState.errors.timezone.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" type="button" onClick={fetchSettings} disabled={saving}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={saving} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>Configure SMTP settings for sending emails</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Configuration Required</p>
                    <p className="text-sm text-blue-800 mt-1">
                      Update these settings to enable email notifications throughout the system
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      {...emailForm.register('smtpHost')}
                      id="smtpHost"
                      placeholder="smtp.gmail.com"
                      disabled={saving}
                    />
                    {emailForm.formState.errors.smtpHost && (
                      <p className="text-sm text-destructive">{emailForm.formState.errors.smtpHost.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      {...emailForm.register('smtpPort', { valueAsNumber: true })}
                      id="smtpPort"
                      type="number"
                      placeholder="587"
                      disabled={saving}
                    />
                    {emailForm.formState.errors.smtpPort && (
                      <p className="text-sm text-destructive">{emailForm.formState.errors.smtpPort.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      {...emailForm.register('smtpUser')}
                      id="smtpUser"
                      placeholder="your-email@gmail.com"
                      disabled={saving}
                    />
                    {emailForm.formState.errors.smtpUser && (
                      <p className="text-sm text-destructive">{emailForm.formState.errors.smtpUser.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <Input
                      {...emailForm.register('smtpPassword')}
                      id="smtpPassword"
                      type="password"
                      placeholder="••••••••"
                      disabled={saving}
                    />
                    {emailForm.formState.errors.smtpPassword && (
                      <p className="text-sm text-destructive">{emailForm.formState.errors.smtpPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fromAddress">From Email Address</Label>
                    <Input
                      {...emailForm.register('fromAddress')}
                      id="fromAddress"
                      type="email"
                      placeholder="noreply@example.com"
                      disabled={saving}
                    />
                    {emailForm.formState.errors.fromAddress && (
                      <p className="text-sm text-destructive">{emailForm.formState.errors.fromAddress.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      {...emailForm.register('fromName')}
                      id="fromName"
                      placeholder="Ternant App"
                      disabled={saving}
                    />
                    {emailForm.formState.errors.fromName && (
                      <p className="text-sm text-destructive">{emailForm.formState.errors.fromName.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    {...emailForm.register('useTLS')}
                    id="useTLS"
                    type="checkbox"
                    className="rounded border-gray-300"
                    disabled={saving}
                  />
                  <Label htmlFor="useTLS" className="font-normal cursor-pointer">
                    Use TLS Encryption
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestEmail}
                    disabled={saving || testingEmail}
                    className="gap-2"
                  >
                    {testingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
                    Test Configuration
                  </Button>
                  <Button variant="outline" type="button" onClick={fetchSettings} disabled={saving}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={saving} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security policies and requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rateLimitPerMinute">Rate Limit (requests/minute)</Label>
                    <Input
                      {...securityForm.register('rateLimitPerMinute', { valueAsNumber: true })}
                      id="rateLimitPerMinute"
                      type="number"
                      placeholder="100"
                      disabled={saving}
                    />
                    {securityForm.formState.errors.rateLimitPerMinute && (
                      <p className="text-sm text-destructive">
                        {securityForm.formState.errors.rateLimitPerMinute.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeoutMinutes">Session Timeout (minutes)</Label>
                    <Input
                      {...securityForm.register('sessionTimeoutMinutes', { valueAsNumber: true })}
                      id="sessionTimeoutMinutes"
                      type="number"
                      placeholder="60"
                      disabled={saving}
                    />
                    {securityForm.formState.errors.sessionTimeoutMinutes && (
                      <p className="text-sm text-destructive">
                        {securityForm.formState.errors.sessionTimeoutMinutes.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                    <Input
                      {...securityForm.register('passwordMinLength', { valueAsNumber: true })}
                      id="passwordMinLength"
                      type="number"
                      min="6"
                      max="128"
                      placeholder="8"
                      disabled={saving}
                    />
                    {securityForm.formState.errors.passwordMinLength && (
                      <p className="text-sm text-destructive">
                        {securityForm.formState.errors.passwordMinLength.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    {...securityForm.register('enforce2FA')}
                    id="enforce2FA"
                    type="checkbox"
                    className="rounded border-gray-300"
                    disabled={saving}
                  />
                  <Label htmlFor="enforce2FA" className="font-normal cursor-pointer">
                    Enforce Two-Factor Authentication
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" type="button" onClick={fetchSettings} disabled={saving}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={saving} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Feature Management</p>
                    <p className="text-sm text-green-800 mt-1">
                      Use feature flags to control which features are available to your users
                    </p>
                  </div>
                </div>

                {settings?.featureFlags && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(settings.featureFlags).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-xs text-muted-foreground">
                            {value ? 'Currently enabled' : 'Currently disabled'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${value ? 'bg-green-600' : 'bg-muted-foreground'}`} />
                          <span className="text-sm font-medium">{value ? 'On' : 'Off'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Feature flag management through API coming soon. Contact support to modify feature flags.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
