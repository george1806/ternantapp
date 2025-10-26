import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../database/entities/base.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { PaymentMethod } from '../../../common/enums';

/**
 * Payment Entity - Tracks payment transactions for invoices
 * Author: george1806
 */
@Entity('payments')
@Index(['companyId', 'invoiceId'])
@Index(['companyId', 'paidAt'])
export class Payment extends TenantBaseEntity {
    @Column({ name: 'invoice_id' })
    invoiceId: string;

    @Column({
        type: 'decimal',
        precision: 15,
        scale: 2
    })
    amount: number;

    @Column({ type: 'timestamp', name: 'paid_at' })
    paidAt: Date;

    @Column({
        type: 'enum',
        enum: PaymentMethod
    })
    method: PaymentMethod;

    @Column({ length: 255, nullable: true })
    reference: string;

    @Column({ type: 'json', nullable: true })
    metadata: any;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ default: true, name: 'is_active' })
    isActive: boolean;

    // Relations
    @ManyToOne(() => Invoice, { eager: false })
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;
}
