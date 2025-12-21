import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApartmentsService } from './services/apartments.service';
import { ApartmentsController } from './controllers/apartments.controller';
import { Apartment } from './entities/apartment.entity';
import { Compound } from '../compounds/entities/compound.entity';
import { Occupancy } from '../occupancies/entities/occupancy.entity';
import { DashboardModule } from '../dashboard/dashboard.module';

/**
 * Apartments Module
 * Manages apartment/unit operations within compounds with dashboard cache invalidation
 *
 * Author: george1806
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Apartment, Compound, Occupancy]),
        forwardRef(() => DashboardModule)
    ],
    controllers: [ApartmentsController],
    providers: [ApartmentsService],
    exports: [ApartmentsService]
})
export class ApartmentsModule {}
