import { PartialType } from '@nestjs/swagger';
import { CreateReminderDto } from './create-reminder.dto';

/**
 * Update Reminder DTO
 * Partial update for existing reminders
 *
 * Author: george1806
 */
export class UpdateReminderDto extends PartialType(CreateReminderDto) {}
