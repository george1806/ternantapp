import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../database/entities/base.entity';
import { Occupancy } from '../../occupancies/entities/occupancy.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Invoice Entity - Represents billing documents for rent and other charges
 * Author: george1806
 */
@Entity('invoices')
@Index(['companyId', 'occupancyId', 'status'])
@Index(['companyId', 'tenantId', 'status'])
@Index(['companyId', 'dueDate'])
@Index(['companyId', 'invoiceNumber'], { unique: true })
export class Invoice extends TenantBaseEntity {
  @Column({ name: 'invoice_number', length: 50, unique: false })
  invoiceNumber: string;

  @Column({ name: 'occupancy_id' })
  occupancyId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'date', name: 'invoice_date' })
  invoiceDate: Date;

  @Column({ type: 'date', name: 'due_date' })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
  })
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

  @Column({ type: 'json' })
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    type?: 'rent' | 'utility' | 'maintenance' | 'other';
  }[];

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'subtotal',
  })
  subtotal: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    name: 'tax_amount',
    default: 0,
  })
  taxAmount: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_amount',
  })
  totalAmount: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    name: 'amount_paid',
  })
  amountPaid: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'date', nullable: true, name: 'paid_date' })
  paidDate: Date;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Relations
  @ManyToOne(() => Occupancy, { eager: false })
  @JoinColumn({ name: 'occupancy_id' })
  occupancy: Occupancy;

  @ManyToOne(() => Tenant, { eager: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // Virtual properties
  get amountDue(): number {
    return Number(this.totalAmount) - Number(this.amountPaid);
  }

  get isOverdue(): boolean {
    if (this.status === 'paid' || this.status === 'cancelled') {
      return false;
    }
    const now = new Date();
    return new Date(this.dueDate) < now;
  }

  get isPaid(): boolean {
    return this.status === 'paid' || Number(this.amountPaid) >= Number(this.totalAmount);
  }

  get daysOverdue(): number | null {
    if (!this.isOverdue) return null;
    const now = new Date();
    const due = new Date(this.dueDate);
    const diffTime = now.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
