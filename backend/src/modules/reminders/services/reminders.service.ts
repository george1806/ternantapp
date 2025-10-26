import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual, Between } from 'typeorm';
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

/**
 * Reminders Service
 * Business logic for managing reminder notifications
 *
 * Features:
 * - CRUD operations for reminders
 * - Automatic reminder scheduling for due/overdue invoices
 * - Queue integration for async notification sending
 * - Cron jobs for periodic reminder checks
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
        private readonly configService: ConfigService
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
    async markAsSent(id: string, companyId: string): Promise<Reminder> {
        const reminder = await this.findOne(id, companyId);
        reminder.status = ReminderStatus.SENT;
        reminder.sentAt = new Date();
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

        this.logger.debug(`Reminder queued: ${reminder.id}, Job ID: ${job.id}`);
    }

    /**
     * CRON: Check for due invoices and create reminders
     * Runs based on REMINDER_DUE_SOON_CRON (default: daily at 8 AM)
     */
    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async checkDueInvoices(): Promise<void> {
        this.logger.log('Running scheduled check for due invoices...');

        try {
            const dueSoonDays = this.configService.get<number>(
                'REMINDER_DUE_SOON_DAYS',
                3
            );
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + dueSoonDays);

            // Find invoices due in 3 days
            const dueInvoices = await this.invoiceRepository.find({
                where: {
                    status: 'sent',
                    dueDate: LessThan(threeDaysFromNow)
                },
                relations: ['occupancy', 'occupancy.tenant', 'occupancy.apartment']
            });

            this.logger.log(`Found ${dueInvoices.length} invoices due soon`);

            for (const invoice of dueInvoices) {
                // Check if reminder already sent
                const existingReminder = await this.reminderRepository.findOne({
                    where: {
                        companyId: invoice.companyId,
                        invoiceId: invoice.id,
                        type: ReminderType.DUE_SOON,
                        status: ReminderStatus.SENT
                    }
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
                            dueDate: invoice.dueDate
                        }
                    });
                }
            }

            this.logger.log('Due invoice check completed');
        } catch (error) {
            this.logger.error('Error checking due invoices:', error);
        }
    }

    /**
     * CRON: Check for overdue invoices and create reminders
     * Runs based on REMINDER_OVERDUE_CRON (default: daily at 9 AM)
     */
    @Cron(CronExpression.EVERY_DAY_AT_9AM)
    async checkOverdueInvoices(): Promise<void> {
        this.logger.log('Running scheduled check for overdue invoices...');

        try {
            const overdueIntervalDays = this.configService.get<number>(
                'REMINDER_OVERDUE_INTERVAL_DAYS',
                7
            );
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Find overdue invoices
            const overdueInvoices = await this.invoiceRepository.find({
                where: {
                    status: 'overdue',
                    dueDate: LessThan(today)
                },
                relations: ['occupancy', 'occupancy.tenant', 'occupancy.apartment']
            });

            this.logger.log(`Found ${overdueInvoices.length} overdue invoices`);

            for (const invoice of overdueInvoices) {
                // Send reminder every 7 days
                const lastReminder = await this.reminderRepository.findOne({
                    where: {
                        companyId: invoice.companyId,
                        invoiceId: invoice.id,
                        type: ReminderType.OVERDUE,
                        status: ReminderStatus.SENT
                    },
                    order: { sentAt: 'DESC' }
                });

                const shouldSend =
                    !lastReminder ||
                    (lastReminder.sentAt &&
                        new Date().getTime() - lastReminder.sentAt.getTime() >
                            overdueIntervalDays * 24 * 60 * 60 * 1000);

                if (shouldSend) {
                    await this.create(invoice.companyId, {
                        type: ReminderType.OVERDUE,
                        tenantId: invoice.occupancy.tenantId,
                        invoiceId: invoice.id,
                        subject: `Overdue Rent - Unit ${invoice.occupancy.apartment.unitNumber}`,
                        message: `Dear ${invoice.occupancy.tenant.firstName}, your rent for Unit ${invoice.occupancy.apartment.unitNumber} is overdue. Due date was ${invoice.dueDate.toLocaleDateString()}. Amount: ${invoice.totalAmount}. Please settle this as soon as possible.`,
                        scheduledFor: new Date(),
                        metadata: {
                            templateName: 'rent-overdue',
                            apartmentCode: invoice.occupancy.apartment.unitNumber,
                            amount: invoice.totalAmount,
                            dueDate: invoice.dueDate,
                            daysOverdue: Math.floor(
                                (today.getTime() - invoice.dueDate.getTime()) /
                                    (1000 * 60 * 60 * 24)
                            )
                        }
                    });
                }
            }

            this.logger.log('Overdue invoice check completed');
        } catch (error) {
            this.logger.error('Error checking overdue invoices:', error);
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
}
