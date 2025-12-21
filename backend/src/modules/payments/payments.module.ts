import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './services/payments.service';
import { PaymentsController } from './controllers/payments.controller';
import { Payment } from './entities/payment.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { DashboardModule } from '../dashboard/dashboard.module';

/**
 * Payments Module
 * Manages payment functionality with transaction support for invoice updates
 * Includes dashboard cache invalidation for data consistency
 *
 * Author: george1806
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Payment, Invoice]),
        forwardRef(() => DashboardModule)
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService]
})
export class PaymentsModule {}
