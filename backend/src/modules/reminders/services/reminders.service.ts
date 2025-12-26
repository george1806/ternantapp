import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual, Between, DeepPartial } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Reminder } from '../entities/reminder.entity';
import { CreateReminderDto } from '../dto/create-reminder.dto';
import { UpdateReminderDto } from '../dto/update-reminder.dto';
import { QueryReminderDto } from '../dto/query-reminder.dto';
import { ReminderStatus, ReminderType } from '../../../common/enums';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { ReminderSettingsService } from './reminder-settings.service';
import { ReminderLogService } from './reminder-log.service';

/**
 * Reminders Service
 * Business logic for managing reminder notifications
 *
 * Features:
 * - CRUD operations for reminders
 * - Automatic reminder scheduling for due/overdue invoices
 * - Queue integration for async notification sending
 * - Cron jobs for periodic reminder checks (with configurable settings)
 * - Grace period and weekend skip logic
 * - Escalation levels for overdue reminders
 *
 * Author: george1806
 */
@Injectable()
export class RemindersService {
    private readonly logger = new Logger(RemindersService.name);

    constructor(
        @InjectRepository(Reminder)
        private readonly reminderRepository: Repository<Reminder>,
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
        @InjectRepository(Tenant)
        private readonly tenantRepository: Repository<Tenant>,
        @InjectQueue('reminders')
        private readonly reminderQueue: Queue,
        private readonly configService: ConfigService,
        private readonly settingsService: ReminderSettingsService,
        private readonly logService: ReminderLogService,
    ) {}

    /**
     * Find all reminders with optional filtering
     */
    async findAll(companyId: string, query?: QueryReminderDto): Promise<Reminder[]> {
        const where: any = { companyId };

        if (query?.type) where.type = query.type;
        if (query?.status) where.status = query.status;
        if (query?.tenantId) where.tenantId = query.tenantId;
        if (query?.invoiceId) where.invoiceId = query.invoiceId;

        if (query?.scheduledFrom && query?.scheduledTo) {
            where.scheduledFor = Between(
                new Date(query.scheduledFrom),
                new Date(query.scheduledTo)
            );
        } else if (query?.scheduledFrom) {
            where.scheduledFor = MoreThanOrEqual(new Date(query.scheduledFrom));
        }

        return this.reminderRepository.find({
            where,
            relations: ['tenant', 'invoice'],
            order: { scheduledFor: 'DESC' }
        });
    }

    /**
     * Find a single reminder by ID
     */
    async findOne(id: string, companyId: string): Promise<Reminder> {
        const reminder = await this.reminderRepository.findOne({
            where: { id, companyId },
            relations: ['tenant', 'invoice']
        });

        if (!reminder) {
            throw new NotFoundException(`Reminder with ID ${id} not found`);
        }

        return reminder;
    }

    /**
     * Create a new reminder and optionally queue it
     */
    async create(companyId: string, dto: CreateReminderDto): Promise<Reminder> {
        // Verify tenant exists
        const tenant = await this.tenantRepository.findOne({
            where: { id: dto.tenantId, companyId }
        });

        if (!tenant) {
            throw new NotFoundException(`Tenant with ID ${dto.tenantId} not found`);
        }

        // Create reminder
        const reminder = this.reminderRepository.create({
            ...dto,
            companyId,
            recipient: dto.recipient || tenant.email
        });

        const saved = await this.reminderRepository.save(reminder);

        // Queue for sending if scheduled for now or past
        const now = new Date();
        const scheduledTime = new Date(dto.scheduledFor);

        if (scheduledTime <= now) {
            await this.queueReminder(saved);
        } else {
            // Schedule for future delivery
            const delay = scheduledTime.getTime() - now.getTime();
            await this.queueReminder(saved, delay);
        }

        this.logger.log(`Reminder created and queued: ${saved.id}`);
        return saved;
    }

    /**
     * Update an existing reminder
     */
    async update(
        id: string,
        companyId: string,
        dto: UpdateReminderDto
    ): Promise<Reminder> {
        const reminder = await this.findOne(id, companyId);

        Object.assign(reminder, dto);
        return this.reminderRepository.save(reminder);
    }

    /**
     * Delete a reminder
     */
    async remove(id: string, companyId: string): Promise<void> {
        const reminder = await this.findOne(id, companyId);
        await this.reminderRepository.remove(reminder);
        this.logger.log(`Reminder deleted: ${id}`);
    }

    /**
     * Mark reminder as sent
     */
    async markAsSent(
        id: string,
        companyId: string,
        messageId?: string,
        provider?: string
    ): Promise<Reminder> {
        const reminder = await this.findOne(id, companyId);
        reminder.status = ReminderStatus.SENT;
        reminder.sentAt = new Date();

        // Update audit log
        if (messageId && provider) {
            await this.logService.logSent(id, messageId, provider);
        }

        return this.reminderRepository.save(reminder);
    }

    /**
     * Mark reminder as failed with error message
     */
    async markAsFailed(
        id: string,
        companyId: string,
        errorMessage: string
    ): Promise<Reminder> {
        const reminder = await this.findOne(id, companyId);
        reminder.status = ReminderStatus.FAILED;
        reminder.errorMessage = errorMessage;
        reminder.retryCount += 1;

        // Update audit log
        await this.logService.logFailed(id, errorMessage);

        return this.reminderRepository.save(reminder);
    }

    /**
     * Queue a reminder for sending
     */
    private async queueReminder(reminder: Reminder, delay: number = 0): Promise<void> {
        const job = await this.reminderQueue.add(
            'send-reminder',
            {
                type: reminder.type,
                companyId: reminder.companyId,
                reminderId: reminder.id,
                tenantId: reminder.tenantId,
                invoiceId: reminder.invoiceId,
                subject: reminder.subject,
                message: reminder.message,
                recipient: reminder.recipient,
                metadata: reminder.metadata
            },
            {
                delay,
                attempts: this.configService.get<number>('QUEUE_JOB_ATTEMPTS', 3),
                backoff: {
                    type: 'exponential',
                    delay: this.configService.get<number>(
                        'QUEUE_JOB_BACKOFF_DELAY',
                        60000
                    )
                },
                removeOnComplete: {
                    age: this.configService.get<number>('QUEUE_COMPLETED_JOB_AGE', 86400),
                    count: 1000
                },
                removeOnFail: {
                    age: this.configService.get<number>('QUEUE_FAILED_JOB_AGE', 604800)
                }
            }
        );

        // Update metadata with job ID
        reminder.metadata = {
            ...reminder.metadata,
            emailJobId: job.id
        };
        await this.reminderRepository.save(reminder);

        // Create audit log entry
        await this.logService.logQueued(
            reminder.companyId,
            reminder.id,
            reminder.type,
            reminder.recipient,
            reminder.subject,
            reminder.metadata,
        );

        this.logger.debug(`Reminder queued: ${reminder.id}, Job ID: ${job.id}`);
    }

    /**
     * CRON: Check for due invoices and create reminders
     * Runs daily at 9 AM (configurable per company via settings)
     */
    @Cron(CronExpression.EVERY_DAY_AT_9AM)
    async checkDueInvoices(): Promise<void> {
        this.logger.log('Running scheduled check for due invoices...');

        try {
            // Get all unique companies with invoices
            const companies = await this.invoiceRepository
                .createQueryBuilder('invoice')
                .select('DISTINCT invoice.companyId', 'companyId')
                .getRawMany();

            for (const { companyId } of companies) {
                await this.checkDueInvoicesForCompany(companyId);
            }

            this.logger.log('Due invoice check completed for all companies');
        } catch (error) {
            this.logger.error('Error checking due invoices:', error);
        }
    }

    /**
     * Check due invoices for a specific company (respects company settings)
     */
    private async checkDueInvoicesForCompany(companyId: string): Promise<void> {
        const settings = await this.settingsService.getSettings(companyId);

        // Skip if due soon reminders are disabled
        if (!settings.dueSoonConfig.enabled) {
            this.logger.debug(`Due soon reminders disabled for company ${companyId}`);
            return;
        }

        // Skip if today is a weekend and skip weekends is enabled
        const today = new Date();
        if (await this.settingsService.shouldSkipDate(companyId, today)) {
            this.logger.debug(`Skipping due invoice check for company ${companyId} (weekend)`);
            return;
        }

        const dueSoonDays = settings.dueSoonConfig.daysBeforeDue;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dueSoonDays);
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Find invoices due in X days (based on settings)
        const dueInvoices = await this.invoiceRepository.find({
            where: {
                companyId,
                status: 'sent',
                dueDate: Between(targetDate, nextDay),
            },
            relations: ['occupancy', 'occupancy.tenant', 'occupancy.apartment'],
        });

        this.logger.log(
            `Found ${dueInvoices.length} invoices due in ${dueSoonDays} days for company ${companyId}`,
        );

        for (const invoice of dueInvoices) {
            // Skip if invoice is already paid (based on business rules)
            if (settings.businessRules.skipIfPaid && invoice.status === 'paid') {
                continue;
            }

            // Check if reminder already sent
            const existingReminder = await this.reminderRepository.findOne({
                where: {
                    companyId: invoice.companyId,
                    invoiceId: invoice.id,
                    type: ReminderType.DUE_SOON,
                    status: ReminderStatus.SENT,
                },
            });

            if (!existingReminder) {
                await this.create(invoice.companyId, {
                    type: ReminderType.DUE_SOON,
                    tenantId: invoice.occupancy.tenantId,
                    invoiceId: invoice.id,
                    subject: `Rent Due Soon - Unit ${invoice.occupancy.apartment.unitNumber}`,
                    message: `Dear ${invoice.occupancy.tenant.firstName}, your rent for Unit ${invoice.occupancy.apartment.unitNumber} is due on ${invoice.dueDate.toLocaleDateString()}. Amount: ${invoice.totalAmount}.`,
                    scheduledFor: new Date(),
                    metadata: {
                        templateName: 'rent-due-soon',
                        apartmentCode: invoice.occupancy.apartment.unitNumber,
                        amount: invoice.totalAmount,
                        dueDate: invoice.dueDate,
                    },
                });
            }
        }
    }

    /**
     * CRON: Check for overdue invoices and create escalation reminders
     * Runs daily at 10 AM (configurable per company via settings)
     */
    @Cron(CronExpression.EVERY_DAY_AT_10AM)
    async checkOverdueInvoices(): Promise<void> {
        this.logger.log('Running scheduled check for overdue invoices...');

        try {
            // Get all unique companies with invoices
            const companies = await this.invoiceRepository
                .createQueryBuilder('invoice')
                .select('DISTINCT invoice.companyId', 'companyId')
                .getRawMany();

            for (const { companyId } of companies) {
                await this.checkOverdueInvoicesForCompany(companyId);
            }

            this.logger.log('Overdue invoice check completed for all companies');
        } catch (error) {
            this.logger.error('Error checking overdue invoices:', error);
        }
    }

    /**
     * Check overdue invoices for a specific company (respects escalation levels)
     */
    private async checkOverdueInvoicesForCompany(companyId: string): Promise<void> {
        const settings = await this.settingsService.getSettings(companyId);

        // Skip if overdue reminders are disabled
        if (!settings.overdueConfig.enabled) {
            this.logger.debug(`Overdue reminders disabled for company ${companyId}`);
            return;
        }

        // Skip if today is a weekend and skip weekends is enabled
        const today = new Date();
        if (await this.settingsService.shouldSkipDate(companyId, today)) {
            this.logger.debug(`Skipping overdue invoice check for company ${companyId} (weekend)`);
            return;
        }

        const enabledLevels = await this.settingsService.getEnabledEscalationLevels(companyId);
        if (enabledLevels.length === 0) {
            this.logger.debug(`No enabled escalation levels for company ${companyId}`);
            return;
        }

        today.setHours(0, 0, 0, 0);

        // Add grace period to due date
        const gracePeriodDays = settings.businessRules.gracePeriodDays;

        // Find overdue invoices
        const overdueInvoices = await this.invoiceRepository.find({
            where: {
                companyId,
                status: 'overdue',
                dueDate: LessThan(today),
            },
            relations: ['occupancy', 'occupancy.tenant', 'occupancy.apartment'],
        });

        this.logger.log(`Found ${overdueInvoices.length} overdue invoices for company ${companyId}`);

        for (const invoice of overdueInvoices) {
            // Skip if invoice is already paid (based on business rules)
            if (settings.overdueConfig.stopIfPaid && invoice.status === 'paid') {
                continue;
            }

            // Calculate days overdue (including grace period)
            const dueDateWithGrace = new Date(invoice.dueDate);
            dueDateWithGrace.setDate(dueDateWithGrace.getDate() + gracePeriodDays);

            const daysOverdue = Math.floor(
                (today.getTime() - dueDateWithGrace.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (daysOverdue < 0) {
                // Still in grace period
                continue;
            }

            // Check which escalation level applies
            const applicableLevel = enabledLevels.find(
                (level) => level.daysAfterDue === daysOverdue,
            );

            if (!applicableLevel) {
                // No escalation level for this exact day
                continue;
            }

            // Count existing overdue reminders
            const reminderCount = await this.reminderRepository.count({
                where: {
                    companyId: invoice.companyId,
                    invoiceId: invoice.id,
                    type: ReminderType.OVERDUE,
                    status: ReminderStatus.SENT,
                },
            });

            // Check max escalations
            if (reminderCount >= settings.overdueConfig.maxEscalations) {
                this.logger.debug(
                    `Max escalations (${settings.overdueConfig.maxEscalations}) reached for invoice ${invoice.id}`,
                );
                continue;
            }

            // Check if reminder already sent for this escalation level
            const existingReminder = await this.reminderRepository.findOne({
                where: {
                    companyId: invoice.companyId,
                    invoiceId: invoice.id,
                    type: ReminderType.OVERDUE,
                },
                order: { sentAt: 'DESC' },
            });

            const lastReminderDays = existingReminder
                ? Math.floor(
                      (today.getTime() - existingReminder.sentAt.getTime()) / (1000 * 60 * 60 * 24),
                  )
                : null;

            // Skip if already sent reminder for this level today
            if (lastReminderDays !== null && lastReminderDays < 1) {
                continue;
            }

            // Create reminder with escalation template
            await this.create(invoice.companyId, {
                type: ReminderType.OVERDUE,
                tenantId: invoice.occupancy.tenantId,
                invoiceId: invoice.id,
                subject: `Overdue Rent - Unit ${invoice.occupancy.apartment.unitNumber}`,
                message: `Dear ${invoice.occupancy.tenant.firstName}, your rent for Unit ${invoice.occupancy.apartment.unitNumber} is overdue. Due date was ${invoice.dueDate.toLocaleDateString()}. Amount: ${invoice.totalAmount}. Please settle this as soon as possible.`,
                scheduledFor: new Date(),
                metadata: {
                    templateName: `rent-overdue-${applicableLevel.templateType}`,
                    apartmentCode: invoice.occupancy.apartment.unitNumber,
                    amount: invoice.totalAmount,
                    dueDate: invoice.dueDate,
                    daysOverdue,
                    escalationLevel: applicableLevel.templateType,
                    reminderCount: reminderCount + 1,
                },
            });

            this.logger.log(
                `Created ${applicableLevel.templateType} reminder for invoice ${invoice.id} (${daysOverdue} days overdue)`,
            );
        }
    }

    /**
     * Send a welcome message to a new tenant
     */
    async sendWelcomeMessage(
        companyId: string,
        tenantId: string,
        apartmentCode: string
    ): Promise<Reminder> {
        const tenant = await this.tenantRepository.findOne({
            where: { id: tenantId, companyId }
        });

        if (!tenant) {
            throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
        }

        return this.create(companyId, {
            type: ReminderType.WELCOME,
            tenantId,
            subject: `Welcome to ${apartmentCode}`,
            message: `Dear ${tenant.firstName}, welcome to your new apartment ${apartmentCode}! We're glad to have you. If you have any questions, please don't hesitate to contact us.`,
            scheduledFor: new Date(),
            metadata: {
                templateName: 'tenant-welcome',
                apartmentCode
            }
        });
    }

    /**
     * Send a payment receipt notification
     */
    async sendPaymentReceipt(
        companyId: string,
        tenantId: string,
        invoiceId: string,
        amount: number,
        currency: string
    ): Promise<Reminder> {
        const tenant = await this.tenantRepository.findOne({
            where: { id: tenantId, companyId }
        });

        if (!tenant) {
            throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
        }

        return this.create(companyId, {
            type: ReminderType.RECEIPT,
            tenantId,
            invoiceId,
            subject: 'Payment Receipt',
            message: `Dear ${tenant.firstName}, we have received your payment of ${currency} ${amount}. Thank you for your payment!`,
            scheduledFor: new Date(),
            metadata: {
                templateName: 'payment-receipt',
                amount,
                currency
            }
        });
    }

    /**
     * TESTING: Force send a reminder immediately
     * Bypasses queue delay and processes the reminder right away
     */
    async sendNow(id: string, companyId: string): Promise<Reminder> {
        const reminder = await this.findOne(id, companyId);

        if (!reminder) {
            throw new NotFoundException(`Reminder with ID ${id} not found`);
        }

        if (reminder.status === ReminderStatus.SENT) {
            this.logger.warn(`Reminder ${id} already sent, re-queuing...`);
        }

        // Queue with 0 delay (immediate processing)
        await this.queueReminder(reminder, 0);

        this.logger.log(`Reminder ${id} queued for immediate sending`);

        return reminder;
    }

    /**
     * TESTING: Create a test reminder with sample data
     * Useful for testing email templates and delivery
     */
    async createTestReminder(
        companyId: string,
        type: 'DUE_SOON' | 'OVERDUE' | 'WELCOME' | 'RECEIPT',
        recipient: string
    ): Promise<any> {
        this.logger.log(`Creating test reminder of type ${type} for ${recipient}`);

        const sampleData = {
            DUE_SOON: {
                subject: 'TEST: Rent Due Soon - Unit 101',
                message: 'This is a test reminder for rent due soon.',
                metadata: {
                    templateName: 'rent-due-soon',
                    tenantName: 'Test Tenant',
                    unitNumber: '101',
                    amount: '1500.00',
                    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                    paymentUrl: 'https://example.com/invoices/test',
                    year: new Date().getFullYear()
                }
            },
            OVERDUE: {
                subject: 'TEST: Overdue Rent Payment - Unit 101',
                message: 'This is a test reminder for overdue rent.',
                metadata: {
                    templateName: 'rent-overdue',
                    tenantName: 'Test Tenant',
                    unitNumber: '101',
                    amount: '1500.00',
                    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                    daysOverdue: 5,
                    paymentUrl: 'https://example.com/invoices/test',
                    year: new Date().getFullYear()
                }
            },
            WELCOME: {
                subject: 'TEST: Welcome to Your New Home - Unit 101',
                message: 'This is a test welcome message.',
                metadata: {
                    templateName: 'tenant-welcome',
                    tenantName: 'Test Tenant',
                    unitNumber: '101',
                    propertyName: 'Test Property',
                    moveInDate: new Date().toLocaleDateString(),
                    monthlyRent: '1500.00',
                    emergencyContact: '555-0123',
                    portalUrl: 'https://example.com/portal',
                    year: new Date().getFullYear()
                }
            },
            RECEIPT: {
                subject: 'TEST: Payment Receipt - Unit 101',
                message: 'This is a test payment receipt.',
                metadata: {
                    templateName: 'payment-receipt',
                    tenantName: 'Test Tenant',
                    unitNumber: '101',
                    receiptNumber: 'REC-TEST-001',
                    paymentDate: new Date().toLocaleDateString(),
                    amount: '1500.00',
                    paymentMethod: 'Bank Transfer',
                    reference: 'TEST-REF-123',
                    invoiceNumber: 'INV-TEST-001',
                    invoiceTotal: '1500.00',
                    remainingBalance: '0.00',
                    receiptUrl: 'https://example.com/receipts/test',
                    year: new Date().getFullYear()
                }
            }
        };

        const data = sampleData[type];

        // Create reminder entity with proper typing using DeepPartial
        const reminderData: DeepPartial<Reminder> = {
            companyId,
            type: ReminderType[type],
            subject: data.subject,
            message: data.message,
            recipient,
            status: ReminderStatus.PENDING,
            scheduledFor: new Date(),
            metadata: data.metadata,
            retryCount: 0
        };

        // Save to database
        const reminder = await this.reminderRepository.save(reminderData);

        // Queue for immediate sending
        await this.queueReminder(reminder, 0);

        this.logger.log(`Test reminder created and queued: ${reminder.id}`);

        return {
            message: 'Test reminder created and queued for immediate sending',
            reminder,
            recipient,
            type
        };
    }

    /**
     * Preview a reminder without sending
     * Returns rendered content for review
     */
    async previewReminder(id: string, companyId: string): Promise<any> {
        const reminder = await this.findOne(id, companyId);

        // Build preview response
        return {
            id: reminder.id,
            type: reminder.type,
            subject: reminder.subject,
            message: reminder.message,
            recipient: reminder.recipient,
            scheduledFor: reminder.scheduledFor,
            metadata: reminder.metadata,
            textPreview: reminder.message,
            // TODO: Add HTML preview when email templates are implemented
            htmlPreview: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>${reminder.subject}</h2>
                <p>${reminder.message.replace(/\n/g, '<br>')}</p>
                ${reminder.metadata ? `<pre>${JSON.stringify(reminder.metadata, null, 2)}</pre>` : ''}
            </div>`,
        };
    }

    /**
     * Batch send reminders based on criteria
     * Supports dry-run mode for testing
     */
    async sendBatchReminders(companyId: string, dto: any): Promise<any> {
        this.logger.log(`Starting batch send for company ${companyId}, type: ${dto.type}`);

        const results = {
            success: true,
            message: '',
            totalEligible: 0,
            totalQueued: 0,
            totalSkipped: 0,
            reminders: [] as any[],
            skippedReasons: {} as Record<string, number>,
        };

        try {
            // Build query based on reminder type
            let invoices: Invoice[] = [];

            if (dto.type === ReminderType.DUE_SOON) {
                // Get settings
                const settings = await this.settingsService.getSettings(companyId);
                if (!settings.dueSoonConfig.enabled) {
                    results.message = 'Due soon reminders are disabled in settings';
                    results.success = false;
                    return results;
                }

                const daysBeforeDue = settings.dueSoonConfig.daysBeforeDue;
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + daysBeforeDue);

                const queryBuilder = this.invoiceRepository
                    .createQueryBuilder('invoice')
                    .leftJoinAndSelect('invoice.occupancy', 'occupancy')
                    .leftJoinAndSelect('occupancy.tenant', 'tenant')
                    .leftJoinAndSelect('occupancy.apartment', 'apartment')
                    .where('invoice.companyId = :companyId', { companyId })
                    .andWhere('invoice.status = :status', { status: 'pending' })
                    .andWhere('invoice.dueDate = :targetDate', { targetDate });

                // Apply filters if provided
                if (dto.apartmentIds && dto.apartmentIds.length > 0) {
                    queryBuilder.andWhere('apartment.id IN (:...apartmentIds)', {
                        apartmentIds: dto.apartmentIds,
                    });
                }

                if (dto.tenantIds && dto.tenantIds.length > 0) {
                    queryBuilder.andWhere('tenant.id IN (:...tenantIds)', {
                        tenantIds: dto.tenantIds,
                    });
                }

                invoices = await queryBuilder.getMany();
            } else if (dto.type === ReminderType.OVERDUE) {
                // Get settings
                const settings = await this.settingsService.getSettings(companyId);
                if (!settings.overdueConfig.enabled) {
                    results.message = 'Overdue reminders are disabled in settings';
                    results.success = false;
                    return results;
                }

                const queryBuilder = this.invoiceRepository
                    .createQueryBuilder('invoice')
                    .leftJoinAndSelect('invoice.occupancy', 'occupancy')
                    .leftJoinAndSelect('occupancy.tenant', 'tenant')
                    .leftJoinAndSelect('occupancy.apartment', 'apartment')
                    .where('invoice.companyId = :companyId', { companyId })
                    .andWhere('invoice.status = :status', { status: 'pending' })
                    .andWhere('invoice.dueDate < :today', { today: new Date() });

                // Apply filters
                if (dto.apartmentIds && dto.apartmentIds.length > 0) {
                    queryBuilder.andWhere('apartment.id IN (:...apartmentIds)', {
                        apartmentIds: dto.apartmentIds,
                    });
                }

                if (dto.tenantIds && dto.tenantIds.length > 0) {
                    queryBuilder.andWhere('tenant.id IN (:...tenantIds)', {
                        tenantIds: dto.tenantIds,
                    });
                }

                invoices = await queryBuilder.getMany();
            }

            results.totalEligible = invoices.length;

            // Process each invoice
            for (const invoice of invoices) {
                try {
                    // Check if reminder already exists
                    const existing = await this.reminderRepository.findOne({
                        where: {
                            companyId,
                            invoiceId: invoice.id,
                            type: dto.type,
                            status: ReminderStatus.PENDING,
                        },
                    });

                    if (existing) {
                        results.totalSkipped++;
                        this.incrementSkipReason(results.skippedReasons, 'Already queued');
                        continue;
                    }

                    // Build reminder data
                    const reminderData = {
                        type: dto.type,
                        tenantId: invoice.occupancy.tenantId,
                        invoiceId: invoice.id,
                        subject:
                            dto.type === ReminderType.DUE_SOON
                                ? `Rent Due Soon - Unit ${invoice.occupancy.apartment.unitNumber}`
                                : `Overdue Rent - Unit ${invoice.occupancy.apartment.unitNumber}`,
                        message:
                            dto.type === ReminderType.DUE_SOON
                                ? `Dear ${invoice.occupancy.tenant.firstName}, your rent for Unit ${invoice.occupancy.apartment.unitNumber} is due on ${invoice.dueDate.toLocaleDateString()}. Amount: ${invoice.totalAmount}.`
                                : `Dear ${invoice.occupancy.tenant.firstName}, your rent for Unit ${invoice.occupancy.apartment.unitNumber} is overdue. Due date was ${invoice.dueDate.toLocaleDateString()}. Amount: ${invoice.totalAmount}.`,
                        scheduledFor: new Date(),
                        metadata: {
                            templateName:
                                dto.type === ReminderType.DUE_SOON
                                    ? 'rent-due-soon'
                                    : 'rent-overdue-gentle',
                            apartmentCode: invoice.occupancy.apartment.unitNumber,
                            amount: invoice.totalAmount,
                            dueDate: invoice.dueDate,
                        },
                    };

                    if (dto.dryRun) {
                        // Dry run - just add to results without creating
                        results.reminders.push({
                            id: 'dry-run',
                            tenantName: `${invoice.occupancy.tenant.firstName} ${invoice.occupancy.tenant.lastName}`,
                            recipient: invoice.occupancy.tenant.email,
                            subject: reminderData.subject,
                            status: 'would-send',
                        });
                        results.totalQueued++;
                    } else {
                        // Actually create and queue
                        const created = await this.create(companyId, reminderData);
                        results.reminders.push({
                            id: created.id,
                            tenantName: `${invoice.occupancy.tenant.firstName} ${invoice.occupancy.tenant.lastName}`,
                            recipient: created.recipient,
                            subject: created.subject,
                            status: created.status,
                        });
                        results.totalQueued++;
                    }
                } catch (error) {
                    results.totalSkipped++;
                    this.incrementSkipReason(
                        results.skippedReasons,
                        error.message || 'Processing error',
                    );
                    this.logger.error(`Error processing invoice ${invoice.id}:`, error);
                }
            }

            results.message = dto.dryRun
                ? `Dry run completed. Would send ${results.totalQueued} reminders`
                : `Batch send completed. ${results.totalQueued} reminders queued, ${results.totalSkipped} skipped`;

            this.logger.log(results.message);
            return results;
        } catch (error) {
            this.logger.error('Batch send error:', error);
            results.success = false;
            results.message = `Batch send failed: ${error.message}`;
            return results;
        }
    }

    /**
     * Helper to increment skip reason counter
     */
    private incrementSkipReason(reasons: Record<string, number>, reason: string): void {
        reasons[reason] = (reasons[reason] || 0) + 1;
    }
}
