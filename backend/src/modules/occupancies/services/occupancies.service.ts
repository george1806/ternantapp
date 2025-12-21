import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Inject,
    forwardRef
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, DataSource } from 'typeorm';
import { Occupancy } from '../entities/occupancy.entity';
import { CreateOccupancyDto } from '../dto/create-occupancy.dto';
import { UpdateOccupancyDto } from '../dto/update-occupancy.dto';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Apartment } from '../../apartments/entities/apartment.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { DashboardService } from '../../dashboard/dashboard.service';

/**
 * Occupancies Service
 * Business logic for occupancy/lease management
 * Includes dashboard cache invalidation for data consistency
 *
 * Author: george1806
 */
@Injectable()
export class OccupanciesService {
    constructor(
        @InjectRepository(Occupancy)
        private occupanciesRepository: Repository<Occupancy>,
        @InjectRepository(Tenant)
        private tenantsRepository: Repository<Tenant>,
        @InjectRepository(Apartment)
        private apartmentsRepository: Repository<Apartment>,
        @InjectRepository(Invoice)
        private invoicesRepository: Repository<Invoice>,
        private dataSource: DataSource,
        @Inject(forwardRef(() => DashboardService))
        private dashboardService: DashboardService
    ) {}

    /**
     * Create a new occupancy
     * Validates tenant and apartment existence, and checks for conflicts
     */
    async create(createDto: CreateOccupancyDto, companyId: string): Promise<Occupancy> {
        // Validate dates
        const startDate = new Date(createDto.leaseStartDate);
        const endDate = new Date(createDto.leaseEndDate);

        if (endDate <= startDate) {
            throw new BadRequestException('Lease end date must be after start date');
        }

        // Validate deposit amounts
        if (createDto.depositPaid && createDto.securityDeposit) {
            if (createDto.depositPaid > createDto.securityDeposit) {
                throw new BadRequestException(
                    `Deposit paid (${createDto.depositPaid}) cannot exceed security deposit (${createDto.securityDeposit})`
                );
            }
        }

        // Verify tenant exists and belongs to company
        const tenant = await this.tenantsRepository.findOne({
            where: { id: createDto.tenantId, companyId, isActive: true }
        });
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        // Verify apartment exists and belongs to company
        const apartment = await this.apartmentsRepository.findOne({
            where: { id: createDto.apartmentId, companyId, isActive: true }
        });
        if (!apartment) {
            throw new NotFoundException('Apartment not found');
        }

        // Check if apartment is already occupied during this period
        const conflictingOccupancy = await this.checkApartmentAvailability(
            createDto.apartmentId,
            companyId,
            startDate,
            endDate
        );

        if (conflictingOccupancy) {
            throw new ConflictException(
                'Apartment is already occupied during this period'
            );
        }

        const occupancy = this.occupanciesRepository.create({
            ...createDto,
            companyId
        });

        const savedOccupancy = await this.occupanciesRepository.save(occupancy);

        // Invalidate dashboard cache after successful creation
        const compoundId = apartment.compoundId;
        await this.dashboardService.invalidateCache(companyId, compoundId, true);

        return savedOccupancy;
    }

    /**
     * Check if an apartment is available for a given period
     */
    async checkApartmentAvailability(
        apartmentId: string,
        companyId: string,
        startDate: Date,
        endDate: Date,
        excludeOccupancyId?: string
    ): Promise<Occupancy | null> {
        const query = this.occupanciesRepository
            .createQueryBuilder('occupancy')
            .where('occupancy.companyId = :companyId', { companyId })
            .andWhere('occupancy.apartmentId = :apartmentId', { apartmentId })
            .andWhere('occupancy.isActive = :isActive', { isActive: true })
            .andWhere('occupancy.status IN (:...statuses)', {
                statuses: ['pending', 'active']
            })
            .andWhere(
                '(occupancy.leaseStartDate <= :endDate AND occupancy.leaseEndDate >= :startDate)',
                { startDate, endDate }
            );

        if (excludeOccupancyId) {
            query.andWhere('occupancy.id != :excludeOccupancyId', {
                excludeOccupancyId
            });
        }

        return query.getOne();
    }

    /**
     * Find all occupancies for a company
     */
    async findAll(
        companyId: string,
        status?: string,
        includeInactive = false
    ): Promise<Occupancy[]> {
        const where: FindOptionsWhere<Occupancy> = { companyId };

        if (!includeInactive) {
            where.isActive = true;
        }

        if (status) {
            where.status = status as any;
        }

        return this.occupanciesRepository.find({
            where,
            relations: ['tenant', 'apartment'],
            order: { leaseStartDate: 'DESC' }
        });
    }

    /**
     * Find occupancies by tenant
     */
    async findByTenant(tenantId: string, companyId: string): Promise<Occupancy[]> {
        return this.occupanciesRepository.find({
            where: { tenantId, companyId, isActive: true },
            relations: ['apartment', 'apartment.compound'],
            order: { leaseStartDate: 'DESC' }
        });
    }

    /**
     * Find occupancies by apartment
     */
    async findByApartment(apartmentId: string, companyId: string): Promise<Occupancy[]> {
        return this.occupanciesRepository.find({
            where: { apartmentId, companyId, isActive: true },
            relations: ['tenant'],
            order: { leaseStartDate: 'DESC' }
        });
    }

    /**
     * Find active occupancies (currently ongoing)
     */
    async findActive(companyId: string): Promise<Occupancy[]> {
        const now = new Date();

        return this.occupanciesRepository.find({
            where: {
                companyId,
                status: 'active',
                isActive: true,
                leaseStartDate: LessThanOrEqual(now),
                leaseEndDate: MoreThanOrEqual(now)
            },
            relations: ['tenant', 'apartment'],
            order: { leaseEndDate: 'ASC' }
        });
    }

    /**
     * Find expiring leases (ending within specified days)
     */
    async findExpiring(companyId: string, daysAhead = 30): Promise<Occupancy[]> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        return this.occupanciesRepository
            .createQueryBuilder('occupancy')
            .where('occupancy.companyId = :companyId', { companyId })
            .andWhere('occupancy.status = :status', { status: 'active' })
            .andWhere('occupancy.isActive = :isActive', { isActive: true })
            .andWhere('occupancy.leaseEndDate >= :now', { now })
            .andWhere('occupancy.leaseEndDate <= :futureDate', { futureDate })
            .leftJoinAndSelect('occupancy.tenant', 'tenant')
            .leftJoinAndSelect('occupancy.apartment', 'apartment')
            .orderBy('occupancy.leaseEndDate', 'ASC')
            .getMany();
    }

    /**
     * Get occupancy statistics
     */
    async getStats(companyId: string): Promise<{
        total: number;
        active: number;
        pending: number;
        ended: number;
        cancelled: number;
        expiringThisMonth: number;
        expiringNextMonth: number;
        averageLeaseDuration: number;
    }> {
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

        const [total, active, pending, ended, cancelled, expiringThisMonth, expiringNextMonth] = await Promise.all([
            this.occupanciesRepository.count({
                where: { companyId, isActive: true }
            }),
            this.occupanciesRepository.count({
                where: { companyId, status: 'active', isActive: true }
            }),
            this.occupanciesRepository.count({
                where: { companyId, status: 'pending', isActive: true }
            }),
            this.occupanciesRepository.count({
                where: { companyId, status: 'ended', isActive: true }
            }),
            this.occupanciesRepository.count({
                where: { companyId, status: 'cancelled', isActive: true }
            }),
            this.occupanciesRepository
                .createQueryBuilder('occupancy')
                .where('occupancy.companyId = :companyId', { companyId })
                .andWhere('occupancy.status = :status', { status: 'active' })
                .andWhere('occupancy.isActive = :isActive', { isActive: true })
                .andWhere('occupancy.leaseEndDate >= :now', { now })
                .andWhere('occupancy.leaseEndDate <= :endOfMonth', { endOfMonth })
                .getCount(),
            this.occupanciesRepository
                .createQueryBuilder('occupancy')
                .where('occupancy.companyId = :companyId', { companyId })
                .andWhere('occupancy.status = :status', { status: 'active' })
                .andWhere('occupancy.isActive = :isActive', { isActive: true })
                .andWhere('occupancy.leaseEndDate > :endOfMonth', { endOfMonth })
                .andWhere('occupancy.leaseEndDate <= :endOfNextMonth', { endOfNextMonth })
                .getCount()
        ]);

        // Calculate average lease duration in days
        const occupanciesWithDates = await this.occupanciesRepository
            .createQueryBuilder('occupancy')
            .select('occupancy.leaseStartDate', 'startDate')
            .addSelect('occupancy.leaseEndDate', 'endDate')
            .where('occupancy.companyId = :companyId', { companyId })
            .andWhere('occupancy.isActive = :isActive', { isActive: true })
            .andWhere('occupancy.status IN (:...statuses)', { statuses: ['active', 'ended'] })
            .getRawMany();

        let averageLeaseDuration = 0;
        if (occupanciesWithDates.length > 0) {
            const totalDays = occupanciesWithDates.reduce((sum, occ) => {
                const start = new Date(occ.startDate);
                const end = new Date(occ.endDate);
                const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                return sum + days;
            }, 0);
            averageLeaseDuration = Math.round(totalDays / occupanciesWithDates.length);
        }

        return {
            total,
            active,
            pending,
            ended,
            cancelled,
            expiringThisMonth,
            expiringNextMonth,
            averageLeaseDuration
        };
    }

    /**
     * Find one occupancy by ID
     */
    async findOne(id: string, companyId: string): Promise<Occupancy> {
        const occupancy = await this.occupanciesRepository.findOne({
            where: { id, companyId, isActive: true },
            relations: ['tenant', 'apartment', 'apartment.compound']
        });

        if (!occupancy) {
            throw new NotFoundException(`Occupancy with ID "${id}" not found`);
        }

        return occupancy;
    }

    /**
     * Update an occupancy
     */
    async update(
        id: string,
        updateDto: UpdateOccupancyDto,
        companyId: string
    ): Promise<Occupancy> {
        const occupancy = await this.findOne(id, companyId);

        // If updating dates, validate and check conflicts
        if (updateDto.leaseStartDate || updateDto.leaseEndDate) {
            const startDate = updateDto.leaseStartDate
                ? new Date(updateDto.leaseStartDate)
                : occupancy.leaseStartDate;
            const endDate = updateDto.leaseEndDate
                ? new Date(updateDto.leaseEndDate)
                : occupancy.leaseEndDate;

            if (endDate <= startDate) {
                throw new BadRequestException('Lease end date must be after start date');
            }

            // Check for conflicts if changing dates
            const conflict = await this.checkApartmentAvailability(
                occupancy.apartmentId,
                companyId,
                startDate,
                endDate,
                id
            );

            if (conflict) {
                throw new ConflictException(
                    'Apartment is already occupied during this period'
                );
            }
        }

        Object.assign(occupancy, updateDto);
        const savedOccupancy = await this.occupanciesRepository.save(occupancy);

        // Invalidate dashboard cache after successful update
        const compoundId = occupancy.apartment?.compoundId;
        await this.dashboardService.invalidateCache(companyId, compoundId, true);

        return savedOccupancy;
    }

    /**
     * Update occupancy status
     * Invalidates dashboard cache after successful status update
     */
    async updateStatus(
        id: string,
        status: 'pending' | 'active' | 'ended' | 'cancelled',
        companyId: string
    ): Promise<Occupancy> {
        const occupancy = await this.findOne(id, companyId);

        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
            pending: ['active', 'cancelled'],
            active: ['ended', 'cancelled'],
            ended: ['cancelled'],
            cancelled: []
        };

        if (!validTransitions[occupancy.status]?.includes(status)) {
            throw new BadRequestException(
                `Cannot transition from ${occupancy.status} to ${status}`
            );
        }

        occupancy.status = status;
        const savedOccupancy = await this.occupanciesRepository.save(occupancy);

        // Invalidate dashboard cache after successful status update
        const compoundId = occupancy.apartment?.compoundId;
        await this.dashboardService.invalidateCache(companyId, compoundId, true);

        return savedOccupancy;
    }

    /**
     * Mark occupancy as ended (lease completed)
     * Updates apartment status to available and invalidates cache
     */
    async endOccupancy(
        id: string,
        companyId: string,
        moveOutDate: string,
        notes?: string
    ): Promise<Occupancy> {
        const occupancy = await this.findOne(id, companyId);

        if (occupancy.status === 'ended') {
            throw new BadRequestException('Occupancy is already ended');
        }

        if (occupancy.status === 'cancelled') {
            throw new BadRequestException('Cannot end a cancelled occupancy');
        }

        // Update occupancy
        occupancy.status = 'ended';
        occupancy.moveOutDate = new Date(moveOutDate);
        if (notes) {
            occupancy.notes = occupancy.notes ? `${occupancy.notes}\n\n[End of Lease Notes]\n${notes}` : notes;
        }

        const savedOccupancy = await this.occupanciesRepository.save(occupancy);

        // Update apartment status to available
        if (occupancy.apartment) {
            await this.apartmentsRepository.update(
                { id: occupancy.apartmentId, companyId },
                { status: 'available' }
            );
        }

        // Invalidate dashboard cache
        const compoundId = occupancy.apartment?.compoundId;
        await this.dashboardService.invalidateCache(companyId, compoundId, true);

        return savedOccupancy;
    }

    /**
     * Cancel an occupancy (marks as cancelled)
     * Updates apartment status to available and invalidates cache
     */
    async cancelOccupancy(
        id: string,
        companyId: string,
        reason: string
    ): Promise<Occupancy> {
        const occupancy = await this.findOne(id, companyId);

        if (occupancy.status === 'ended') {
            throw new BadRequestException('Cannot cancel an already ended occupancy');
        }

        if (occupancy.status === 'cancelled') {
            throw new BadRequestException('Occupancy is already cancelled');
        }

        // Update occupancy
        occupancy.status = 'cancelled';
        occupancy.notes = occupancy.notes
            ? `${occupancy.notes}\n\n[Cancellation Reason]\n${reason}`
            : `[Cancellation Reason]\n${reason}`;

        const savedOccupancy = await this.occupanciesRepository.save(occupancy);

        // Update apartment status to available
        if (occupancy.apartment) {
            await this.apartmentsRepository.update(
                { id: occupancy.apartmentId, companyId },
                { status: 'available' }
            );
        }

        // Invalidate dashboard cache
        const compoundId = occupancy.apartment?.compoundId;
        await this.dashboardService.invalidateCache(companyId, compoundId, true);

        return savedOccupancy;
    }

    /**
     * Record deposit payment
     */
    async recordDepositPayment(
        id: string,
        companyId: string,
        amount: number
    ): Promise<Occupancy> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const occupancy = await queryRunner.manager.findOne(Occupancy, {
                where: { id, companyId, isActive: true }
            });

            if (!occupancy) {
                throw new NotFoundException(`Occupancy with ID "${id}" not found`);
            }

            const currentDeposit = Number(occupancy.depositPaid) || 0;
            const securityDeposit = Number(occupancy.securityDeposit) || 0;
            const newTotal = currentDeposit + amount;

            if (newTotal > securityDeposit) {
                throw new BadRequestException(
                    'Deposit payment exceeds required security deposit'
                );
            }

            occupancy.depositPaid = newTotal;
            const saved = await queryRunner.manager.save(Occupancy, occupancy);

            await queryRunner.commitTransaction();
            return saved;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Soft delete (deactivate) an occupancy and cascade delete its invoices
     * Invalidates dashboard cache after successful deletion
     */
    async remove(id: string, companyId: string): Promise<void> {
        const occupancy = await this.findOne(id, companyId);

        // Business rule: Can only delete if status is pending or cancelled
        if (occupancy.status === 'active') {
            throw new BadRequestException(
                'Cannot delete an active occupancy. End it first.'
            );
        }

        // Cascade: soft delete all invoices for this occupancy
        await this.invoicesRepository.update(
            { occupancyId: id, companyId, isActive: true },
            { isActive: false }
        );

        occupancy.isActive = false;
        await this.occupanciesRepository.save(occupancy);

        // Invalidate dashboard cache after successful deletion
        const compoundId = occupancy.apartment?.compoundId;
        await this.dashboardService.invalidateCache(companyId, compoundId, true);
    }

    /**
     * Reactivate a deactivated occupancy
     */
    async activate(id: string, companyId: string): Promise<Occupancy> {
        const occupancy = await this.occupanciesRepository.findOne({
            where: { id, companyId }
        });

        if (!occupancy) {
            throw new NotFoundException(`Occupancy with ID "${id}" not found`);
        }

        // Check for conflicts before reactivating
        const leaseStart = new Date(occupancy.leaseStartDate);
        const leaseEnd = new Date(occupancy.leaseEndDate);

        const conflicts = await this.occupanciesRepository.find({
            where: {
                apartmentId: occupancy.apartmentId,
                companyId,
                isActive: true,
                status: 'active',
                id: occupancy.id // Exclude self
            }
        });

        // Filter conflicts that overlap with lease dates
        const hasConflict = conflicts.some((other) => {
            const otherStart = new Date(other.leaseStartDate);
            const otherEnd = new Date(other.leaseEndDate);
            return leaseStart < otherEnd && leaseEnd > otherStart;
        });

        if (hasConflict) {
            throw new ConflictException(
                'Apartment is already occupied during this lease period'
            );
        }

        occupancy.isActive = true;
        return this.occupanciesRepository.save(occupancy);
    }
}
