/**
 * Email Options Interface
 * Defines the structure for sending emails
 *
 * Author: george1806
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  path?: string;
  content?: Buffer | string;
  contentType?: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  mjml: string;
}
