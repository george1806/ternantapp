import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApartmentsService } from './services/apartments.service';
import { ApartmentsController } from './controllers/apartments.controller';
import { Apartment } from './entities/apartment.entity';
import { Compound } from '../compounds/entities/compound.entity';

/**
 * Apartments Module
 * Manages apartment/unit operations within compounds
 *
 * Author: george1806
 */
@Module({
    imports: [TypeOrmModule.forFeature([Apartment, Compound])],
    controllers: [ApartmentsController],
    providers: [ApartmentsService],
    exports: [ApartmentsService]
})
export class ApartmentsModule {}
