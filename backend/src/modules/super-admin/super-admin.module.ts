import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SuperAdminCompaniesController } from './controllers/super-admin-companies.controller';
import { SuperAdminUsersController } from './controllers/super-admin-users.controller';
import { SuperAdminAnalyticsController } from './controllers/super-admin-analytics.controller';
import { SuperAdminSettingsController } from './controllers/super-admin-settings.controller';
import { SuperAdminCompaniesService } from './services/super-admin-companies.service';
import { SuperAdminUsersService } from './services/super-admin-users.service';
import { SuperAdminAnalyticsService } from './services/super-admin-analytics.service';
import { SuperAdminSettingsService } from './services/super-admin-settings.service';
import { Company } from '../companies/entities/company.entity';
import { User } from '../users/entities/user.entity';
import { Compound } from '../compounds/entities/compound.entity';
import { Apartment } from '../apartments/entities/apartment.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Occupancy } from '../occupancies/entities/occupancy.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Payment } from '../payments/entities/payment.entity';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Company,
            User,
            Compound,
            Apartment,
            Tenant,
            Occupancy,
            Invoice,
            Payment
        ]),
        UsersModule
    ],
    controllers: [SuperAdminCompaniesController, SuperAdminUsersController, SuperAdminAnalyticsController, SuperAdminSettingsController],
    providers: [SuperAdminCompaniesService, SuperAdminUsersService, SuperAdminAnalyticsService, SuperAdminSettingsService],
    exports: [SuperAdminCompaniesService, SuperAdminUsersService, SuperAdminAnalyticsService, SuperAdminSettingsService]
})
export class SuperAdminModule {}
