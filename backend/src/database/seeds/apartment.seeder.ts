import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Apartment } from '../../modules/apartments/entities/apartment.entity';
import { Compound } from '../../modules/compounds/entities/compound.entity';

/**
 * Apartment Seeder
 * Creates test apartments/units
 *
 * Author: george1806
 */
export class ApartmentSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(compounds: Compound[]): Promise<Apartment[]> {
    const apartmentRepository = this.dataSource.getRepository(Apartment);

    console.log('🏠 Seeding apartments...');

    const savedApartments: Apartment[] = [];

    for (const compound of compounds) {
      const unitsPerCompound = faker.number.int({ min: 8, max: 15 });

      for (let i = 1; i <= unitsPerCompound; i++) {
        const floor = Math.ceil(i / 4);
        const unitNumber = `${floor}${String.fromCharCode(64 + ((i - 1) % 4) + 1)}`;
        const bedrooms = faker.helpers.arrayElement([1, 2, 3, 4]);
        const bathrooms = faker.helpers.arrayElement([1, 2, 3]);

        const apartmentData = {
          companyId: compound.companyId,
          compoundId: compound.id,
          unitNumber,
          floor,
          bedrooms,
          bathrooms,
          areaSqm: faker.number.int({ min: 50, max: 200 }),
          monthlyRent: this.calculateRent(bedrooms),
          status: faker.helpers.arrayElement([
            'available',
            'available',
            'occupied',
            'occupied',
            'occupied',
          ] as const),
          amenities: this.getAmenities(bedrooms),
          notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
          isActive: true,
        };

        let apartment = await apartmentRepository.findOne({
          where: {
            companyId: compound.companyId,
            compoundId: compound.id,
            unitNumber: apartmentData.unitNumber,
          },
        });

        if (!apartment) {
          apartment = apartmentRepository.create(apartmentData);
          await apartmentRepository.save(apartment);
          savedApartments.push(apartment);
        } else {
          savedApartments.push(apartment);
        }
      }

      console.log(`  ✓ Created ${unitsPerCompound} apartments for ${compound.name}`);
    }

    console.log(`✅ Seeded ${savedApartments.length} apartments\n`);
    return savedApartments;
  }

  private calculateRent(bedrooms: number): number {
    const baseRent: Record<number, number> = {
      1: 25000,
      2: 45000,
      3: 65000,
      4: 95000,
    };

    const base = baseRent[bedrooms] || 25000;
    const variation = faker.number.int({ min: -5000, max: 10000 });
    return base + variation;
  }

  private getAmenities(bedrooms: number): string[] {
    const basic = ['Kitchen', 'Bathroom'];
    const standard = [...basic, 'Balcony', 'Parking'];
    const premium = [...standard, 'Master Ensuite', 'Guest Toilet', 'Study Room'];

    if (bedrooms === 1) return basic;
    if (bedrooms === 2) return standard;
    return premium;
  }

  async clear(): Promise<void> {
    const apartmentRepository = this.dataSource.getRepository(Apartment);
    await apartmentRepository.clear();
    console.log('🗑️  Cleared all apartments');
  }
}
