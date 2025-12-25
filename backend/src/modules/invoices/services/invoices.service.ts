import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Inject,
    forwardRef
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThan, Between, In } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Invoice } from '../entities/invoice.entity';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { Occupancy } from '../../occupancies/entities/occupancy.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Company } from '../../companies/entities/company.entity';
import { DashboardService } from '../../dashboard/dashboard.service';

/**
 * Invoices Service
 * Business logic for invoice management
 * Includes dashboard cache invalidation and recent invoices caching
 *
 * Author: george1806
 */
@Injectable()
export class InvoicesService {
    // Cache TTL for recent invoices: 5 minutes (300000ms)
    private readonly RECENT_CACHE_TTL = 300000;

    constructor(
        @InjectRepository(Invoice)
        private invoicesRepository: Repository<Invoice>,
        @InjectRepository(Occupancy)
        private occupanciesRepository: Repository<Occupancy>,
        @InjectRepository(Tenant)
        private tenantsRepository: Repository<Tenant>,
        @InjectRepository(Payment)
        private paymentsRepository: Repository<Payment>,
        @InjectRepository(Company)
        private companiesRepository: Repository<Company>,
        @Inject(forwardRef(() => DashboardService))
        private dashboardService: DashboardService,
        @Inject(CACHE_MANAGER)
        private cacheManager: Cache
    ) {}

    /**
     * Create a new invoice
     * Invalidates dashboard cache after successful creation
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

        // Verify occupancy exists and get compound info
        const occupancy = await this.occupanciesRepository.findOne({
            where: { id: createDto.occupancyId, companyId, isActive: true },
            relations: ['apartment']
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

        const savedInvoice = await this.invoicesRepository.save(invoice);

        // Invalidate caches after successful creation
        const compoundId = occupancy.apartment?.compoundId;
        await Promise.all([
            this.dashboardService.invalidateCache(companyId, compoundId, true),
            this.invalidateRecentInvoicesCache(companyId, compoundId)
        ]);

        return savedInvoice;
    }

    /**
     * Invalidate recent invoices cache
     * @private
     */
    private async invalidateRecentInvoicesCache(companyId: string, compoundId?: string): Promise<void> {
        const keysToDelete: string[] = [];

        // Invalidate company-level recent invoices
        keysToDelete.push(`dashboard:recent:invoices:${companyId}`);

        // Invalidate compound-specific recent invoices if provided
        if (compoundId) {
            keysToDelete.push(`dashboard:recent:invoices:${companyId}:${compoundId}`);
        }

        await Promise.all(keysToDelete.map(key => this.cacheManager.del(key)));
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
        filters?: {
            status?: string;
            search?: string;
            dateFrom?: string;
            dateTo?: string;
            includeInactive?: boolean;
            compoundId?: string;
            sortBy?: string;
            sortOrder?: 'ASC' | 'DESC';
        }
    ): Promise<{ data: Invoice[]; total: number }> {
        const skip = (page - 1) * limit;

        const query = this.invoicesRepository
            .createQueryBuilder('invoice')
            .where('invoice.companyId = :companyId', { companyId })
            .leftJoinAndSelect('invoice.tenant', 'tenant')
            .leftJoinAndSelect('invoice.occupancy', 'occupancy')
            .leftJoinAndSelect('occupancy.apartment', 'apartment');

        if (!filters?.includeInactive) {
            query.andWhere('invoice.isActive = :isActive', { isActive: true });
        }

        if (filters?.status) {
            query.andWhere('invoice.status = :status', { status: filters.status });
        }

        // Search by invoice number or tenant name
        if (filters?.search) {
            query.andWhere(
                '(invoice.invoiceNumber LIKE :search OR tenant.firstName LIKE :search OR tenant.lastName LIKE :search)',
                { search: `%${filters.search}%` }
            );
        }

        // Filter by date range
        if (filters?.dateFrom) {
            query.andWhere('invoice.dueDate >= :dateFrom', { dateFrom: filters.dateFrom });
        }

        if (filters?.dateTo) {
            query.andWhere('invoice.dueDate <= :dateTo', { dateTo: filters.dateTo });
        }

        // Filter by compound/property if provided
        if (filters?.compoundId) {
            query.andWhere('apartment.compoundId = :compoundId', { compoundId: filters.compoundId });
        }

        // Apply sorting
        const sortBy = filters?.sortBy || 'dueDate';
        const sortOrder = filters?.sortOrder || 'DESC';
        query.orderBy(`invoice.${sortBy}`, sortOrder);

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
            relations: [
                'tenant',
                'occupancy',
                'occupancy.apartment',
                'occupancy.apartment.compound'
            ]
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice with ID "${id}" not found`);
        }

        return invoice;
    }

    /**
     * Update an invoice
     * Invalidates dashboard cache after successful update
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
        const savedInvoice = await this.invoicesRepository.save(invoice);

        // Invalidate caches after successful update
        const compoundId = invoice.occupancy?.apartment?.compoundId;
        await Promise.all([
            this.dashboardService.invalidateCache(companyId, compoundId, true),
            this.invalidateRecentInvoicesCache(companyId, compoundId)
        ]);

        return savedInvoice;
    }

    /**
     * Update invoice status
     * Invalidates dashboard and recent invoices cache after successful status update
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
        const savedInvoice = await this.invoicesRepository.save(invoice);

        // Invalidate caches after successful status update
        const compoundId = invoice.occupancy?.apartment?.compoundId;
        await Promise.all([
            this.dashboardService.invalidateCache(companyId, compoundId, true),
            this.invalidateRecentInvoicesCache(companyId, compoundId)
        ]);

        return savedInvoice;
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
     * Invalidates dashboard cache after successful deletion
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

        // Invalidate caches after successful deletion
        const compoundId = invoice.occupancy?.apartment?.compoundId;
        await Promise.all([
            this.dashboardService.invalidateCache(companyId, compoundId, true),
            this.invalidateRecentInvoicesCache(companyId, compoundId)
        ]);
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

        // Simple text-based PDF generation
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];

        // Set up Promise and event listeners BEFORE writing to the document
        const pdfPromise = new Promise<Buffer>((resolve, reject) => {
            doc.on('data', (chunk: Buffer) => buffers.push(chunk));
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
            doc.on('error', reject);
        });

        // Now write content to the PDF
        const company = await this.companiesRepository.findOne({
            where: { id: companyId }
        });

        // Header - Company Info (From)
        doc.fontSize(22).fillColor('#2563eb').text('INVOICE', { align: 'center' });
        doc.fontSize(10).fillColor('#6b7280').text(`#${invoice.invoiceNumber}`, { align: 'center' });
        doc.moveDown(2);

        // Company Details
        doc.fontSize(12).fillColor('#000000').text('FROM:', { underline: true });
        doc.fontSize(11).fillColor('#374151').text(company?.name || 'Company Name');
        if (company?.email) doc.fontSize(9).fillColor('#6b7280').text(`Email: ${company.email}`);
        if (company?.phone) doc.text(`Phone: ${company.phone}`);
        doc.moveDown(1.5);

        // Customer/Tenant Details (To)
        doc.fontSize(12).fillColor('#000000').text('BILL TO:', { underline: true });
        if (invoice.tenant) {
            doc.fontSize(11).fillColor('#374151').text(`${invoice.tenant.firstName} ${invoice.tenant.lastName}`);
            if (invoice.tenant.email) doc.fontSize(9).fillColor('#6b7280').text(`Email: ${invoice.tenant.email}`);
            if (invoice.tenant.phone) doc.text(`Phone: ${invoice.tenant.phone}`);
        }
        if (invoice.occupancy?.apartment) {
            doc.text(`Property: Unit ${invoice.occupancy.apartment.unitNumber}`);
            if (invoice.occupancy.apartment.compound) {
                doc.text(`Location: ${invoice.occupancy.apartment.compound.name}`);
            }
        }
        doc.moveDown(1.5);

        // Invoice Details
        const xPos = 50;
        const yPos = doc.y;
        doc.fontSize(10).fillColor('#6b7280')
            .text(`Issue Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, xPos, yPos)
            .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 320, yPos)
            .text(`Status: ${invoice.status.toUpperCase()}`, 320, yPos + 15);
        doc.moveDown(2);

        // Line Items Table
        doc.fontSize(12).fillColor('#000000').text('INVOICE FOR:', { underline: true });
        doc.moveDown(0.5);

        // Table Header
        const tableTop = doc.y;
        doc.fontSize(10).fillColor('#ffffff');
        doc.rect(xPos, tableTop, 495, 20).fill('#2563eb');
        doc.text('Description', xPos + 5, tableTop + 5, { width: 250 });
        doc.text('Qty', xPos + 260, tableTop + 5, { width: 40, align: 'right' });
        doc.text('Price', xPos + 310, tableTop + 5, { width: 80, align: 'right' });
        doc.text('Amount', xPos + 400, tableTop + 5, { width: 90, align: 'right' });

        // Table Rows
        let currentY = tableTop + 25;
        doc.fillColor('#374151');
        const lineItems = invoice.lineItems || [];

        lineItems.forEach((item: any, index: number) => {
            const bgColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';
            doc.rect(xPos, currentY, 495, 20).fill(bgColor);

            // Convert numeric values to numbers
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unitPrice) || 0;
            const amount = Number(item.amount) || 0;

            doc.fillColor('#374151').fontSize(9);
            doc.text(item.description, xPos + 5, currentY + 5, { width: 245 });
            doc.text(quantity.toString(), xPos + 260, currentY + 5, { width: 40, align: 'right' });
            doc.text(unitPrice.toFixed(2), xPos + 310, currentY + 5, { width: 80, align: 'right' });
            doc.text(amount.toFixed(2), xPos + 400, currentY + 5, { width: 90, align: 'right' });

            currentY += 20;
        });

        // Convert numeric values to numbers (they come as strings from DB)
        const subtotal = Number(invoice.subtotal) || 0;
        const taxAmount = Number(invoice.taxAmount) || 0;
        const totalAmount = Number(invoice.totalAmount) || 0;
        const amountPaid = Number(invoice.amountPaid) || 0;

        // Totals Section
        currentY += 10;
        doc.fontSize(10).fillColor('#374151');
        doc.text('Subtotal:', xPos + 350, currentY, { width: 90, align: 'left' });
        doc.text(subtotal.toFixed(2), xPos + 400, currentY, { width: 90, align: 'right' });

        if (taxAmount > 0) {
            currentY += 20;
            doc.text('Tax:', xPos + 350, currentY, { width: 90, align: 'left' });
            doc.text(taxAmount.toFixed(2), xPos + 400, currentY, { width: 90, align: 'right' });
        }

        currentY += 20;
        doc.fontSize(12).fillColor('#000000');
        doc.rect(xPos + 350, currentY - 5, 195, 25).fill('#f3f4f6');
        doc.text('TOTAL:', xPos + 355, currentY, { width: 90, align: 'left' });
        doc.text(totalAmount.toFixed(2), xPos + 400, currentY, { width: 90, align: 'right' });

        currentY += 30;
        doc.fontSize(10).fillColor('#374151');
        doc.text('Amount Paid:', xPos + 350, currentY, { width: 90, align: 'left' });
        doc.text(amountPaid.toFixed(2), xPos + 400, currentY, { width: 90, align: 'right' });

        currentY += 20;
        doc.fontSize(11).fillColor('#dc2626');
        doc.text('Balance Due:', xPos + 350, currentY, { width: 90, align: 'left' });
        doc.text((totalAmount - amountPaid).toFixed(2), xPos + 400, currentY, { width: 90, align: 'right' });

        // Notes
        if (invoice.notes) {
            doc.moveDown(2);
            doc.fontSize(10).fillColor('#000000').text('Notes:');
            doc.fontSize(9).fillColor('#6b7280').text(invoice.notes);
        }

        // Footer
        doc.moveDown(3);
        doc.fontSize(8).fillColor('#9ca3af').text('Thank you for your business!', { align: 'center' });

        // Signal that we're done writing
        doc.end();

        // Wait for the PDF to be fully generated
        return pdfPromise;
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
