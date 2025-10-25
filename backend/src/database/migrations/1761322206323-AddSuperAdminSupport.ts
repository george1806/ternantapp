import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSuperAdminSupport1761322206323 implements MigrationInterface {
    name = 'AddSuperAdminSupport1761322206323'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_72425d1279a7db35f9b6918167\` ON \`users\``);
        await queryRunner.query(`ALTER TABLE \`companies\` DROP COLUMN \`migration_test\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`is_super_admin\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_7ae6334059289559722437bcc1c\``);
        await queryRunner.query(`DROP INDEX \`IDX_13af76739939fc5cb3c90ab3e7\` ON \`users\``);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`company_id\` \`company_id\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`role\` \`role\` enum ('SUPER_ADMIN', 'OWNER', 'ADMIN', 'STAFF', 'AUDITOR', 'TENANT_PORTAL') NOT NULL DEFAULT 'STAFF'`);
        await queryRunner.query(`CREATE INDEX \`IDX_ace513fa30d485cfd25c11a9e4\` ON \`users\` (\`role\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_13af76739939fc5cb3c90ab3e7\` ON \`users\` (\`company_id\`, \`status\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_074675ed1a1d59bfe7bdb9c0a3\` ON \`users\` (\`company_id\`, \`email\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_7ae6334059289559722437bcc1c\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_7ae6334059289559722437bcc1c\``);
        await queryRunner.query(`DROP INDEX \`IDX_074675ed1a1d59bfe7bdb9c0a3\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_13af76739939fc5cb3c90ab3e7\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_ace513fa30d485cfd25c11a9e4\` ON \`users\``);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`role\` \`role\` enum ('OWNER', 'ADMIN', 'STAFF', 'AUDITOR', 'TENANT_PORTAL') NOT NULL DEFAULT 'STAFF'`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`company_id\` \`company_id\` varchar(255) NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_13af76739939fc5cb3c90ab3e7\` ON \`users\` (\`company_id\`, \`status\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_7ae6334059289559722437bcc1c\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`is_super_admin\``);
        await queryRunner.query(`ALTER TABLE \`companies\` ADD \`migration_test\` varchar(50) NULL COMMENT 'Test column to verify migrations work'`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_72425d1279a7db35f9b6918167\` ON \`users\` (\`company_id\`, \`email\`)`);
    }

}
