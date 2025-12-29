import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';

/**
 * Invoice Email Log Status
 */
export enum InvoiceEmailLogStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  DELIVERED = 'delivered',
}

/**
 * Invoice Email Log Entity
 *
 * Audit trail for all invoice emails sent/resent.
 * Tracks delivery status, failures, and provides compliance logging.
 *
 * Author: george1806
 */
@Entity('invoice_email_logs')
@Index(['companyId', 'createdAt'])
@Index(['invoiceId'])
@Index(['status'])
@Index(['recipient'])
export class InvoiceEmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  companyId: string;

  @Column({ type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column({
    type: 'enum',
    enum: InvoiceEmailLogStatus,
    default: InvoiceEmailLogStatus.QUEUED,
  })
  status: InvoiceEmailLogStatus;

  @Column({ nullable: true })
  messageId: string; // Provider's message ID

  @Column()
  recipient: string;

  @Column()
  subject: string;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ default: 1 })
  attempts: number; // Number of send/resend attempts

  @Column({ default: false })
  isResend: boolean; // True if this is a resend, false if first send

  @Column({ type: 'json', nullable: true })
  metadata: {
    invoiceNumber?: string;
    tenantId?: string;
    tenantName?: string;
    amount?: number;
    dueDate?: string;
    provider?: string;
    hasPdfAttachment?: boolean;
    [key: string]: any;
  };

  @Column({ type: 'timestamp', nullable: true })
  queuedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  /**
   * Check if log is for a successful send
   */
  isSuccessful(): boolean {
    return this.status === InvoiceEmailLogStatus.SENT || this.status === InvoiceEmailLogStatus.DELIVERED;
  }

  /**
   * Check if log is for a failed send
   */
  isFailed(): boolean {
    return this.status === InvoiceEmailLogStatus.FAILED || this.status === InvoiceEmailLogStatus.BOUNCED;
  }

  /**
   * Get time taken from queue to send (in seconds)
   */
  getProcessingTime(): number | null {
    if (!this.queuedAt || !this.sentAt) {
      return null;
    }
    return (this.sentAt.getTime() - this.queuedAt.getTime()) / 1000;
  }
}
