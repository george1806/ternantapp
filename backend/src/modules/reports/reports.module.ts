import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './controllers/reports.controller';
import { ReportsService } from './services/reports.service';
import { Apartment } from '../apartments/entities/apartment.entity';
import { Occupancy } from '../occupancies/entities/occupancy.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Compound } from '../compounds/entities/compound.entity';

/**
 * Reports Module
 * Handles analytics, KPIs, and reporting functionality
 *
 * Features:
 * - Dashboard KPIs
 * - Revenue analytics
 * - Occupancy analytics
 * - Financial reports
 * - Performance metrics
 *
 * Author: george1806
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Apartment,
      Occupancy,
      Invoice,
      Payment,
      Compound,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
