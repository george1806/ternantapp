import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Compound } from '../entities/compound.entity';
import { CreateCompoundDto } from '../dto/create-compound.dto';
import { UpdateCompoundDto } from '../dto/update-compound.dto';

/**
 * Compounds Service
 * Manages building/location entities with caching
 *
 * Author: george1806
 */
@Injectable()
export class CompoundsService {
    constructor(
        @InjectRepository(Compound)
        private readonly compoundRepository: Repository<Compound>,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache
    ) {}

    /**
     * Create a new compound
     */
    async create(
        companyId: string,
        createCompoundDto: CreateCompoundDto
    ): Promise<Compound> {
        const compound = this.compoundRepository.create({
            ...createCompoundDto,
            companyId,
            isActive: createCompoundDto.isActive ?? true
        });

        const saved = await this.compoundRepository.save(compound);
        await this.cacheCompound(saved);

        return saved;
    }

    /**
     * Find all compounds for a company
     */
    async findAll(companyId: string, includeInactive = false): Promise<Compound[]> {
        const where: any = { companyId };

        if (!includeInactive) {
            where.isActive = true;
        }

        return this.compoundRepository.find({
            where,
            order: { name: 'ASC' }
        });
    }

    /**
     * Find compound by ID with caching
     */
    async findOne(id: string, companyId: string): Promise<Compound> {
        const cacheKey = `compound:${id}`;

        // Try cache first
        const cached = await this.cacheManager.get<Compound>(cacheKey);
        if (cached && cached.companyId === companyId) {
            return cached;
        }

        // Fetch from database
        const compound = await this.compoundRepository.findOne({
            where: { id, companyId }
        });

        if (!compound) {
            throw new NotFoundException(`Compound with ID ${id} not found`);
        }

        // Cache for 5 minutes
        await this.cacheCompound(compound);

        return compound;
    }

    /**
     * Find compound with apartments count
     */
    async findOneWithStats(id: string, companyId: string): Promise<Compound> {
        const compound = await this.compoundRepository
            .createQueryBuilder('compound')
            .leftJoinAndSelect('compound.apartments', 'apartments')
            .where('compound.id = :id', { id })
            .andWhere('compound.companyId = :companyId', { companyId })
            .getOne();

        if (!compound) {
            throw new NotFoundException(`Compound with ID ${id} not found`);
        }

        return compound;
    }

    /**
     * Update compound
     */
    async update(
        id: string,
        companyId: string,
        updateCompoundDto: UpdateCompoundDto
    ): Promise<Compound> {
        const compound = await this.findOne(id, companyId);

        Object.assign(compound, updateCompoundDto);
        const updated = await this.compoundRepository.save(compound);

        // Invalidate and refresh cache
        await this.invalidateCache(id);
        await this.cacheCompound(updated);

        return updated;
    }

    /**
     * Soft delete compound (deactivate)
     */
    async remove(id: string, companyId: string): Promise<void> {
        const compound = await this.findOne(id, companyId);

        compound.isActive = false;
        await this.compoundRepository.save(compound);

        // Invalidate cache
        await this.invalidateCache(id);
    }

    /**
     * Activate compound
     */
    async activate(id: string, companyId: string): Promise<Compound> {
        const compound = await this.compoundRepository.findOne({
            where: { id, companyId }
        });

        if (!compound) {
            throw new NotFoundException(`Compound with ID ${id} not found`);
        }

        compound.isActive = true;
        const updated = await this.compoundRepository.save(compound);

        // Refresh cache
        await this.cacheCompound(updated);

        return updated;
    }

    /**
     * Search compounds by name or location
     */
    async search(companyId: string, searchTerm: string): Promise<Compound[]> {
        return this.compoundRepository
            .createQueryBuilder('compound')
            .where('compound.companyId = :companyId', { companyId })
            .andWhere('compound.isActive = :isActive', { isActive: true })
            .andWhere(
                '(compound.name LIKE :search OR compound.city LIKE :search OR compound.addressLine LIKE :search)',
                { search: `%${searchTerm}%` }
            )
            .orderBy('compound.name', 'ASC')
            .getMany();
    }

    /**
     * Count compounds by company
     */
    async countByCompany(companyId: string): Promise<number> {
        return this.compoundRepository.count({
            where: { companyId, isActive: true }
        });
    }

    /**
     * Cache compound by ID
     */
    private async cacheCompound(compound: Compound): Promise<void> {
        const ttl = 300000; // 5 minutes
        await this.cacheManager.set(`compound:${compound.id}`, compound, ttl);
    }

    /**
     * Invalidate compound cache
     */
    private async invalidateCache(id: string): Promise<void> {
        await this.cacheManager.del(`compound:${id}`);
    }
}
