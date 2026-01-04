import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateInvoiceEmailLogsTable1735470000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create invoice_email_logs table
    await queryRunner.createTable(
      new Table({
        name: 'invoice_email_logs',
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
            name: 'invoiceId',
            type: 'varchar',
            length: '36',
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
            default: 1,
          },
          {
            name: 'isResend',
            type: 'boolean',
            default: false,
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

    // Create indexes for invoice_email_logs
    await queryRunner.createIndex(
      'invoice_email_logs',
      new TableIndex({
        name: 'IDX_INVOICE_EMAIL_LOGS_COMPANY_ID_CREATED_AT',
        columnNames: ['companyId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'invoice_email_logs',
      new TableIndex({
        name: 'IDX_INVOICE_EMAIL_LOGS_INVOICE_ID',
        columnNames: ['invoiceId'],
      }),
    );

    await queryRunner.createIndex(
      'invoice_email_logs',
      new TableIndex({
        name: 'IDX_INVOICE_EMAIL_LOGS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'invoice_email_logs',
      new TableIndex({
        name: 'IDX_INVOICE_EMAIL_LOGS_RECIPIENT',
        columnNames: ['recipient'],
      }),
    );

    // Create foreign key to invoices table
    await queryRunner.createForeignKey(
      'invoice_email_logs',
      new TableForeignKey({
        columnNames: ['invoiceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'invoices',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop invoice_email_logs table
    await queryRunner.dropTable('invoice_email_logs', true);
  }
}
