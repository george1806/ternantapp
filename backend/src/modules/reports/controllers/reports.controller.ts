import {
    Controller,
    Get,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
    Delete,
    Res,
    Header
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from '../services/reports.service';
import { ExportService } from '../services/export.service';
import {
    DateRangeDto,
    KpiResponseDto,
    RevenueAnalyticsDto,
    OccupancyAnalyticsDto,
    LeaseExpirationReportDto,
    AgingAnalysisReportDto
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
    constructor(
        private readonly reportsService: ReportsService,
        private readonly exportService: ExportService
    ) {}

    @Get('kpis')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get dashboard KPIs',
        description:
            'Retrieve key performance indicators for the dashboard including occupancy rates, revenue metrics, and collection statistics'
    })
    @ApiResponse({
        status: 200,
        description: 'KPIs retrieved successfully',
        type: KpiResponseDto
    })
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Start date for filtering (ISO 8601)'
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'End date for filtering (ISO 8601)'
    })
    async getDashboardKpis(
        @TenantId() companyId: string,
        @Query() dateRange?: DateRangeDto
    ): Promise<KpiResponseDto> {
        return this.reportsService.getDashboardKpis(companyId, dateRange);
    }

    @Get('revenue')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get revenue analytics',
        description:
            'Detailed revenue analysis including trends, collection rates, and payment method breakdown'
    })
    @ApiResponse({
        status: 200,
        description: 'Revenue analytics retrieved successfully',
        type: RevenueAnalyticsDto
    })
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Start date for filtering (ISO 8601)'
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'End date for filtering (ISO 8601)'
    })
    async getRevenueAnalytics(
        @TenantId() companyId: string,
        @Query() dateRange?: DateRangeDto
    ): Promise<RevenueAnalyticsDto> {
        return this.reportsService.getRevenueAnalytics(companyId, dateRange);
    }

    @Get('occupancy')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get occupancy analytics',
        description:
            'Occupancy statistics including rates, trends, turnover, and breakdown by compound'
    })
    @ApiResponse({
        status: 200,
        description: 'Occupancy analytics retrieved successfully',
        type: OccupancyAnalyticsDto
    })
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Start date for filtering (ISO 8601)'
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'End date for filtering (ISO 8601)'
    })
    async getOccupancyAnalytics(
        @TenantId() companyId: string,
        @Query() dateRange?: DateRangeDto
    ): Promise<OccupancyAnalyticsDto> {
        return this.reportsService.getOccupancyAnalytics(companyId, dateRange);
    }

    @Get('lease-expiration')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get lease expiration report',
        description: 'Shows leases expiring within specified number of days with urgency levels'
    })
    @ApiResponse({
        status: 200,
        description: 'Lease expiration report retrieved successfully',
        type: [LeaseExpirationReportDto]
    })
    @ApiQuery({
        name: 'daysAhead',
        required: false,
        type: Number,
        description: 'Number of days ahead to check (default: 90)'
    })
    async getLeaseExpirationReport(
        @TenantId() companyId: string,
        @Query('daysAhead') daysAhead?: number
    ): Promise<LeaseExpirationReportDto[]> {
        return this.reportsService.getLeaseExpirationReport(
            companyId,
            daysAhead ? Number(daysAhead) : 90
        );
    }

    @Get('aging-analysis')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get aging analysis report',
        description: 'Shows overdue invoices grouped by aging buckets (current, 1-30, 31-60, 61-90, 90+ days)'
    })
    @ApiResponse({
        status: 200,
        description: 'Aging analysis report retrieved successfully',
        type: AgingAnalysisReportDto
    })
    async getAgingAnalysisReport(
        @TenantId() companyId: string
    ): Promise<AgingAnalysisReportDto> {
        return this.reportsService.getAgingAnalysisReport(companyId);
    }

    @Get('kpis/export')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @Header('Content-Type', 'text/csv')
    @ApiOperation({
        summary: 'Export KPIs to CSV',
        description: 'Download dashboard KPIs as CSV file'
    })
    @ApiResponse({
        status: 200,
        description: 'CSV file generated successfully'
    })
    async exportKPIs(
        @TenantId() companyId: string,
        @Query() dateRange: DateRangeDto,
        @Res() res: Response
    ): Promise<void> {
        const kpis = await this.reportsService.getDashboardKpis(companyId, dateRange);
        const csv = this.exportService.generateKPIsCSV(kpis);

        const filename = `kpis-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    }

    @Get('revenue/export')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @Header('Content-Type', 'text/csv')
    @ApiOperation({
        summary: 'Export revenue analytics to CSV',
        description: 'Download revenue analytics as CSV file'
    })
    @ApiResponse({
        status: 200,
        description: 'CSV file generated successfully'
    })
    async exportRevenue(
        @TenantId() companyId: string,
        @Query() dateRange: DateRangeDto,
        @Res() res: Response
    ): Promise<void> {
        const revenue = await this.reportsService.getRevenueAnalytics(companyId, dateRange);
        const csv = this.exportService.generateRevenueCSV(revenue);

        const filename = `revenue-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    }

    @Get('occupancy/export')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @Header('Content-Type', 'text/csv')
    @ApiOperation({
        summary: 'Export occupancy analytics to CSV',
        description: 'Download occupancy analytics as CSV file'
    })
    @ApiResponse({
        status: 200,
        description: 'CSV file generated successfully'
    })
    async exportOccupancy(
        @TenantId() companyId: string,
        @Query() dateRange: DateRangeDto,
        @Res() res: Response
    ): Promise<void> {
        const occupancy = await this.reportsService.getOccupancyAnalytics(companyId, dateRange);
        const csv = this.exportService.generateOccupancyCSV(occupancy);

        const filename = `occupancy-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    }

    @Get('lease-expiration/export')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @Header('Content-Type', 'text/csv')
    @ApiOperation({
        summary: 'Export lease expiration report to CSV',
        description: 'Download lease expiration report as CSV file'
    })
    @ApiResponse({
        status: 200,
        description: 'CSV file generated successfully'
    })
    @ApiQuery({
        name: 'daysAhead',
        required: false,
        type: Number,
        description: 'Number of days ahead to check (default: 90)'
    })
    async exportLeaseExpiration(
        @TenantId() companyId: string,
        @Query('daysAhead') daysAhead: number,
        @Res() res: Response
    ): Promise<void> {
        const leases = await this.reportsService.getLeaseExpirationReport(
            companyId,
            daysAhead ? Number(daysAhead) : 90
        );
        const csv = this.exportService.generateLeaseExpirationCSV(leases);

        const filename = `lease-expiration-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    }

    @Get('aging-analysis/export')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @Header('Content-Type', 'text/csv')
    @ApiOperation({
        summary: 'Export aging analysis report to CSV',
        description: 'Download aging analysis report as CSV file'
    })
    @ApiResponse({
        status: 200,
        description: 'CSV file generated successfully'
    })
    async exportAgingAnalysis(
        @TenantId() companyId: string,
        @Res() res: Response
    ): Promise<void> {
        const aging = await this.reportsService.getAgingAnalysisReport(companyId);
        const csv = this.exportService.generateAgingAnalysisCSV(aging);

        const filename = `aging-analysis-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    }

    @Delete('cache')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Clear reports cache',
        description: 'Force refresh of cached report data for the company'
    })
    @ApiResponse({
        status: 204,
        description: 'Cache cleared successfully'
    })
    async clearCache(@TenantId() companyId: string): Promise<void> {
        await this.reportsService.clearCache(companyId);
    }
}
