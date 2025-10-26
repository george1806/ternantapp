import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery
} from '@nestjs/swagger';
import { TenantsService } from '../services/tenants.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/tenant.decorator';

/**
 * Tenants Controller
 * RESTful API endpoints for tenant management
 *
 * Author: george1806
 */
@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new tenant' })
    @ApiResponse({ status: 201, description: 'Tenant created successfully' })
    @ApiResponse({ status: 409, description: 'Tenant email already exists' })
    async create(@Body() createDto: CreateTenantDto, @CurrentUser() user: any) {
        return this.tenantsService.create(createDto, user.companyId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all tenants' })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['active', 'inactive', 'blacklisted'],
        description: 'Filter by status'
    })
    @ApiQuery({
        name: 'includeInactive',
        required: false,
        type: Boolean,
        description: 'Include inactive tenants'
    })
    @ApiResponse({ status: 200, description: 'List of tenants' })
    async findAll(
        @CurrentUser() user: any,
        @Query('status') status?: string,
        @Query('includeInactive') includeInactive?: boolean
    ) {
        return this.tenantsService.findAll(user.companyId, status, includeInactive);
    }

    @Get('search')
    @ApiOperation({ summary: 'Search tenants by name, email, or phone' })
    @ApiQuery({ name: 'q', required: true, description: 'Search query' })
    @ApiResponse({ status: 200, description: 'Search results' })
    async search(@CurrentUser() user: any, @Query('q') query: string) {
        return this.tenantsService.search(user.companyId, query);
    }

    @Get('count')
    @ApiOperation({ summary: 'Count tenants with optional filters' })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['active', 'inactive', 'blacklisted'],
        description: 'Filter by status'
    })
    @ApiResponse({ status: 200, description: 'Tenant count' })
    async count(@CurrentUser() user: any, @Query('status') status?: string) {
        const count = await this.tenantsService.count(user.companyId, status);
        return { count };
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get tenant statistics' })
    @ApiResponse({ status: 200, description: 'Tenant statistics by status' })
    async getStats(@CurrentUser() user: any) {
        return this.tenantsService.getStats(user.companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get tenant by ID' })
    @ApiResponse({ status: 200, description: 'Tenant found' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async findOne(@Param('id') id: string, @CurrentUser() user: any) {
        return this.tenantsService.findOne(id, user.companyId);
    }

    @Get(':id/history')
    @ApiOperation({ summary: 'Get tenant with occupancy history' })
    @ApiResponse({
        status: 200,
        description: 'Tenant with occupancy history'
    })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async findOneWithHistory(@Param('id') id: string, @CurrentUser() user: any) {
        return this.tenantsService.findOneWithOccupancies(id, user.companyId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a tenant' })
    @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    @ApiResponse({ status: 409, description: 'Email already exists' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateTenantDto,
        @CurrentUser() user: any
    ) {
        return this.tenantsService.update(id, updateDto, user.companyId);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update tenant status' })
    @ApiResponse({ status: 200, description: 'Status updated successfully' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: 'active' | 'inactive' | 'blacklisted',
        @CurrentUser() user: any
    ) {
        return this.tenantsService.updateStatus(id, status, user.companyId);
    }

    @Post(':id/blacklist')
    @ApiOperation({ summary: 'Blacklist a tenant' })
    @ApiResponse({ status: 200, description: 'Tenant blacklisted successfully' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async blacklist(
        @Param('id') id: string,
        @Body('reason') reason: string,
        @CurrentUser() user: any
    ) {
        return this.tenantsService.blacklist(id, user.companyId, reason);
    }

    @Post(':id/documents')
    @ApiOperation({ summary: 'Add a document to tenant' })
    @ApiResponse({ status: 200, description: 'Document added successfully' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async addDocument(
        @Param('id') id: string,
        @Body()
        document: { type: string; fileName: string; fileUrl: string },
        @CurrentUser() user: any
    ) {
        return this.tenantsService.addDocument(id, user.companyId, document);
    }

    @Post(':id/references')
    @ApiOperation({ summary: 'Add a reference to tenant' })
    @ApiResponse({ status: 200, description: 'Reference added successfully' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async addReference(
        @Param('id') id: string,
        @Body()
        reference: {
            name: string;
            phone: string;
            relationship: string;
            email?: string;
        },
        @CurrentUser() user: any
    ) {
        return this.tenantsService.addReference(id, user.companyId, reference);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Deactivate a tenant (soft delete)' })
    @ApiResponse({ status: 204, description: 'Tenant deactivated' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async remove(@Param('id') id: string, @CurrentUser() user: any) {
        await this.tenantsService.remove(id, user.companyId);
    }

    @Post(':id/activate')
    @ApiOperation({ summary: 'Reactivate a deactivated tenant' })
    @ApiResponse({ status: 200, description: 'Tenant reactivated successfully' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async activate(@Param('id') id: string, @CurrentUser() user: any) {
        return this.tenantsService.activate(id, user.companyId);
    }
}
