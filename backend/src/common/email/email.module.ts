import { Module, Global } from '@nestjs/common';
import { EmailService } from './services/email.service';

/**
 * Email Module
 * Global module for email functionality
 *
 * Features:
 * - Nodemailer integration
 * - MJML template support
 * - Handlebars rendering
 * - Configuration-based SMTP
 *
 * Author: george1806
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
