import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateReportSnapshotsTable1734900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create report_snapshots table
    await queryRunner.createTable(
      new Table({
        name: 'report_snapshots',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'company_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'snapshot_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'snapshot_type',
            type: 'enum',
            enum: ['monthly', 'weekly', 'daily'],
            default: "'monthly'",
            isNullable: false,
          },
          // KPI Data
          {
            name: 'total_units',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'occupied_units',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'vacant_units',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'maintenance_units',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'occupancy_rate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          // Revenue Data
          {
            name: 'total_revenue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'monthly_revenue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'collected_revenue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'outstanding_revenue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'collection_rate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          // Tenant/Lease Data
          {
            name: 'active_tenants',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'active_leases',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          // Invoice Data
          {
            name: 'pending_invoices',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'overdue_invoices',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'overdue_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          // Lease Expiration
          {
            name: 'expiring_leases_30_days',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'expiring_leases_60_days',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'expiring_leases_90_days',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          // Metadata
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create index on company_id and snapshot_date
    await queryRunner.createIndex(
      'report_snapshots',
      new TableIndex({
        name: 'idx_company_date',
        columnNames: ['company_id', 'snapshot_date'],
      }),
    );

    // Create index on snapshot_type
    await queryRunner.createIndex(
      'report_snapshots',
      new TableIndex({
        name: 'idx_snapshot_type',
        columnNames: ['snapshot_type'],
      }),
    );

    // Create unique constraint on company_id, snapshot_date, snapshot_type
    await queryRunner.createIndex(
      'report_snapshots',
      new TableIndex({
        name: 'uk_company_date_type',
        columnNames: ['company_id', 'snapshot_date', 'snapshot_type'],
        isUnique: true,
      }),
    );

    // Create foreign key to companies table
    await queryRunner.createForeignKey(
      'report_snapshots',
      new TableForeignKey({
        name: 'fk_snapshot_company',
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add performance indexes to existing tables
    // Optimize lease expiration queries
    await queryRunner.query(`
      CREATE INDEX idx_occupancy_lease_end
      ON occupancies(company_id, lease_end_date, status)
    `);

    // Optimize invoice aging queries
    await queryRunner.query(`
      CREATE INDEX idx_invoice_aging
      ON invoices(company_id, due_date, status)
    `);

    // Optimize apartment maintenance status
    await queryRunner.query(`
      CREATE INDEX idx_apartment_maintenance
      ON apartments(company_id, status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop performance indexes from existing tables
    await queryRunner.query(`DROP INDEX idx_apartment_maintenance ON apartments`);
    await queryRunner.query(`DROP INDEX idx_invoice_aging ON invoices`);
    await queryRunner.query(`DROP INDEX idx_occupancy_lease_end ON occupancies`);

    // Drop foreign key
    await queryRunner.dropForeignKey('report_snapshots', 'fk_snapshot_company');

    // Drop indexes
    await queryRunner.dropIndex('report_snapshots', 'uk_company_date_type');
    await queryRunner.dropIndex('report_snapshots', 'idx_snapshot_type');
    await queryRunner.dropIndex('report_snapshots', 'idx_company_date');

    // Drop table
    await queryRunner.dropTable('report_snapshots');
  }
}
