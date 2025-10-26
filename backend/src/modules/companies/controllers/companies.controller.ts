import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { CompaniesService } from '../services/companies.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { RegisterCompanyDto } from '../../auth/dto/register-company.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { UserRole } from '../../../common/enums';
import { AuthService } from '../../auth/services/auth.service';
import { getAvailableCurrencies } from '../../../common/config/currency.config';

@ApiTags('Companies')
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CompaniesController {
    constructor(
        private readonly companiesService: CompaniesService,
        private readonly authService: AuthService
    ) {}

    @Public()
    @Get('currencies')
    @ApiOperation({ summary: 'Get list of supported currencies (Public)' })
    @ApiResponse({
        status: 200,
        description: 'List of all supported currencies with metadata'
    })
    getCurrencies() {
        return {
            currencies: getAvailableCurrencies(),
            message: 'Supported currencies retrieved successfully'
        };
    }

    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new company with owner user (Public)' })
    @ApiResponse({ status: 201, description: 'Company registered successfully' })
    @ApiResponse({ status: 409, description: 'Company slug or email already exists' })
    async register(@Body() registerDto: RegisterCompanyDto, @Req() req: Request) {
        const metadata = AuthService.extractMetadata(req);
        const result = await this.authService.registerCompany(registerDto, metadata);

        return {
            message: 'Company registered successfully',
            company: result.company,
            user: result.user,
            tokens: result.tokens
        };
    }

    @Post()
    @Roles(UserRole.OWNER)
    @ApiOperation({ summary: 'Create a new company (Owner only)' })
    @ApiResponse({ status: 201, description: 'Company created successfully' })
    @ApiResponse({ status: 409, description: 'Company with this slug already exists' })
    create(@Body() createCompanyDto: CreateCompanyDto) {
        return this.companiesService.create(createCompanyDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get company by ID' })
    @ApiResponse({ status: 200, description: 'Company found' })
    @ApiResponse({ status: 404, description: 'Company not found' })
    findOne(@Param('id') id: string) {
        return this.companiesService.findOne(id);
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Get company by slug' })
    @ApiResponse({ status: 200, description: 'Company found' })
    @ApiResponse({ status: 404, description: 'Company not found' })
    findBySlug(@Param('slug') slug: string) {
        return this.companiesService.findBySlug(slug);
    }

    @Patch(':id')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Update company (Owner/Admin only)' })
    @ApiResponse({ status: 200, description: 'Company updated successfully' })
    @ApiResponse({ status: 404, description: 'Company not found' })
    update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
        return this.companiesService.update(id, updateCompanyDto);
    }

    @Delete(':id')
    @Roles(UserRole.OWNER)
    @ApiOperation({ summary: 'Delete company (Owner only)' })
    @ApiResponse({ status: 200, description: 'Company deleted successfully' })
    @ApiResponse({ status: 404, description: 'Company not found' })
    remove(@Param('id') id: string) {
        return this.companiesService.remove(id);
    }
}
