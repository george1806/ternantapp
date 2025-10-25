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
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ApartmentsService } from '../services/apartments.service';
import { CreateApartmentDto } from '../dto/create-apartment.dto';
import { UpdateApartmentDto } from '../dto/update-apartment.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/tenant.decorator';

/**
 * Apartments Controller
 * RESTful API endpoints for apartment management
 *
 * Author: george1806
 */
@ApiTags('Apartments')
@Controller('apartments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new apartment' })
  @ApiResponse({
    status: 201,
    description: 'Apartment created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid compound or data' })
  @ApiResponse({
    status: 409,
    description: 'Unit number already exists in compound',
  })
  async create(
    @Body() createDto: CreateApartmentDto,
    @CurrentUser() user: any,
  ) {
    return this.apartmentsService.create(createDto, user.companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all apartments' })
  @ApiQuery({
    name: 'compoundId',
    required: false,
    description: 'Filter by compound',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['available', 'occupied', 'maintenance', 'reserved'],
    description: 'Filter by status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of apartments retrieved successfully',
  })
  async findAll(
    @CurrentUser() user: any,
    @Query('compoundId') compoundId?: string,
    @Query('status') status?: string,
  ) {
    return this.apartmentsService.findAll(user.companyId, compoundId, status);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search apartments by unit number or notes' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(@CurrentUser() user: any, @Query('q') query: string) {
    return this.apartmentsService.search(user.companyId, query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count apartments with optional filters' })
  @ApiQuery({
    name: 'compoundId',
    required: false,
    description: 'Filter by compound',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['available', 'occupied', 'maintenance', 'reserved'],
    description: 'Filter by status',
  })
  @ApiResponse({ status: 200, description: 'Apartment count' })
  async count(
    @CurrentUser() user: any,
    @Query('compoundId') compoundId?: string,
    @Query('status') status?: string,
  ) {
    const count = await this.apartmentsService.count(
      user.companyId,
      compoundId,
      status,
    );
    return { count };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get apartment availability statistics' })
  @ApiResponse({
    status: 200,
    description: 'Availability statistics',
  })
  async getStats(@CurrentUser() user: any) {
    return this.apartmentsService.getAvailabilityStats(user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get apartment by ID' })
  @ApiResponse({ status: 200, description: 'Apartment found' })
  @ApiResponse({ status: 404, description: 'Apartment not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.apartmentsService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an apartment' })
  @ApiResponse({ status: 200, description: 'Apartment updated successfully' })
  @ApiResponse({ status: 404, description: 'Apartment not found' })
  @ApiResponse({
    status: 409,
    description: 'Unit number already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateApartmentDto,
    @CurrentUser() user: any,
  ) {
    return this.apartmentsService.update(id, updateDto, user.companyId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update apartment status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Apartment not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status')
    status: 'available' | 'occupied' | 'maintenance' | 'reserved',
    @CurrentUser() user: any,
  ) {
    return this.apartmentsService.updateStatus(id, status, user.companyId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate an apartment (soft delete)' })
  @ApiResponse({ status: 204, description: 'Apartment deactivated' })
  @ApiResponse({ status: 404, description: 'Apartment not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete occupied apartment',
  })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.apartmentsService.remove(id, user.companyId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Reactivate a deactivated apartment' })
  @ApiResponse({
    status: 200,
    description: 'Apartment reactivated successfully',
  })
  @ApiResponse({ status: 404, description: 'Apartment not found' })
  async activate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.apartmentsService.activate(id, user.companyId);
  }
}
