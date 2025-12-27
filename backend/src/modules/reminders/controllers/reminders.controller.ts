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
import { BatchSendRemindersDto } from '../dto/batch-send-reminders.dto';
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
        const { data, total } = await this.remindersService.findAll(companyId, query);

        const page = query.page || 1;
        const limit = query.limit || 10;
        const totalPages = Math.ceil(total / limit);

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages
            }
        };
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
        @CurrentUser() user: any,
        @Body() createReminderDto: CreateReminderDto
    ) {
        const companyId = user.companyId || user.company_id;
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

    /**
     * TESTING: Force send a specific reminder immediately
     * Bypasses queue delay and sends the reminder right now
     */
    @Post(':id/send-now')
    @ApiOperation({
        summary: 'Force send reminder immediately (Testing)',
        description: 'Bypasses queue delay and sends the reminder immediately. For testing purposes.'
    })
    @ApiParam({ name: 'id', description: 'Reminder UUID' })
    @ApiResponse({
        status: 200,
        description: 'Reminder sent immediately'
    })
    @ApiResponse({
        status: 404,
        description: 'Reminder not found'
    })
    async sendNow(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string
    ) {
        return this.remindersService.sendNow(id, companyId);
    }

    /**
     * TESTING: Manually trigger the "Due Soon" invoices cron job
     * Normally runs daily at 8 AM automatically
     */
    @Post('test/cron-due-soon')
    @ApiOperation({
        summary: 'Manually trigger due invoices check (Testing)',
        description: 'Manually triggers the cron job that checks for invoices due soon and creates reminders. Normally runs at 8 AM daily.'
    })
    @ApiResponse({
        status: 200,
        description: 'Due invoices check completed'
    })
    async testCronDueSoon() {
        await this.remindersService.checkDueInvoices();
        return {
            message: 'Due invoices cron job executed successfully',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * TESTING: Manually trigger the "Overdue" invoices cron job
     * Normally runs daily at 9 AM automatically
     */
    @Post('test/cron-overdue')
    @ApiOperation({
        summary: 'Manually trigger overdue invoices check (Testing)',
        description: 'Manually triggers the cron job that checks for overdue invoices and creates reminders. Normally runs at 9 AM daily.'
    })
    @ApiResponse({
        status: 200,
        description: 'Overdue invoices check completed'
    })
    async testCronOverdue() {
        await this.remindersService.checkOverdueInvoices();
        return {
            message: 'Overdue invoices cron job executed successfully',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * TESTING: Create and send a test reminder with sample data
     */
    @Post('test/simulate')
    @ApiOperation({
        summary: 'Create test reminder with sample data (Testing)',
        description: 'Creates a test reminder with sample data and sends it immediately for testing email templates and delivery.'
    })
    @ApiResponse({
        status: 201,
        description: 'Test reminder created and sent'
    })
    async simulateReminder(
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('email') userEmail: string,
        @Body('type') type: 'DUE_SOON' | 'OVERDUE' | 'WELCOME' | 'RECEIPT' = 'DUE_SOON',
        @Body('recipient') recipient?: string
    ) {
        return this.remindersService.createTestReminder(
            companyId,
            type,
            recipient || userEmail
        );
    }

    /**
     * Preview a reminder without sending
     * Returns rendered email content for review
     */
    @Post(':id/preview')
    @ApiOperation({
        summary: 'Preview reminder content',
        description: 'Preview the email content of a reminder without actually sending it'
    })
    @ApiParam({ name: 'id', description: 'Reminder UUID' })
    @ApiResponse({
        status: 200,
        description: 'Reminder preview generated successfully'
    })
    @ApiResponse({
        status: 404,
        description: 'Reminder not found'
    })
    async previewReminder(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string
    ) {
        return this.remindersService.previewReminder(id, companyId);
    }

    /**
     * Batch send reminders based on criteria
     * Supports filtering by properties, apartments, tenants
     * Includes dry-run mode for testing
     */
    @Post('batch/send')
    @ApiOperation({
        summary: 'Batch send reminders',
        description: 'Send reminders in bulk based on filtering criteria. Supports dry-run mode to preview what would be sent.'
    })
    @ApiResponse({
        status: 200,
        description: 'Batch send completed successfully'
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid batch criteria'
    })
    async batchSend(
        @CurrentUser('companyId') companyId: string,
        @Body() batchDto: BatchSendRemindersDto
    ) {
        return this.remindersService.sendBatchReminders(companyId, batchDto);
    }
}
