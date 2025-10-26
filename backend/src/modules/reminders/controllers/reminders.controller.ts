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
    ApiParam
} from '@nestjs/swagger';
import { RemindersService } from '../services/reminders.service';
import { CreateReminderDto } from '../dto/create-reminder.dto';
import { UpdateReminderDto } from '../dto/update-reminder.dto';
import { QueryReminderDto } from '../dto/query-reminder.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/tenant.decorator';

/**
 * Reminders Controller
 * API endpoints for managing reminder notifications
 *
 * Endpoints:
 * - GET    /reminders          - List all reminders with filters
 * - GET    /reminders/:id      - Get single reminder
 * - POST   /reminders          - Create new reminder
 * - PATCH  /reminders/:id      - Update reminder
 * - DELETE /reminders/:id      - Delete reminder
 * - POST   /reminders/:id/send - Manually trigger sending
 *
 * Author: george1806
 */
@ApiTags('Reminders')
@ApiBearerAuth()
@Controller('reminders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RemindersController {
    constructor(private readonly remindersService: RemindersService) {}

    /**
     * List all reminders with optional filtering
     */
    @Get()
    @ApiOperation({ summary: 'List all reminders' })
    @ApiResponse({
        status: 200,
        description: 'Reminders retrieved successfully'
    })
    async findAll(
        @CurrentUser('companyId') companyId: string,
        @Query() query: QueryReminderDto
    ) {
        return this.remindersService.findAll(companyId, query);
    }

    /**
     * Get a single reminder by ID
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get reminder by ID' })
    @ApiParam({ name: 'id', description: 'Reminder UUID' })
    @ApiResponse({
        status: 200,
        description: 'Reminder retrieved successfully'
    })
    @ApiResponse({
        status: 404,
        description: 'Reminder not found'
    })
    async findOne(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.remindersService.findOne(id, companyId);
    }

    /**
     * Create a new reminder
     */
    @Post()
    @ApiOperation({ summary: 'Create new reminder' })
    @ApiResponse({
        status: 201,
        description: 'Reminder created successfully'
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid input data'
    })
    async create(
        @CurrentUser('companyId') companyId: string,
        @Body() createReminderDto: CreateReminderDto
    ) {
        return this.remindersService.create(companyId, createReminderDto);
    }

    /**
     * Update an existing reminder
     */
    @Patch(':id')
    @ApiOperation({ summary: 'Update reminder' })
    @ApiParam({ name: 'id', description: 'Reminder UUID' })
    @ApiResponse({
        status: 200,
        description: 'Reminder updated successfully'
    })
    @ApiResponse({
        status: 404,
        description: 'Reminder not found'
    })
    async update(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string,
        @Body() updateReminderDto: UpdateReminderDto
    ) {
        return this.remindersService.update(id, companyId, updateReminderDto);
    }

    /**
     * Delete a reminder
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete reminder' })
    @ApiParam({ name: 'id', description: 'Reminder UUID' })
    @ApiResponse({
        status: 204,
        description: 'Reminder deleted successfully'
    })
    @ApiResponse({
        status: 404,
        description: 'Reminder not found'
    })
    async remove(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.remindersService.remove(id, companyId);
    }

    /**
     * Manually mark a reminder as sent
     */
    @Post(':id/mark-sent')
    @ApiOperation({ summary: 'Mark reminder as sent' })
    @ApiParam({ name: 'id', description: 'Reminder UUID' })
    @ApiResponse({
        status: 200,
        description: 'Reminder marked as sent'
    })
    @ApiResponse({
        status: 404,
        description: 'Reminder not found'
    })
    async markAsSent(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string
    ) {
        return this.remindersService.markAsSent(id, companyId);
    }

    /**
     * Send welcome message to a tenant
     */
    @Post('welcome/:tenantId')
    @ApiOperation({ summary: 'Send welcome message to tenant' })
    @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
    @ApiResponse({
        status: 201,
        description: 'Welcome message sent'
    })
    async sendWelcome(
        @Param('tenantId') tenantId: string,
        @CurrentUser('companyId') companyId: string,
        @Body('apartmentCode') apartmentCode: string
    ) {
        return this.remindersService.sendWelcomeMessage(
            companyId,
            tenantId,
            apartmentCode
        );
    }

    /**
     * Send payment receipt to a tenant
     */
    @Post('receipt')
    @ApiOperation({ summary: 'Send payment receipt' })
    @ApiResponse({
        status: 201,
        description: 'Payment receipt sent'
    })
    async sendReceipt(
        @CurrentUser('companyId') companyId: string,
        @Body('tenantId') tenantId: string,
        @Body('invoiceId') invoiceId: string,
        @Body('amount') amount: number,
        @Body('currency') currency: string
    ) {
        return this.remindersService.sendPaymentReceipt(
            companyId,
            tenantId,
            invoiceId,
            amount,
            currency
        );
    }
}
