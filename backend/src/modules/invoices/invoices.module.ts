import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './services/invoices.service';
import { InvoicesController } from './controllers/invoices.controller';
import { Invoice } from './entities/invoice.entity';
import { InvoiceEmailLog } from './entities/invoice-email-log.entity';
import { Occupancy } from '../occupancies/entities/occupancy.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Company } from '../companies/entities/company.entity';
import { DashboardModule } from '../dashboard/dashboard.module';
import { EmailModule } from '../../common/email/email.module';
import { InvoiceEmailLogService } from './services/invoice-email-log.service';

/**
 * Invoices Module
 * Manages invoice functionality with dashboard cache invalidation and email logging
 *
 * Author: george1806
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Invoice, InvoiceEmailLog, Occupancy, Tenant, Payment, Company]),
        forwardRef(() => DashboardModule),
        EmailModule
    ],
    controllers: [InvoicesController],
    providers: [InvoicesService, InvoiceEmailLogService],
    exports: [InvoicesService, InvoiceEmailLogService]
})
export class InvoicesModule {}
