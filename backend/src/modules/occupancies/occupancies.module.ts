import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OccupanciesService } from './services/occupancies.service';
import { OccupanciesController } from './controllers/occupancies.controller';
import { Occupancy } from './entities/occupancy.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Apartment } from '../apartments/entities/apartment.entity';
import { Invoice } from '../invoices/entities/invoice.entity';

/**
 * Occupancies Module
 * Manages tenant-apartment relationships (leases)
 *
 * Author: george1806
 */
@Module({
    imports: [TypeOrmModule.forFeature([Occupancy, Tenant, Apartment, Invoice])],
    controllers: [OccupanciesController],
    providers: [OccupanciesService],
    exports: [OccupanciesService]
})
export class OccupanciesModule {}
