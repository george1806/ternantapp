import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './services/companies.service';
import { CompaniesController } from './controllers/companies.controller';
import { Company } from './entities/company.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([Company]), forwardRef(() => AuthModule)],
    controllers: [CompaniesController],
    providers: [CompaniesService],
    exports: [CompaniesService]
})
export class CompaniesModule {}
