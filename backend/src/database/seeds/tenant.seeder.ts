import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';
import { Company } from '../../modules/companies/entities/company.entity';

/**
 * Tenant Seeder
 * Creates test tenants
 *
 * Author: george1806
 */
export class TenantSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(companies: Company[], count: number = 50): Promise<Tenant[]> {
    const tenantRepository = this.dataSource.getRepository(Tenant);

    console.log('👤 Seeding tenants...');

    const savedTenants: Tenant[] = [];

    for (const company of companies) {
      const tenantsPerCompany = Math.floor(count / companies.length);

      for (let i = 0; i < tenantsPerCompany; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName }).toLowerCase();

        const tenantData = {
          companyId: company.id,
          firstName,
          lastName,
          email,
          phone: `+254-${faker.string.numeric(3)}-${faker.string.numeric(3)}-${faker.string.numeric(3)}`,
          idNumber: faker.string.numeric(8),
          dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
          nationality: 'Kenyan',
          occupation: faker.person.jobTitle(),
          employer: faker.company.name(),
          emergencyContact: {
            name: faker.person.fullName(),
            phone: `+254-${faker.string.numeric(3)}-${faker.string.numeric(3)}-${faker.string.numeric(3)}`,
            relationship: faker.helpers.arrayElement(['Spouse', 'Parent', 'Sibling', 'Friend']),
          },
          status: 'active' as const,
          notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
          isBlacklisted: false,
        };

        let tenant = await tenantRepository.findOne({
          where: {
            companyId: company.id,
            email: tenantData.email,
          },
        });

        if (!tenant) {
          tenant = tenantRepository.create(tenantData);
          await tenantRepository.save(tenant);
          savedTenants.push(tenant);
        } else {
          savedTenants.push(tenant);
        }
      }

      console.log(`  ✓ Created ${tenantsPerCompany} tenants for ${company.name}`);
    }

    console.log(`✅ Seeded ${savedTenants.length} tenants\n`);
    return savedTenants;
  }

  async clear(): Promise<void> {
    const tenantRepository = this.dataSource.getRepository(Tenant);
    await tenantRepository.clear();
    console.log('🗑️  Cleared all tenants');
  }
}
