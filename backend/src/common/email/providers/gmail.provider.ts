import { BaseEmailProvider, SMTPConfig } from './base-email.provider';

/**
 * Gmail SMTP Provider
 *
 * Free tier: 500 emails/day
 * For personal use and testing only
 *
 * Configuration:
 * - MAIL_USER: Your Gmail address
 * - MAIL_PASSWORD: App Password (NOT your Gmail password)
 *
 * Setup:
 * 1. Go to https://myaccount.google.com/
 * 2. Security → 2-Step Verification (enable if not enabled)
 * 3. Security → App Passwords
 * 4. Generate password for "Mail"
 * 5. Use your Gmail address as MAIL_USER
 * 6. Use generated 16-character password as MAIL_PASSWORD
 *
 * WARNING: Not recommended for production use. Use Brevo or SendGrid instead.
 *
 * Author: george1806
 */
export class GmailEmailProvider extends BaseEmailProvider {
  readonly name = 'Gmail SMTP';
  readonly freeLimit = '500 emails/day';
  readonly documentation = 'https://support.google.com/mail/answer/7126229';

  protected getSmtpConfig(user: string, password: string): SMTPConfig {
    return {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user,
        pass: password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    };
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const user = process.env.MAIL_USER;
    const password = process.env.MAIL_PASSWORD;

    if (!user) {
      errors.push('MAIL_USER is required (your Gmail address)');
    } else if (!user.includes('@gmail.com') && !user.includes('@googlemail.com')) {
      errors.push('MAIL_USER should be a Gmail address');
    }

    if (!password) {
      errors.push('MAIL_PASSWORD is required (App Password, not Gmail password)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
