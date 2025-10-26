import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1729870000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper function to create index if it doesn't exist
    const createIndexIfNotExists = async (indexName: string, tableName: string, columns: string) => {
      const indexExists = await queryRunner.query(
        `SELECT COUNT(*) as count FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = '${tableName}' AND index_name = '${indexName}'`
      );
      if (indexExists[0].count === 0) {
        await queryRunner.query(`CREATE INDEX ${indexName} ON ${tableName}(${columns});`);
      }
    };

    // Users table indexes
    await createIndexIfNotExists('IDX_users_email', 'users', 'email');
    await createIndexIfNotExists('IDX_users_company_id', 'users', 'companyId');
    await createIndexIfNotExists('IDX_users_role', 'users', 'role');

    // Companies table indexes
    await createIndexIfNotExists('IDX_companies_slug', 'companies', 'slug');
    await createIndexIfNotExists('IDX_companies_is_active', 'companies', 'isActive');

    // Compounds table indexes
    await createIndexIfNotExists('IDX_compounds_company_id', 'compounds', 'companyId');
    await createIndexIfNotExists('IDX_compounds_name', 'compounds', 'name');

    // Apartments table indexes
    await createIndexIfNotExists('IDX_apartments_company_id', 'apartments', 'companyId');
    await createIndexIfNotExists('IDX_apartments_compound_id', 'apartments', 'compoundId');
    await createIndexIfNotExists('IDX_apartments_status', 'apartments', 'status');
    await createIndexIfNotExists('IDX_apartments_number', 'apartments', 'apartmentNumber');

    // Tenants table indexes
    await createIndexIfNotExists('IDX_tenants_company_id', 'tenants', 'companyId');
    await createIndexIfNotExists('IDX_tenants_email', 'tenants', 'email');
    await createIndexIfNotExists('IDX_tenants_phone', 'tenants', 'phone');
    await createIndexIfNotExists('IDX_tenants_national_id', 'tenants', 'nationalId');

    // Occupancies table indexes
    await createIndexIfNotExists('IDX_occupancies_company_id', 'occupancies', 'companyId');
    await createIndexIfNotExists('IDX_occupancies_apartment_id', 'occupancies', 'apartmentId');
    await createIndexIfNotExists('IDX_occupancies_tenant_id', 'occupancies', 'tenantId');
    await createIndexIfNotExists('IDX_occupancies_status', 'occupancies', 'status');
    await createIndexIfNotExists('IDX_occupancies_start_date', 'occupancies', 'startDate');
    await createIndexIfNotExists('IDX_occupancies_end_date', 'occupancies', 'endDate');

    // Invoices table indexes
    await createIndexIfNotExists('IDX_invoices_company_id', 'invoices', 'companyId');
    await createIndexIfNotExists('IDX_invoices_occupancy_id', 'invoices', 'occupancyId');
    await createIndexIfNotExists('IDX_invoices_status', 'invoices', 'status');
    await createIndexIfNotExists('IDX_invoices_invoice_date', 'invoices', 'invoiceDate');
    await createIndexIfNotExists('IDX_invoices_due_date', 'invoices', 'dueDate');
    await createIndexIfNotExists('IDX_invoices_invoice_number', 'invoices', 'invoiceNumber');

    // Payments table indexes
    await createIndexIfNotExists('IDX_payments_company_id', 'payments', 'companyId');
    await createIndexIfNotExists('IDX_payments_invoice_id', 'payments', 'invoiceId');
    await createIndexIfNotExists('IDX_payments_payment_date', 'payments', 'paymentDate');
    await createIndexIfNotExists('IDX_payments_payment_method', 'payments', 'paymentMethod');

    // Composite indexes for common queries
    await createIndexIfNotExists('IDX_occupancies_company_status', 'occupancies', 'companyId, status');
    await createIndexIfNotExists('IDX_invoices_company_status', 'invoices', 'companyId, status');
    await createIndexIfNotExists('IDX_apartments_compound_status', 'apartments', 'compoundId, status');
    await createIndexIfNotExists('IDX_invoices_occupancy_date', 'invoices', 'occupancyId, invoiceDate');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    await queryRunner.query(`DROP INDEX IDX_invoices_occupancy_date ON invoices;`);
    await queryRunner.query(`DROP INDEX IDX_apartments_compound_status ON apartments;`);
    await queryRunner.query(`DROP INDEX IDX_invoices_company_status ON invoices;`);
    await queryRunner.query(`DROP INDEX IDX_occupancies_company_status ON occupancies;`);

    await queryRunner.query(`DROP INDEX IDX_payments_payment_method ON payments;`);
    await queryRunner.query(`DROP INDEX IDX_payments_payment_date ON payments;`);
    await queryRunner.query(`DROP INDEX IDX_payments_invoice_id ON payments;`);
    await queryRunner.query(`DROP INDEX IDX_payments_company_id ON payments;`);

    await queryRunner.query(`DROP INDEX IDX_invoices_invoice_number ON invoices;`);
    await queryRunner.query(`DROP INDEX IDX_invoices_due_date ON invoices;`);
    await queryRunner.query(`DROP INDEX IDX_invoices_invoice_date ON invoices;`);
    await queryRunner.query(`DROP INDEX IDX_invoices_status ON invoices;`);
    await queryRunner.query(`DROP INDEX IDX_invoices_occupancy_id ON invoices;`);
    await queryRunner.query(`DROP INDEX IDX_invoices_company_id ON invoices;`);

    await queryRunner.query(`DROP INDEX IDX_occupancies_end_date ON occupancies;`);
    await queryRunner.query(`DROP INDEX IDX_occupancies_start_date ON occupancies;`);
    await queryRunner.query(`DROP INDEX IDX_occupancies_status ON occupancies;`);
    await queryRunner.query(`DROP INDEX IDX_occupancies_tenant_id ON occupancies;`);
    await queryRunner.query(`DROP INDEX IDX_occupancies_apartment_id ON occupancies;`);
    await queryRunner.query(`DROP INDEX IDX_occupancies_company_id ON occupancies;`);

    await queryRunner.query(`DROP INDEX IDX_tenants_national_id ON tenants;`);
    await queryRunner.query(`DROP INDEX IDX_tenants_phone ON tenants;`);
    await queryRunner.query(`DROP INDEX IDX_tenants_email ON tenants;`);
    await queryRunner.query(`DROP INDEX IDX_tenants_company_id ON tenants;`);

    await queryRunner.query(`DROP INDEX IDX_apartments_number ON apartments;`);
    await queryRunner.query(`DROP INDEX IDX_apartments_status ON apartments;`);
    await queryRunner.query(`DROP INDEX IDX_apartments_compound_id ON apartments;`);
    await queryRunner.query(`DROP INDEX IDX_apartments_company_id ON apartments;`);

    await queryRunner.query(`DROP INDEX IDX_compounds_name ON compounds;`);
    await queryRunner.query(`DROP INDEX IDX_compounds_company_id ON compounds;`);

    await queryRunner.query(`DROP INDEX IDX_companies_is_active ON companies;`);
    await queryRunner.query(`DROP INDEX IDX_companies_slug ON companies;`);

    await queryRunner.query(`DROP INDEX IDX_users_role ON users;`);
    await queryRunner.query(`DROP INDEX IDX_users_company_id ON users;`);
    await queryRunner.query(`DROP INDEX IDX_users_email ON users;`);
  }
}
