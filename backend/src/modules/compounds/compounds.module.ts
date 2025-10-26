import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompoundsService } from './services/compounds.service';
import { CompoundsController } from './controllers/compounds.controller';
import { Compound } from './entities/compound.entity';
import { Apartment } from '../apartments/entities/apartment.entity';

/**
 * Compounds Module
 * Manages building/location entities
 *
 * Author: george1806
 */
@Module({
    imports: [TypeOrmModule.forFeature([Compound, Apartment])],
    controllers: [CompoundsController],
    providers: [CompoundsService],
    exports: [CompoundsService] // Export for use in Apartments module
})
export class CompoundsModule {}
