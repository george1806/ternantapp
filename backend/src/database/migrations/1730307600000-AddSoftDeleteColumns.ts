import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * Add Soft Delete Columns Migration
 * Adds soft delete support (deletedAt) to all major entities
 * Allows data preservation while maintaining logical deletion
 *
 * Tables modified:
 * - invoices
 * - payments
 * - occupancies
 * - tenants
 * - compounds
 * - apartments
 * - reminders
 *
 * Rollback supported: Yes
 * Date: 2024-11-29
 */
export class AddSoftDeleteColumns1730307600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // List of tables to add soft delete to
    const tablesToModify = [
      'invoices',
      'payments',
      'occupancies',
      'tenants',
      'compounds',
      'apartments',
      'reminders',
    ];

    for (const tableName of tablesToModify) {
      // Add deleted_at column
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'deleted_at',
          type: 'datetime',
          isNullable: true,
          default: null,
          comment: `Soft delete timestamp for ${tableName}`,
        }),
      );

      // Add index on (company_id, deleted_at) for efficient soft-delete queries
      await queryRunner.createIndex(
        tableName,
        new TableIndex({
          columnNames: ['company_id', 'deleted_at'],
          name: `IDX_${tableName.toUpperCase()}_COMPANY_ID_DELETED_AT`,
        }),
      );

      // Add separate index on deleted_at for cleanup queries
      await queryRunner.createIndex(
        tableName,
        new TableIndex({
          columnNames: ['deleted_at'],
          name: `IDX_${tableName.toUpperCase()}_DELETED_AT`,
        }),
      );

      console.log(`✓ Added soft delete columns to ${tableName}`);
    }

    console.log('✓ Soft delete migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tablesToModify = [
      'invoices',
      'payments',
      'occupancies',
      'tenants',
      'compounds',
      'apartments',
      'reminders',
    ];

    for (const tableName of tablesToModify) {
      // Drop indexes
      await queryRunner.dropIndex(
        tableName,
        `IDX_${tableName.toUpperCase()}_COMPANY_ID_DELETED_AT`,
      );

      await queryRunner.dropIndex(
        tableName,
        `IDX_${tableName.toUpperCase()}_DELETED_AT`,
      );

      // Drop column
      await queryRunner.dropColumn(tableName, 'deleted_at');

      console.log(`✓ Removed soft delete columns from ${tableName}`);
    }

    console.log('✓ Soft delete migration rolled back successfully');
  }
}
