import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { SuperAdminCompaniesService } from '../services/super-admin-companies.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CompanyStatsDto } from '../dto/company-stats.dto';

/**
 * Super Admin Companies Controller
 * Manages all companies in the platform
 *
 * Only accessible by users with isSuperAdmin = true
 */
@Controller('super-admin/companies')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminCompaniesController {
  constructor(
    private readonly superAdminCompaniesService: SuperAdminCompaniesService,
  ) {}

  /**
   * Get all companies with pagination and filters
   */
  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.superAdminCompaniesService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
    });
  }

  /**
   * Get platform-wide statistics
   * MUST BE BEFORE :id routes to avoid "platform" being treated as an ID
   */
  @Get('platform/stats')
  async getPlatformStats() {
    return this.superAdminCompaniesService.getPlatformStats();
  }

  /**
   * Get company by ID with full details
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.superAdminCompaniesService.findOne(id);
  }

  /**
   * Get company statistics
   */
  @Get(':id/stats')
  async getCompanyStats(@Param('id') id: string): Promise<CompanyStatsDto> {
    return this.superAdminCompaniesService.getCompanyStats(id);
  }

  /**
   * Create a new company (with owner)
   */
  @Post()
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.superAdminCompaniesService.create(createCompanyDto);
  }

  /**
   * Update company details
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.superAdminCompaniesService.update(id, updateCompanyDto);
  }

  /**
   * Suspend a company
   */
  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(@Param('id') id: string) {
    return this.superAdminCompaniesService.suspend(id);
  }

  /**
   * Activate a company
   */
  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    return this.superAdminCompaniesService.activate(id);
  }

  /**
   * Delete a company (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.superAdminCompaniesService.remove(id);
  }
}
