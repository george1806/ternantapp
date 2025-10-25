import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { Invoice } from '../../invoices/entities/invoice.entity';

/**
 * Payments Service
 * Business logic for payment management with invoice updates
 *
 * Author: george1806
 */
@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new payment and update invoice
   * Uses transaction to ensure data consistency
   */
  async create(
    createDto: CreatePaymentDto,
    companyId: string,
  ): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Verify invoice exists and get details
      const invoice = await manager.findOne(Invoice, {
        where: { id: createDto.invoiceId, companyId, isActive: true },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      // 2. Validate payment doesn't exceed outstanding amount
      const currentPaid = Number(invoice.amountPaid) || 0;
      const totalAmount = Number(invoice.totalAmount);
      const newTotal = currentPaid + createDto.amount;

      if (newTotal > totalAmount) {
        throw new BadRequestException(
          `Payment amount exceeds outstanding balance. Outstanding: ${totalAmount - currentPaid}`,
        );
      }

      // 3. Create payment
      const payment = manager.create(Payment, {
        ...createDto,
        companyId,
        paidAt: new Date(createDto.paidAt),
      });

      const savedPayment = await manager.save(Payment, payment);

      // 4. Update invoice
      invoice.amountPaid = newTotal;

      // Update invoice status based on payment
      if (newTotal >= totalAmount) {
        invoice.status = 'paid';
        invoice.paidDate = new Date();
      } else if (newTotal > 0 && invoice.status === 'draft') {
        invoice.status = 'sent';
      }

      await manager.save(Invoice, invoice);

      return savedPayment;
    });
  }

  /**
   * Find all payments for a company
   */
  async findAll(
    companyId: string,
    invoiceId?: string,
    includeInactive = false,
  ): Promise<Payment[]> {
    const where: FindOptionsWhere<Payment> = { companyId };

    if (!includeInactive) {
      where.isActive = true;
    }

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    return this.paymentsRepository.find({
      where,
      relations: ['invoice', 'invoice.tenant'],
      order: { paidAt: 'DESC' },
    });
  }

  /**
   * Find payments by invoice
   */
  async findByInvoice(invoiceId: string, companyId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { invoiceId, companyId, isActive: true },
      order: { paidAt: 'DESC' },
    });
  }

  /**
   * Find payments within a date range
   */
  async findByDateRange(
    companyId: string,
    startDate: Date,
    endDate: Date,
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
    endDate?: Date,
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
      relations: ['invoice', 'invoice.tenant', 'invoice.occupancy'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${id}" not found`);
    }

    return payment;
  }

  /**
   * Update a payment
   */
  async update(
    id: string,
    updateDto: UpdatePaymentDto,
    companyId: string,
  ): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id, companyId },
        relations: ['invoice'],
      });

      if (!payment) {
        throw new NotFoundException(`Payment with ID "${id}" not found`);
      }

      const oldAmount = Number(payment.amount);
      const newAmount = updateDto.amount !== undefined ? updateDto.amount : oldAmount;

      // If amount is changing, we need to update the invoice
      if (newAmount !== oldAmount) {
        const invoice = payment.invoice;
        const currentPaid = Number(invoice.amountPaid);
        const totalAmount = Number(invoice.totalAmount);

        // Calculate new invoice amountPaid
        const newInvoicePaid = currentPaid - oldAmount + newAmount;

        if (newInvoicePaid < 0) {
          throw new BadRequestException('Updated payment amount creates negative balance');
        }

        if (newInvoicePaid > totalAmount) {
          throw new BadRequestException('Updated payment amount exceeds invoice total');
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

      return manager.save(Payment, payment);
    });
  }

  /**
   * Soft delete (deactivate) a payment
   */
  async remove(id: string, companyId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id, companyId },
        relations: ['invoice'],
      });

      if (!payment) {
        throw new NotFoundException(`Payment with ID "${id}" not found`);
      }

      // Revert invoice amount
      const invoice = payment.invoice;
      const currentPaid = Number(invoice.amountPaid);
      const paymentAmount = Number(payment.amount);

      invoice.amountPaid = Math.max(0, currentPaid - paymentAmount);

      // Update invoice status
      if (invoice.status === 'paid' && invoice.amountPaid < Number(invoice.totalAmount)) {
        invoice.status = 'sent';
        (invoice as any).paidDate = null;
      }

      await manager.save(Invoice, invoice);

      // Deactivate payment
      payment.isActive = false;
      await manager.save(Payment, payment);
    });
  }

  /**
   * Reactivate a deactivated payment
   */
  async activate(id: string, companyId: string): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id, companyId },
        relations: ['invoice'],
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
          'Cannot reactivate: payment would exceed invoice total',
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
      return manager.save(Payment, payment);
    });
  }
}
