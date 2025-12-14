import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InvoicesService } from '../services/invoices.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { BulkGenerateInvoicesDto, BulkGenerateInvoicesResponseDto } from '../dto/bulk-generate-invoices.dto';
import { InvoiceQueryDto } from '../../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/tenant.decorator';

/**
 * Invoices Controller
 * Handles HTTP requests for invoice management
 *
 * Author: george1806
 */
@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new invoice' })
    @ApiResponse({ status: 201, description: 'Invoice created successfully' })
    @ApiResponse({ status: 409, description: 'Invoice number already exists' })
    create(@Body() createDto: CreateInvoiceDto, @CurrentUser() user: any) {
        return this.invoicesService.create(createDto, user.companyId);
    }

    @Post('generate-rent')
    @ApiOperation({ summary: 'Auto-generate rent invoice for an occupancy' })
    @ApiResponse({ status: 201, description: 'Rent invoice generated' })
    @ApiResponse({ status: 409, description: 'Invoice already exists for this period' })
    generateRentInvoice(
        @Body('occupancyId') occupancyId: string,
        @Body('month') month: string,
        @Body('dueDay') dueDay: number,
        @CurrentUser() user: any
    ) {
        return this.invoicesService.generateRentInvoice(
            occupancyId,
            user.companyId,
            month,
            dueDay
        );
    }

    @Post('bulk-generate')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({
        summary: 'Bulk generate rent invoices for multiple occupancies',
        description: 'Generate rent invoices for all active occupancies or specific ones in a single operation. Rate limited to 10 requests per minute per user.'
    })
    @ApiResponse({ status: 201, description: 'Invoices generated', type: BulkGenerateInvoicesResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid input parameters' })
    @ApiResponse({ status: 429, description: 'Too many requests (rate limited)' })
    async bulkGenerateRentInvoices(
        @Body() dto: BulkGenerateInvoicesDto,
        @CurrentUser() user: any
    ): Promise<BulkGenerateInvoicesResponseDto> {
        return this.invoicesService.bulkGenerateRentInvoices(
            user.companyId,
            dto.month,
            dto.dueDay || 5,
            dto.occupancyIds,
            dto.skipExisting !== false
        );
    }

    @Get()
    @ApiOperation({ summary: 'Get all invoices with pagination and validated sorting' })
    @ApiResponse({ status: 200, description: 'Returns invoices with pagination' })
    @ApiResponse({ status: 400, description: 'Invalid query parameters' })
    async findAll(
        @Query() query: InvoiceQueryDto,
        @CurrentUser() user?: any
    ) {
        // Validate sortBy field against whitelist
        const validatedSortBy = query.validateSortBy(query.sortBy);

        const currentPage = query.page || 1;
        const pageLimit = query.limit || 10;

        const result = await this.invoicesService.findAll(
            user.companyId,
            currentPage,
            pageLimit,
            {
                status: query.status,
                includeInactive: query.includeInactive || false
            }
        );

        const totalPages = Math.ceil(result.total / pageLimit);

        // Return paginated response format expected by frontend
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

    @Get('stats')
    @ApiOperation({ summary: 'Get invoice statistics' })
    @ApiResponse({ status: 200, description: 'Invoice statistics' })
    getStats(@CurrentUser() user: any) {
        return this.invoicesService.getStats(user.companyId);
    }

    @Get('overdue')
    @ApiOperation({ summary: 'Get overdue invoices' })
    @ApiResponse({ status: 200, description: 'List of overdue invoices' })
    findOverdue(@CurrentUser() user: any) {
        return this.invoicesService.findOverdue(user.companyId);
    }

    @Get('due-soon')
    @ApiOperation({ summary: 'Get invoices due soon' })
    @ApiQuery({ name: 'daysAhead', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'List of invoices due soon' })
    findDueSoon(@Query('daysAhead') daysAhead?: number, @CurrentUser() user?: any) {
        return this.invoicesService.findDueSoon(user.companyId, daysAhead);
    }

    @Get('tenant/:tenantId')
    @ApiOperation({ summary: 'Get invoices by tenant' })
    @ApiResponse({ status: 200, description: 'List of tenant invoices' })
    findByTenant(@Param('tenantId') tenantId: string, @CurrentUser() user: any) {
        return this.invoicesService.findByTenant(tenantId, user.companyId);
    }

    @Get('occupancy/:occupancyId')
    @ApiOperation({ summary: 'Get invoices by occupancy' })
    @ApiResponse({ status: 200, description: 'List of occupancy invoices' })
    findByOccupancy(@Param('occupancyId') occupancyId: string, @CurrentUser() user: any) {
        return this.invoicesService.findByOccupancy(occupancyId, user.companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get invoice by ID' })
    @ApiResponse({ status: 200, description: 'Invoice details' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    findOne(@Param('id') id: string, @CurrentUser() user: any) {
        return this.invoicesService.findOne(id, user.companyId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an invoice' })
    @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
    @ApiResponse({ status: 400, description: 'Cannot update paid/cancelled invoice' })
    update(
        @Param('id') id: string,
        @Body() updateDto: UpdateInvoiceDto,
        @CurrentUser() user: any
    ) {
        return this.invoicesService.update(id, updateDto, user.companyId);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update invoice status' })
    @ApiResponse({ status: 200, description: 'Status updated successfully' })
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
        @CurrentUser() user: any
    ) {
        return this.invoicesService.updateStatus(id, status, user.companyId);
    }

    @Post(':id/payment')
    @ApiOperation({ summary: 'Record a payment on an invoice' })
    @ApiResponse({ status: 200, description: 'Payment recorded successfully' })
    @ApiResponse({ status: 400, description: 'Payment exceeds invoice total' })
    recordPayment(
        @Param('id') id: string,
        @Body('amount') amount: number,
        @CurrentUser() user: any
    ) {
        return this.invoicesService.recordPayment(id, user.companyId, amount);
    }

    @Post(':id/send')
    @ApiOperation({ summary: 'Mark invoice as sent' })
    @ApiResponse({ status: 200, description: 'Invoice marked as sent' })
    markAsSent(@Param('id') id: string, @CurrentUser() user: any) {
        return this.invoicesService.markAsSent(id, user.companyId);
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'Cancel an invoice' })
    @ApiResponse({ status: 200, description: 'Invoice cancelled' })
    @ApiResponse({ status: 400, description: 'Cannot cancel paid invoice' })
    cancel(@Param('id') id: string, @CurrentUser() user: any) {
        return this.invoicesService.cancel(id, user.companyId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete (deactivate) an invoice' })
    @ApiResponse({ status: 200, description: 'Invoice deleted successfully' })
    @ApiResponse({ status: 400, description: 'Can only delete draft/cancelled invoices' })
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.invoicesService.remove(id, user.companyId);
    }

    @Post(':id/activate')
    @ApiOperation({ summary: 'Reactivate a deleted invoice' })
    @ApiResponse({ status: 200, description: 'Invoice reactivated' })
    activate(@Param('id') id: string, @CurrentUser() user: any) {
        return this.invoicesService.activate(id, user.companyId);
    }

    @Get(':id/pdf')
    @ApiOperation({ summary: 'Download invoice as PDF' })
    @ApiResponse({ status: 200, description: 'PDF file' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    downloadPdf(@Param('id') id: string, @CurrentUser() user: any) {
        return this.invoicesService.downloadPdf(id, user.companyId);
    }

    @Get(':id/payments')
    @ApiOperation({ summary: 'Get payments for an invoice' })
    @ApiResponse({ status: 200, description: 'List of payments' })
    getPayments(@Param('id') id: string, @CurrentUser() user: any) {
        return this.invoicesService.getPayments(id, user.companyId);
    }
}
