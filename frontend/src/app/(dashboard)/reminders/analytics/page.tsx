'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';
import {
  remindersService,
  type DeliveryStats,
  type ProcessingTimeResponse,
  type FailureReasonsResponse,
  type ReminderLog,
} from '@/services/reminders.service';

export default function RemindersAnalyticsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null);
  const [processingTime, setProcessingTime] = useState<ProcessingTimeResponse | null>(null);
  const [failureReasons, setFailureReasons] = useState<FailureReasonsResponse | null>(null);
  const [recentLogs, setRecentLogs] = useState<ReminderLog[]>([]);
  const [dateRange, setDateRange] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const [statsRes, timeRes, reasonsRes, logsRes] = await Promise.all([
        remindersService.getDeliveryStats(dateRange),
        remindersService.getProcessingTime(dateRange),
        remindersService.getFailureReasons(dateRange),
        remindersService.getLogs(dateRange),
      ]);

      setDeliveryStats(statsRes.data);
      setProcessingTime(timeRes.data);
      setFailureReasons(reasonsRes.data);
      setRecentLogs(logsRes.data);
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

  const handleCleanup = async () => {
    try {
      const response = await remindersService.cleanupLogs(90);
      toast({
        title: 'Success',
        description: response.data.message,
      });
      loadAnalytics();
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Queued
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case 'delivered':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Delivered
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'bounced':
        return (
          <Badge variant="destructive" className="bg-orange-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Bounced
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && !deliveryStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/reminders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Reminder Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Delivery statistics and performance metrics
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleCleanup}>
          <Trash2 className="h-4 w-4 mr-2" />
          Cleanup Old Logs
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Select the period for analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryStats?.totalSent || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {deliveryStats?.successRate.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {deliveryStats?.successfulDeliveries || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failures</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {deliveryStats?.failures || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {deliveryStats?.failureRate.toFixed(1) || 0}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounces</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {deliveryStats?.bounces || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {deliveryStats?.bounceRate.toFixed(1) || 0}% bounce rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Processing Time */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Performance</CardTitle>
          <CardDescription>Average time from queue to delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">
              {processingTime?.averageProcessingTime?.toFixed(2) || 'N/A'}
            </span>
            <span className="text-muted-foreground">{processingTime?.unit || 'seconds'}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{processingTime?.message}</p>
        </CardContent>
      </Card>

      {/* Failure Reasons */}
      {failureReasons && failureReasons.totalFailures > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Failure Reasons</CardTitle>
            <CardDescription>
              Breakdown of {failureReasons.totalFailures} failures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(failureReasons.failureReasons).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between">
                  <span className="text-sm">{reason}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-48 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${(count / failureReasons.totalFailures) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest reminder logs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No logs available for this period
                  </TableCell>
                </TableRow>
              ) : (
                recentLogs.slice(0, 20).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {formatDate(log.sentAt || log.failedAt || log.queuedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.recipient}</TableCell>
                    <TableCell className="text-sm truncate max-w-xs">{log.subject}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm">{log.metadata?.provider || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
