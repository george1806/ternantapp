import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { Apartment } from '../entities/apartment.entity';
import { CreateApartmentDto } from '../dto/create-apartment.dto';
import { UpdateApartmentDto } from '../dto/update-apartment.dto';
import { Compound } from '../../compounds/entities/compound.entity';

/**
 * Apartments Service
 * Business logic for apartment management
 *
 * Author: george1806
 */
@Injectable()
export class ApartmentsService {
    constructor(
        @InjectRepository(Apartment)
        private apartmentsRepository: Repository<Apartment>,
        @InjectRepository(Compound)
        private compoundsRepository: Repository<Compound>
    ) {}

    /**
     * Create a new apartment
     * Validates compound exists and unit number is unique within compound
     */
    async create(createDto: CreateApartmentDto, companyId: string): Promise<Apartment> {
        // Verify compound exists and belongs to company
        const compound = await this.compoundsRepository.findOne({
            where: { id: createDto.compoundId, companyId }
        });

        if (!compound) {
            throw new BadRequestException(
                'Compound not found or does not belong to your company'
            );
        }

        // Check for duplicate unit number in same compound
        const existing = await this.apartmentsRepository.findOne({
            where: {
                companyId,
                compoundId: createDto.compoundId,
                unitNumber: createDto.unitNumber
            }
        });

        if (existing) {
            throw new ConflictException(
                `Unit number '${createDto.unitNumber}' already exists in this compound`
            );
        }

        const apartment = this.apartmentsRepository.create({
            ...createDto,
            companyId
        });

        return this.apartmentsRepository.save(apartment);
    }

    /**
     * Find all apartments for a company
     * Supports filtering by compound and status
     */
    async findAll(
        companyId: string,
        compoundId?: string,
        status?: string
    ): Promise<Apartment[]> {
        const where: FindOptionsWhere<Apartment> = {
            companyId,
            isActive: true
        };

        if (compoundId) {
            where.compoundId = compoundId;
        }

        if (status) {
            where.status = status as any;
        }

        return this.apartmentsRepository.find({
            where,
            relations: ['compound'],
            order: { unitNumber: 'ASC' }
        });
    }

    /**
     * Search apartments by unit number or notes
     */
    async search(companyId: string, query: string): Promise<Apartment[]> {
        return this.apartmentsRepository.find({
            where: [
                { companyId, unitNumber: Like(`%${query}%`), isActive: true },
                { companyId, notes: Like(`%${query}%`), isActive: true }
            ],
            relations: ['compound'],
            order: { unitNumber: 'ASC' },
            take: 50 // Limit results for performance
        });
    }

    /**
     * Count apartments with optional filters
     */
    async count(
        companyId: string,
        compoundId?: string,
        status?: string
    ): Promise<number> {
        const where: FindOptionsWhere<Apartment> = {
            companyId,
            isActive: true
        };

        if (compoundId) {
            where.compoundId = compoundId;
        }

        if (status) {
            where.status = status as any;
        }

        return this.apartmentsRepository.count({ where });
    }

    /**
     * Get available apartments count by compound
     */
    async getAvailabilityStats(companyId: string): Promise<{
        total: number;
        available: number;
        occupied: number;
        maintenance: number;
        reserved: number;
    }> {
        const [total, available, occupied, maintenance, reserved] = await Promise.all([
            this.apartmentsRepository.count({
                where: { companyId, isActive: true }
            }),
            this.apartmentsRepository.count({
                where: { companyId, status: 'available', isActive: true }
            }),
            this.apartmentsRepository.count({
                where: { companyId, status: 'occupied', isActive: true }
            }),
            this.apartmentsRepository.count({
                where: { companyId, status: 'maintenance', isActive: true }
            }),
            this.apartmentsRepository.count({
                where: { companyId, status: 'reserved', isActive: true }
            })
        ]);

        return { total, available, occupied, maintenance, reserved };
    }

    /**
     * Find one apartment by ID
     */
    async findOne(id: string, companyId: string): Promise<Apartment> {
        const apartment = await this.apartmentsRepository.findOne({
            where: { id, companyId },
            relations: ['compound']
        });

        if (!apartment) {
            throw new NotFoundException(`Apartment with ID "${id}" not found`);
        }

        return apartment;
    }

    /**
     * Update an apartment
     */
    async update(
        id: string,
        updateDto: UpdateApartmentDto,
        companyId: string
    ): Promise<Apartment> {
        const apartment = await this.findOne(id, companyId);

        // If updating unit number, check for duplicates
        if (updateDto.unitNumber && updateDto.unitNumber !== apartment.unitNumber) {
            const existing = await this.apartmentsRepository.findOne({
                where: {
                    companyId,
                    compoundId: apartment.compoundId,
                    unitNumber: updateDto.unitNumber
                }
            });

            if (existing) {
                throw new ConflictException(
                    `Unit number '${updateDto.unitNumber}' already exists in this compound`
                );
            }
        }

        Object.assign(apartment, updateDto);
        return this.apartmentsRepository.save(apartment);
    }

    /**
     * Soft delete (deactivate) an apartment
     */
    async remove(id: string, companyId: string): Promise<void> {
        const apartment = await this.findOne(id, companyId);

        // Business rule: Cannot delete occupied apartments
        if (apartment.status === 'occupied') {
            throw new BadRequestException(
                'Cannot delete an occupied apartment. Please end the occupancy first.'
            );
        }

        apartment.isActive = false;
        await this.apartmentsRepository.save(apartment);
    }

    /**
     * Reactivate a deactivated apartment
     */
    async activate(id: string, companyId: string): Promise<Apartment> {
        const apartment = await this.apartmentsRepository.findOne({
            where: { id, companyId },
            relations: ['compound']
        });

        if (!apartment) {
            throw new NotFoundException(`Apartment with ID "${id}" not found`);
        }

        apartment.isActive = true;
        return this.apartmentsRepository.save(apartment);
    }

    /**
     * Update apartment status
     */
    async updateStatus(
        id: string,
        status: 'available' | 'occupied' | 'maintenance' | 'reserved',
        companyId: string
    ): Promise<Apartment> {
        const apartment = await this.findOne(id, companyId);
        apartment.status = status;
        return this.apartmentsRepository.save(apartment);
    }
}
