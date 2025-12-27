import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/tenant.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ReminderLogService } from '../services/reminder-log.service';

/**
 * Reminder Analytics Controller
 *
 * Provides analytics and reporting endpoints for reminder system.
 * Includes delivery statistics, failure analysis, and performance metrics.
 *
 * Author: george1806
 */
@ApiTags('Reminder Analytics')
@Controller({ path: 'reminders/analytics', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReminderAnalyticsController {
    constructor(private readonly logService: ReminderLogService) {}

    /**
     * Get delivery statistics for current company
     */
    @Get('delivery-stats')
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    @ApiOperation({
        summary: 'Get delivery statistics',
        description: 'Get email delivery statistics including success rate, failures, and bounces',
    })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
    @ApiResponse({
        status: 200,
        description: 'Delivery statistics retrieved successfully',
    })
    async getDeliveryStats(
        @CurrentUser('companyId') companyId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const stats = await this.logService.getDeliveryStats(companyId, start, end);

        // Map to frontend-expected format
        return {
            totalSent: stats.sent + stats.delivered,
            successfulDeliveries: stats.sent + stats.delivered,
            failures: stats.failed,
            bounces: stats.bounced,
            successRate: stats.deliveryRate,
            bounceRate: stats.bounced > 0 ? (stats.bounced / stats.total) * 100 : 0,
            failureRate: stats.failureRate,
        };
    }

    /**
     * Get average processing time for emails
     */
    @Get('processing-time')
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    @ApiOperation({
        summary: 'Get average processing time',
        description: 'Get average time taken from queueing to sending emails (in seconds)',
    })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
    @ApiResponse({
        status: 200,
        description: 'Processing time retrieved successfully',
    })
    async getProcessingTime(
        @CurrentUser('companyId') companyId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const avgTime = await this.logService.getAverageProcessingTime(companyId, start, end);

        return {
            averageProcessingTime: avgTime,
            unit: 'seconds',
            message:
                avgTime !== null
                    ? `Average processing time: ${avgTime.toFixed(2)} seconds`
                    : 'No data available',
        };
    }

    /**
     * Get failure reasons breakdown
     */
    @Get('failure-reasons')
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    @ApiOperation({
        summary: 'Get failure reasons breakdown',
        description: 'Get breakdown of email failures by reason',
    })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
    @ApiResponse({
        status: 200,
        description: 'Failure reasons retrieved successfully',
    })
    async getFailureReasons(
        @CurrentUser('companyId') companyId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const reasons = await this.logService.getFailureReasons(companyId, start, end);

        return {
            failureReasons: reasons,
            totalFailures: Object.values(reasons).reduce((sum, count) => sum + count, 0),
        };
    }

    /**
     * Get reminder logs for company
     */
    @Get('logs')
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    @ApiOperation({
        summary: 'Get reminder logs',
        description: 'Get audit logs for reminder emails sent',
    })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
    @ApiResponse({
        status: 200,
        description: 'Logs retrieved successfully',
    })
    async getLogs(
        @CurrentUser('companyId') companyId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        return this.logService.getLogsForCompany(companyId, start, end);
    }

    /**
     * Clean up old logs
     */
    @Get('cleanup')
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    @ApiOperation({
        summary: 'Clean up old logs',
        description: 'Delete reminder logs older than specified days (default: 90 days)',
    })
    @ApiQuery({
        name: 'daysToKeep',
        required: false,
        description: 'Number of days to keep logs (default: 90)',
    })
    @ApiResponse({
        status: 200,
        description: 'Cleanup completed successfully',
    })
    async cleanupLogs(
        @CurrentUser('companyId') companyId: string,
        @Query('daysToKeep', new ParseIntPipe({ optional: true })) daysToKeep?: number,
    ) {
        const deletedCount = await this.logService.cleanupOldLogs(companyId, daysToKeep || 90);

        return {
            success: true,
            message: `Cleaned up ${deletedCount} old log entries`,
            deletedCount,
        };
    }
}
