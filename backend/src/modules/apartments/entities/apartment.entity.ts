import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../database/entities/base.entity';
import { Compound } from '../../compounds/entities/compound.entity';
import { Occupancy } from '../../occupancies/entities/occupancy.entity';

/**
 * Apartment Entity - Represents a unit within a compound
 * Author: george1806
 *
 * Database Optimization:
 * - Composite index on (companyId, compoundId, unitNumber) for fast lookups
 * - Index on (companyId, isActive) for filtered queries
 * - Foreign key with cascade options for referential integrity
 */
@Entity('apartments')
@Index(['companyId', 'compoundId', 'unitNumber'], { unique: true })
@Index(['companyId', 'isActive'])
export class Apartment extends TenantBaseEntity {
  @Column({ name: 'compound_id' })
  @Index()
  compoundId: string;

  @ManyToOne(() => Compound, { eager: false })
  @JoinColumn({ name: 'compound_id' })
  compound: Compound;

  @Column({ name: 'unit_number', length: 50 })
  unitNumber: string;

  @Column({ type: 'int', nullable: true })
  floor: number;

  @Column({ type: 'int', nullable: true })
  bedrooms: number;

  @Column({ type: 'int', nullable: true })
  bathrooms: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'area_sqm'
  })
  areaSqm: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    name: 'monthly_rent'
  })
  monthlyRent: number;

  @Column({
    type: 'enum',
    enum: ['available', 'occupied', 'maintenance', 'reserved'],
    default: 'available'
  })
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';

  @Column({ type: 'json', nullable: true })
  amenities: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Relations
  @OneToMany(() => Occupancy, (occupancy) => occupancy.apartment)
  occupancies: Occupancy[];

  // Virtual field for display name
  get displayName(): string {
    return `Unit ${this.unitNumber}`;
  }

  // Virtual field for occupancy status
  get isAvailable(): boolean {
    return this.status === 'available' && this.isActive;
  }
}
