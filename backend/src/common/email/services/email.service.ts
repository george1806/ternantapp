import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';
import mjml2html from 'mjml';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EmailOptions } from '../interfaces/email-options.interface';
import {
  EmailProviderFactory,
  EmailProviderType,
  BaseEmailProvider,
} from '../providers';

/**
 * Email Service
 * Handles email sending with MJML templates and Handlebars
 *
 * Features:
 * - SMTP configuration via environment variables
 * - MJML template support
 * - Handlebars template rendering
 * - Attachment support
 * - Error handling and logging
 * - Production-ready (configurable)
 *
 * Author: george1806
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private provider: BaseEmailProvider;
  private readonly templatesPath: string;

  constructor(private readonly configService: ConfigService) {
    this.templatesPath = path.join(process.cwd(), 'src', 'common', 'email', 'templates');
    this.initializeTransporter();
  }

  /**
   * Initialize SMTP transporter with configuration
   * Uses Factory Pattern to create appropriate email provider
   */
  private initializeTransporter(): void {
    try {
      // Get provider type from environment (defaults to 'mailpit' for development)
      const providerType = this.configService.get<EmailProviderType>(
        'MAIL_PROVIDER',
        'mailpit'
      );
      const user = this.configService.get<string>('MAIL_USER', '');
      const password = this.configService.get<string>('MAIL_PASSWORD', '');

      // Create provider instance using Factory Pattern
      this.provider = EmailProviderFactory.create(providerType, user, password);

      // Get transporter from provider
      this.transporter = this.provider.getTransporter();

      // Get provider information
      const info = this.provider.getInfo();

      // Log provider details
      this.logger.log('═══════════════════════════════════════════════');
      this.logger.log(`✓ Email Provider: ${info.name}`);
      this.logger.log(`✓ Free Tier: ${info.freeLimit}`);
      this.logger.log(`✓ Documentation: ${info.documentation}`);
      this.logger.log('═══════════════════════════════════════════════');

      // Warning for development mode
      if (providerType === 'mailpit') {
        this.logger.warn(
          '⚠️  Using Mailpit (development mode) - Emails will NOT be sent to real addresses.'
        );
        this.logger.warn(
          '   Change MAIL_PROVIDER to "brevo" for production. See: backend/docs/EMAIL_SETUP.md'
        );
      }

      // Test connection (async, don't block startup)
      this.testProviderConnection();

    } catch (error) {
      this.logger.error('Failed to initialize email provider:', error.message);
      this.logger.error(
        'Fix your email configuration in .env file. Using fallback (emails will fail).'
      );
      // Don't throw - allow app to start but log error clearly
    }
  }

  /**
   * Test email provider connection (non-blocking)
   */
  private async testProviderConnection(): Promise<void> {
    try {
      const isConnected = await this.provider.testConnection();
      if (isConnected) {
        this.logger.log('✓ Email provider connection test passed');
      } else {
        this.logger.warn('⚠️  Email provider connection test failed');
      }
    } catch (error) {
      this.logger.warn(`⚠️  Could not verify email provider connection: ${error.message}`);
    }
  }

  /**
   * Send email with options
   * Returns the message ID from the email provider
   */
  async sendMail(options: EmailOptions): Promise<{ messageId: string; provider: string }> {
    try {
      const fromName = this.configService.get<string>('MAIL_FROM_NAME', 'Apartment Management');
      const fromEmail = this.configService.get<string>('MAIL_FROM_EMAIL', 'noreply@apartment.app');
      const from = options.from || `${fromName} <${fromEmail}>`;

      let html = options.html;

      // If template is specified, render it
      if (options.template) {
        html = await this.renderTemplate(options.template, options.context || {});
      }

      const mailOptions = {
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html,
        text: options.text,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email sent successfully: ${info.messageId}`);
      this.logger.debug(`Recipients: ${mailOptions.to}`);

      // Return message ID and provider name for logging
      return {
        messageId: info.messageId,
        provider: this.provider.getInfo().name,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Render MJML template with Handlebars
   */
  private async renderTemplate(templateName: string, context: Record<string, any>): Promise<string> {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.mjml`);

      // Check if template exists
      try {
        await fs.access(templatePath);
      } catch {
        this.logger.warn(`Template not found: ${templateName}, using fallback`);
        return this.getFallbackTemplate(templateName, context);
      }

      // Read template file
      const mjmlContent = await fs.readFile(templatePath, 'utf-8');

      // Compile with Handlebars
      const template = Handlebars.compile(mjmlContent);
      const renderedMjml = template(context);

      // Convert MJML to HTML
      const { html, errors } = mjml2html(renderedMjml, {
        validationLevel: 'soft',
      });

      if (errors && errors.length > 0) {
        this.logger.warn(`MJML errors in template ${templateName}:`, errors);
      }

      return html;
    } catch (error) {
      this.logger.error(`Error rendering template ${templateName}:`, error);
      return this.getFallbackTemplate(templateName, context);
    }
  }

  /**
   * Get fallback HTML template when MJML template is not available
   */
  private getFallbackTemplate(templateName: string, context: Record<string, any>): string {
    const appName = this.configService.get<string>('APP_NAME', 'Apartment Management');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${context.subject || 'Notification'}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4a5568; color: white; padding: 20px; text-align: center; }
            .content { background: #f7fafc; padding: 30px; }
            .footer { background: #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #718096; }
            .button { display: inline-block; padding: 12px 24px; background: #4299e1; color: white; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${appName}</h1>
            </div>
            <div class="content">
              <h2>${context.subject || 'Notification'}</h2>
              <p>${context.message || 'You have a new notification.'}</p>
              ${context.actionUrl ? `<p><a href="${context.actionUrl}" class="button">View Details</a></p>` : ''}
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send rent due reminder
   */
  async sendRentDueReminder(to: string, data: {
    tenantName: string;
    unitNumber: string;
    amount: number;
    dueDate: string;
    invoiceId: string;
  }): Promise<void> {
    await this.sendMail({
      to,
      subject: `Rent Due Soon - Unit ${data.unitNumber}`,
      template: 'rent-due-soon',
      context: data,
    });
  }

  /**
   * Send overdue rent reminder
   */
  async sendOverdueReminder(to: string, data: {
    tenantName: string;
    unitNumber: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
  }): Promise<void> {
    await this.sendMail({
      to,
      subject: `Overdue Rent Payment - Unit ${data.unitNumber}`,
      template: 'rent-overdue',
      context: data,
    });
  }

  /**
   * Send welcome message
   */
  async sendWelcomeMessage(to: string, data: {
    tenantName: string;
    unitNumber: string;
    moveInDate: string;
  }): Promise<void> {
    await this.sendMail({
      to,
      subject: `Welcome to Unit ${data.unitNumber}!`,
      template: 'tenant-welcome',
      context: data,
    });
  }

  /**
   * Send payment receipt
   */
  async sendPaymentReceipt(to: string, data: {
    tenantName: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    reference: string;
  }): Promise<void> {
    await this.sendMail({
      to,
      subject: 'Payment Receipt',
      template: 'payment-receipt',
      context: data,
    });
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection verification failed:', error);
      return false;
    }
  }
}
