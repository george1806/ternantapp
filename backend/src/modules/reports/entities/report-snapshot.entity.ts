import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../database/entities/base.entity';

/**
 * Report Snapshot Entity
 * Stores historical snapshots of KPIs for trend analysis
 * Generated monthly via cron job
 */
@Entity('report_snapshots')
@Index(['companyId', 'snapshotDate'])
@Index(['snapshotType'])
@Index(['companyId', 'snapshotDate', 'snapshotType'], { unique: true })
export class ReportSnapshot extends TenantBaseEntity {
  @Column({ type: 'date', name: 'snapshot_date' })
  snapshotDate: Date;

  @Column({
    type: 'enum',
    enum: ['monthly', 'weekly', 'daily'],
    default: 'monthly',
    name: 'snapshot_type',
  })
  snapshotType: 'monthly' | 'weekly' | 'daily';

  // KPI Data
  @Column({ type: 'int', default: 0, name: 'total_units' })
  totalUnits: number;

  @Column({ type: 'int', default: 0, name: 'occupied_units' })
  occupiedUnits: number;

  @Column({ type: 'int', default: 0, name: 'vacant_units' })
  vacantUnits: number;

  @Column({ type: 'int', default: 0, name: 'maintenance_units' })
  maintenanceUnits: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'occupancy_rate' })
  occupancyRate: number;

  // Revenue Data
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_revenue' })
  totalRevenue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'monthly_revenue' })
  monthlyRevenue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'collected_revenue' })
  collectedRevenue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'outstanding_revenue' })
  outstandingRevenue: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'collection_rate' })
  collectionRate: number;

  // Tenant/Lease Data
  @Column({ type: 'int', default: 0, name: 'active_tenants' })
  activeTenants: number;

  @Column({ type: 'int', default: 0, name: 'active_leases' })
  activeLeases: number;

  // Invoice Data
  @Column({ type: 'int', default: 0, name: 'pending_invoices' })
  pendingInvoices: number;

  @Column({ type: 'int', default: 0, name: 'overdue_invoices' })
  overdueInvoices: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'overdue_amount' })
  overdueAmount: number;

  // Lease Expiration
  @Column({ type: 'int', default: 0, name: 'expiring_leases_30_days' })
  expiringLeases30Days: number;

  @Column({ type: 'int', default: 0, name: 'expiring_leases_60_days' })
  expiringLeases60Days: number;

  @Column({ type: 'int', default: 0, name: 'expiring_leases_90_days' })
  expiringLeases90Days: number;
}
