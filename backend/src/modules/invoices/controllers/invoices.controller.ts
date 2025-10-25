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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InvoicesService } from '../services/invoices.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
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
    @CurrentUser() user: any,
  ) {
    return this.invoicesService.generateRentInvoice(
      occupancyId,
      user.companyId,
      month,
      dueDay,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'includeInactive', required: false })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  findAll(
    @Query('status') status?: string,
    @Query('includeInactive') includeInactive?: string,
    @CurrentUser() user?: any,
  ) {
    return this.invoicesService.findAll(
      user.companyId,
      status,
      includeInactive === 'true',
    );
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
  findDueSoon(
    @Query('daysAhead') daysAhead?: number,
    @CurrentUser() user?: any,
  ) {
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
  findByOccupancy(
    @Param('occupancyId') occupancyId: string,
    @CurrentUser() user: any,
  ) {
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
    @CurrentUser() user: any,
  ) {
    return this.invoicesService.update(id, updateDto, user.companyId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update invoice status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
    @CurrentUser() user: any,
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
    @CurrentUser() user: any,
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
}
