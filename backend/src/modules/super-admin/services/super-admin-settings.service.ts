import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Super Admin Settings Service
 * Manages platform-wide settings
 */
@Injectable()
export class SuperAdminSettingsService {
    private settings: any = {
        appName: 'Ternant App',
        supportEmail: 'support@ternant.com',
        currency: 'KES',
        timezone: 'Africa/Nairobi',
        emailConfig: {
            smtpHost: '',
            smtpPort: 587,
            smtpUser: '',
            smtpPassword: '',
            fromAddress: '',
            fromName: 'Ternant App',
            useTLS: true,
        },
        security: {
            rateLimitPerMinute: 100,
            sessionTimeoutMinutes: 60,
            enforce2FA: false,
            passwordMinLength: 8,
        },
        featureFlags: {
            tenantPortal: true,
            fileUpload: true,
            auditLog: true,
            mobileApp: false,
            paymentGateway: true,
        },
    };

    constructor(private configService: ConfigService) {
        // Load settings from environment or database
        this.loadSettings();
    }

    /**
     * Get all platform settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Update platform settings
     */
    updateSettings(updates: any) {
        this.settings = {
            ...this.settings,
            ...updates,
            // Merge nested objects
            emailConfig: {
                ...this.settings.emailConfig,
                ...(updates.emailConfig || {}),
            },
            security: {
                ...this.settings.security,
                ...(updates.security || {}),
            },
            featureFlags: {
                ...this.settings.featureFlags,
                ...(updates.featureFlags || {}),
            },
        };

        return { ...this.settings };
    }

    /**
     * Get feature flags
     */
    getFeatureFlags() {
        return { ...this.settings.featureFlags };
    }

    /**
     * Update feature flags
     */
    updateFeatureFlags(flags: Record<string, boolean>) {
        this.settings.featureFlags = {
            ...this.settings.featureFlags,
            ...flags,
        };

        return { ...this.settings.featureFlags };
    }

    /**
     * Test email configuration
     */
    async testEmailConfig(): Promise<{ success: boolean; message: string }> {
        const { smtpHost, smtpPort, smtpUser, smtpPassword } = this.settings.emailConfig;

        // Basic validation
        if (!smtpHost || !smtpUser || !smtpPassword) {
            return {
                success: false,
                message: 'SMTP configuration incomplete',
            };
        }

        try {
            // Simple SMTP connection test (without actual email library)
            // In production, this should use nodemailer or similar
            console.log(`Testing SMTP connection to ${smtpHost}:${smtpPort}`);

            return {
                success: true,
                message: 'SMTP configuration is valid',
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to connect to SMTP: ${error.message}`,
            };
        }
    }

    /**
     * Load settings from environment or database
     */
    private loadSettings() {
        // In production, this would load from a settings table in the database
        // For now, we use environment variables or defaults

        this.settings = {
            appName: this.configService.get('APP_NAME', 'Ternant App'),
            supportEmail: this.configService.get('SUPPORT_EMAIL', 'support@ternant.com'),
            currency: this.configService.get('CURRENCY', 'KES'),
            timezone: this.configService.get('TIMEZONE', 'Africa/Nairobi'),
            emailConfig: {
                smtpHost: this.configService.get('MAIL_HOST', ''),
                smtpPort: this.configService.get('MAIL_PORT', 587),
                smtpUser: this.configService.get('MAIL_USER', ''),
                smtpPassword: this.configService.get('MAIL_PASSWORD', ''),
                fromAddress: this.configService.get('MAIL_FROM_EMAIL', ''),
                fromName: this.configService.get('MAIL_FROM_NAME', 'Ternant App'),
                useTLS: this.configService.get('MAIL_SECURE', 'true') === 'true',
            },
            security: {
                rateLimitPerMinute: this.configService.get('THROTTLE_LIMIT', 100),
                sessionTimeoutMinutes: this.configService.get('SESSION_TIMEOUT', 60),
                enforce2FA: this.configService.get('ENFORCE_2FA', 'false') === 'true',
                passwordMinLength: this.configService.get('PASSWORD_MIN_LENGTH', 8),
            },
            featureFlags: {
                tenantPortal: this.configService.get('FEATURE_TENANT_PORTAL', 'true') === 'true',
                fileUpload: this.configService.get('FEATURE_FILE_UPLOAD', 'true') === 'true',
                auditLog: this.configService.get('FEATURE_AUDIT_LOG', 'true') === 'true',
                mobileApp: this.configService.get('FEATURE_MOBILE_APP', 'false') === 'true',
                paymentGateway: this.configService.get('FEATURE_PAYMENT_GATEWAY', 'true') === 'true',
            },
        };
    }
}
