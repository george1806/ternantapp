import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TenantValidationGuard } from './tenant-validation.guard';
import { Company } from '../../modules/companies/entities/company.entity';

/**
 * Guards Module
 *
 * Provides global guards that require dependency injection.
 * Guards registered via APP_GUARD are applied globally to all routes.
 *
 * @author george1806
 */
@Module({
    imports: [TypeOrmModule.forFeature([Company])],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard
        },
        {
            provide: APP_GUARD,
            useClass: TenantValidationGuard
        }
    ]
})
export class GuardsModule {}
