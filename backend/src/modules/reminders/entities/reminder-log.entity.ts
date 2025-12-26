import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReminderType } from '../../../common/enums';
import { Reminder } from './reminder.entity';

/**
 * Reminder Log Status
 */
export enum ReminderLogStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  DELIVERED = 'delivered',
}

/**
 * Reminder Log Entity
 *
 * Audit trail for all reminder emails sent.
 * Tracks delivery status, failures, and provides compliance logging.
 *
 * Author: george1806
 */
@Entity('reminder_logs')
@Index(['companyId', 'createdAt'])
@Index(['reminderId'])
@Index(['status'])
@Index(['recipient'])
export class ReminderLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  companyId: string;

  @Column({ type: 'uuid', nullable: true })
  reminderId: string;

  @ManyToOne(() => Reminder, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reminderId' })
  reminder: Reminder;

  @Column({
    type: 'enum',
    enum: ReminderType,
  })
  type: ReminderType;

  @Column({
    type: 'enum',
    enum: ReminderLogStatus,
    default: ReminderLogStatus.QUEUED,
  })
  status: ReminderLogStatus;

  @Column({ nullable: true })
  messageId: string; // Provider's message ID

  @Column()
  recipient: string;

  @Column()
  subject: string;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: 'json', nullable: true })
  metadata: {
    invoiceId?: string;
    tenantId?: string;
    amount?: number;
    dueDate?: string;
    provider?: string;
    templateUsed?: string;
    escalationLevel?: string;
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
    return this.status === ReminderLogStatus.SENT || this.status === ReminderLogStatus.DELIVERED;
  }

  /**
   * Check if log is for a failed send
   */
  isFailed(): boolean {
    return this.status === ReminderLogStatus.FAILED || this.status === ReminderLogStatus.BOUNCED;
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
