import { BaseEmailProvider } from './base-email.provider';
import { BrevoEmailProvider } from './brevo.provider';
import { MailpitEmailProvider } from './mailpit.provider';
import { SendGridEmailProvider } from './sendgrid.provider';
import { GmailEmailProvider } from './gmail.provider';

/**
 * Email Provider Factory
 *
 * Creates the appropriate email provider instance based on configuration.
 * Implements the Factory Pattern for email providers.
 *
 * Usage:
 * ```typescript
 * const provider = EmailProviderFactory.create('brevo', user, password);
 * provider.initialize(user, password);
 * const transporter = provider.getTransporter();
 * ```
 *
 * Author: george1806
 */

export type EmailProviderType =
  | 'mailpit'      // Development only
  | 'brevo'        // Recommended (300/day)
  | 'sendgrid'     // Industry standard (100/day)
  | 'gmail'        // Personal use (500/day)
  | 'resend'       // Coming soon
  | 'mailgun'      // Coming soon
  | 'aws-ses'      // Coming soon
  | 'postmark';    // Coming soon

export class EmailProviderFactory {
  /**
   * Create email provider instance
   */
  static create(
    providerType: EmailProviderType,
    user: string = '',
    password: string = ''
  ): BaseEmailProvider {

    let provider: BaseEmailProvider;

    switch (providerType) {
      case 'mailpit':
        provider = new MailpitEmailProvider();
        break;

      case 'brevo':
        provider = new BrevoEmailProvider();
        break;

      case 'sendgrid':
        provider = new SendGridEmailProvider();
        break;

      case 'gmail':
        provider = new GmailEmailProvider();
        break;

      // Coming soon - Add more providers here
      case 'resend':
      case 'mailgun':
      case 'aws-ses':
      case 'postmark':
        throw new Error(
          `Provider "${providerType}" is not yet implemented. ` +
          `Available providers: mailpit, brevo, sendgrid, gmail`
        );

      default:
        throw new Error(
          `Unknown email provider: "${providerType}". ` +
          `Available providers: mailpit, brevo, sendgrid, gmail`
        );
    }

    // Initialize the provider
    provider.initialize(user, password);

    // Validate provider configuration
    const validation = provider.validate();
    if (!validation.valid) {
      throw new Error(
        `Email provider "${providerType}" validation failed:\n` +
        validation.errors.map(err => `  - ${err}`).join('\n')
      );
    }

    return provider;
  }

  /**
   * Get list of available providers
   */
  static getAvailableProviders(): EmailProviderType[] {
    return ['mailpit', 'brevo', 'sendgrid', 'gmail'];
  }

  /**
   * Get provider recommendations
   */
  static getRecommendation(): {
    development: EmailProviderType;
    production: EmailProviderType;
    personal: EmailProviderType;
  } {
    return {
      development: 'mailpit',
      production: 'brevo',
      personal: 'gmail',
    };
  }
}
