import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/tenant.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';

/**
 * Dashboard Controller
 * Provides dashboard statistics and data for authenticated users
 *
 * Author: george1806
 */
@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    /**
     * Get dashboard statistics for current user's company or specific property
     * @param user - Current authenticated user
     * @param compoundId - Optional compound/property ID for property-specific stats
     */
    @Get('stats')
    @ApiOperation({
        summary: 'Get dashboard statistics',
        description: 'Get company-wide or property-specific dashboard statistics'
    })
    @ApiQuery({
        name: 'compoundId',
        required: false,
        type: String,
        description: 'Optional property ID to filter stats for a specific property'
    })
    async getStats(
        @CurrentUser() user: any,
        @Query('compoundId') compoundId?: string
    ): Promise<{ data: DashboardStatsDto }> {
        const stats = await this.dashboardService.getStats(user.companyId, compoundId);
        return { data: stats };
    }
}
