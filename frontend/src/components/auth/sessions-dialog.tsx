'use client';

import { useEffect, useState } from 'react';
import { Monitor, Smartphone, Tablet, MapPin, Clock, LogOut, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { authService, type Session } from '@/services/auth.service';
import { getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';

interface SessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionsDialog({ open, onOpenChange }: SessionsDialogProps) {
  const { toast } = useToast();
  const { clearAuth } = useAuthStore();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (open) {
      loadSessions();
    }
  }, [open]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await authService.getSessions();
      setSessions(response.data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('Are you sure you want to logout from all devices? You will be logged out from this device too.')) {
      return;
    }

    try {
      setLoggingOut(true);
      await authService.logoutAll();

      toast({
        title: 'Success',
        description: 'Logged out from all devices successfully',
      });

      // Clear local auth state
      clearAuth();

      // Close dialog
      onOpenChange(false);

      // Redirect to login
      router.push('/auth/login');
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const getDeviceIcon = (deviceInfo: string) => {
    const info = deviceInfo.toLowerCase();

    if (info.includes('mobile') || info.includes('android') || info.includes('iphone')) {
      return <Smartphone className="h-5 w-5 text-muted-foreground" />;
    }

    if (info.includes('tablet') || info.includes('ipad')) {
      return <Tablet className="h-5 w-5 text-muted-foreground" />;
    }

    return <Monitor className="h-5 w-5 text-muted-foreground" />;
  };

  const formatDeviceInfo = (deviceInfo: string) => {
    // Extract browser and OS from user agent string
    const parts = deviceInfo.split(/[()]/);
    if (parts.length >= 2) {
      const browser = parts[0].trim();
      const os = parts[1].split(';')[0].trim();
      return { browser, os };
    }
    return { browser: 'Unknown Browser', os: 'Unknown OS' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Active Sessions</DialogTitle>
          <DialogDescription>
            Manage your active sessions across all devices
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active sessions found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {sessions.map((session) => {
                  const { browser, os } = formatDeviceInfo(session.deviceInfo);

                  return (
                    <div
                      key={session.id}
                      className={`p-4 border rounded-lg ${
                        session.isCurrent ? 'bg-primary/5 border-primary' : 'bg-background'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 flex-1">
                          <div className="mt-1">
                            {getDeviceIcon(session.deviceInfo)}
                          </div>

                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{browser}</h4>
                              {session.isCurrent && (
                                <Badge variant="default" className="text-xs">
                                  Current Session
                                </Badge>
                              )}
                            </div>

                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-1">
                                <Monitor className="h-3 w-3" />
                                <span>{os}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{session.ipAddress}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Last active:{' '}
                                  {formatDistanceToNow(new Date(session.lastActive), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>

                              <div className="text-xs">
                                Started: {format(new Date(session.createdAt), 'MMM dd, yyyy HH:mm')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {sessions.length} active {sessions.length === 1 ? 'session' : 'sessions'}
                </p>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLogoutAll}
                  disabled={loggingOut}
                >
                  {loggingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout All Devices
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
