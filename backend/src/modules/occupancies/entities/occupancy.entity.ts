import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../database/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Apartment } from '../../apartments/entities/apartment.entity';

/**
 * Occupancy Entity - Represents tenant-apartment relationships (leases)
 * Author: george1806
 */
@Entity('occupancies')
@Index(['companyId', 'apartmentId', 'status'])
@Index(['companyId', 'tenantId', 'status'])
@Index(['companyId', 'leaseEndDate'])
export class Occupancy extends TenantBaseEntity {
    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'apartment_id' })
    apartmentId: string;

    @Column({ type: 'date', name: 'lease_start_date' })
    leaseStartDate: Date;

    @Column({ type: 'date', name: 'lease_end_date' })
    leaseEndDate: Date;

    @Column({
        type: 'decimal',
        precision: 15,
        scale: 2,
        name: 'monthly_rent'
    })
    monthlyRent: number;

    @Column({
        type: 'decimal',
        precision: 15,
        scale: 2,
        name: 'security_deposit',
        nullable: true
    })
    securityDeposit: number;

    @Column({
        type: 'decimal',
        precision: 15,
        scale: 2,
        name: 'deposit_paid',
        default: 0
    })
    depositPaid: number;

    @Column({ type: 'date', nullable: true, name: 'move_in_date' })
    moveInDate: Date;

    @Column({ type: 'date', nullable: true, name: 'move_out_date' })
    moveOutDate: Date;

    @Column({
        type: 'enum',
        enum: ['pending', 'active', 'ended', 'cancelled'],
        default: 'pending'
    })
    status: 'pending' | 'active' | 'ended' | 'cancelled';

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ default: true, name: 'is_active' })
    isActive: boolean;

    // Relations
    @ManyToOne(() => Tenant, { eager: false })
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => Apartment, { eager: false })
    @JoinColumn({ name: 'apartment_id' })
    apartment: Apartment;

    @OneToMany('Invoice', 'occupancy', { cascade: true })
    invoices: any[];

    // Virtual properties
    get isCurrentlyActive(): boolean {
        const now = new Date();
        return (
            this.status === 'active' &&
            this.isActive &&
            this.leaseStartDate <= now &&
            this.leaseEndDate >= now
        );
    }

    get daysUntilLeaseEnd(): number | null {
        if (this.status !== 'active') return null;
        const now = new Date();
        const endDate = new Date(this.leaseEndDate);
        const diffTime = endDate.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    get remainingDepositAmount(): number {
        return (this.securityDeposit || 0) - this.depositPaid;
    }
}
