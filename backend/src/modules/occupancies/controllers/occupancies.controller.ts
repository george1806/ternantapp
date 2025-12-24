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
import { Public } from '../../../common/decorators/public.decorator';
import { OccupancyStatusUpdateTask } from '../tasks/occupancy-status-update.task';

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
    constructor(
        private readonly occupanciesService: OccupanciesService,
        private readonly statusUpdateTask: OccupancyStatusUpdateTask
    ) {}

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
    @ApiOperation({ summary: 'Get all occupancies with pagination' })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['pending', 'active', 'ended', 'cancelled']
    })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'compoundId', required: false, type: String })
    @ApiQuery({ name: 'apartmentId', required: false, type: String })
    @ApiQuery({ name: 'tenantId', required: false, type: String })
    @ApiQuery({ name: 'sortBy', required: false, type: String })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
    @ApiResponse({ status: 200, description: 'Paginated list of occupancies' })
    async findAll(
        @Query('status') status?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
        @Query('compoundId') compoundId?: string,
        @Query('apartmentId') apartmentId?: string,
        @Query('tenantId') tenantId?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
        @CurrentUser() user?: any
    ) {
        const currentPage = Number(page) || 1;
        const pageLimit = Number(limit) || 10;

        const result = await this.occupanciesService.findAllPaginated(
            user.companyId,
            currentPage,
            pageLimit,
            {
                status,
                search,
                compoundId,
                apartmentId,
                tenantId,
                sortBy: sortBy || 'leaseStartDate',
                sortOrder: sortOrder || 'DESC'
            }
        );

        const totalPages = Math.ceil(result.total / pageLimit);

        return {
            data: result.data,
            meta: {
                total: result.total,
                page: currentPage,
                limit: pageLimit,
                totalPages
            }
        };
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
        @Body() body: { moveOutDate: string; notes?: string },
        @CurrentUser() user: any
    ) {
        return this.occupanciesService.endOccupancy(
            id,
            user.companyId,
            body.moveOutDate,
            body.notes
        );
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'Cancel an occupancy (lease cancelled)' })
    @ApiResponse({ status: 200, description: 'Occupancy cancelled successfully' })
    @ApiResponse({ status: 400, description: 'Occupancy already cancelled or ended' })
    @ApiResponse({ status: 404, description: 'Occupancy not found' })
    cancelOccupancy(
        @Param('id') id: string,
        @Body('reason') reason: string,
        @CurrentUser() user: any
    ) {
        return this.occupanciesService.cancelOccupancy(id, user.companyId, reason);
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

    @Public()
    @Post('trigger-status-update')
    @ApiOperation({
        summary: 'Manually trigger occupancy status update (Testing/Admin)',
        description: 'Triggers the automatic status update task immediately. Updates all pending occupancies where lease start date has arrived.'
    })
    @ApiResponse({
        status: 200,
        description: 'Status update completed',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                success: { type: 'number' },
                failed: { type: 'number' }
            }
        }
    })
    @ApiResponse({ status: 403, description: 'Auto-update is disabled' })
    async triggerStatusUpdate() {
        const result = await this.statusUpdateTask.triggerManualUpdate();
        return {
            message: 'Status update completed',
            success: result.success,
            failed: result.failed
        };
    }
}
