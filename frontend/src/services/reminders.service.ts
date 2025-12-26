import { api } from '@/lib/api';

/**
 * Reminders Service
 *
 * Handles reminder creation, management, and automated notifications
 */

export interface Reminder {
  id: string;
  companyId: string;
  type: 'rent_due' | 'payment_received' | 'lease_expiring' | 'custom';
  subject: string;
  message: string;
  tenantId?: string;
  occupancyId?: string;
  invoiceId?: string;
  sendAt: string;
  channel: 'email' | 'sms' | 'both';
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  error?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderQueryParams {
  status?: 'pending' | 'sent' | 'failed';
  type?: 'rent_due' | 'payment_received' | 'lease_expiring' | 'custom';
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateReminderDto {
  type: 'rent_due' | 'payment_received' | 'lease_expiring' | 'custom';
  subject: string;
  message: string;
  tenantId?: string;
  occupancyId?: string;
  invoiceId?: string;
  sendAt: string | Date;
  channel: 'email' | 'sms' | 'both';
}

export interface UpdateReminderDto {
  subject?: string;
  message?: string;
  sendAt?: string | Date;
  channel?: 'email' | 'sms' | 'both';
}

export interface WelcomeMessageDto {
  message?: string;
  sendVia?: 'email' | 'sms' | 'both';
}

export interface ReceiptDto {
  paymentId: string;
  invoiceId: string;
  tenantEmail: string;
  customMessage?: string;
}

export interface ReminderListResponse {
  data: Reminder[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BatchSendDto {
  type: 'DUE_SOON' | 'OVERDUE';
  propertyIds?: string[];
  apartmentIds?: string[];
  tenantIds?: string[];
  dryRun?: boolean;
}

export interface BatchSendResponse {
  success: boolean;
  message: string;
  totalEligible: number;
  totalQueued: number;
  totalSkipped: number;
  reminders: Array<{
    id: string;
    tenantName: string;
    recipient: string;
    subject: string;
    status: string;
  }>;
  skippedReasons?: Record<string, number>;
}

export interface PreviewResponse {
  id: string;
  type: string;
  subject: string;
  message: string;
  recipient: string;
  scheduledFor: string;
  metadata: Record<string, any>;
  textPreview: string;
  htmlPreview?: string;
}

export interface DeliveryStats {
  totalSent: number;
  successfulDeliveries: number;
  failures: number;
  bounces: number;
  successRate: number;
  bounceRate: number;
  failureRate: number;
}

export interface ProcessingTimeResponse {
  averageProcessingTime: number | null;
  unit: string;
  message: string;
}

export interface FailureReasonsResponse {
  failureReasons: Record<string, number>;
  totalFailures: number;
}

export interface ReminderLog {
  id: string;
  companyId: string;
  type: string;
  recipient: string;
  subject: string;
  status: 'queued' | 'sent' | 'failed';
  queuedAt: string;
  sentAt?: string;
  failedAt?: string;
  error?: string;
  messageId?: string;
  provider?: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
}

export const remindersService = {
  /**
   * Get all reminders with optional filters
   */
  getAll: (params?: ReminderQueryParams) => {
    return api.get<ReminderListResponse>('/reminders', { params });
  },

  /**
   * Get reminder by ID
   */
  getById: (id: string) => {
    return api.get<Reminder>(`/reminders/${id}`);
  },

  /**
   * Create a new reminder
   */
  create: (data: CreateReminderDto) => {
    return api.post<Reminder>('/reminders', data);
  },

  /**
   * Update an existing reminder
   */
  update: (id: string, data: UpdateReminderDto) => {
    return api.patch<Reminder>(`/reminders/${id}`, data);
  },

  /**
   * Delete a reminder
   */
  delete: (id: string) => {
    return api.delete(`/reminders/${id}`);
  },

  /**
   * Mark reminder as sent
   */
  markSent: (id: string) => {
    return api.post<Reminder>(`/reminders/${id}/mark-sent`);
  },

  /**
   * Send welcome message to a tenant
   */
  sendWelcome: (tenantId: string, data?: WelcomeMessageDto) => {
    return api.post(`/reminders/welcome/${tenantId}`, data || {});
  },

  /**
   * Send payment receipt to tenant
   */
  sendReceipt: (data: ReceiptDto) => {
    return api.post('/reminders/receipt', data);
  },

  /**
   * Send a reminder immediately (manual trigger)
   */
  sendNow: (id: string) => {
    return api.post<Reminder>(`/reminders/${id}/send-now`);
  },

  /**
   * Preview a reminder without sending
   */
  preview: (id: string) => {
    return api.post<PreviewResponse>(`/reminders/${id}/preview`);
  },

  /**
   * Batch send reminders based on criteria
   */
  batchSend: (data: BatchSendDto) => {
    return api.post<BatchSendResponse>('/reminders/batch/send', data);
  },

  /**
   * Analytics: Get delivery statistics
   */
  getDeliveryStats: (params?: AnalyticsQueryParams) => {
    return api.get<DeliveryStats>('/reminders/analytics/delivery-stats', { params });
  },

  /**
   * Analytics: Get average processing time
   */
  getProcessingTime: (params?: AnalyticsQueryParams) => {
    return api.get<ProcessingTimeResponse>('/reminders/analytics/processing-time', { params });
  },

  /**
   * Analytics: Get failure reasons breakdown
   */
  getFailureReasons: (params?: AnalyticsQueryParams) => {
    return api.get<FailureReasonsResponse>('/reminders/analytics/failure-reasons', { params });
  },

  /**
   * Analytics: Get reminder logs
   */
  getLogs: (params?: AnalyticsQueryParams) => {
    return api.get<ReminderLog[]>('/reminders/analytics/logs', { params });
  },

  /**
   * Analytics: Clean up old logs
   */
  cleanupLogs: (daysToKeep?: number) => {
    return api.get<{ success: boolean; message: string; deletedCount: number }>(
      '/reminders/analytics/cleanup',
      { params: { daysToKeep } }
    );
  },
};
