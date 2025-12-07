import {
    Controller,
    Get,
    Put,
    Post,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { SuperAdminSettingsService } from '../services/super-admin-settings.service';

/**
 * Super Admin Settings Controller
 * Manages platform-wide settings
 */
@ApiTags('Super Admin - Settings')
@ApiBearerAuth()
@Controller('super-admin/settings')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminSettingsController {
    constructor(private readonly settingsService: SuperAdminSettingsService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get platform settings' })
    @ApiResponse({
        status: 200,
        description: 'Platform settings retrieved successfully',
    })
    getSettings() {
        const settings = this.settingsService.getSettings();
        return { data: settings };
    }

    @Put()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update platform settings' })
    @ApiResponse({
        status: 200,
        description: 'Platform settings updated successfully',
    })
    updateSettings(@Body() updates: any) {
        const settings = this.settingsService.updateSettings(updates);
        return { data: settings };
    }

    @Get('feature-flags')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get feature flags' })
    @ApiResponse({
        status: 200,
        description: 'Feature flags retrieved successfully',
    })
    getFeatureFlags() {
        const flags = this.settingsService.getFeatureFlags();
        return { data: flags };
    }

    @Put('feature-flags')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update feature flags' })
    @ApiResponse({
        status: 200,
        description: 'Feature flags updated successfully',
    })
    updateFeatureFlags(@Body() body: { flags: Record<string, boolean> }) {
        const flags = this.settingsService.updateFeatureFlags(body.flags);
        return { data: flags };
    }

    @Post('test-email')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Test email configuration' })
    @ApiResponse({
        status: 200,
        description: 'Email configuration test result',
    })
    async testEmail() {
        const result = await this.settingsService.testEmailConfig();
        return result;
    }
}
