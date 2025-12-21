import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Inject,
    forwardRef
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { Apartment } from '../entities/apartment.entity';
import { CreateApartmentDto } from '../dto/create-apartment.dto';
import { UpdateApartmentDto } from '../dto/update-apartment.dto';
import { Compound } from '../../compounds/entities/compound.entity';
import { Occupancy } from '../../occupancies/entities/occupancy.entity';
import { DashboardService } from '../../dashboard/dashboard.service';

/**
 * Apartments Service
 * Business logic for apartment management with dashboard cache invalidation
 *
 * Author: george1806
 */
@Injectable()
export class ApartmentsService {
    constructor(
        @InjectRepository(Apartment)
        private apartmentsRepository: Repository<Apartment>,
        @InjectRepository(Compound)
        private compoundsRepository: Repository<Compound>,
        @InjectRepository(Occupancy)
        private occupanciesRepository: Repository<Occupancy>,
        @Inject(forwardRef(() => DashboardService))
        private dashboardService: DashboardService
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
     * Find all apartments for a company with pagination
     * Supports filtering by compound and status
     */
    async findAll(
        companyId: string,
        page: number = 1,
        limit: number = 10,
        filters?: { compoundId?: string; status?: string; search?: string }
    ): Promise<{ data: Apartment[]; total: number }> {
        const skip = (page - 1) * limit;

        const query = this.apartmentsRepository
            .createQueryBuilder('apartment')
            .where('apartment.companyId = :companyId', { companyId })
            .andWhere('apartment.isActive = :isActive', { isActive: true })
            .leftJoinAndSelect('apartment.compound', 'compound');

        if (filters?.compoundId) {
            query.andWhere('apartment.compoundId = :compoundId', { compoundId: filters.compoundId });
        }

        if (filters?.status) {
            query.andWhere('apartment.status = :status', { status: filters.status });
        }

        if (filters?.search) {
            query.andWhere(
                '(apartment.unitNumber LIKE :search OR apartment.notes LIKE :search)',
                { search: `%${filters.search}%` }
            );
        }

        query.orderBy('apartment.unitNumber', 'ASC');

        const [data, total] = await query
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return { data, total };
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
     * Get available apartments count optionally filtered by compound
     */
    async getAvailabilityStats(companyId: string, compoundId?: string): Promise<{
        total: number;
        available: number;
        occupied: number;
        maintenance: number;
        reserved: number;
        occupancyRate: number;
    }> {
        const baseWhere = { companyId, isActive: true, ...(compoundId && { compoundId }) };

        const [total, available, occupied, maintenance, reserved] = await Promise.all([
            this.apartmentsRepository.count({
                where: baseWhere
            }),
            this.apartmentsRepository.count({
                where: { ...baseWhere, status: 'available' }
            }),
            this.apartmentsRepository.count({
                where: { ...baseWhere, status: 'occupied' }
            }),
            this.apartmentsRepository.count({
                where: { ...baseWhere, status: 'maintenance' }
            }),
            this.apartmentsRepository.count({
                where: { ...baseWhere, status: 'reserved' }
            })
        ]);

        const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;

        return { total, available, occupied, maintenance, reserved, occupancyRate };
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
     * Invalidates dashboard cache after successful status update
     */
    async updateStatus(
        id: string,
        status: 'available' | 'occupied' | 'maintenance' | 'reserved',
        companyId: string
    ): Promise<Apartment> {
        const apartment = await this.findOne(id, companyId);
        apartment.status = status;
        const savedApartment = await this.apartmentsRepository.save(apartment);

        // Invalidate dashboard cache after successful status update
        const compoundId = apartment.compound?.id;
        await this.dashboardService.invalidateCache(companyId, compoundId, true);

        return savedApartment;
    }

    /**
     * Get current active occupancy for an apartment
     */
    async getCurrentOccupancy(
        apartmentId: string,
        companyId: string
    ): Promise<Occupancy | null> {
        // First verify apartment exists and belongs to company
        await this.findOne(apartmentId, companyId);

        const occupancy = await this.occupanciesRepository.findOne({
            where: {
                apartmentId,
                companyId,
                status: 'active',
                isActive: true
            },
            relations: ['tenant', 'apartment', 'apartment.compound']
        });

        return occupancy;
    }

    /**
     * Get occupancy history for an apartment
     */
    async getOccupancyHistory(
        apartmentId: string,
        companyId: string
    ): Promise<Occupancy[]> {
        // First verify apartment exists and belongs to company
        await this.findOne(apartmentId, companyId);

        const occupancies = await this.occupanciesRepository.find({
            where: {
                apartmentId,
                companyId,
                isActive: true
            },
            relations: ['tenant'],
            order: { createdAt: 'DESC' }
        });

        return occupancies;
    }

    /**
     * Get financial summary for an apartment
     */
    async getFinancialSummary(
        apartmentId: string,
        companyId: string
    ): Promise<{
        totalRevenue: number;
        currentMonthlyRevenue: number;
        totalDaysRented: number;
        totalDaysVacant: number;
        occupancyRate: number;
    }> {
        // First verify apartment exists and belongs to company
        const apartment = await this.findOne(apartmentId, companyId);

        // Get all completed and active occupancies
        const occupancies = await this.occupanciesRepository.find({
            where: {
                apartmentId,
                companyId,
                isActive: true
            }
        });

        let totalRevenue = 0;
        let totalDaysRented = 0;
        let currentMonthlyRevenue = 0;

        const now = new Date();

        for (const occupancy of occupancies) {
            const startDate = new Date(occupancy.leaseStartDate);
            const endDate = occupancy.status === 'ended' && occupancy.moveOutDate
                ? new Date(occupancy.moveOutDate)
                : occupancy.status === 'active'
                    ? now
                    : new Date(occupancy.leaseEndDate);

            // Calculate days rented
            const daysRented = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            totalDaysRented += daysRented;

            // Calculate revenue (days * daily rent)
            const monthlyRent = occupancy.monthlyRent;
            const dailyRent = monthlyRent / 30;
            totalRevenue += daysRented * dailyRent;

            // Add to current monthly revenue if active
            if (occupancy.status === 'active') {
                currentMonthlyRevenue += monthlyRent;
            }
        }

        // Calculate total days since apartment was created
        const apartmentCreatedDate = new Date(apartment.createdAt);
        const totalDays = Math.floor((now.getTime() - apartmentCreatedDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalDaysVacant = totalDays - totalDaysRented;

        // Calculate occupancy rate
        const occupancyRate = totalDays > 0 ? (totalDaysRented / totalDays) * 100 : 0;

        return {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            currentMonthlyRevenue,
            totalDaysRented,
            totalDaysVacant: Math.max(0, totalDaysVacant),
            occupancyRate: Math.round(occupancyRate * 100) / 100
        };
    }
}
