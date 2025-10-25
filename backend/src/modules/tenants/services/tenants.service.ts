import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';

/**
 * Tenants Service
 * Business logic for tenant management
 *
 * Author: george1806
 */
@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
  ) {}

  /**
   * Create a new tenant
   * Validates email uniqueness within company
   */
  async create(
    createDto: CreateTenantDto,
    companyId: string,
  ): Promise<Tenant> {
    // Check for duplicate email in same company
    const existing = await this.tenantsRepository.findOne({
      where: { companyId, email: createDto.email },
    });

    if (existing) {
      throw new ConflictException(
        `Tenant with email '${createDto.email}' already exists`,
      );
    }

    const tenant = this.tenantsRepository.create({
      ...createDto,
      companyId,
    });

    return this.tenantsRepository.save(tenant);
  }

  /**
   * Find all tenants for a company
   * Supports filtering by status
   */
  async findAll(
    companyId: string,
    status?: string,
    includeInactive = false,
  ): Promise<Tenant[]> {
    const where: FindOptionsWhere<Tenant> = { companyId };

    if (!includeInactive) {
      where.isActive = true;
    }

    if (status) {
      where.status = status as any;
    }

    return this.tenantsRepository.find({
      where,
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  /**
   * Search tenants by name, email, or phone
   */
  async search(companyId: string, query: string): Promise<Tenant[]> {
    return this.tenantsRepository
      .createQueryBuilder('tenant')
      .where('tenant.companyId = :companyId', { companyId })
      .andWhere('tenant.isActive = :isActive', { isActive: true })
      .andWhere(
        '(tenant.firstName LIKE :search OR tenant.lastName LIKE :search OR tenant.email LIKE :search OR tenant.phone LIKE :search)',
        { search: `%${query}%` },
      )
      .orderBy('tenant.lastName', 'ASC')
      .addOrderBy('tenant.firstName', 'ASC')
      .take(50)
      .getMany();
  }

  /**
   * Count tenants with optional filters
   */
  async count(companyId: string, status?: string): Promise<number> {
    const where: FindOptionsWhere<Tenant> = {
      companyId,
      isActive: true,
    };

    if (status) {
      where.status = status as any;
    }

    return this.tenantsRepository.count({ where });
  }

  /**
   * Get tenant statistics by status
   */
  async getStats(companyId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    blacklisted: number;
  }> {
    const [total, active, inactive, blacklisted] = await Promise.all([
      this.tenantsRepository.count({
        where: { companyId, isActive: true },
      }),
      this.tenantsRepository.count({
        where: { companyId, status: 'active', isActive: true },
      }),
      this.tenantsRepository.count({
        where: { companyId, status: 'inactive', isActive: true },
      }),
      this.tenantsRepository.count({
        where: { companyId, status: 'blacklisted', isActive: true },
      }),
    ]);

    return { total, active, inactive, blacklisted };
  }

  /**
   * Find one tenant by ID
   */
  async findOne(id: string, companyId: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({
      where: { id, companyId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    return tenant;
  }

  /**
   * Find tenant with occupancy history
   */
  async findOneWithOccupancies(id: string, companyId: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({
      where: { id, companyId },
      relations: ['occupancies', 'occupancies.apartment'],
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    return tenant;
  }

  /**
   * Update a tenant
   */
  async update(
    id: string,
    updateDto: UpdateTenantDto,
    companyId: string,
  ): Promise<Tenant> {
    const tenant = await this.findOne(id, companyId);

    // If updating email, check for duplicates
    if (updateDto.email && updateDto.email !== tenant.email) {
      const existing = await this.tenantsRepository.findOne({
        where: { companyId, email: updateDto.email },
      });

      if (existing) {
        throw new ConflictException(
          `Tenant with email '${updateDto.email}' already exists`,
        );
      }
    }

    Object.assign(tenant, updateDto);
    return this.tenantsRepository.save(tenant);
  }

  /**
   * Update tenant status
   */
  async updateStatus(
    id: string,
    status: 'active' | 'inactive' | 'blacklisted',
    companyId: string,
  ): Promise<Tenant> {
    const tenant = await this.findOne(id, companyId);
    tenant.status = status;
    return this.tenantsRepository.save(tenant);
  }

  /**
   * Blacklist a tenant
   * This is a critical operation and should include a reason in notes
   */
  async blacklist(
    id: string,
    companyId: string,
    reason?: string,
  ): Promise<Tenant> {
    const tenant = await this.findOne(id, companyId);

    tenant.status = 'blacklisted';

    if (reason) {
      const timestamp = new Date().toISOString();
      const blacklistNote = `\n[BLACKLISTED ${timestamp}]: ${reason}`;
      tenant.notes = tenant.notes
        ? tenant.notes + blacklistNote
        : blacklistNote;
    }

    return this.tenantsRepository.save(tenant);
  }

  /**
   * Soft delete (deactivate) a tenant
   */
  async remove(id: string, companyId: string): Promise<void> {
    const tenant = await this.findOne(id, companyId);

    // Business rule: Cannot delete if tenant has active occupancies
    // This will be checked when occupancies module is implemented

    tenant.isActive = false;
    await this.tenantsRepository.save(tenant);
  }

  /**
   * Reactivate a deactivated tenant
   */
  async activate(id: string, companyId: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({
      where: { id, companyId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    tenant.isActive = true;
    return this.tenantsRepository.save(tenant);
  }

  /**
   * Add a document to tenant
   */
  async addDocument(
    id: string,
    companyId: string,
    document: {
      type: string;
      fileName: string;
      fileUrl: string;
    },
  ): Promise<Tenant> {
    const tenant = await this.findOne(id, companyId);

    const newDocument = {
      ...document,
      uploadedAt: new Date(),
    };

    tenant.documents = tenant.documents || [];
    tenant.documents.push(newDocument);

    return this.tenantsRepository.save(tenant);
  }

  /**
   * Add a reference to tenant
   */
  async addReference(
    id: string,
    companyId: string,
    reference: {
      name: string;
      phone: string;
      relationship: string;
      email?: string;
    },
  ): Promise<Tenant> {
    const tenant = await this.findOne(id, companyId);

    tenant.references = tenant.references || [];
    tenant.references.push(reference);

    return this.tenantsRepository.save(tenant);
  }
}
