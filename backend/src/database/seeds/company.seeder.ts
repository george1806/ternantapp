import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import slugify from 'slugify';
import { Company } from '../../modules/companies/entities/company.entity';

/**
 * Company Seeder
 * Creates test companies with realistic data
 *
 * Author: george1806
 */
export class CompanySeeder {
    constructor(private readonly dataSource: DataSource) {}

    async run(): Promise<Company[]> {
        const companyRepository = this.dataSource.getRepository(Company);

        console.log('🏢 Seeding companies...');

        const companies = [
            {
                name: 'Sunrise Property Management',
                slug: 'sunrise-pm',
                email: 'admin@sunrise-pm.com',
                phone: '+254-712-345-678',
                address: '123 Westlands Avenue, Nairobi',
                website: 'https://sunrise-pm.com',
                settings: {
                    currency: 'KES',
                    timezone: 'Africa/Nairobi',
                    dateFormat: 'DD/MM/YYYY',
                    theme: 'blue'
                }
            },
            {
                name: 'Elite Housing Solutions',
                slug: 'elite-housing',
                email: 'info@elitehousing.co.ke',
                phone: '+254-722-987-654',
                address: '456 Kilimani Road, Nairobi',
                website: 'https://elitehousing.co.ke',
                settings: {
                    currency: 'KES',
                    timezone: 'Africa/Nairobi',
                    dateFormat: 'DD/MM/YYYY',
                    theme: 'green'
                }
            },
            {
                name: 'Metro Apartments Ltd',
                slug: 'metro-apartments',
                email: 'hello@metroapartments.com',
                phone: '+254-733-111-222',
                address: '789 Parklands Street, Nairobi',
                website: 'https://metroapartments.com',
                settings: {
                    currency: 'KES',
                    timezone: 'Africa/Nairobi',
                    dateFormat: 'DD/MM/YYYY',
                    theme: 'purple'
                }
            }
        ];

        const savedCompanies: Company[] = [];

        for (const companyData of companies) {
            // Check if company already exists
            let company = await companyRepository.findOne({
                where: { slug: companyData.slug }
            });

            if (!company) {
                company = companyRepository.create({
                    ...companyData,
                    isActive: true
                });
                await companyRepository.save(company);
                console.log(`  ✓ Created company: ${company.name}`);
            } else {
                console.log(`  ⊙ Company already exists: ${company.name}`);
            }

            savedCompanies.push(company);
        }

        console.log(`✅ Seeded ${savedCompanies.length} companies\n`);
        return savedCompanies;
    }

    async clear(): Promise<void> {
        const companyRepository = this.dataSource.getRepository(Company);
        await companyRepository.clear();
        console.log('🗑️  Cleared all companies');
    }
}
