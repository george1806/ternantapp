import { Entity, Column, Index, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '../../../database/entities/base.entity';
import { Occupancy } from '../../occupancies/entities/occupancy.entity';

/**
 * Tenant Entity - Represents individuals or entities renting apartments
 * Author: george1806
 */
@Entity('tenants')
@Index(['companyId', 'email'], { unique: true })
@Index(['companyId', 'phone'])
@Index(['companyId', 'isActive'])
export class Tenant extends TenantBaseEntity {
    @Column({ name: 'first_name', length: 100 })
    firstName: string;

    @Column({ name: 'last_name', length: 100 })
    lastName: string;

    @Column({ length: 255, unique: false })
    email: string;

    @Column({ length: 50, nullable: true })
    phone: string;

    @Column({ name: 'alternate_phone', length: 50, nullable: true })
    alternatePhone: string;

    @Column({ type: 'date', nullable: true, name: 'date_of_birth' })
    dateOfBirth: Date;

    @Column({ length: 50, nullable: true, name: 'id_type' })
    idType: string;

    @Column({ length: 100, nullable: true, name: 'id_number' })
    idNumber: string;

    @Column({ type: 'text', nullable: true, name: 'current_address' })
    currentAddress: string;

    @Column({ length: 100, nullable: true, name: 'emergency_contact_name' })
    emergencyContactName: string;

    @Column({ length: 50, nullable: true, name: 'emergency_contact_phone' })
    emergencyContactPhone: string;

    @Column({ length: 100, nullable: true, name: 'emergency_contact_relationship' })
    emergencyContactRelationship: string;

    @Column({ length: 255, nullable: true, name: 'employer_name' })
    employerName: string;

    @Column({ length: 100, nullable: true, name: 'employer_phone' })
    employerPhone: string;

    @Column({
        type: 'decimal',
        precision: 15,
        scale: 2,
        nullable: true,
        name: 'monthly_income'
    })
    monthlyIncome: number;

    @Column({ type: 'json', nullable: true })
    references: {
        name: string;
        phone: string;
        relationship: string;
        email?: string;
    }[];

    @Column({ type: 'json', nullable: true })
    documents: {
        type: string;
        fileName: string;
        fileUrl: string;
        uploadedAt: Date;
    }[];

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({
        type: 'enum',
        enum: ['active', 'inactive', 'blacklisted'],
        default: 'active'
    })
    status: 'active' | 'inactive' | 'blacklisted';

    @Column({ default: true, name: 'is_active' })
    isActive: boolean;

    // Relations
    @OneToMany(() => Occupancy, (occupancy) => occupancy.tenant)
    occupancies: Occupancy[];

    // Virtual fields
    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    get age(): number | null {
        if (!this.dateOfBirth) return null;
        const today = new Date();
        const birthDate = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    get isBlacklisted(): boolean {
        return this.status === 'blacklisted';
    }
}
