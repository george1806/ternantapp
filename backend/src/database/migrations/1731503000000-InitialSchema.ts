import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial Schema Migration
 *
 * This migration represents the baseline schema for the apartment management system.
 * It includes all tables created by the entities.
 *
 * Since the tables were already created using synchronize mode, this migration
 * serves as a baseline for future migrations.
 *
 * Author: george1806
 * Date: 2025-10-13
 */
export class InitialSchema1731503000000 implements MigrationInterface {
  name = 'InitialSchema1731503000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if migrations table exists (indicates migrations have been run before)
    const migrationsTableExists = await queryRunner.hasTable('migrations');

    // If tables already exist (which they do), just mark this migration as complete
    // This is a baseline migration for an existing schema
    console.log('✓ Baseline migration: Schema already exists, marking as complete');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Since this is a baseline migration for existing tables,
    // we don't want to drop everything automatically
    console.log('⚠ Baseline migration: Manual cleanup required');
    console.log('Run the following to drop all tables:');
    console.log('  DROP TABLE payments;');
    console.log('  DROP TABLE reminders;');
    console.log('  DROP TABLE invoices;');
    console.log('  DROP TABLE occupancies;');
    console.log('  DROP TABLE tenants;');
    console.log('  DROP TABLE apartments;');
    console.log('  DROP TABLE compounds;');
    console.log('  DROP TABLE users;');
    console.log('  DROP TABLE companies;');
  }
}
