import {
    Injectable,
    NotFoundException,
    ConflictException,
    Inject,
    BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserStatus } from '../../../common/enums';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache
    ) {}

    /**
     * Create a new user with hashed password
     */
    async create(companyId: string, createUserDto: CreateUserDto): Promise<User> {
        // Check if email already exists in this company
        const existing = await this.userRepository.findOne({
            where: { companyId, email: createUserDto.email }
        });

        if (existing) {
            throw new ConflictException(
                'User with this email already exists in your company'
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(createUserDto.password, 12);

        // Create user
        const user = this.userRepository.create({
            ...createUserDto,
            companyId,
            passwordHash,
            status: UserStatus.ACTIVE,
            profile: {
                phone: createUserDto.phone
            }
        });

        const saved = await this.userRepository.save(user);

        // Cache user
        await this.cacheUser(saved);

        // Return without password
        const { passwordHash: _, ...userWithoutPassword } = saved;
        return userWithoutPassword as User;
    }

    /**
     * Find all users in a company
     */
    async findAll(companyId: string, includeInactive = false): Promise<User[]> {
        const where: any = { companyId };

        if (!includeInactive) {
            where.status = UserStatus.ACTIVE;
        }

        const users = await this.userRepository.find({
            where,
            order: { createdAt: 'DESC' },
            select: [
                'id',
                'companyId',
                'firstName',
                'lastName',
                'email',
                'role',
                'status',
                'profile',
                'lastLoginAt',
                'emailVerifiedAt',
                'createdAt',
                'updatedAt'
            ]
        });

        return users;
    }

    /**
     * Find user by ID with caching
     */
    async findOne(id: string, companyId: string): Promise<User> {
        const cacheKey = `user:${id}`;

        // Try cache first
        const cached = await this.cacheManager.get<User>(cacheKey);
        if (cached && cached.companyId === companyId) {
            return cached;
        }

        // Fetch from database
        const user = await this.userRepository.findOne({
            where: { id, companyId },
            select: [
                'id',
                'companyId',
                'firstName',
                'lastName',
                'email',
                'role',
                'status',
                'profile',
                'lastLoginAt',
                'lastLoginIp',
                'emailVerifiedAt',
                'createdAt',
                'updatedAt'
            ]
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        // Cache for 5 minutes
        await this.cacheUser(user);

        return user;
    }

    /**
     * Find user by email (for authentication)
     */
    async findByEmail(email: string, companyId?: string): Promise<User | null> {
        const where: any = { email };
        if (companyId) {
            where.companyId = companyId;
        }

        return this.userRepository.findOne({
            where,
            select: [
                'id',
                'companyId',
                'firstName',
                'lastName',
                'email',
                'passwordHash',
                'role',
                'status',
                'profile',
                'lastLoginAt',
                'emailVerifiedAt'
            ]
        });
    }

    /**
     * Find user by email with company details
     */
    async findByEmailWithCompany(email: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { email },
            relations: ['company'],
            select: [
                'id',
                'companyId',
                'firstName',
                'lastName',
                'email',
                'passwordHash',
                'role',
                'status',
                'isSuperAdmin'
            ]
        });
    }

    /**
     * Update user
     */
    async update(
        id: string,
        companyId: string,
        updateUserDto: UpdateUserDto
    ): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id, companyId }
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        // Update profile if phone is provided
        if (updateUserDto.phone) {
            user.profile = {
                ...user.profile,
                phone: updateUserDto.phone
            };
        }

        // Update other fields
        Object.assign(user, updateUserDto);

        const updated = await this.userRepository.save(user);

        // Invalidate and refresh cache
        await this.invalidateCache(id);
        await this.cacheUser(updated);

        // Return without password
        const { passwordHash, ...userWithoutPassword } = updated;
        return userWithoutPassword as User;
    }

    /**
     * Update user password
     */
    async updatePassword(
        id: string,
        companyId: string,
        newPassword: string
    ): Promise<void> {
        const user = await this.userRepository.findOne({
            where: { id, companyId }
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        // Validate password strength
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!passwordRegex.test(newPassword) || newPassword.length < 8) {
            throw new BadRequestException(
                'Password must be at least 8 characters and contain uppercase, lowercase, number and special character'
            );
        }

        user.passwordHash = await bcrypt.hash(newPassword, 12);
        await this.userRepository.save(user);

        // Invalidate cache
        await this.invalidateCache(id);
    }

    /**
     * Update last login info
     */
    async updateLastLogin(id: string, ipAddress: string): Promise<void> {
        await this.userRepository.update(id, {
            lastLoginAt: new Date(),
            lastLoginIp: ipAddress
        });

        // Invalidate cache
        await this.invalidateCache(id);
    }

    /**
     * Verify password
     */
    async verifyPassword(
        plainPassword: string,
        hashedPassword: string
    ): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Soft delete user (deactivate)
     */
    async remove(id: string, companyId: string): Promise<void> {
        const user = await this.userRepository.findOne({
            where: { id, companyId }
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        user.status = UserStatus.INACTIVE;
        await this.userRepository.save(user);

        // Invalidate cache
        await this.invalidateCache(id);
    }

    /**
     * Activate user
     */
    async activate(id: string, companyId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id, companyId }
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        user.status = UserStatus.ACTIVE;
        const updated = await this.userRepository.save(user);

        // Refresh cache
        await this.cacheUser(updated);

        const { passwordHash, ...userWithoutPassword } = updated;
        return userWithoutPassword as User;
    }

    /**
     * Cache user by ID
     */
    private async cacheUser(user: User): Promise<void> {
        const ttl = 300000; // 5 minutes
        const { passwordHash, ...userToCache } = user;
        await this.cacheManager.set(`user:${user.id}`, userToCache, ttl);
    }

    /**
     * Invalidate user cache
     */
    private async invalidateCache(id: string): Promise<void> {
        await this.cacheManager.del(`user:${id}`);
    }

    /**
     * Count users by company
     */
    async countByCompany(companyId: string): Promise<number> {
        return this.userRepository.count({
            where: { companyId, status: UserStatus.ACTIVE }
        });
    }
}
