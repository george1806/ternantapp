import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Update UserRole enum from old values (SUPER_ADMIN, OWNER, ADMIN, STAFF, AUDITOR, TENANT_PORTAL)
 * to new values (ADMIN, OWNER, WORKER)
 */
export class UpdateUserRoleEnumToADMINOWNERWORKER1733595000000 implements MigrationInterface {
    name = 'UpdateUserRoleEnumToADMINOWNERWORKER1733595000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Expand enum to include both old and new values
        await queryRunner.query(`
            ALTER TABLE users
            MODIFY COLUMN role ENUM('SUPER_ADMIN', 'OWNER', 'ADMIN', 'STAFF', 'AUDITOR', 'TENANT_PORTAL', 'WORKER')
            NOT NULL DEFAULT 'STAFF'
        `);

        // Step 2: Update existing users to map old roles to new roles
        await queryRunner.query(`
            UPDATE users
            SET role = CASE
                WHEN role IN ('STAFF', 'AUDITOR', 'TENANT_PORTAL') THEN 'WORKER'
                WHEN role = 'SUPER_ADMIN' THEN 'ADMIN'
                ELSE role
            END
        `);

        // Step 3: Remove old values and set new default
        await queryRunner.query(`
            ALTER TABLE users
            MODIFY COLUMN role ENUM('ADMIN', 'OWNER', 'WORKER')
            NOT NULL DEFAULT 'WORKER'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert the enum column to old values
        await queryRunner.query(`
            ALTER TABLE users
            MODIFY COLUMN role ENUM('SUPER_ADMIN', 'OWNER', 'ADMIN', 'STAFF', 'AUDITOR', 'TENANT_PORTAL')
            NOT NULL DEFAULT 'STAFF'
        `);

        // Revert users back to old roles
        await queryRunner.query(`
            UPDATE users
            SET role = CASE
                WHEN role = 'WORKER' THEN 'STAFF'
                ELSE role
            END
        `);
    }
}
