import { BaseEmailProvider, SMTPConfig } from './base-email.provider';

/**
 * Mailpit Email Provider (Development Only)
 *
 * Local email testing server that catches all emails
 * Emails are NOT sent to real addresses
 *
 * Web UI: http://localhost:8025
 *
 * Author: george1806
 */
export class MailpitEmailProvider extends BaseEmailProvider {
  readonly name = 'Mailpit (Development)';
  readonly freeLimit = 'Unlimited (local only)';
  readonly documentation = 'https://github.com/axllent/mailpit';

  protected getSmtpConfig(user: string, password: string): SMTPConfig {
    return {
      host: 'mailpit',
      port: 1025,
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
    };
  }

  validate(): { valid: boolean; errors: string[] } {
    // No validation needed for Mailpit
    return { valid: true, errors: [] };
  }
}
