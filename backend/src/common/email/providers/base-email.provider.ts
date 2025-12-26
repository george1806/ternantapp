import { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';

/**
 * SMTP Configuration Interface
 * Defines the structure for SMTP server settings
 */
export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  pool?: boolean;
  maxConnections?: number;
  rateDelta?: number;
  rateLimit?: number;
  tls?: {
    rejectUnauthorized: boolean;
  };
}

/**
 * Abstract Email Provider
 *
 * Base class for all email provider implementations.
 * Each provider (Brevo, SendGrid, etc.) extends this class.
 *
 * Author: george1806
 */
export abstract class BaseEmailProvider {
  protected transporter: Transporter;

  /**
   * Provider name for logging and identification
   */
  abstract readonly name: string;

  /**
   * Free tier limits (for documentation)
   */
  abstract readonly freeLimit: string;

  /**
   * Documentation URL
   */
  abstract readonly documentation: string;

  /**
   * Get SMTP configuration for this provider
   */
  protected abstract getSmtpConfig(user: string, password: string): SMTPConfig;

  /**
   * Initialize the email transporter
   */
  initialize(user: string, password: string): void {
    const config = this.getSmtpConfig(user, password);
    this.transporter = nodemailer.createTransport(config);
  }

  /**
   * Get the nodemailer transporter
   */
  getTransporter(): Transporter {
    if (!this.transporter) {
      throw new Error(`Email provider ${this.name} not initialized. Call initialize() first.`);
    }
    return this.transporter;
  }

  /**
   * Validate provider-specific requirements
   * Override this in child classes if needed
   */
  validate(): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }

  /**
   * Get provider information for logging
   */
  getInfo(): {
    name: string;
    freeLimit: string;
    documentation: string;
  } {
    return {
      name: this.name,
      freeLimit: this.freeLimit,
      documentation: this.documentation,
    };
  }

  /**
   * Optional: Provider-specific setup (e.g., verify domain, check API key)
   * Override in child classes if needed
   */
  async setup(): Promise<void> {
    // Default: no additional setup
  }

  /**
   * Optional: Test connection to provider
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      return false;
    }
  }
}
