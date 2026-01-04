import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';
import { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from '../dto/users.dto';
import { UserStatus, UserRole } from '../../../common/enums';

/**
 * Super Admin Users Service
 * Handles all platform user management operations
 *
 * Author: george1806
 */
@Injectable()
export class SuperAdminUsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Company)
        private readonly companyRepository: Repository<Company>
    ) {}

    /**
     * List all platform users with pagination and filters
     */
    async listUsers(query: ListUsersQueryDto) {
        const {
            page = 1,
            limit = 20,
            search,
            companyId,
            role,
            status,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = query;

        const where: FindOptionsWhere<User> = {};

        // Apply filters
        if (companyId) {
            where.companyId = companyId;
        }

        if (role) {
            where.role = role;
        }

        if (status) {
            where.status = status;
        }

        // Build query
        const queryBuilder = this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company');

        // Apply where conditions
        if (Object.keys(where).length > 0) {
            queryBuilder.where(where);
        }

        // Apply search
        if (search) {
            queryBuilder.andWhere(
                '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search)',
                { search: `%${search}%` }
            );
        }

        // Apply sorting
        const sortField = sortBy === 'name' ? 'user.firstName' : `user.${sortBy}`;
        queryBuilder.orderBy(sortField, sortOrder);

        // Apply pagination
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        // Execute query
        const [users, total] = await queryBuilder.getManyAndCount();

        return {
            data: users.map((user) => this.sanitizeUser(user)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get platform-wide user statistics
     */
    async getUserStats() {
        const [
            totalUsers,
            activeUsers,
            suspendedUsers,
            ownerCount,
            adminCount,
            staffCount
        ] = await Promise.all([
            this.userRepository.count({ where: { isSuperAdmin: false } }),
            this.userRepository.count({
                where: { status: UserStatus.ACTIVE, isSuperAdmin: false }
            }),
            this.userRepository.count({
                where: { status: UserStatus.SUSPENDED, isSuperAdmin: false }
            }),
            this.userRepository.count({ where: { role: UserRole.OWNER } }),
            this.userRepository.count({ where: { role: UserRole.ADMIN } }),
            this.userRepository.count({ where: { role: UserRole.STAFF } })
        ]);

        // Get recent users
        const recentUsers = await this.userRepository.find({
            where: { isSuperAdmin: false },
            relations: ['company'],
            order: { createdAt: 'DESC' },
            take: 10
        });

        return {
            totalUsers,
            activeUsers,
            suspendedUsers,
            usersByRole: {
                owners: ownerCount,
                admins: adminCount,
                staff: staffCount
            },
            recentUsers: recentUsers.map((user) => this.sanitizeUser(user))
        };
    }

    /**
     * Get user by ID
     */
    async getUserById(id: string) {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['company']
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return this.sanitizeUser(user);
    }

    /**
     * Create a new user
     */
    async createUser(createUserDto: CreateUserDto) {
        // Check if company exists
        const company = await this.companyRepository.findOne({
            where: { id: createUserDto.companyId }
        });

        if (!company) {
            throw new NotFoundException(
                `Company with ID ${createUserDto.companyId} not found`
            );
        }

        // Check if email already exists
        const existingUser = await this.userRepository.findOne({
            where: { email: createUserDto.email }
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(createUserDto.password, 12);

        // Create user
        const user = this.userRepository.create({
            companyId: createUserDto.companyId,
            firstName: createUserDto.firstName,
            lastName: createUserDto.lastName,
            email: createUserDto.email,
            passwordHash,
            role: createUserDto.role,
            status: UserStatus.ACTIVE,
            ...(createUserDto.phone && { profile: { phone: createUserDto.phone } })
        });

        const savedUser = await this.userRepository.save(user);

        // Load with relations
        const userWithRelations = await this.userRepository.findOne({
            where: { id: (savedUser as User).id },
            relations: ['company']
        });

        if (!userWithRelations) {
            throw new NotFoundException('User not found after creation');
        }

        return this.sanitizeUser(userWithRelations);
    }

    /**
     * Update user
     */
    async updateUser(id: string, updateUserDto: UpdateUserDto) {
        const user = await this.userRepository.findOne({ where: { id } });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        // Prevent modifying super admin
        if (user.isSuperAdmin) {
            throw new BadRequestException('Cannot modify super admin user');
        }

        // Check email uniqueness if email is being updated
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingUser = await this.userRepository.findOne({
                where: { email: updateUserDto.email }
            });

            if (existingUser) {
                throw new ConflictException('User with this email already exists');
            }
        }

        // Update fields
        if (updateUserDto.firstName) user.firstName = updateUserDto.firstName;
        if (updateUserDto.lastName) user.lastName = updateUserDto.lastName;
        if (updateUserDto.email) user.email = updateUserDto.email;
        if (updateUserDto.role) user.role = updateUserDto.role;
        if (updateUserDto.status) user.status = updateUserDto.status;

        if (updateUserDto.password) {
            user.passwordHash = await bcrypt.hash(updateUserDto.password, 12);
        }

        if (updateUserDto.phone) {
            user.profile = { ...user.profile, phone: updateUserDto.phone };
        }

        await this.userRepository.save(user);

        // Reload with relations
        const updatedUser = await this.userRepository.findOne({
            where: { id },
            relations: ['company']
        });

        if (!updatedUser) {
            throw new NotFoundException('User not found after update');
        }

        return this.sanitizeUser(updatedUser);
    }

    /**
     * Delete user (soft delete)
     */
    async deleteUser(id: string) {
        const user = await this.userRepository.findOne({ where: { id } });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        if (user.isSuperAdmin) {
            throw new BadRequestException('Cannot delete super admin user');
        }

        user.status = UserStatus.INACTIVE;
        await this.userRepository.save(user);

        return { message: 'User deleted successfully' };
    }

    /**
     * Activate user
     */
    async activateUser(id: string) {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['company']
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        user.status = UserStatus.ACTIVE;
        await this.userRepository.save(user);

        return this.sanitizeUser(user);
    }

    /**
     * Suspend user
     */
    async suspendUser(id: string) {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['company']
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        if (user.isSuperAdmin) {
            throw new BadRequestException('Cannot suspend super admin user');
        }

        user.status = UserStatus.SUSPENDED;
        await this.userRepository.save(user);

        return this.sanitizeUser(user);
    }

    /**
     * Reset user password
     */
    async resetPassword(id: string, newPassword: string) {
        const user = await this.userRepository.findOne({ where: { id } });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        user.passwordHash = await bcrypt.hash(newPassword, 12);
        await this.userRepository.save(user);

        return { message: 'Password reset successfully' };
    }

    /**
     * Sanitize user object (remove sensitive data)
     */
    private sanitizeUser(user: User) {
        const { passwordHash, ...sanitized } = user;
        return sanitized;
    }
}
