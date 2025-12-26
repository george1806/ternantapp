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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/tenant.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ReminderSettingsService } from '../services/reminder-settings.service';
import { UpdateReminderSettingsDto } from '../dto/update-reminder-settings.dto';
import { ReminderSettings } from '../entities/reminder-settings.entity';

/**
 * Reminder Settings Controller
 *
 * Manages configurable settings for the reminder system.
 * Only accessible by ADMIN and OWNER users.
 *
 * Author: george1806
 */
@ApiTags('Reminder Settings')
@Controller({ path: 'settings/reminders', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReminderSettingsController {
  constructor(private readonly settingsService: ReminderSettingsService) {}

  /**
   * Get reminder settings for current company
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Get reminder settings',
    description: 'Get configurable reminder settings for the current company',
  })
  @ApiResponse({
    status: 200,
    description: 'Reminder settings retrieved successfully',
    type: ReminderSettings,
  })
  async getSettings(
    @CurrentUser('companyId') companyId: string,
  ): Promise<ReminderSettings> {
    return this.settingsService.getSettings(companyId);
  }

  /**
   * Update reminder settings for current company
   */
  @Put()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update reminder settings',
    description: 'Update configurable reminder settings for the current company',
  })
  @ApiResponse({
    status: 200,
    description: 'Reminder settings updated successfully',
    type: ReminderSettings,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid settings data',
  })
  async updateSettings(
    @CurrentUser('companyId') companyId: string,
    @Body() updateDto: UpdateReminderSettingsDto,
  ): Promise<ReminderSettings> {
    return this.settingsService.updateSettings(companyId, updateDto);
  }

  /**
   * Reset reminder settings to defaults
   */
  @Post('reset')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset reminder settings to defaults',
    description: 'Reset all reminder settings to default values for the current company',
  })
  @ApiResponse({
    status: 200,
    description: 'Reminder settings reset successfully',
    type: ReminderSettings,
  })
  async resetToDefaults(
    @CurrentUser('companyId') companyId: string,
  ): Promise<ReminderSettings> {
    return this.settingsService.resetToDefaults(companyId);
  }
}
