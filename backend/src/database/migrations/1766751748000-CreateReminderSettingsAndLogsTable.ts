import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateReminderSettingsAndLogsTable1766751748000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create reminder_settings table
    await queryRunner.createTable(
      new Table({
        name: 'reminder_settings',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'companyId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'dueSoonConfig',
            type: 'json',
          },
          {
            name: 'overdueConfig',
            type: 'json',
          },
          {
            name: 'welcomeConfig',
            type: 'json',
          },
          {
            name: 'receiptConfig',
            type: 'json',
          },
          {
            name: 'emailSettings',
            type: 'json',
          },
          {
            name: 'queueSettings',
            type: 'json',
          },
          {
            name: 'businessRules',
            type: 'json',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique index on companyId
    await queryRunner.createIndex(
      'reminder_settings',
      new TableIndex({
        name: 'IDX_REMINDER_SETTINGS_COMPANY_ID',
        columnNames: ['companyId'],
        isUnique: true,
      }),
    );

    // Create reminder_logs table
    await queryRunner.createTable(
      new Table({
        name: 'reminder_logs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'companyId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'reminderId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['DUE_SOON', 'OVERDUE', 'WELCOME', 'RECEIPT'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['queued', 'sent', 'failed', 'bounced', 'delivered'],
            default: "'queued'",
          },
          {
            name: 'messageId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'recipient',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'subject',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'failureReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'attempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'queuedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sentAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'deliveredAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for reminder_logs
    await queryRunner.createIndex(
      'reminder_logs',
      new TableIndex({
        name: 'IDX_REMINDER_LOGS_COMPANY_ID_CREATED_AT',
        columnNames: ['companyId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'reminder_logs',
      new TableIndex({
        name: 'IDX_REMINDER_LOGS_REMINDER_ID',
        columnNames: ['reminderId'],
      }),
    );

    await queryRunner.createIndex(
      'reminder_logs',
      new TableIndex({
        name: 'IDX_REMINDER_LOGS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'reminder_logs',
      new TableIndex({
        name: 'IDX_REMINDER_LOGS_RECIPIENT',
        columnNames: ['recipient'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop reminder_logs table
    await queryRunner.dropTable('reminder_logs', true);

    // Drop reminder_settings table
    await queryRunner.dropTable('reminder_settings', true);
  }
}
