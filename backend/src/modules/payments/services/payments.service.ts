import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Payment } from '../entities/payment.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { DashboardService } from '../../dashboard/dashboard.service';

/**
 * Payments Service
 * Business logic for payment management with invoice updates
 * Includes dashboard cache invalidation for data consistency
 *
 * Author: george1806
 */
@Injectable()
export class PaymentsService {
    private readonly RECENT_CACHE_TTL = 300000; // 5 minutes

    constructor(
        @InjectRepository(Payment)
        private paymentsRepository: Repository<Payment>,
        @InjectRepository(Invoice)
        private invoicesRepository: Repository<Invoice>,
        private dataSource: DataSource,
        @Inject(forwardRef(() => DashboardService))
        private dashboardService: DashboardService,
        @Inject(CACHE_MANAGER)
        private cacheManager: Cache
    ) {}

    /**
     * Create a new payment and update invoice
     * Uses transaction to ensure data consistency
     * Invalidates dashboard cache after successful payment creation
     */
    async create(createDto: CreatePaymentDto, companyId: string): Promise<Payment> {
        const payment = await this.dataSource.transaction(async (manager) => {
            // 1. Check for duplicate payment using idempotency key
            if (createDto.idempotencyKey) {
                const existingPayment = await manager.findOne(Payment, {
                    where: { companyId, idempotencyKey: createDto.idempotencyKey, isActive: true }
                });

                if (existingPayment) {
                    // Return the existing payment (idempotent behavior)
                    return existingPayment;
                }
            }

            // 2. Verify invoice exists and get details
            const invoice = await manager.findOne(Invoice, {
                where: { id: createDto.invoiceId, companyId, isActive: true },
                relations: ['occupancy', 'occupancy.apartment']
            });

            if (!invoice) {
                throw new NotFoundException('Invoice not found');
            }

            // 3. Validate payment doesn't exceed outstanding amount
            const currentPaid = Number(invoice.amountPaid) || 0;
            const totalAmount = Number(invoice.totalAmount);
            const newTotal = currentPaid + createDto.amount;

            if (newTotal > totalAmount) {
                throw new BadRequestException(
                    `Payment amount exceeds outstanding balance. Outstanding: ${totalAmount - currentPaid}`
                );
            }

            // 4. Create payment
            const payment = manager.create(Payment, {
                ...createDto,
                companyId,
                paidAt: new Date(createDto.paidAt)
            });

            const savedPayment = await manager.save(Payment, payment);

            // 5. Update invoice
            invoice.amountPaid = newTotal;

            // Update invoice status based on payment
            if (newTotal >= totalAmount) {
                invoice.status = 'paid';
                invoice.paidDate = new Date();
            } else if (newTotal > 0 && invoice.status === 'draft') {
                invoice.status = 'sent';
            }

            await manager.save(Invoice, invoice);

            // Store compoundId for cache invalidation
            (savedPayment as any)._compoundId = invoice.occupancy?.apartment?.compoundId;

            return savedPayment;
        });

        // Invalidate caches after successful transaction
        const compoundId = (payment as any)._compoundId;
        await Promise.all([
            this.dashboardService.invalidateCache(companyId, compoundId, true),
            this.invalidateRecentPaymentsCache(companyId, compoundId)
        ]);

        return payment;
    }

    /**
     * Find all payments for a company with pagination
     */
    async findAll(
        companyId: string,
        page: number = 1,
        limit: number = 10,
        filters?: { invoiceId?: string; includeInactive?: boolean; compoundId?: string }
    ): Promise<{ data: Payment[]; total: number }> {
        const skip = (page - 1) * limit;

        const query = this.paymentsRepository
            .createQueryBuilder('payment')
            .where('payment.companyId = :companyId', { companyId })
            .leftJoinAndSelect('payment.invoice', 'invoice')
            .leftJoinAndSelect('invoice.tenant', 'tenant');

        if (!filters?.includeInactive) {
            query.andWhere('payment.isActive = :isActive', { isActive: true });
        }

        if (filters?.invoiceId) {
            query.andWhere('payment.invoiceId = :invoiceId', { invoiceId: filters.invoiceId });
        }

        // Filter by compound/property if provided
        if (filters?.compoundId) {
            query
                .innerJoin('invoice.occupancy', 'occupancy')
                .innerJoin('occupancy.apartment', 'apartment')
                .andWhere('apartment.compoundId = :compoundId', { compoundId: filters.compoundId });
        }

        query.orderBy('payment.paidAt', 'DESC');

        const [data, total] = await query
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return { data, total };
    }

    /**
     * Find payments by invoice
     */
    async findByInvoice(invoiceId: string, companyId: string): Promise<Payment[]> {
        return this.paymentsRepository.find({
            where: { invoiceId, companyId, isActive: true },
            order: { paidAt: 'DESC' }
        });
    }

    /**
     * Find payments within a date range
     */
    async findByDateRange(
        companyId: string,
        startDate: Date,
        endDate: Date
    ): Promise<Payment[]> {
        return this.paymentsRepository
            .createQueryBuilder('payment')
            .where('payment.companyId = :companyId', { companyId })
            .andWhere('payment.isActive = :isActive', { isActive: true })
            .andWhere('payment.paidAt >= :startDate', { startDate })
            .andWhere('payment.paidAt <= :endDate', { endDate })
            .leftJoinAndSelect('payment.invoice', 'invoice')
            .leftJoinAndSelect('invoice.tenant', 'tenant')
            .orderBy('payment.paidAt', 'DESC')
            .getMany();
    }

    /**
     * Get payment statistics
     */
    async getStats(
        companyId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<{
        totalPayments: number;
        totalAmount: number;
        byMethod: Record<string, { count: number; amount: number }>;
    }> {
        const queryBuilder = this.paymentsRepository
            .createQueryBuilder('payment')
            .where('payment.companyId = :companyId', { companyId })
            .andWhere('payment.isActive = :isActive', { isActive: true });

        if (startDate) {
            queryBuilder.andWhere('payment.paidAt >= :startDate', { startDate });
        }

        if (endDate) {
            queryBuilder.andWhere('payment.paidAt <= :endDate', { endDate });
        }

        const payments = await queryBuilder.getMany();

        const totalPayments = payments.length;
        const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

        const byMethod: Record<string, { count: number; amount: number }> = {};

        payments.forEach((payment) => {
            const method = payment.method;
            if (!byMethod[method]) {
                byMethod[method] = { count: 0, amount: 0 };
            }
            byMethod[method].count++;
            byMethod[method].amount += Number(payment.amount);
        });

        return { totalPayments, totalAmount, byMethod };
    }

    /**
     * Find one payment by ID
     */
    async findOne(id: string, companyId: string): Promise<Payment> {
        const payment = await this.paymentsRepository.findOne({
            where: { id, companyId },
            relations: ['invoice', 'invoice.tenant', 'invoice.occupancy']
        });

        if (!payment) {
            throw new NotFoundException(`Payment with ID "${id}" not found`);
        }

        return payment;
    }

    /**
     * Update a payment
     * Invalidates dashboard cache after successful update
     */
    async update(
        id: string,
        updateDto: UpdatePaymentDto,
        companyId: string
    ): Promise<Payment> {
        const payment = await this.dataSource.transaction(async (manager) => {
            const payment = await manager.findOne(Payment, {
                where: { id, companyId },
                relations: ['invoice', 'invoice.occupancy', 'invoice.occupancy.apartment']
            });

            if (!payment) {
                throw new NotFoundException(`Payment with ID "${id}" not found`);
            }

            const oldAmount = Number(payment.amount);
            const newAmount =
                updateDto.amount !== undefined ? updateDto.amount : oldAmount;

            // If amount is changing, we need to update the invoice
            if (newAmount !== oldAmount) {
                const invoice = payment.invoice;
                const currentPaid = Number(invoice.amountPaid);
                const totalAmount = Number(invoice.totalAmount);

                // Calculate new invoice amountPaid
                const newInvoicePaid = currentPaid - oldAmount + newAmount;

                if (newInvoicePaid < 0) {
                    throw new BadRequestException(
                        'Updated payment amount creates negative balance'
                    );
                }

                if (newInvoicePaid > totalAmount) {
                    throw new BadRequestException(
                        'Updated payment amount exceeds invoice total'
                    );
                }

                // Update invoice
                invoice.amountPaid = newInvoicePaid;

                if (newInvoicePaid >= totalAmount) {
                    invoice.status = 'paid';
                    if (!invoice.paidDate) {
                        invoice.paidDate = new Date();
                    }
                } else {
                    // If was paid but now isn't fully paid
                    if (invoice.status === 'paid') {
                        invoice.status = 'sent';
                        (invoice as any).paidDate = null;
                    }
                }

                await manager.save(Invoice, invoice);
            }

            // Update payment
            Object.assign(payment, updateDto);

            if (updateDto.paidAt) {
                payment.paidAt = new Date(updateDto.paidAt);
            }

            // Store compoundId for cache invalidation
            (payment as any)._compoundId = payment.invoice?.occupancy?.apartment?.compoundId;

            return manager.save(Payment, payment);
        });

        // Invalidate caches after successful transaction
        const compoundId = (payment as any)._compoundId;
        await Promise.all([
            this.dashboardService.invalidateCache(companyId, compoundId, true),
            this.invalidateRecentPaymentsCache(companyId, compoundId)
        ]);

        return payment;
    }

    /**
     * Soft delete (deactivate) a payment
     * Invalidates caches after successful deletion
     */
    async remove(id: string, companyId: string): Promise<void> {
        let compoundId: string | undefined;

        await this.dataSource.transaction(async (manager) => {
            const payment = await manager.findOne(Payment, {
                where: { id, companyId },
                relations: ['invoice', 'invoice.occupancy', 'invoice.occupancy.apartment']
            });

            if (!payment) {
                throw new NotFoundException(`Payment with ID "${id}" not found`);
            }

            // Store compoundId for cache invalidation
            compoundId = payment.invoice?.occupancy?.apartment?.compoundId;

            // Revert invoice amount
            const invoice = payment.invoice;
            const currentPaid = Number(invoice.amountPaid);
            const paymentAmount = Number(payment.amount);

            invoice.amountPaid = Math.max(0, currentPaid - paymentAmount);

            // Update invoice status
            if (
                invoice.status === 'paid' &&
                invoice.amountPaid < Number(invoice.totalAmount)
            ) {
                invoice.status = 'sent';
                (invoice as any).paidDate = null;
            }

            await manager.save(Invoice, invoice);

            // Deactivate payment
            payment.isActive = false;
            await manager.save(Payment, payment);
        });

        // Invalidate caches after successful transaction
        await Promise.all([
            this.dashboardService.invalidateCache(companyId, compoundId, true),
            this.invalidateRecentPaymentsCache(companyId, compoundId)
        ]);
    }

    /**
     * Reactivate a deactivated payment
     * Invalidates caches after successful reactivation
     */
    async activate(id: string, companyId: string): Promise<Payment> {
        const payment = await this.dataSource.transaction(async (manager) => {
            const payment = await manager.findOne(Payment, {
                where: { id, companyId },
                relations: ['invoice', 'invoice.occupancy', 'invoice.occupancy.apartment']
            });

            if (!payment) {
                throw new NotFoundException(`Payment with ID "${id}" not found`);
            }

            const invoice = payment.invoice;
            const currentPaid = Number(invoice.amountPaid);
            const totalAmount = Number(invoice.totalAmount);
            const paymentAmount = Number(payment.amount);
            const newTotal = currentPaid + paymentAmount;

            if (newTotal > totalAmount) {
                throw new BadRequestException(
                    'Cannot reactivate: payment would exceed invoice total'
                );
            }

            // Update invoice
            invoice.amountPaid = newTotal;

            if (newTotal >= totalAmount) {
                invoice.status = 'paid';
                invoice.paidDate = new Date();
            }

            await manager.save(Invoice, invoice);

            // Reactivate payment
            payment.isActive = true;

            // Store compoundId for cache invalidation
            (payment as any)._compoundId = payment.invoice?.occupancy?.apartment?.compoundId;

            return manager.save(Payment, payment);
        });

        // Invalidate caches after successful transaction
        const compoundId = (payment as any)._compoundId;
        await Promise.all([
            this.dashboardService.invalidateCache(companyId, compoundId, true),
            this.invalidateRecentPaymentsCache(companyId, compoundId)
        ]);

        return payment;
    }

    /**
     * Invalidate recent payments cache for company and optionally compound
     * Private helper method for cache management
     */
    private async invalidateRecentPaymentsCache(companyId: string, compoundId?: string): Promise<void> {
        const keysToDelete: string[] = [];

        // Invalidate company-level recent payments cache
        keysToDelete.push(`dashboard:recent:payments:${companyId}`);

        // Invalidate compound-specific recent payments cache if compoundId provided
        if (compoundId) {
            keysToDelete.push(`dashboard:recent:payments:${companyId}:${compoundId}`);
        }

        await Promise.all(keysToDelete.map(key => this.cacheManager.del(key)));
    }
}
