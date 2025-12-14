import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Add Account Lockout Fields to Users Table
 *
 * SECURITY: Implements brute force protection by tracking failed login attempts
 * and locking accounts temporarily after multiple failures.
 *
 * Fields Added:
 * - login_attempts: Tracks consecutive failed login attempts
 * - locked_until: Timestamp until which account is locked
 * - last_failed_login: Timestamp of last failed login attempt
 *
 * @author george1806
 */
export class AddAccountLockoutFields1734096000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add login_attempts column
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'login_attempts',
                type: 'int',
                default: 0,
                isNullable: false,
                comment: 'Number of consecutive failed login attempts'
            })
        );

        // Add locked_until column
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'locked_until',
                type: 'timestamp',
                isNullable: true,
                default: null,
                comment: 'Account locked until this timestamp'
            })
        );

        // Add last_failed_login column
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'last_failed_login',
                type: 'timestamp',
                isNullable: true,
                default: null,
                comment: 'Timestamp of last failed login attempt'
            })
        );

        // Add index on locked_until for performance
        await queryRunner.query(
            `CREATE INDEX idx_users_locked_until ON users (locked_until)`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`DROP INDEX idx_users_locked_until ON users`);

        // Drop columns in reverse order
        await queryRunner.dropColumn('users', 'last_failed_login');
        await queryRunner.dropColumn('users', 'locked_until');
        await queryRunner.dropColumn('users', 'login_attempts');
    }
}
