import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Update WORKER role to STAFF and add AUDITOR role
 *
 * Changes:
 * 1. Update existing users with role='WORKER' to role='STAFF'
 * 2. Modify the role enum to include STAFF and AUDITOR instead of WORKER
 */
export class UpdateWorkerToStaffAndAddAuditor1767000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Update existing WORKER roles to STAFF
    await queryRunner.query(`
      UPDATE users
      SET role = 'STAFF'
      WHERE role = 'WORKER'
    `);

    // Step 2: Modify the enum to replace WORKER with STAFF and add AUDITOR
    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('ADMIN', 'OWNER', 'STAFF', 'AUDITOR')
      NOT NULL
      DEFAULT 'STAFF'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Revert STAFF back to WORKER
    await queryRunner.query(`
      UPDATE users
      SET role = 'WORKER'
      WHERE role = 'STAFF'
    `);

    // Step 2: Remove AUDITOR role (set to STAFF first if any exist)
    await queryRunner.query(`
      UPDATE users
      SET role = 'STAFF'
      WHERE role = 'AUDITOR'
    `);

    // Step 3: Revert enum back to original (ADMIN, OWNER, WORKER)
    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('ADMIN', 'OWNER', 'WORKER')
      NOT NULL
      DEFAULT 'WORKER'
    `);
  }
}
