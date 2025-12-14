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
};
