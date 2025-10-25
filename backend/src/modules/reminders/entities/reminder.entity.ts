import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../database/entities/base.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { ReminderType, ReminderStatus } from '../../../common/enums';

/**
 * Reminder Entity
 * Tracks reminder notifications sent to tenants
 *
 * Handles:
 * - Rent due reminders
 * - Overdue payment notifications
 * - Payment receipts
 * - Welcome messages
 *
 * Author: george1806
 */
@Entity('reminders')
@Index(['companyId', 'status', 'scheduledFor'])
@Index(['companyId', 'tenantId'])
export class Reminder extends TenantBaseEntity {
  @Column({ type: 'enum', enum: ReminderType })
  type: ReminderType;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  invoiceId: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recipient: string;

  @Column({ type: 'enum', enum: ReminderStatus, default: ReminderStatus.PENDING })
  status: ReminderStatus;

  @Column({ type: 'timestamp', name: 'scheduled_for' })
  scheduledFor: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt: Date;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'json', nullable: true })
  metadata: {
    emailJobId?: string;
    templateName?: string;
    [key: string]: any;
  };

  // Relations
  @ManyToOne(() => Tenant, { eager: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Invoice, { eager: false, nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;
}
