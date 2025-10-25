import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { CompanySeeder } from './company.seeder';
import { UserSeeder } from './user.seeder';
import { CompoundSeeder } from './compound.seeder';
import { ApartmentSeeder } from './apartment.seeder';
import { TenantSeeder } from './tenant.seeder';
import { OccupancySeeder } from './occupancy.seeder';
import { InvoiceSeeder } from './invoice.seeder';
import { PaymentSeeder } from './payment.seeder';

/**
 * Main Seed Runner
 * Orchestrates all seeders in correct order
 *
 * Usage:
 *   npm run seed:run        - Run all seeders
 *   npm run seed:run clear  - Clear all data first
 *
 * Author: george1806
 */

async function runSeeders() {
  console.log('\n🌱 Starting database seeding...\n');
  console.log('='.repeat(60));

  const dataSource = new DataSource(dataSourceOptions);

  try {
    // Initialize connection
    await dataSource.initialize();
    console.log('✓ Database connection established\n');

    // Check if clear flag is provided
    const shouldClear = process.argv.includes('clear');

    if (shouldClear) {
      console.log('🗑️  Clearing existing data...\n');
      await clearData(dataSource);
      console.log('\n');
    }

    // Run seeders in order (respecting dependencies)
    console.log('📦 Running seeders...\n');

    // 1. Companies (no dependencies)
    const companySeeder = new CompanySeeder(dataSource);
    const companies = await companySeeder.run();

    // 2. Users (depends on companies)
    const userSeeder = new UserSeeder(dataSource);
    const users = await userSeeder.run(companies);

    // 3. Compounds (depends on companies)
    const compoundSeeder = new CompoundSeeder(dataSource);
    const compounds = await compoundSeeder.run(companies);

    // 4. Apartments (depends on compounds)
    const apartmentSeeder = new ApartmentSeeder(dataSource);
    const apartments = await apartmentSeeder.run(compounds);

    // 5. Tenants (depends on companies)
    const tenantSeeder = new TenantSeeder(dataSource);
    const tenants = await tenantSeeder.run(companies);

    // 6. Occupancies (depends on apartments and tenants)
    const occupancySeeder = new OccupancySeeder(dataSource);
    const occupancies = await occupancySeeder.run(apartments, tenants);

    // 7. Invoices (depends on occupancies)
    const invoiceSeeder = new InvoiceSeeder(dataSource);
    const invoices = await invoiceSeeder.run(occupancies);

    // 8. Payments (depends on invoices)
    const paymentSeeder = new PaymentSeeder(dataSource);
    const payments = await paymentSeeder.run(invoices);

    // Summary
    console.log('='.repeat(60));
    console.log('\n✅ Seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Companies: ${companies.length}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Compounds: ${compounds.length}`);
    console.log(`   Apartments: ${apartments.length}`);
    console.log(`   Tenants: ${tenants.length}`);
    console.log(`   Occupancies: ${occupancies.length}`);
    console.log(`   Invoices: ${invoices.length}`);
    console.log(`   Payments: ${payments.length}`);
    console.log('\n📝 Test Credentials:');
    console.log('   Email: owner@sunrise-pm.com');
    console.log('   Password: Password123!');
    console.log('\n🚀 Start the server and test the API at:');
    console.log('   http://localhost:3000/api/docs\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('✓ Database connection closed\n');
  }
}

async function clearData(dataSource: DataSource) {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Disable foreign key checks temporarily
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

    // Manually truncate tables in reverse order
    await queryRunner.query('TRUNCATE TABLE `payments`');
    console.log('🗑️  Cleared all payments');

    await queryRunner.query('TRUNCATE TABLE `invoices`');
    console.log('🗑️  Cleared all invoices');

    await queryRunner.query('TRUNCATE TABLE `occupancies`');
    console.log('🗑️  Cleared all occupancies');

    await queryRunner.query('TRUNCATE TABLE `tenants`');
    console.log('🗑️  Cleared all tenants');

    await queryRunner.query('TRUNCATE TABLE `apartments`');
    console.log('🗑️  Cleared all apartments');

    await queryRunner.query('TRUNCATE TABLE `compounds`');
    console.log('🗑️  Cleared all compounds');

    await queryRunner.query('TRUNCATE TABLE `users`');
    console.log('🗑️  Cleared all users');

    await queryRunner.query('TRUNCATE TABLE `companies`');
    console.log('🗑️  Cleared all companies');

    // Re-enable foreign key checks
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ All data cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear data:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// Run if called directly
if (require.main === module) {
  runSeeders();
}

export { runSeeders, clearData };
