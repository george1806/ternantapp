import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Compound } from '../../modules/compounds/entities/compound.entity';
import { Company } from '../../modules/companies/entities/company.entity';

/**
 * Compound Seeder
 * Creates test compounds (property locations)
 *
 * Author: george1806
 */
export class CompoundSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(companies: Company[]): Promise<Compound[]> {
    const compoundRepository = this.dataSource.getRepository(Compound);

    console.log('🏘️  Seeding compounds...');

    const compoundTemplates = [
      {
        names: ['Westlands Heights', 'Parklands Plaza', 'Kilimani Courts'],
        areas: ['Westlands', 'Parklands', 'Kilimani'],
        cities: ['Nairobi', 'Nairobi', 'Nairobi'],
      },
      {
        names: ['Lavington Gardens', 'Karen Villas', 'Runda Estates'],
        areas: ['Lavington', 'Karen', 'Runda'],
        cities: ['Nairobi', 'Nairobi', 'Nairobi'],
      },
      {
        names: ['South B Residences', 'South C Towers', 'Lang\'ata View'],
        areas: ['South B', 'South C', 'Lang\'ata'],
        cities: ['Nairobi', 'Nairobi', 'Nairobi'],
      },
    ];

    const savedCompounds: Compound[] = [];

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const templates = compoundTemplates[i];

      for (let j = 0; j < templates.names.length; j++) {
        const compoundData = {
          companyId: company.id,
          name: templates.names[j],
          addressLine: `${faker.location.buildingNumber()} ${templates.areas[j]} Road`,
          city: templates.cities[j],
          region: 'Nairobi County',
          country: 'Kenya',
          postalCode: faker.location.zipCode('#####'),
          geoLat: Number(faker.location.latitude({ min: -1.4, max: -1.2 })),
          geoLng: Number(faker.location.longitude({ min: 36.7, max: 36.9 })),
          totalUnits: faker.number.int({ min: 20, max: 50 }),
          description: `Premium ${templates.names[j]} located in the heart of ${templates.areas[j]}`,
          amenities: ['Parking', 'Security', 'Water', 'Backup Power', 'Gym', 'Swimming Pool'],
        };

        let compound = await compoundRepository.findOne({
          where: {
            companyId: company.id,
            name: compoundData.name,
          },
        });

        if (!compound) {
          compound = compoundRepository.create(compoundData);
          await compoundRepository.save(compound);
          console.log(`  ✓ Created compound: ${compound.name} (${company.name})`);
        } else {
          console.log(`  ⊙ Compound already exists: ${compound.name}`);
        }

        savedCompounds.push(compound);
      }
    }

    console.log(`✅ Seeded ${savedCompounds.length} compounds\n`);
    return savedCompounds;
  }

  async clear(): Promise<void> {
    const compoundRepository = this.dataSource.getRepository(Compound);
    await compoundRepository.clear();
    console.log('🗑️  Cleared all compounds');
  }
}
