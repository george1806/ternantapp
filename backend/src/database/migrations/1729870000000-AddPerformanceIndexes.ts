import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1729870000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table indexes
    await queryRunner.query(`
      CREATE INDEX IDX_users_email ON users(email);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_users_company_id ON users(companyId);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_users_role ON users(role);
    `);

    // Companies table indexes
    await queryRunner.query(`
      CREATE INDEX IDX_companies_slug ON companies(slug);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_companies_is_active ON companies(isActive);
    `);

    // Compounds table indexes
    await queryRunner.query(`
      CREATE INDEX IDX_compounds_company_id ON compounds(companyId);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_compounds_name ON compounds(name);
    `);

    // Apartments table indexes
    await queryRunner.query(`
      CREATE INDEX IDX_apartments_company_id ON apartments(companyId);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_apartments_compound_id ON apartments(compoundId);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_apartments_status ON apartments(status);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_apartments_number ON apartments(apartmentNumber);
    `);

    // Tenants table indexes
    await queryRunner.query(`
      CREATE INDEX IDX_tenants_company_id ON tenants(companyId);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_tenants_email ON tenants(email);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_tenants_phone ON tenants(phone);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_tenants_national_id ON tenants(nationalId);
    `);

    // Occupancies table indexes
    await queryRunner.query(`
      CREATE INDEX IDX_occupancies_company_id ON occupancies(companyId);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_occupancies_apartment_id ON occupancies(apartmentId);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_occupancies_tenant_id ON occupancies(tenantId);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_occupancies_status ON occupancies(status);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_occupancies_start_date ON occupancies(startDate);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_occupancies_end_date ON occupancies(endDate);
    `);

    // Invoices table indexes
    await queryRunner.query(`
      CREATE INDEX IDX_invoices_company_id ON invoices(companyId);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_invoices_occupancy_id ON invoices(occupancyId);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_invoices_status ON invoices(status);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_invoices_invoice_date ON invoices(invoiceDate);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_invoices_due_date ON invoices(dueDate);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_invoices_invoice_number ON invoices(invoiceNumber);
    `);

    // Payments table indexes
    await queryRunner.query(`
      CREATE INDEX IDX_payments_company_id ON payments(companyId);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_payments_invoice_id ON payments(invoiceId);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_payments_payment_date ON payments(paymentDate);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_payments_payment_method ON payments(paymentMethod);
    `);

    // Composite indexes for common queries
    await queryRunner.query(`
      CREATE INDEX IDX_occupancies_company_status ON occupancies(companyId, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_invoices_company_status ON invoices(companyId, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_apartments_compound_status ON apartments(compoundId, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_invoices_occupancy_date ON invoices(occupancyId, invoiceDate);
    `);
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
