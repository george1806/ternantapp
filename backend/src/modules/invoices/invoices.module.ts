import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './services/invoices.service';
import { InvoicesController } from './controllers/invoices.controller';
import { Invoice } from './entities/invoice.entity';
import { Occupancy } from '../occupancies/entities/occupancy.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Company } from '../companies/entities/company.entity';
import { DashboardModule } from '../dashboard/dashboard.module';

/**
 * Invoices Module
 * Manages invoice functionality with dashboard cache invalidation
 *
 * Author: george1806
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Invoice, Occupancy, Tenant, Payment, Company]),
        forwardRef(() => DashboardModule)
    ],
    controllers: [InvoicesController],
    providers: [InvoicesService],
    exports: [InvoicesService]
})
export class InvoicesModule {}
