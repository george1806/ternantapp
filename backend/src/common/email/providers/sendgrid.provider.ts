import { BaseEmailProvider, SMTPConfig } from './base-email.provider';

/**
 * SendGrid Email Provider
 *
 * Free tier: 100 emails/day (3,000/month)
 * Industry standard with excellent deliverability
 *
 * Configuration:
 * - MAIL_USER: Always use "apikey" (literal string)
 * - MAIL_PASSWORD: Your SendGrid API key
 *
 * Setup:
 * 1. Sign up at https://sendgrid.com/
 * 2. Verify your email
 * 3. Go to Settings → API Keys
 * 4. Create API key with "Mail Send" permissions
 * 5. Set MAIL_USER=apikey
 * 6. Set MAIL_PASSWORD to your API key (starts with SG.)
 *
 * Author: george1806
 */
export class SendGridEmailProvider extends BaseEmailProvider {
  readonly name = 'SendGrid';
  readonly freeLimit = '100 emails/day (3,000/month)';
  readonly documentation = 'https://docs.sendgrid.com/';

  protected getSmtpConfig(user: string, password: string): SMTPConfig {
    return {
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey', // Always 'apikey' for SendGrid
        pass: password,
      },
    };
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const user = process.env.MAIL_USER;
    const password = process.env.MAIL_PASSWORD;

    if (!password) {
      errors.push('MAIL_PASSWORD is required (your SendGrid API key)');
    } else if (!password.startsWith('SG.')) {
      errors.push('MAIL_PASSWORD should be a SendGrid API key (starts with "SG.")');
    }

    if (user && user !== 'apikey') {
      errors.push('MAIL_USER should be "apikey" for SendGrid (or leave empty)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
