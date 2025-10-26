import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Occupancy } from '../../modules/occupancies/entities/occupancy.entity';
import { Apartment } from '../../modules/apartments/entities/apartment.entity';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';

/**
 * Occupancy Seeder
 * Creates test occupancies (tenant-apartment relationships)
 *
 * Author: george1806
 */
export class OccupancySeeder {
    constructor(private readonly dataSource: DataSource) {}

    async run(apartments: Apartment[], tenants: Tenant[]): Promise<Occupancy[]> {
        const occupancyRepository = this.dataSource.getRepository(Occupancy);

        console.log('🔑 Seeding occupancies...');

        const savedOccupancies: Occupancy[] = [];

        // Get occupied apartments only
        const occupiedApartments = apartments.filter((apt) => apt.status === 'occupied');

        let tenantIndex = 0;

        for (const apartment of occupiedApartments) {
            if (tenantIndex >= tenants.length) break;

            // Find tenants from the same company
            const companyTenants = tenants.filter(
                (t) => t.companyId === apartment.companyId
            );
            if (companyTenants.length === 0) continue;

            const tenant = companyTenants[tenantIndex % companyTenants.length];
            tenantIndex++;

            const leaseStartDate = faker.date.past({ years: 2 });
            const leaseEndDate = new Date(leaseStartDate);
            leaseEndDate.setMonth(
                leaseEndDate.getMonth() + faker.helpers.arrayElement([6, 12, 24])
            );

            const occupancyData = {
                companyId: apartment.companyId,
                apartmentId: apartment.id,
                tenantId: tenant.id,
                leaseStartDate,
                leaseEndDate,
                monthlyRent: apartment.monthlyRent,
                securityDeposit: apartment.monthlyRent * 2,
                depositPaid: apartment.monthlyRent * 2,
                moveInDate: leaseStartDate,
                status: 'active' as const,
                notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
                isActive: true
            };

            let occupancy = await occupancyRepository.findOne({
                where: {
                    companyId: apartment.companyId,
                    apartmentId: apartment.id,
                    status: 'active'
                }
            });

            if (!occupancy) {
                occupancy = occupancyRepository.create(occupancyData);
                await occupancyRepository.save(occupancy);
                savedOccupancies.push(occupancy);
            } else {
                savedOccupancies.push(occupancy);
            }
        }

        console.log(`  ✓ Created ${savedOccupancies.length} active occupancies`);
        console.log(`✅ Seeded ${savedOccupancies.length} occupancies\n`);
        return savedOccupancies;
    }

    async clear(): Promise<void> {
        const occupancyRepository = this.dataSource.getRepository(Occupancy);
        await occupancyRepository.clear();
        console.log('🗑️  Cleared all occupancies');
    }
}
