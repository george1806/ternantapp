import {
    Controller,
    Get,
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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { SuperAdminAnalyticsService } from '../services/super-admin-analytics.service';

/**
 * Super Admin Analytics Controller
 * Provides platform-wide analytics endpoints
 */
@ApiTags('Super Admin - Analytics')
@ApiBearerAuth()
@Controller('super-admin/analytics')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminAnalyticsController {
    constructor(
        private readonly analyticsService: SuperAdminAnalyticsService
    ) {}

    @Get('revenue-trends')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get platform revenue trends' })
    @ApiQuery({
        name: 'period',
        required: false,
        enum: ['7d', '30d', '90d', 'ytd', 'all'],
        description: 'Period for trends analysis',
    })
    @ApiResponse({
        status: 200,
        description: 'Revenue trends data',
    })
    async getRevenueTrends(
        @Query('period') period: '7d' | '30d' | '90d' | 'ytd' | 'all' = '30d'
    ) {
        const data = await this.analyticsService.getRevenueTrends(period);
        return { data };
    }

    @Get('invoice-distribution')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get invoice status distribution' })
    @ApiQuery({
        name: 'period',
        required: false,
        enum: ['7d', '30d', '90d', 'ytd', 'all'],
        description: 'Period for distribution analysis',
    })
    @ApiResponse({
        status: 200,
        description: 'Invoice distribution data',
    })
    async getInvoiceDistribution(
        @Query('period') period: '7d' | '30d' | '90d' | 'ytd' | 'all' = '30d'
    ) {
        const data = await this.analyticsService.getInvoiceDistribution(period);
        return { data };
    }

    @Get('payment-collection')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get payment collection metrics' })
    @ApiQuery({
        name: 'period',
        required: false,
        enum: ['7d', '30d', '90d', 'ytd', 'all'],
        description: 'Period for collection analysis',
    })
    @ApiResponse({
        status: 200,
        description: 'Payment collection metrics',
    })
    async getPaymentCollection(
        @Query('period') period: '7d' | '30d' | '90d' | 'ytd' | 'all' = '30d'
    ) {
        const data = await this.analyticsService.getPaymentCollection(period);
        return { data };
    }

    @Get('top-companies')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get top companies by revenue' })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of companies to return',
    })
    @ApiResponse({
        status: 200,
        description: 'Top companies list',
    })
    async getTopCompanies(@Query('limit') limit: number = 10) {
        const data = await this.analyticsService.getTopCompanies(limit);
        return { data };
    }

    @Get('dashboard')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get analytics dashboard data (all metrics)' })
    @ApiQuery({
        name: 'period',
        required: false,
        enum: ['7d', '30d', '90d', 'ytd', 'all'],
        description: 'Period for analysis',
    })
    @ApiResponse({
        status: 200,
        description: 'Complete analytics dashboard data',
    })
    async getAnalyticsDashboard(
        @Query('period') period: '7d' | '30d' | '90d' | 'ytd' | 'all' = '30d'
    ) {
        const [
            revenueTrends,
            invoiceDistribution,
            paymentCollection,
            topCompanies,
        ] = await Promise.all([
            this.analyticsService.getRevenueTrends(period),
            this.analyticsService.getInvoiceDistribution(period),
            this.analyticsService.getPaymentCollection(period),
            this.analyticsService.getTopCompanies(10),
        ]);

        return {
            data: {
                revenueTrends,
                invoiceDistribution,
                paymentCollection,
                topCompanies,
            },
        };
    }
}
