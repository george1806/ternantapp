'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Mail, MessageSquare, Clock, CheckCircle2, XCircle, Search, MoreVertical, Eye, Send, Edit, Trash2, Users, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { remindersService, type Reminder, type PreviewResponse } from '@/services/reminders.service';
import { getApiErrorMessage } from '@/lib/api';
import { format } from 'date-fns';
import { ReminderFormDialog } from '@/components/reminders/reminder-form-dialog';
import { BatchSendDialog } from '@/components/reminders/batch-send-dialog';

export default function RemindersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBatchSendDialogOpen, setIsBatchSendDialogOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    data: PreviewResponse | null;
  }>({ open: false, data: null });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    sent: 0,
    failed: 0,
  });

  const limit = 10;

  // Helper function to safely format dates
  const formatSafeDate = (dateValue: string | undefined | null, formatStr: string): string => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, formatStr);
  };

  useEffect(() => {
    loadReminders();
  }, [currentPage, statusFilter, typeFilter, searchTerm]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await remindersService.getAll(params);
      setReminders(response.data.data || []);
      setTotalPages(response.data.meta?.totalPages || 1);

      // Calculate stats
      const allRemindersResponse = await remindersService.getAll({ page: 1, limit: 1000 });
      const allReminders = allRemindersResponse.data.data || [];
      setStats({
        total: allReminders.length,
        pending: allReminders.filter((r) => r.status === 'pending').length,
        sent: allReminders.filter((r) => r.status === 'sent').length,
        failed: allReminders.filter((r) => r.status === 'failed').length,
      });
    } catch (error) {
      console.error('Error loading reminders:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) {
      return;
    }

    try {
      await remindersService.delete(id);
      toast({
        title: 'Success',
        description: 'Reminder deleted successfully',
      });
      loadReminders();
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleMarkSent = async (id: string) => {
    try {
      await remindersService.markSent(id);
      toast({
        title: 'Success',
        description: 'Reminder marked as sent',
      });
      loadReminders();
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const response = await remindersService.preview(id);
      setPreviewDialog({ open: true, data: response.data });
    } catch (error) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleSendNow = async (id: string) => {
    if (!confirm('Are you sure you want to send this reminder immediately?')) {
      return;
    }

    try {
      await remindersService.sendNow(id);
      toast({
        title: 'Success',
        description: 'Reminder queued for immediate sending',
      });
      loadReminders();
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
      case 'PENDING':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'SENT':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'FAILED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { color: string; label: string }> = {
      DUE_SOON: { color: 'bg-blue-100 text-blue-800', label: 'Rent Due' },
      OVERDUE: { color: 'bg-red-100 text-red-800', label: 'Overdue' },
      RECEIPT: { color: 'bg-green-100 text-green-800', label: 'Receipt' },
      WELCOME: { color: 'bg-purple-100 text-purple-800', label: 'Welcome' },
    };

    const config = typeConfig[type] || { color: 'bg-gray-100 text-gray-800', label: type };

    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'both':
        return (
          <div className="flex gap-1">
            <Mail className="h-4 w-4" />
            <MessageSquare className="h-4 w-4" />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading && reminders.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reminders</h1>
          <p className="text-muted-foreground mt-2">
            Manage automated tenant notifications and reminders
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/reminders/analytics')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsBatchSendDialogOpen(true)}
          >
            <Users className="h-4 w-4 mr-2" />
            Batch Send
          </Button>
          <Button onClick={() => {
            setSelectedReminder(null);
            setIsCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Reminder
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reminders</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by subject or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="DUE_SOON">Rent Due</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="RECEIPT">Payment Receipt</SelectItem>
                <SelectItem value="WELCOME">Welcome</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reminders Table */}
      <Card>
        <CardContent className="pt-6">
          {reminders.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reminders found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first reminder to start automating tenant notifications
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Reminder
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Send At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reminders.map((reminder) => (
                    <TableRow key={reminder.id}>
                      <TableCell>{getTypeBadge(reminder.type)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reminder.subject}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {reminder.message}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getChannelIcon(reminder.channel)}
                          <span className="text-sm">{reminder.channel || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatSafeDate(reminder.sendAt, 'MMM dd, yyyy')}
                          <div className="text-xs text-muted-foreground">
                            {formatSafeDate(reminder.sendAt, 'hh:mm a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(reminder.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePreview(reminder.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            {reminder.status === 'PENDING' && (
                              <DropdownMenuItem onClick={() => handleSendNow(reminder.id)}>
                                <Send className="h-4 w-4 mr-2" />
                                Send Now
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedReminder(reminder);
                                setIsCreateDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(reminder.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <ReminderFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        reminder={selectedReminder}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          setSelectedReminder(null);
          loadReminders();
        }}
      />

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ open, data: null })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Reminder</DialogTitle>
            <DialogDescription>
              Review the reminder content before sending
            </DialogDescription>
          </DialogHeader>

          {previewDialog.data && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Recipient</label>
                <p className="text-sm text-muted-foreground">{previewDialog.data.recipient}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Subject</label>
                <p className="text-sm text-muted-foreground">{previewDialog.data.subject}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Scheduled For</label>
                <p className="text-sm text-muted-foreground">
                  {formatSafeDate(previewDialog.data.scheduledFor, 'MMM dd, yyyy hh:mm a')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Message (Text)</label>
                <div className="mt-2 p-4 bg-muted rounded-md">
                  <pre className="whitespace-pre-wrap text-sm">{previewDialog.data.textPreview}</pre>
                </div>
              </div>

              {previewDialog.data.htmlPreview && (
                <div>
                  <label className="text-sm font-medium">Message (HTML Preview)</label>
                  <div
                    className="mt-2 p-4 bg-white border rounded-md"
                    dangerouslySetInnerHTML={{ __html: previewDialog.data.htmlPreview }}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Send Dialog */}
      <BatchSendDialog
        open={isBatchSendDialogOpen}
        onOpenChange={setIsBatchSendDialogOpen}
        onSuccess={loadReminders}
      />
    </div>
  );
}
