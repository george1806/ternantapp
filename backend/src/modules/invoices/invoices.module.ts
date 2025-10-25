import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './services/invoices.service';
import { InvoicesController } from './controllers/invoices.controller';
import { Invoice } from './entities/invoice.entity';
import { Occupancy } from '../occupancies/entities/occupancy.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

/**
 * Invoices Module
 * Manages invoice functionality
 *
 * Author: george1806
 */
@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Occupancy, Tenant])],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
