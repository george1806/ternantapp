import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { BaseRepository } from '../../../common/pagination/base.repository';
import { PaginationService } from '../../../common/pagination/pagination.service';
import { PaginatedResult, PaginationParams } from '../../../common/pagination/pagination.types';

/**
 * Invoices Repository
 * Handles all database operations for invoices with pagination support
 *
 * Design Pattern: Repository Pattern
 * - Encapsulates database queries
 * - Provides clean API for service layer
 * - Inherits pagination support from BaseRepository
 */
@Injectable()
export class InvoicesRepository extends BaseRepository<Invoice> {
  constructor(
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    paginationService: PaginationService,
  ) {
    super(invoicesRepository, paginationService);
  }

  /**
   * Find all invoices for a company with pagination
   * Properly uses eager loading to prevent N+1 queries
   */
  async findAllPaginated(
    companyId: string,
    params: PaginationParams,
    status?: string,
    includeInactive = false,
  ): Promise<PaginatedResult<Invoice>> {
    const where: FindOptionsWhere<Invoice> = { companyId };

    if (!includeInactive) {
      where.isActive = true;
    }

    if (status) {
      where.status = status as any;
    }

    return this.findWithPagination(
      where,
      params,
      ['tenant', 'occupancy', 'occupancy.apartment'], // Eager load relations to prevent N+1
      { invoiceDate: 'DESC' },
    );
  }

  /**
   * Find invoices by tenant with pagination
   */
  async findByTenantPaginated(
    tenantId: string,
    companyId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<Invoice>> {
    const where: FindOptionsWhere<Invoice> = {
      tenantId,
      companyId,
      isActive: true,
    };

    return this.findWithPagination(where, params, ['occupancy'], {
      invoiceDate: 'DESC',
    });
  }

  /**
   * Find invoices by occupancy with pagination
   */
  async findByOccupancyPaginated(
    occupancyId: string,
    companyId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<Invoice>> {
    const where: FindOptionsWhere<Invoice> = {
      occupancyId,
      companyId,
      isActive: true,
    };

    return this.findWithPagination(where, params, ['tenant'], {
      invoiceDate: 'DESC',
    });
  }

  /**
   * Find overdue invoices with pagination
   * Uses QueryBuilder for complex query with date comparison
   */
  async findOverduePaginated(
    companyId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<Invoice>> {
    const now = new Date();

    const queryBuilder = this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.tenant', 'tenant')
      .leftJoinAndSelect('invoice.occupancy', 'occupancy')
      .leftJoinAndSelect('occupancy.apartment', 'apartment')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.isActive = :isActive', { isActive: true })
      .andWhere('invoice.status NOT IN (:...statuses)', {
        statuses: ['paid', 'cancelled'],
      })
      .andWhere('invoice.dueDate < :now', { now })
      .orderBy('invoice.dueDate', 'ASC');

    return this.paginate(queryBuilder, params);
  }

  /**
   * Find invoices due soon with pagination
   */
  async findDueSoonPaginated(
    companyId: string,
    params: PaginationParams,
    daysAhead = 7,
  ): Promise<PaginatedResult<Invoice>> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const queryBuilder = this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.tenant', 'tenant')
      .leftJoinAndSelect('invoice.occupancy', 'occupancy')
      .leftJoinAndSelect('occupancy.apartment', 'apartment')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.isActive = :isActive', { isActive: true })
      .andWhere('invoice.status NOT IN (:...statuses)', {
        statuses: ['paid', 'cancelled'],
      })
      .andWhere('invoice.dueDate >= :now', { now })
      .andWhere('invoice.dueDate <= :futureDate', { futureDate })
      .orderBy('invoice.dueDate', 'ASC');

    return this.paginate(queryBuilder, params);
  }

  /**
   * Find invoices by status with pagination
   */
  async findByStatusPaginated(
    companyId: string,
    status: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<Invoice>> {
    const where: FindOptionsWhere<Invoice> = {
      companyId,
      status: status as any,
      isActive: true,
    };

    return this.findWithPagination(where, params, ['tenant', 'occupancy'], {
      invoiceDate: 'DESC',
    });
  }

  /**
   * Find unpaid invoices with pagination
   */
  async findUnpaidPaginated(
    companyId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<Invoice>> {
    const queryBuilder = this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.tenant', 'tenant')
      .leftJoinAndSelect('invoice.occupancy', 'occupancy')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.isActive = :isActive', { isActive: true })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: ['sent', 'overdue'],
      })
      .orderBy('invoice.dueDate', 'ASC');

    return this.paginate(queryBuilder, params);
  }
}
