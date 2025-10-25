import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './services/tenants.service';
import { TenantsController } from './controllers/tenants.controller';
import { Tenant } from './entities/tenant.entity';

/**
 * Tenants Module
 * Manages tenant/renter operations
 *
 * Author: george1806
 */
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
