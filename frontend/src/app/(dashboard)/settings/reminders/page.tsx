'use client';

import { useEffect, useState } from 'react';
import { Save, RotateCcw, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  reminderSettingsService,
  type ReminderSettings,
  type EscalationLevel,
} from '@/services/reminder-settings.service';
import { getApiErrorMessage } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function ReminderSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await reminderSettingsService.getSettings();
      setSettings(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await reminderSettingsService.updateSettings({
        dueSoonConfig: settings.dueSoonConfig,
        overdueConfig: settings.overdueConfig,
        welcomeConfig: settings.welcomeConfig,
        receiptConfig: settings.receiptConfig,
        emailSettings: settings.emailSettings,
        queueSettings: settings.queueSettings,
        businessRules: settings.businessRules,
      });

      toast({
        title: 'Success',
        description: 'Reminder settings saved successfully',
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

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await reminderSettingsService.resetToDefaults();
      setSettings(response.data);
      toast({
        title: 'Success',
        description: 'Settings reset to defaults',
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

  const addEscalationLevel = () => {
    if (!settings) return;

    const newLevel: EscalationLevel = {
      daysAfterDue: 1,
      sendTime: '10:00',
      templateType: 'gentle',
      enabled: true,
    };

    setSettings({
      ...settings,
      overdueConfig: {
        ...settings.overdueConfig,
        escalationLevels: [...settings.overdueConfig.escalationLevels, newLevel],
      },
    });
  };

  const removeEscalationLevel = (index: number) => {
    if (!settings) return;

    const newLevels = settings.overdueConfig.escalationLevels.filter((_, i) => i !== index);
    setSettings({
      ...settings,
      overdueConfig: {
        ...settings.overdueConfig,
        escalationLevels: newLevels,
      },
    });
  };

  const updateEscalationLevel = (index: number, updates: Partial<EscalationLevel>) => {
    if (!settings) return;

    const newLevels = settings.overdueConfig.escalationLevels.map((level, i) =>
      i === index ? { ...level, ...updates } : level
    );

    setSettings({
      ...settings,
      overdueConfig: {
        ...settings.overdueConfig,
        escalationLevels: newLevels,
      },
    });
  };

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reminder Settings</h1>
            <p className="text-muted-foreground mt-2">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reminder Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure automated reminder notifications for tenants
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Changes to these settings will affect all future reminder emails. Existing scheduled
          reminders will not be modified.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="reminders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="email">Email Settings</TabsTrigger>
          <TabsTrigger value="queue">Queue & Performance</TabsTrigger>
          <TabsTrigger value="business">Business Rules</TabsTrigger>
        </TabsList>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="space-y-4">
          {/* Due Soon Reminders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Due Soon Reminders</CardTitle>
                  <CardDescription>
                    Send reminders before rent is due to help tenants pay on time
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.dueSoonConfig.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      dueSoonConfig: { ...settings.dueSoonConfig, enabled: checked },
                    })
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daysBeforeDue">Days Before Due Date</Label>
                  <Input
                    id="daysBeforeDue"
                    type="number"
                    min="1"
                    max="30"
                    value={settings.dueSoonConfig.daysBeforeDue}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dueSoonConfig: {
                          ...settings.dueSoonConfig,
                          daysBeforeDue: parseInt(e.target.value) || 3,
                        },
                      })
                    }
                    disabled={!settings.dueSoonConfig.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueSoonSendTime">Send Time (24h format)</Label>
                  <Input
                    id="dueSoonSendTime"
                    type="time"
                    value={settings.dueSoonConfig.sendTime}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dueSoonConfig: {
                          ...settings.dueSoonConfig,
                          sendTime: e.target.value,
                        },
                      })
                    }
                    disabled={!settings.dueSoonConfig.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skipWeekends">Skip Weekends</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="skipWeekends"
                      checked={settings.dueSoonConfig.skipWeekends}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          dueSoonConfig: {
                            ...settings.dueSoonConfig,
                            skipWeekends: checked,
                          },
                        })
                      }
                      disabled={!settings.dueSoonConfig.enabled}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {settings.dueSoonConfig.skipWeekends ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overdue Reminders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Overdue Reminders</CardTitle>
                  <CardDescription>
                    Escalating reminders for overdue rent payments
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.overdueConfig.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      overdueConfig: { ...settings.overdueConfig, enabled: checked },
                    })
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxEscalations">Maximum Escalations</Label>
                  <Input
                    id="maxEscalations"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.overdueConfig.maxEscalations}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        overdueConfig: {
                          ...settings.overdueConfig,
                          maxEscalations: parseInt(e.target.value) || 3,
                        },
                      })
                    }
                    disabled={!settings.overdueConfig.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stopIfPaid">Stop if Paid</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="stopIfPaid"
                      checked={settings.overdueConfig.stopIfPaid}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          overdueConfig: {
                            ...settings.overdueConfig,
                            stopIfPaid: checked,
                          },
                        })
                      }
                      disabled={!settings.overdueConfig.enabled}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {settings.overdueConfig.stopIfPaid ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Escalation Levels</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addEscalationLevel}
                    disabled={!settings.overdueConfig.enabled}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Level
                  </Button>
                </div>

                {settings.overdueConfig.escalationLevels.map((level, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Days After Due</Label>
                          <Input
                            type="number"
                            min="1"
                            max="90"
                            value={level.daysAfterDue}
                            onChange={(e) =>
                              updateEscalationLevel(index, {
                                daysAfterDue: parseInt(e.target.value) || 1,
                              })
                            }
                            disabled={!settings.overdueConfig.enabled}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Send Time</Label>
                          <Input
                            type="time"
                            value={level.sendTime}
                            onChange={(e) =>
                              updateEscalationLevel(index, { sendTime: e.target.value })
                            }
                            disabled={!settings.overdueConfig.enabled}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Template Type</Label>
                          <Select
                            value={level.templateType}
                            onValueChange={(value: 'gentle' | 'firm' | 'urgent') =>
                              updateEscalationLevel(index, { templateType: value })
                            }
                            disabled={!settings.overdueConfig.enabled}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gentle">Gentle</SelectItem>
                              <SelectItem value="firm">Firm</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Actions</Label>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={level.enabled}
                              onCheckedChange={(checked) =>
                                updateEscalationLevel(index, { enabled: checked })
                              }
                              disabled={!settings.overdueConfig.enabled}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEscalationLevel(index)}
                              disabled={!settings.overdueConfig.enabled}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Welcome Messages */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Welcome Messages</CardTitle>
                  <CardDescription>
                    Send welcome emails to new tenants when they move in
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.welcomeConfig.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      welcomeConfig: { ...settings.welcomeConfig, enabled: checked },
                    })
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sendOn">Send On</Label>
                  <Select
                    value={settings.welcomeConfig.sendOn}
                    onValueChange={(value: 'move_in_date' | 'lease_start' | 'immediate') =>
                      setSettings({
                        ...settings,
                        welcomeConfig: { ...settings.welcomeConfig, sendOn: value },
                      })
                    }
                    disabled={!settings.welcomeConfig.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediately</SelectItem>
                      <SelectItem value="lease_start">Lease Start Date</SelectItem>
                      <SelectItem value="move_in_date">Move-In Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcomeSendTime">Send Time</Label>
                  <Input
                    id="welcomeSendTime"
                    type="time"
                    value={settings.welcomeConfig.sendTime}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        welcomeConfig: {
                          ...settings.welcomeConfig,
                          sendTime: e.target.value,
                        },
                      })
                    }
                    disabled={!settings.welcomeConfig.enabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Receipts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment Receipts</CardTitle>
                  <CardDescription>
                    Automatically send payment confirmation emails to tenants
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.receiptConfig.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      receiptConfig: { ...settings.receiptConfig, enabled: checked },
                    })
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sendImmediately">Send Immediately</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="sendImmediately"
                      checked={settings.receiptConfig.sendImmediately}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          receiptConfig: {
                            ...settings.receiptConfig,
                            sendImmediately: checked,
                          },
                        })
                      }
                      disabled={!settings.receiptConfig.enabled}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {settings.receiptConfig.sendImmediately ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="includeInvoiceDetails">Include Invoice Details</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="includeInvoiceDetails"
                      checked={settings.receiptConfig.includeInvoiceDetails}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          receiptConfig: {
                            ...settings.receiptConfig,
                            includeInvoiceDetails: checked,
                          },
                        })
                      }
                      disabled={!settings.receiptConfig.enabled}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {settings.receiptConfig.includeInvoiceDetails ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings Tab */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>
                Configure sender information and email delivery settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={settings.emailSettings.fromName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailSettings: {
                          ...settings.emailSettings,
                          fromName: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={settings.emailSettings.fromEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailSettings: {
                          ...settings.emailSettings,
                          fromEmail: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="replyToEmail">Reply-To Email</Label>
                  <Input
                    id="replyToEmail"
                    type="email"
                    value={settings.emailSettings.replyToEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailSettings: {
                          ...settings.emailSettings,
                          replyToEmail: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxRetries">Max Retries on Failure</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min="0"
                    max="10"
                    value={settings.emailSettings.maxRetriesOnFailure}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailSettings: {
                          ...settings.emailSettings,
                          maxRetriesOnFailure: parseInt(e.target.value) || 3,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retryDelay">Retry Delay (minutes)</Label>
                  <Input
                    id="retryDelay"
                    type="number"
                    min="1"
                    max="1440"
                    value={settings.emailSettings.retryDelayMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailSettings: {
                          ...settings.emailSettings,
                          retryDelayMinutes: parseInt(e.target.value) || 30,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notifyAdmin">Notify Admin on Failure</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="notifyAdmin"
                      checked={settings.emailSettings.notifyAdminOnFailure}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          emailSettings: {
                            ...settings.emailSettings,
                            notifyAdminOnFailure: checked,
                          },
                        })
                      }
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {settings.emailSettings.notifyAdminOnFailure ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Email Signature</Label>
                <Textarea
                  id="signature"
                  rows={4}
                  placeholder="Add a signature that will be appended to all emails..."
                  value={settings.emailSettings.signature}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emailSettings: {
                        ...settings.emailSettings,
                        signature: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue & Performance Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Queue Settings</CardTitle>
                  <CardDescription>
                    Configure email queue and rate limiting to avoid spam filters
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.queueSettings.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      queueSettings: { ...settings.queueSettings, enabled: checked },
                    })
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxPerHour">Max Emails Per Hour</Label>
                  <Input
                    id="maxPerHour"
                    type="number"
                    min="1"
                    max="1000"
                    value={settings.queueSettings.maxEmailsPerHour}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        queueSettings: {
                          ...settings.queueSettings,
                          maxEmailsPerHour: parseInt(e.target.value) || 50,
                        },
                      })
                    }
                    disabled={!settings.queueSettings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxPerDay">Max Emails Per Day</Label>
                  <Input
                    id="maxPerDay"
                    type="number"
                    min="1"
                    max="10000"
                    value={settings.queueSettings.maxEmailsPerDay}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        queueSettings: {
                          ...settings.queueSettings,
                          maxEmailsPerDay: parseInt(e.target.value) || 250,
                        },
                      })
                    }
                    disabled={!settings.queueSettings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchSize">Batch Size</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    min="1"
                    max="100"
                    value={settings.queueSettings.batchSize}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        queueSettings: {
                          ...settings.queueSettings,
                          batchSize: parseInt(e.target.value) || 10,
                        },
                      })
                    }
                    disabled={!settings.queueSettings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delayBetweenBatches">Delay Between Batches (seconds)</Label>
                  <Input
                    id="delayBetweenBatches"
                    type="number"
                    min="0"
                    max="3600"
                    value={settings.queueSettings.delayBetweenBatches}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        queueSettings: {
                          ...settings.queueSettings,
                          delayBetweenBatches: parseInt(e.target.value) || 60,
                        },
                      })
                    }
                    disabled={!settings.queueSettings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backlogThreshold">Backlog Alert Threshold</Label>
                  <Input
                    id="backlogThreshold"
                    type="number"
                    min="1"
                    max="10000"
                    value={settings.queueSettings.backlogThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        queueSettings: {
                          ...settings.queueSettings,
                          backlogThreshold: parseInt(e.target.value) || 100,
                        },
                      })
                    }
                    disabled={!settings.queueSettings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alertOnBacklog">Alert on Queue Backlog</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="alertOnBacklog"
                      checked={settings.queueSettings.alertOnQueueBacklog}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          queueSettings: {
                            ...settings.queueSettings,
                            alertOnQueueBacklog: checked,
                          },
                        })
                      }
                      disabled={!settings.queueSettings.enabled}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {settings.queueSettings.alertOnQueueBacklog ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Rules Tab */}
        <TabsContent value="business" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Rules</CardTitle>
              <CardDescription>
                Configure business logic for reminder system behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gracePeriod">Grace Period (days)</Label>
                  <Input
                    id="gracePeriod"
                    type="number"
                    min="0"
                    max="30"
                    value={settings.businessRules.gracePeriodDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        businessRules: {
                          ...settings.businessRules,
                          gracePeriodDays: parseInt(e.target.value) || 2,
                        },
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Days after due date before marking invoice as overdue
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pauseOnWeekends">Pause on Weekends</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="pauseOnWeekends"
                      checked={settings.businessRules.pauseOnWeekends}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          businessRules: {
                            ...settings.businessRules,
                            pauseOnWeekends: checked,
                          },
                        })
                      }
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {settings.businessRules.pauseOnWeekends ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Skip sending reminders on Saturdays and Sundays
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skipIfPaid">Skip if Paid</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="skipIfPaid"
                      checked={settings.businessRules.skipIfPaid}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          businessRules: {
                            ...settings.businessRules,
                            skipIfPaid: checked,
                          },
                        })
                      }
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {settings.businessRules.skipIfPaid ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Don't send reminders for fully paid invoices
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skipIfPartiallyPaid">Skip if Partially Paid</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      id="skipIfPartiallyPaid"
                      checked={settings.businessRules.skipIfPartiallyPaid}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          businessRules: {
                            ...settings.businessRules,
                            skipIfPartiallyPaid: checked,
                          },
                        })
                      }
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {settings.businessRules.skipIfPartiallyPaid ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Don't send reminders for partially paid invoices
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sticky Save Button at Bottom */}
      <div className="sticky bottom-0 bg-background border-t pt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset} disabled={saving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
