import { Entity, Column, Index, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '../../../database/entities/base.entity';

/**
 * Compound Entity - Represents a building or location containing apartments
 * Author: george1806
 */
@Entity('compounds')
@Index(['companyId', 'name'])
export class Compound extends TenantBaseEntity {
    @Column({ length: 255 })
    name: string;

    @Column({ name: 'address_line', length: 500 })
    addressLine: string;

    @Column({ length: 100 })
    city: string;

    @Column({ length: 100, nullable: true })
    region: string;

    @Column({ length: 100 })
    country: string;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 7,
        nullable: true,
        name: 'geo_lat'
    })
    geoLat: number;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 7,
        nullable: true,
        name: 'geo_lng'
    })
    geoLng: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ default: true, name: 'is_active' })
    isActive: boolean;

    // Relations - using forward reference to avoid circular dependency
    @OneToMany('Apartment', 'compound')
    apartments: any[];

    // Virtual field for full address
    get fullAddress(): string {
        const parts = [this.addressLine, this.city];
        if (this.region) parts.push(this.region);
        parts.push(this.country);
        return parts.join(', ');
    }
}
