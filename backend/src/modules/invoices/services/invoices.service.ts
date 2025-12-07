import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThan, Between, In } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { Occupancy } from '../../occupancies/entities/occupancy.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Payment } from '../../payments/entities/payment.entity';

/**
 * Invoices Service
 * Business logic for invoice management
 *
 * Author: george1806
 */
@Injectable()
export class InvoicesService {
    constructor(
        @InjectRepository(Invoice)
        private invoicesRepository: Repository<Invoice>,
        @InjectRepository(Occupancy)
        private occupanciesRepository: Repository<Occupancy>,
        @InjectRepository(Tenant)
        private tenantsRepository: Repository<Tenant>,
        @InjectRepository(Payment)
        private paymentsRepository: Repository<Payment>
    ) {}

    /**
     * Create a new invoice
     */
    async create(createDto: CreateInvoiceDto, companyId: string): Promise<Invoice> {
        // Check for duplicate invoice number
        const existing = await this.invoicesRepository.findOne({
            where: { companyId, invoiceNumber: createDto.invoiceNumber }
        });

        if (existing) {
            throw new ConflictException(
                `Invoice with number '${createDto.invoiceNumber}' already exists`
            );
        }

        // Verify occupancy exists
        const occupancy = await this.occupanciesRepository.findOne({
            where: { id: createDto.occupancyId, companyId, isActive: true }
        });
        if (!occupancy) {
            throw new NotFoundException('Occupancy not found');
        }

        // Verify tenant exists
        const tenant = await this.tenantsRepository.findOne({
            where: { id: createDto.tenantId, companyId, isActive: true }
        });
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        // Validate dates
        const invoiceDate = new Date(createDto.invoiceDate);
        const dueDate = new Date(createDto.dueDate);
        if (dueDate < invoiceDate) {
            throw new BadRequestException('Due date must be on or after invoice date');
        }

        const invoice = this.invoicesRepository.create({
            ...createDto,
            companyId
        });

        return this.invoicesRepository.save(invoice);
    }

    /**
     * Generate invoice for an occupancy's rent
     */
    async generateRentInvoice(
        occupancyId: string,
        companyId: string,
        month: string, // Format: 'YYYY-MM'
        dueDay: number = 5 // Day of month when rent is due
    ): Promise<Invoice> {
        const occupancy = await this.occupanciesRepository.findOne({
            where: { id: occupancyId, companyId, isActive: true, status: 'active' },
            relations: ['tenant']
        });

        if (!occupancy) {
            throw new NotFoundException('Occupancy not found or not active');
        }

        // Parse month
        const [year, monthNum] = month.split('-').map(Number);
        const invoiceDate = new Date(year, monthNum - 1, 1);
        const dueDate = new Date(year, monthNum - 1, dueDay);

        // Generate invoice number
        const invoiceNumber = `INV-${year}${String(monthNum).padStart(2, '0')}-${occupancyId.substring(0, 8)}`;

        // Check if invoice already exists
        const existing = await this.invoicesRepository.findOne({
            where: { companyId, invoiceNumber }
        });

        if (existing) {
            throw new ConflictException('Invoice for this period already exists');
        }

        const monthName = invoiceDate.toLocaleString('default', {
            month: 'long',
            year: 'numeric'
        });
        const lineItems = [
            {
                description: `Monthly Rent - ${monthName}`,
                quantity: 1,
                unitPrice: Number(occupancy.monthlyRent),
                amount: Number(occupancy.monthlyRent),
                type: 'rent' as const
            }
        ];

        const subtotal = Number(occupancy.monthlyRent);
        const totalAmount = subtotal;

        const invoice = this.invoicesRepository.create({
            companyId,
            invoiceNumber,
            occupancyId: occupancy.id,
            tenantId: occupancy.tenantId,
            invoiceDate,
            dueDate,
            status: 'draft',
            lineItems,
            subtotal,
            taxAmount: 0,
            totalAmount,
            amountPaid: 0,
            notes: `Automatically generated rent invoice for ${monthName}`
        });

        return this.invoicesRepository.save(invoice);
    }

    /**
     * Find all invoices for a company with pagination
     */
    async findAll(
        companyId: string,
        page: number = 1,
        limit: number = 10,
        filters?: { status?: string; includeInactive?: boolean }
    ): Promise<{ data: Invoice[]; total: number }> {
        const skip = (page - 1) * limit;

        const query = this.invoicesRepository
            .createQueryBuilder('invoice')
            .where('invoice.companyId = :companyId', { companyId })
            .leftJoinAndSelect('invoice.tenant', 'tenant')
            .leftJoinAndSelect('invoice.occupancy', 'occupancy');

        if (!filters?.includeInactive) {
            query.andWhere('invoice.isActive = :isActive', { isActive: true });
        }

        if (filters?.status) {
            query.andWhere('invoice.status = :status', { status: filters.status });
        }

        query.orderBy('invoice.invoiceDate', 'DESC');

        const [data, total] = await query
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return { data, total };
    }

    /**
     * Find invoices by tenant
     */
    async findByTenant(tenantId: string, companyId: string): Promise<Invoice[]> {
        return this.invoicesRepository.find({
            where: { tenantId, companyId, isActive: true },
            relations: ['occupancy'],
            order: { invoiceDate: 'DESC' }
        });
    }

    /**
     * Find invoices by occupancy
     */
    async findByOccupancy(occupancyId: string, companyId: string): Promise<Invoice[]> {
        return this.invoicesRepository.find({
            where: { occupancyId, companyId, isActive: true },
            relations: ['tenant'],
            order: { invoiceDate: 'DESC' }
        });
    }

    /**
     * Find overdue invoices
     */
    async findOverdue(companyId: string): Promise<Invoice[]> {
        const now = new Date();

        return this.invoicesRepository
            .createQueryBuilder('invoice')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.isActive = :isActive', { isActive: true })
            .andWhere('invoice.status NOT IN (:...statuses)', {
                statuses: ['paid', 'cancelled']
            })
            .andWhere('invoice.dueDate < :now', { now })
            .leftJoinAndSelect('invoice.tenant', 'tenant')
            .leftJoinAndSelect('invoice.occupancy', 'occupancy')
            .orderBy('invoice.dueDate', 'ASC')
            .getMany();
    }

    /**
     * Find invoices due soon (within specified days)
     */
    async findDueSoon(companyId: string, daysAhead = 7): Promise<Invoice[]> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        return this.invoicesRepository
            .createQueryBuilder('invoice')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.isActive = :isActive', { isActive: true })
            .andWhere('invoice.status NOT IN (:...statuses)', {
                statuses: ['paid', 'cancelled']
            })
            .andWhere('invoice.dueDate >= :now', { now })
            .andWhere('invoice.dueDate <= :futureDate', { futureDate })
            .leftJoinAndSelect('invoice.tenant', 'tenant')
            .leftJoinAndSelect('invoice.occupancy', 'occupancy')
            .orderBy('invoice.dueDate', 'ASC')
            .getMany();
    }

    /**
     * Get invoice statistics
     */
    async getStats(companyId: string): Promise<{
        total: number;
        draft: number;
        sent: number;
        paid: number;
        overdue: number;
        totalOutstanding: number;
    }> {
        const now = new Date();

        const [total, draft, sent, paid, overdue] = await Promise.all([
            this.invoicesRepository.count({
                where: { companyId, isActive: true }
            }),
            this.invoicesRepository.count({
                where: { companyId, status: 'draft', isActive: true }
            }),
            this.invoicesRepository.count({
                where: { companyId, status: 'sent', isActive: true }
            }),
            this.invoicesRepository.count({
                where: { companyId, status: 'paid', isActive: true }
            }),
            this.invoicesRepository
                .createQueryBuilder('invoice')
                .where('invoice.companyId = :companyId', { companyId })
                .andWhere('invoice.isActive = :isActive', { isActive: true })
                .andWhere('invoice.status NOT IN (:...statuses)', {
                    statuses: ['paid', 'cancelled']
                })
                .andWhere('invoice.dueDate < :now', { now })
                .getCount()
        ]);

        // Calculate total outstanding
        const unpaidInvoices = await this.invoicesRepository.find({
            where: {
                companyId,
                isActive: true,
                status: 'sent' as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
            }
        });

        const totalOutstanding = unpaidInvoices.reduce((sum, inv) => {
            const due = Number(inv.totalAmount) - Number(inv.amountPaid);
            return sum + due;
        }, 0);

        return { total, draft, sent, paid, overdue, totalOutstanding };
    }

    /**
     * Find one invoice by ID
     */
    async findOne(id: string, companyId: string): Promise<Invoice> {
        const invoice = await this.invoicesRepository.findOne({
            where: { id, companyId, isActive: true },
            relations: ['tenant', 'occupancy', 'occupancy.apartment']
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice with ID "${id}" not found`);
        }

        return invoice;
    }

    /**
     * Update an invoice
     */
    async update(
        id: string,
        updateDto: UpdateInvoiceDto,
        companyId: string
    ): Promise<Invoice> {
        const invoice = await this.findOne(id, companyId);

        // Can't update paid or cancelled invoices
        if (invoice.status === 'paid' || invoice.status === 'cancelled') {
            throw new BadRequestException(`Cannot update ${invoice.status} invoice`);
        }

        // If updating invoice number, check for duplicates
        if (
            updateDto.invoiceNumber &&
            updateDto.invoiceNumber !== invoice.invoiceNumber
        ) {
            const existing = await this.invoicesRepository.findOne({
                where: { companyId, invoiceNumber: updateDto.invoiceNumber }
            });

            if (existing) {
                throw new ConflictException(
                    `Invoice with number '${updateDto.invoiceNumber}' already exists`
                );
            }
        }

        Object.assign(invoice, updateDto);
        return this.invoicesRepository.save(invoice);
    }

    /**
     * Update invoice status
     */
    async updateStatus(
        id: string,
        status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
        companyId: string
    ): Promise<Invoice> {
        const invoice = await this.findOne(id, companyId);

        // Validate status transitions using state machine
        const validTransitions: Record<string, string[]> = {
            draft: ['sent', 'cancelled'],
            sent: ['paid', 'overdue', 'cancelled'],
            paid: [], // Final state
            overdue: ['paid', 'cancelled'],
            cancelled: [] // Final state
        };

        if (!validTransitions[invoice.status]?.includes(status)) {
            throw new BadRequestException(
                `Cannot transition from ${invoice.status} to ${status}`
            );
        }

        // Auto-update paid date when marking as paid
        if (status === 'paid' && invoice.status !== 'paid') {
            invoice.paidDate = new Date();
            // Set amount paid to total if not already set
            if (Number(invoice.amountPaid) < Number(invoice.totalAmount)) {
                invoice.amountPaid = invoice.totalAmount;
            }
        }

        invoice.status = status;
        return this.invoicesRepository.save(invoice);
    }

    /**
     * Record a payment on an invoice
     */
    async recordPayment(id: string, companyId: string, amount: number): Promise<Invoice> {
        const invoice = await this.findOne(id, companyId);

        if (invoice.status === 'cancelled') {
            throw new BadRequestException('Cannot record payment on cancelled invoice');
        }

        const currentPaid = Number(invoice.amountPaid) || 0;
        const totalAmount = Number(invoice.totalAmount);
        const newTotal = currentPaid + amount;

        if (newTotal > totalAmount) {
            throw new BadRequestException('Payment amount exceeds invoice total');
        }

        invoice.amountPaid = newTotal;

        // Auto-update status if fully paid
        if (newTotal >= totalAmount) {
            invoice.status = 'paid';
            invoice.paidDate = new Date();
        }

        return this.invoicesRepository.save(invoice);
    }

    /**
     * Mark invoice as sent
     */
    async markAsSent(id: string, companyId: string): Promise<Invoice> {
        return this.updateStatus(id, 'sent', companyId);
    }

    /**
     * Cancel an invoice
     */
    async cancel(id: string, companyId: string): Promise<Invoice> {
        const invoice = await this.findOne(id, companyId);

        if (invoice.status === 'paid') {
            throw new BadRequestException('Cannot cancel paid invoice');
        }

        return this.updateStatus(id, 'cancelled', companyId);
    }

    /**
     * Soft delete (deactivate) an invoice
     */
    async remove(id: string, companyId: string): Promise<void> {
        const invoice = await this.findOne(id, companyId);

        // Business rule: Can only delete draft or cancelled invoices
        if (invoice.status !== 'draft' && invoice.status !== 'cancelled') {
            throw new BadRequestException('Can only delete draft or cancelled invoices');
        }

        // Cascade: soft delete all payments for this invoice
        await this.paymentsRepository.update(
            { invoiceId: id, companyId, isActive: true },
            { isActive: false }
        );

        invoice.isActive = false;
        await this.invoicesRepository.save(invoice);
    }

    /**
     * Reactivate a deactivated invoice
     */
    async activate(id: string, companyId: string): Promise<Invoice> {
        const invoice = await this.invoicesRepository.findOne({
            where: { id, companyId }
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice with ID "${id}" not found`);
        }

        invoice.isActive = true;
        return this.invoicesRepository.save(invoice);
    }

    /**
     * Bulk generate invoices for multiple occupancies
     * Generates rent invoices for active occupancies in a single operation
     */
    async bulkGenerateRentInvoices(
        companyId: string,
        month: string,
        dueDay: number = 5,
        occupancyIds?: string[],
        skipExisting: boolean = true
    ): Promise<{
        processed: number;
        created: number;
        skipped: number;
        failed: number;
        createdInvoiceIds: string[];
        errors: Array<{ occupancyId: string; error: string }>;
        totalAmount: number;
    }> {
        // Get occupancies to process
        let occupancies: Occupancy[];
        if (occupancyIds && occupancyIds.length > 0) {
            // Use specific occupancy IDs
            occupancies = await this.occupanciesRepository.find({
                where: {
                    companyId,
                    id: In(occupancyIds),
                    isActive: true,
                    status: 'active'
                },
                relations: ['tenant']
            });
        } else {
            // Get all active occupancies
            occupancies = await this.occupanciesRepository.find({
                where: {
                    companyId,
                    isActive: true,
                    status: 'active'
                },
                relations: ['tenant']
            });
        }

        const results = {
            processed: occupancies.length,
            created: 0,
            skipped: 0,
            failed: 0,
            createdInvoiceIds: [] as string[],
            errors: [] as Array<{ occupancyId: string; error: string }>,
            totalAmount: 0
        };

        // Generate invoices
        for (const occupancy of occupancies) {
            try {
                const invoice = await this.generateRentInvoice(
                    occupancy.id,
                    companyId,
                    month,
                    dueDay
                );

                results.created++;
                results.createdInvoiceIds.push(invoice.id);
                results.totalAmount += Number(invoice.totalAmount);
            } catch (error) {
                // Check if it's a "already exists" error
                if (
                    error instanceof ConflictException &&
                    error.message.includes('already exists')
                ) {
                    if (skipExisting) {
                        results.skipped++;
                    } else {
                        results.failed++;
                        results.errors.push({
                            occupancyId: occupancy.id,
                            error: error.message
                        });
                    }
                } else {
                    results.failed++;
                    results.errors.push({
                        occupancyId: occupancy.id,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        }

        return results;
    }

    /**
     * Download invoice as PDF
     */
    async downloadPdf(id: string, companyId: string): Promise<Buffer> {
        const invoice = await this.findOne(id, companyId);

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        // Simple text-based PDF generation (can be enhanced with a proper PDF library)
        // For now, return a basic PDF-like response
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => buffers.push(chunk));

        doc.fontSize(20).text(`Invoice #${invoice.invoiceNumber}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Status: ${invoice.status.toUpperCase()}`);
        doc.text(`Issue Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`);
        doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`);
        doc.moveDown();

        doc.fontSize(14).text('Invoice Details', { underline: true });
        doc.fontSize(12);
        doc.text(`Total Amount: ${invoice.totalAmount}`);
        doc.text(`Paid Amount: ${invoice.amountPaid}`);
        doc.text(`Outstanding: ${invoice.totalAmount - invoice.amountPaid}`);

        if (invoice.notes) {
            doc.moveDown();
            doc.text('Notes:', { underline: true });
            doc.text(invoice.notes);
        }

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('finish', () => {
                resolve(Buffer.concat(buffers));
            });
            doc.on('error', reject);
        });
    }

    /**
     * Get payments for an invoice
     */
    async getPayments(id: string, companyId: string) {
        const invoice = await this.findOne(id, companyId);

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        // Query payments for this invoice
        const payments = await this.paymentsRepository
            .createQueryBuilder('payment')
            .where('payment.invoiceId = :invoiceId', { invoiceId: id })
            .andWhere('payment.companyId = :companyId', { companyId })
            .andWhere('payment.isActive = true')
            .orderBy('payment.paidAt', 'DESC')
            .getMany();

        return {
            data: payments || [],
            total: payments?.length || 0
        };
    }
}
