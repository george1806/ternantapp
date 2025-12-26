import { BaseEmailProvider, SMTPConfig } from './base-email.provider';

/**
 * Brevo (Sendinblue) Email Provider
 *
 * Free tier: 300 emails/day (9,000/month)
 * Best overall free option
 *
 * Configuration:
 * - MAIL_USER: Your email address (used for login)
 * - MAIL_PASSWORD: Your SMTP key from Brevo dashboard
 *
 * Setup:
 * 1. Sign up at https://www.brevo.com/
 * 2. Go to Settings → SMTP & API
 * 3. Create new SMTP key
 * 4. Use your login email as MAIL_USER
 * 5. Use generated SMTP key as MAIL_PASSWORD
 *
 * Author: george1806
 */
export class BrevoEmailProvider extends BaseEmailProvider {
  readonly name = 'Brevo (Sendinblue)';
  readonly freeLimit = '300 emails/day (9,000/month)';
  readonly documentation = 'https://developers.brevo.com/';

  protected getSmtpConfig(user: string, password: string): SMTPConfig {
    return {
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user,
        pass: password,
      },
      pool: true,
      maxConnections: 5,
      rateDelta: 1000,
      rateLimit: 5, // 5 emails per second
    };
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!process.env.MAIL_USER) {
      errors.push('MAIL_USER is required (your Brevo login email)');
    }

    if (!process.env.MAIL_PASSWORD) {
      errors.push('MAIL_PASSWORD is required (your Brevo SMTP key)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
