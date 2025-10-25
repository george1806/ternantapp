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
import { PaymentsService } from '../services/payments.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/tenant.decorator';

/**
 * Payments Controller
 * Handles HTTP requests for payment management
 *
 * Author: george1806
 */
@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment (also updates invoice)' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 400, description: 'Payment exceeds outstanding balance' })
  create(@Body() createDto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.paymentsService.create(createDto, user.companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiQuery({ name: 'invoiceId', required: false })
  @ApiQuery({ name: 'includeInactive', required: false })
  @ApiResponse({ status: 200, description: 'List of payments' })
  findAll(
    @Query('invoiceId') invoiceId?: string,
    @Query('includeInactive') includeInactive?: string,
    @CurrentUser() user?: any,
  ) {
    return this.paymentsService.findAll(
      user.companyId,
      invoiceId,
      includeInactive === 'true',
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Payment statistics' })
  getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.paymentsService.getStats(
      user.companyId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('date-range')
  @ApiOperation({ summary: 'Get payments within a date range' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, description: 'List of payments' })
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.findByDateRange(
      user.companyId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('invoice/:invoiceId')
  @ApiOperation({ summary: 'Get payments by invoice' })
  @ApiResponse({ status: 200, description: 'List of invoice payments' })
  findByInvoice(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.findByInvoice(invoiceId, user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentsService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a payment (also updates invoice accordingly)',
  })
  @ApiResponse({ status: 200, description: 'Payment updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Updated amount creates invalid state',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.update(id, updateDto, user.companyId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete (deactivate) a payment (reverts invoice changes)',
  })
  @ApiResponse({ status: 200, description: 'Payment deleted successfully' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentsService.remove(id, user.companyId);
  }

  @Post(':id/activate')
  @ApiOperation({
    summary: 'Reactivate a deleted payment (reapplies to invoice)',
  })
  @ApiResponse({ status: 200, description: 'Payment reactivated' })
  @ApiResponse({
    status: 400,
    description: 'Cannot reactivate: would exceed invoice total',
  })
  activate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentsService.activate(id, user.companyId);
  }
}
