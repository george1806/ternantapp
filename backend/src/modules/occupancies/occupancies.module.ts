import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OccupanciesService } from './services/occupancies.service';
import { OccupanciesController } from './controllers/occupancies.controller';
import { Occupancy } from './entities/occupancy.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Apartment } from '../apartments/entities/apartment.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { DashboardModule } from '../dashboard/dashboard.module';
import { OccupancyStatusUpdateTask } from './tasks/occupancy-status-update.task';

/**
 * Occupancies Module
 * Manages tenant-apartment relationships (leases) with dashboard cache invalidation
 * Includes automated status update task (configurable)
 *
 * Author: george1806
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Occupancy, Tenant, Apartment, Invoice]),
        forwardRef(() => DashboardModule)
    ],
    controllers: [OccupanciesController],
    providers: [OccupanciesService, OccupancyStatusUpdateTask],
    exports: [OccupanciesService]
})
export class OccupanciesModule {}
