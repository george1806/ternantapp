import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { Compound } from '../../compounds/entities/compound.entity';
import { Apartment } from '../../apartments/entities/apartment.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Occupancy } from '../../occupancies/entities/occupancy.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { UsersService } from '../../users/services/users.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CompanyStatsDto } from '../dto/company-stats.dto';
import { UserRole, UserStatus } from '../../../common/enums';

/**
 * Super Admin Companies Service
 * Handles company management for super admins
 */
@Injectable()
export class SuperAdminCompaniesService {
    constructor(
        @InjectRepository(Company)
        private readonly companyRepository: Repository<Company>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Compound)
        private readonly compoundRepository: Repository<Compound>,
        @InjectRepository(Apartment)
        private readonly apartmentRepository: Repository<Apartment>,
        @InjectRepository(Tenant)
        private readonly tenantRepository: Repository<Tenant>,
        @InjectRepository(Occupancy)
        private readonly occupancyRepository: Repository<Occupancy>,
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
        private readonly usersService: UsersService
    ) {}

    /**
     * Get all companies with pagination and filters
     */
    async findAll(filters: {
        page: number;
        limit: number;
        search?: string;
        status?: string;
    }) {
        const { page, limit, search, status } = filters;
        const skip = (page - 1) * limit;

        const queryBuilder = this.companyRepository
            .createQueryBuilder('company')
            .leftJoinAndSelect('company.users', 'users');

        // Apply search filter
        if (search) {
            queryBuilder.where(
                'company.name LIKE :search OR company.slug LIKE :search OR company.email LIKE :search',
                { search: `%${search}%` }
            );
        }

        // Apply status filter
        if (status) {
            queryBuilder.andWhere('company.status = :status', { status });
        }

        // Order by creation date
        queryBuilder.orderBy('company.createdAt', 'DESC');

        // Apply pagination
        const [companies, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return {
            data: companies,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get company by ID with full details
     */
    async findOne(id: string) {
        const company = await this.companyRepository.findOne({
            where: { id },
            relations: ['users']
        });

        if (!company) {
            throw new NotFoundException('Company not found');
        }

        return company;
    }

    /**
     * Get company statistics
     */
    async getCompanyStats(id: string): Promise<CompanyStatsDto> {
        const company = await this.findOne(id);

        // Get property stats
        const totalProperties = await this.compoundRepository.count({
            where: { companyId: id }
        });

        const totalApartments = await this.apartmentRepository.count({
            where: { companyId: id }
        });

        const occupiedApartments = await this.apartmentRepository.count({
            where: { companyId: id, status: 'occupied' }
        });

        const availableApartments = await this.apartmentRepository.count({
            where: { companyId: id, status: 'available' }
        });

        const occupancyRate =
            totalApartments > 0
                ? Math.round((occupiedApartments / totalApartments) * 100)
                : 0;

        // Get tenant stats
        const totalTenants = await this.tenantRepository.count({
            where: { companyId: id }
        });

        const activeTenants = await this.tenantRepository.count({
            where: { companyId: id, status: 'active' }
        });

        // Get financial stats
        const totalInvoices = await this.invoiceRepository.count({
            where: { companyId: id }
        });

        const paidInvoices = await this.invoiceRepository.count({
            where: { companyId: id, status: 'paid' }
        });

        const pendingInvoices = await this.invoiceRepository.count({
            where: { companyId: id, status: 'sent' }
        });

        const overdueInvoices = await this.invoiceRepository.count({
            where: { companyId: id, status: 'overdue' }
        });

        // Calculate revenue
        const revenueResult = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.amountPaid)', 'totalRevenue')
            .where('invoice.companyId = :id', { id })
            .getRawOne();

        const outstandingResult = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.totalAmount - invoice.amountPaid)', 'outstanding')
            .where('invoice.companyId = :id', { id })
            .andWhere('invoice.status != :status', { status: 'PAID' })
            .getRawOne();

        // Get user stats
        const totalUsers = await this.userRepository.count({
            where: { companyId: id }
        });

        const activeUsers = await this.userRepository.count({
            where: { companyId: id, status: UserStatus.ACTIVE }
        });

        // Get last activity (last login of any user)
        const lastActiveUser = await this.userRepository.findOne({
            where: { companyId: id },
            order: { lastLoginAt: 'DESC' }
        });

        return {
            companyId: company.id,
            companyName: company.name,
            totalProperties,
            totalApartments,
            occupiedApartments,
            availableApartments,
            occupancyRate,
            totalTenants,
            activeTenants,
            totalInvoices,
            paidInvoices,
            pendingInvoices,
            overdueInvoices,
            totalRevenue: parseFloat(revenueResult?.totalRevenue || '0'),
            outstandingBalance: parseFloat(outstandingResult?.outstanding || '0'),
            totalUsers,
            activeUsers,
            lastActivity: lastActiveUser?.lastLoginAt,
            createdAt: company.createdAt
        };
    }

    /**
     * Get platform-wide statistics
     */
    async getPlatformStats() {
        const totalCompanies = await this.companyRepository.count();
        const activeCompanies = await this.companyRepository.count({
            where: { isActive: true }
        });
        const suspendedCompanies = await this.companyRepository.count({
            where: { isActive: false }
        });

        const totalProperties = await this.compoundRepository.count();
        const totalApartments = await this.apartmentRepository.count();
        const totalTenants = await this.tenantRepository.count();
        const totalUsers = await this.userRepository.count({
            where: { isSuperAdmin: false }
        });

        // Total revenue across all companies
        const revenueResult = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.amountPaid)', 'totalRevenue')
            .getRawOne();

        const totalInvoices = await this.invoiceRepository.count();
        const paidInvoices = await this.invoiceRepository.count({
            where: { status: 'paid' }
        });

        return {
            companies: {
                total: totalCompanies,
                active: activeCompanies,
                suspended: suspendedCompanies
            },
            properties: {
                total: totalProperties,
                averagePerCompany:
                    totalCompanies > 0 ? Math.round(totalProperties / totalCompanies) : 0
            },
            apartments: {
                total: totalApartments
            },
            tenants: {
                total: totalTenants
            },
            users: {
                total: totalUsers
            },
            financials: {
                totalRevenue: parseFloat(revenueResult?.totalRevenue || '0'),
                totalInvoices,
                paidInvoices,
                collectionRate:
                    totalInvoices > 0
                        ? Math.round((paidInvoices / totalInvoices) * 100)
                        : 0
            }
        };
    }

    /**
     * Create a new company with owner
     */
    async create(createCompanyDto: CreateCompanyDto) {
        // Check if company slug already exists
        const existingCompany = await this.companyRepository.findOne({
            where: { slug: createCompanyDto.slug }
        });

        if (existingCompany) {
            throw new ConflictException('Company with this slug already exists');
        }

        // Check if owner email is already taken
        const existingUser = await this.userRepository.findOne({
            where: { email: createCompanyDto.ownerEmail }
        });

        if (existingUser) {
            throw new ConflictException('Email address is already registered');
        }

        // Create company
        const company = this.companyRepository.create({
            name: createCompanyDto.name,
            slug: createCompanyDto.slug,
            email: createCompanyDto.email,
            phone: createCompanyDto.phone,
            currency: createCompanyDto.currency || 'USD',
            timezone: createCompanyDto.timezone || 'UTC',
            isActive: true
        });

        const savedCompany = await this.companyRepository.save(company);

        // Create owner user
        const owner = await this.usersService.create(savedCompany.id, {
            firstName: createCompanyDto.ownerFirstName,
            lastName: createCompanyDto.ownerLastName,
            email: createCompanyDto.ownerEmail,
            password: createCompanyDto.ownerPassword,
            role: UserRole.OWNER,
            phone: createCompanyDto.ownerPhone
        });

        return {
            company: savedCompany,
            owner
        };
    }

    /**
     * Update company details
     */
    async update(id: string, updateCompanyDto: UpdateCompanyDto) {
        const company = await this.findOne(id);

        Object.assign(company, updateCompanyDto);

        return this.companyRepository.save(company);
    }

    /**
     * Suspend a company
     */
    async suspend(id: string) {
        const company = await this.findOne(id);
        company.isActive = false;
        return this.companyRepository.save(company);
    }

    /**
     * Activate a company
     */
    async activate(id: string) {
        const company = await this.findOne(id);
        company.isActive = true;
        return this.companyRepository.save(company);
    }

    /**
     * Delete a company (soft delete)
     */
    async remove(id: string) {
        const company = await this.findOne(id);
        await this.companyRepository.softRemove(company);
    }
}
