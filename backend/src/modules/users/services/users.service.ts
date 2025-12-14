import {
    Injectable,
    NotFoundException,
    ConflictException,
    Inject,
    BadRequestException,
    ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserStatus, UserRole } from '../../../common/enums';
import { MESSAGES, APP_CONFIG } from '../../../common/constants';

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
     * Role-based access control:
     * - ADMIN: Can create OWNER and WORKER users for any company
     * - OWNER: Can only create WORKER users in their own company
     * - If currentUser is not provided (system operation), skip authorization
     */
    async create(companyId: string, createUserDto: CreateUserDto, currentUser?: User): Promise<User> {
        // Role-based authorization (skip for system operations like registration)
        if (currentUser) {
            this.validateUserCreation(currentUser, createUserDto.role, companyId);
        }

        // Check if email already exists
        const existing = await this.userRepository.findOne({
            where: { email: createUserDto.email }
        });

        if (existing) {
            throw new ConflictException(MESSAGES.USER.ALREADY_EXISTS);
        }

        // Determine target company ID
        // ADMIN can create users for any company, OWNER creates for their company
        // System operations (no currentUser) use the provided companyId
        const targetCompanyId = currentUser
            ? (currentUser.role === UserRole.ADMIN ? companyId : currentUser.companyId)
            : companyId;

        // Hash password
        const passwordHash = await bcrypt.hash(
            createUserDto.password,
            APP_CONFIG.PASSWORD.BCRYPT_ROUNDS
        );

        // Create user
        const user = this.userRepository.create({
            ...createUserDto,
            companyId: targetCompanyId,
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
     * Validate user creation based on role hierarchy
     * - Only ADMIN can create ADMIN users
     * - ADMIN can create OWNER and WORKER users
     * - OWNER can only create WORKER users in their company
     * - WORKER cannot create any users
     */
    private validateUserCreation(currentUser: User, targetRole: UserRole, targetCompanyId: string): void {
        // Only ADMIN and OWNER can create users
        if (currentUser.role === UserRole.WORKER) {
            throw new ForbiddenException(MESSAGES.PERMISSION.INSUFFICIENT_PERMISSIONS);
        }

        // Only ADMIN can create ADMIN users
        if (targetRole === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) {
            throw new ForbiddenException(MESSAGES.USER.NO_PERMISSION_CREATE_ADMIN);
        }

        // OWNER can only create WORKER users
        if (currentUser.role === UserRole.OWNER) {
            if (targetRole !== UserRole.WORKER) {
                throw new ForbiddenException(MESSAGES.USER.NO_PERMISSION_CREATE_OWNER);
            }

            // OWNER can only create users in their own company
            if (targetCompanyId !== currentUser.companyId) {
                throw new ForbiddenException(MESSAGES.PERMISSION.INSUFFICIENT_PERMISSIONS);
            }
        }

        // ADMIN cannot create OWNER users with a company they don't have access to
        // (Note: ADMIN has access to all companies, so this is just a placeholder for future validation)
    }

    /**
     * Find all users based on role:
     * - ADMIN: Can see all users across all companies
     * - OWNER: Can only see users in their company
     */
    async findAll(companyId: string, currentUser: User, includeInactive = false): Promise<User[]> {
        const where: any = {};

        // ADMIN can see all users across all companies
        // OWNER can only see users in their company
        if (currentUser.role !== UserRole.ADMIN) {
            where.companyId = companyId;
        }

        if (!includeInactive) {
            where.status = UserStatus.ACTIVE;
        }

        const users = await this.userRepository.find({
            where,
            relations: ['company'],
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
     * ADMIN can access any user, OWNER can only access users in their company
     */
    async findOne(id: string, companyId: string, currentUser: User): Promise<User> {
        const cacheKey = `user:${id}`;

        // Try cache first
        const cached = await this.cacheManager.get<User>(cacheKey);
        if (cached) {
            // ADMIN can access any user
            if (currentUser.role === UserRole.ADMIN) {
                return cached;
            }
            // OWNER can only access users in their company
            if (cached.companyId === companyId) {
                return cached;
            }
        }

        // Fetch from database
        const where: any = { id };

        // ADMIN can access any user, OWNER only in their company
        if (currentUser.role !== UserRole.ADMIN) {
            where.companyId = companyId;
        }

        const user = await this.userRepository.findOne({
            where,
            relations: ['company'],
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
            throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
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
     * Update user with role-based authorization
     */
    async update(
        id: string,
        companyId: string,
        updateUserDto: UpdateUserDto,
        currentUser: User
    ): Promise<User> {
        // Find the target user
        const where: any = { id };

        // ADMIN can update any user, OWNER only in their company
        if (currentUser.role !== UserRole.ADMIN) {
            where.companyId = companyId;
        }

        const user = await this.userRepository.findOne({ where });

        if (!user) {
            throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
        }

        // Validate role change authorization
        if (updateUserDto.role && updateUserDto.role !== user.role) {
            this.validateRoleChange(currentUser, user, updateUserDto.role);
        }

        // OWNER cannot modify OWNER or ADMIN users
        if (currentUser.role === UserRole.OWNER) {
            if (user.role !== UserRole.WORKER) {
                throw new ForbiddenException(MESSAGES.PERMISSION.INSUFFICIENT_PERMISSIONS);
            }
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
     * Validate role change based on current user permissions
     * - Only ADMIN can assign ADMIN role
     * - OWNER cannot change roles at all
     * - Cannot change own role
     */
    private validateRoleChange(currentUser: User, targetUser: User, newRole: UserRole): void {
        // Users cannot change their own role
        if (currentUser.id === targetUser.id) {
            throw new ForbiddenException(MESSAGES.USER.CANNOT_MODIFY_SELF_ROLE);
        }

        // OWNER cannot change roles
        if (currentUser.role === UserRole.OWNER) {
            throw new ForbiddenException(MESSAGES.PERMISSION.OWNER_ONLY);
        }

        // Only ADMIN can assign or remove ADMIN role
        if (newRole === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) {
            throw new ForbiddenException(MESSAGES.PERMISSION.ADMIN_ONLY);
        }

        if (targetUser.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) {
            throw new ForbiddenException(MESSAGES.PERMISSION.ADMIN_ONLY);
        }
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
            throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
        }

        // Validate password strength
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (
            !passwordRegex.test(newPassword) ||
            newPassword.length < APP_CONFIG.PASSWORD.MIN_LENGTH
        ) {
            throw new BadRequestException(MESSAGES.VALIDATION.INVALID_PASSWORD);
        }

        user.passwordHash = await bcrypt.hash(
            newPassword,
            APP_CONFIG.PASSWORD.BCRYPT_ROUNDS
        );
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
     * Soft delete user (deactivate) with role-based authorization
     */
    async remove(id: string, companyId: string, currentUser: User): Promise<void> {
        // Find the target user
        const where: any = { id };

        // ADMIN can deactivate any user, OWNER only in their company
        if (currentUser.role !== UserRole.ADMIN) {
            where.companyId = companyId;
        }

        const user = await this.userRepository.findOne({ where });

        if (!user) {
            throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
        }

        // OWNER cannot deactivate OWNER or ADMIN users
        if (currentUser.role === UserRole.OWNER) {
            if (user.role !== UserRole.WORKER) {
                throw new ForbiddenException(MESSAGES.PERMISSION.INSUFFICIENT_PERMISSIONS);
            }
        }

        // Cannot deactivate ADMIN users
        if (user.role === UserRole.ADMIN) {
            throw new ForbiddenException(MESSAGES.PERMISSION.ADMIN_ONLY);
        }

        user.status = UserStatus.INACTIVE;
        await this.userRepository.save(user);

        // Invalidate cache
        await this.invalidateCache(id);
    }

    /**
     * Activate user with role-based authorization
     */
    async activate(id: string, companyId: string, currentUser: User): Promise<User> {
        // Find the target user
        const where: any = { id };

        // ADMIN can activate any user, OWNER only in their company
        if (currentUser.role !== UserRole.ADMIN) {
            where.companyId = companyId;
        }

        const user = await this.userRepository.findOne({ where });

        if (!user) {
            throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
        }

        // OWNER cannot activate OWNER or ADMIN users
        if (currentUser.role === UserRole.OWNER) {
            if (user.role !== UserRole.WORKER) {
                throw new ForbiddenException(MESSAGES.PERMISSION.INSUFFICIENT_PERMISSIONS);
            }
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
        const ttl = APP_CONFIG.CACHE.SHORT_TTL; // 5 minutes
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
