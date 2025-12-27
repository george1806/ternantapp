import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeTenantIdNullableInReminders1766866503464 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key
        await queryRunner.query(`
            ALTER TABLE reminders
            DROP FOREIGN KEY FK_de7f323194f85398815441bd3a6
        `);

        // Modify column to allow NULL
        await queryRunner.query(`
            ALTER TABLE reminders
            MODIFY COLUMN tenant_id VARCHAR(36) NULL
        `);

        // Re-add foreign key
        await queryRunner.query(`
            ALTER TABLE reminders
            ADD CONSTRAINT FK_de7f323194f85398815441bd3a6
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key
        await queryRunner.query(`
            ALTER TABLE reminders
            DROP FOREIGN KEY FK_de7f323194f85398815441bd3a6
        `);

        // Modify column to NOT NULL
        await queryRunner.query(`
            ALTER TABLE reminders
            MODIFY COLUMN tenant_id VARCHAR(36) NOT NULL
        `);

        // Re-add foreign key
        await queryRunner.query(`
            ALTER TABLE reminders
            ADD CONSTRAINT FK_de7f323194f85398815441bd3a6
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        `);
    }

}
