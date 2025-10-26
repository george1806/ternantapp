import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery
} from '@nestjs/swagger';
import { OccupanciesService } from '../services/occupancies.service';
import { CreateOccupancyDto } from '../dto/create-occupancy.dto';
import { UpdateOccupancyDto } from '../dto/update-occupancy.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/tenant.decorator';

/**
 * Occupancies Controller
 * Handles HTTP requests for occupancy/lease management
 *
 * Author: george1806
 */
@ApiTags('Occupancies')
@Controller('occupancies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OccupanciesController {
    constructor(private readonly occupanciesService: OccupanciesService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new occupancy (lease)' })
    @ApiResponse({ status: 201, description: 'Occupancy created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 404, description: 'Tenant or apartment not found' })
    @ApiResponse({ status: 409, description: 'Apartment unavailable for period' })
    create(@Body() createDto: CreateOccupancyDto, @CurrentUser() user: any) {
        return this.occupanciesService.create(createDto, user.companyId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all occupancies' })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['pending', 'active', 'ended', 'cancelled']
    })
    @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'List of occupancies' })
    findAll(
        @Query('status') status: string,
        @Query('includeInactive') includeInactive: string,
        @CurrentUser() user: any
    ) {
        return this.occupanciesService.findAll(
            user.companyId,
            status,
            includeInactive === 'true'
        );
    }

    @Get('active')
    @ApiOperation({ summary: 'Get all currently active occupancies' })
    @ApiResponse({ status: 200, description: 'List of active occupancies' })
    findActive(@CurrentUser() user: any) {
        return this.occupanciesService.findActive(user.companyId);
    }

    @Get('expiring')
    @ApiOperation({ summary: 'Get occupancies expiring soon' })
    @ApiQuery({
        name: 'days',
        required: false,
        type: Number,
        description: 'Days ahead to check (default: 30)'
    })
    @ApiResponse({ status: 200, description: 'List of expiring occupancies' })
    findExpiring(@Query('days') days: string, @CurrentUser() user: any) {
        const daysAhead = days ? parseInt(days, 10) : 30;
        return this.occupanciesService.findExpiring(user.companyId, daysAhead);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get occupancy statistics' })
    @ApiResponse({ status: 200, description: 'Occupancy statistics' })
    getStats(@CurrentUser() user: any) {
        return this.occupanciesService.getStats(user.companyId);
    }

    @Get('tenant/:tenantId')
    @ApiOperation({ summary: 'Get all occupancies for a tenant' })
    @ApiResponse({ status: 200, description: 'List of tenant occupancies' })
    findByTenant(@Param('tenantId') tenantId: string, @CurrentUser() user: any) {
        return this.occupanciesService.findByTenant(tenantId, user.companyId);
    }

    @Get('apartment/:apartmentId')
    @ApiOperation({ summary: 'Get all occupancies for an apartment' })
    @ApiResponse({ status: 200, description: 'List of apartment occupancies' })
    findByApartment(@Param('apartmentId') apartmentId: string, @CurrentUser() user: any) {
        return this.occupanciesService.findByApartment(apartmentId, user.companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get occupancy by ID' })
    @ApiResponse({ status: 200, description: 'Occupancy details' })
    @ApiResponse({ status: 404, description: 'Occupancy not found' })
    findOne(@Param('id') id: string, @CurrentUser() user: any) {
        return this.occupanciesService.findOne(id, user.companyId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an occupancy' })
    @ApiResponse({ status: 200, description: 'Occupancy updated successfully' })
    @ApiResponse({ status: 404, description: 'Occupancy not found' })
    update(
        @Param('id') id: string,
        @Body() updateDto: UpdateOccupancyDto,
        @CurrentUser() user: any
    ) {
        return this.occupanciesService.update(id, updateDto, user.companyId);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update occupancy status' })
    @ApiResponse({ status: 200, description: 'Status updated successfully' })
    @ApiResponse({ status: 404, description: 'Occupancy not found' })
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: 'pending' | 'active' | 'ended' | 'cancelled',
        @CurrentUser() user: any
    ) {
        return this.occupanciesService.updateStatus(id, status, user.companyId);
    }

    @Post(':id/end')
    @ApiOperation({ summary: 'End an occupancy (lease completed)' })
    @ApiResponse({ status: 200, description: 'Occupancy ended successfully' })
    @ApiResponse({ status: 400, description: 'Occupancy already ended' })
    @ApiResponse({ status: 404, description: 'Occupancy not found' })
    endOccupancy(
        @Param('id') id: string,
        @Body('moveOutDate') moveOutDate: string,
        @CurrentUser() user: any
    ) {
        return this.occupanciesService.endOccupancy(id, user.companyId, moveOutDate);
    }

    @Post(':id/deposit-payment')
    @ApiOperation({ summary: 'Record a deposit payment' })
    @ApiResponse({ status: 200, description: 'Deposit payment recorded' })
    @ApiResponse({ status: 400, description: 'Payment exceeds required deposit' })
    @ApiResponse({ status: 404, description: 'Occupancy not found' })
    recordDepositPayment(
        @Param('id') id: string,
        @Body('amount') amount: number,
        @CurrentUser() user: any
    ) {
        return this.occupanciesService.recordDepositPayment(id, user.companyId, amount);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Deactivate an occupancy' })
    @ApiResponse({ status: 200, description: 'Occupancy deactivated' })
    @ApiResponse({ status: 400, description: 'Cannot delete active occupancy' })
    @ApiResponse({ status: 404, description: 'Occupancy not found' })
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.occupanciesService.remove(id, user.companyId);
    }

    @Post(':id/activate')
    @ApiOperation({ summary: 'Reactivate a deactivated occupancy' })
    @ApiResponse({ status: 200, description: 'Occupancy reactivated' })
    @ApiResponse({ status: 404, description: 'Occupancy not found' })
    activate(@Param('id') id: string, @CurrentUser() user: any) {
        return this.occupanciesService.activate(id, user.companyId);
    }
}
