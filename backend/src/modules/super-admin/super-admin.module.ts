import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminCompaniesController } from './controllers/super-admin-companies.controller';
import { SuperAdminUsersController } from './controllers/super-admin-users.controller';
import { SuperAdminCompaniesService } from './services/super-admin-companies.service';
import { SuperAdminUsersService } from './services/super-admin-users.service';
import { Company } from '../companies/entities/company.entity';
import { User } from '../users/entities/user.entity';
import { Compound } from '../compounds/entities/compound.entity';
import { Apartment } from '../apartments/entities/apartment.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Occupancy } from '../occupancies/entities/occupancy.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
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
    ]),
    UsersModule,
  ],
  controllers: [SuperAdminCompaniesController, SuperAdminUsersController],
  providers: [SuperAdminCompaniesService, SuperAdminUsersService],
  exports: [SuperAdminCompaniesService, SuperAdminUsersService],
})
export class SuperAdminModule {}
