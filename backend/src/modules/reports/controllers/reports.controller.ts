import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from '../services/reports.service';
import {
  DateRangeDto,
  KpiResponseDto,
  RevenueAnalyticsDto,
  OccupancyAnalyticsDto,
} from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';

/**
 * Reports Controller
 * Handles analytics and reporting endpoints
 *
 * All endpoints require authentication and proper role
 * Reports are cached for performance
 *
 * Author: george1806
 */
@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('kpis')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dashboard KPIs',
    description: 'Retrieve key performance indicators for the dashboard including occupancy rates, revenue metrics, and collection statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'KPIs retrieved successfully',
    type: KpiResponseDto,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering (ISO 8601)',
  })
  async getDashboardKpis(
    @TenantId() companyId: string,
    @Query() dateRange?: DateRangeDto,
  ): Promise<KpiResponseDto> {
    return this.reportsService.getDashboardKpis(companyId, dateRange);
  }

  @Get('revenue')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get revenue analytics',
    description: 'Detailed revenue analysis including trends, collection rates, and payment method breakdown',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue analytics retrieved successfully',
    type: RevenueAnalyticsDto,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering (ISO 8601)',
  })
  async getRevenueAnalytics(
    @TenantId() companyId: string,
    @Query() dateRange?: DateRangeDto,
  ): Promise<RevenueAnalyticsDto> {
    return this.reportsService.getRevenueAnalytics(companyId, dateRange);
  }

  @Get('occupancy')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get occupancy analytics',
    description: 'Occupancy statistics including rates, trends, turnover, and breakdown by compound',
  })
  @ApiResponse({
    status: 200,
    description: 'Occupancy analytics retrieved successfully',
    type: OccupancyAnalyticsDto,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering (ISO 8601)',
  })
  async getOccupancyAnalytics(
    @TenantId() companyId: string,
    @Query() dateRange?: DateRangeDto,
  ): Promise<OccupancyAnalyticsDto> {
    return this.reportsService.getOccupancyAnalytics(companyId, dateRange);
  }

  @Delete('cache')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Clear reports cache',
    description: 'Force refresh of cached report data for the company',
  })
  @ApiResponse({
    status: 204,
    description: 'Cache cleared successfully',
  })
  async clearCache(@TenantId() companyId: string): Promise<void> {
    await this.reportsService.clearCache(companyId);
  }
}
