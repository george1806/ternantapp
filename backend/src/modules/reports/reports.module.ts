import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportsController } from './controllers/reports.controller';
import { ReportsService } from './services/reports.service';
import { ExportService } from './services/export.service';
import { SnapshotService } from './services/snapshot.service';
import { SnapshotTask } from './tasks/snapshot.task';
import { Apartment } from '../apartments/entities/apartment.entity';
import { Occupancy } from '../occupancies/entities/occupancy.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Compound } from '../compounds/entities/compound.entity';
import { Company } from '../companies/entities/company.entity';
import { ReportSnapshot } from './entities/report-snapshot.entity';

/**
 * Reports Module
 * Handles analytics, KPIs, and reporting functionality
 *
 * Features:
 * - Dashboard KPIs
 * - Revenue analytics
 * - Occupancy analytics
 * - Lease expiration reports
 * - Aging analysis reports
 * - CSV export functionality
 * - Historical snapshot generation
 * - Scheduled monthly snapshots
 *
 * Author: george1806
 */
@Module({
    imports: [
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature([
            Apartment,
            Occupancy,
            Invoice,
            Payment,
            Compound,
            Company,
            ReportSnapshot
        ])
    ],
    controllers: [ReportsController],
    providers: [
        ReportsService,
        ExportService,
        SnapshotService,
        SnapshotTask
    ],
    exports: [ReportsService, ExportService, SnapshotService]
})
export class ReportsModule {}
