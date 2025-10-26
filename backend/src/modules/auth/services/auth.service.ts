import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { UsersService } from '../../users/services/users.service';
import { CompaniesService } from '../../companies/services/companies.service';
import { SessionService } from '../../../common/services/session.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterCompanyDto } from '../dto/register-company.dto';
import { JwtPayload, UserSession, RefreshSession } from '../interfaces/session.interface';
import { UserRole, UserStatus, Currency } from '../../../common/enums';
import { SessionConfig } from '../../../common/config/session.config';

/**
 * Authentication Service with JWT Session Management
 *
 * Features:
 * - JWT-based authentication
 * - Session stored in Redis for instant revocation
 * - Refresh token rotation
 * - Multi-session support (up to 5 concurrent sessions)
 * - Session metadata tracking
 *
 * Author: george1806
 */
@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly companiesService: CompaniesService,
        private readonly sessionService: SessionService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly dataSource: DataSource
    ) {}

    /**
     * Register a new company with owner user
     * Transaction ensures both company and user are created or none
     */
    async registerCompany(
        registerDto: RegisterCompanyDto,
        metadata?: { ipAddress?: string; userAgent?: string }
    ): Promise<{
        company: any;
        user: any;
        tokens: { accessToken: string; refreshToken: string };
    }> {
        // Start transaction
        return this.dataSource.transaction(async (manager) => {
            // Check if company slug already exists
            try {
                await this.companiesService.findBySlug(registerDto.company.slug);
                throw new ConflictException('Company with this slug already exists');
            } catch (error) {
                if (error instanceof ConflictException) {
                    throw error;
                }
                // Not found is good - continue
            }

            // Check if email is already taken
            const existingUser = await this.usersService.findByEmail(
                registerDto.owner.email
            );
            if (existingUser) {
                throw new ConflictException('Email address is already registered');
            }

            // Create company
            const company = await this.companiesService.create({
                name: registerDto.company.name,
                slug: registerDto.company.slug,
                email: registerDto.company.email,
                phone: registerDto.company.phone,
                currency: registerDto.company.currency || Currency.USD,
                timezone: registerDto.company.timezone || 'UTC'
            });

            // Create owner user
            const user = await this.usersService.create(company.id, {
                firstName: registerDto.owner.firstName,
                lastName: registerDto.owner.lastName,
                email: registerDto.owner.email,
                password: registerDto.owner.password,
                role: UserRole.OWNER,
                phone: registerDto.owner.phone
            });

            // Generate tokens
            const tokens = await this.generateTokens(
                user.id,
                company.id,
                user.email,
                user.role,
                false,
                metadata
            );

            return {
                company,
                user,
                tokens
            };
        });
    }

    /**
     * Login user with email and password
     */
    async login(
        loginDto: LoginDto,
        metadata?: { ipAddress?: string; userAgent?: string }
    ): Promise<{
        user: any;
        company: any;
        tokens: { accessToken: string; refreshToken: string };
    }> {
        // Find user with company details
        const user = await this.usersService.findByEmailWithCompany(loginDto.email);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check user status
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Account is inactive');
        }

        // Verify password
        const isPasswordValid = await this.usersService.verifyPassword(
            loginDto.password,
            user.passwordHash
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Update last login
        await this.usersService.updateLastLogin(user.id, metadata?.ipAddress || '');

        // Generate tokens
        const tokens = await this.generateTokens(
            user.id,
            user.companyId,
            user.email,
            user.role,
            user.isSuperAdmin,
            metadata
        );

        // Remove password from response
        const { passwordHash, ...userWithoutPassword } = user;
        const cleanUser = userWithoutPassword as typeof user;

        return {
            user: cleanUser,
            company: user.company,
            tokens
        };
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshTokens(
        refreshToken: string,
        metadata?: { ipAddress?: string; userAgent?: string }
    ): Promise<{ accessToken: string; refreshToken: string }> {
        // Verify refresh token JWT
        let payload: JwtPayload;
        try {
            payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET')
            });
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Validate payload type
        if (payload.type !== 'refresh') {
            throw new UnauthorizedException('Invalid token type');
        }

        // Refresh session (rotates session IDs)
        const { accessSession, refreshSession } =
            await this.sessionService.refreshSession(payload.sessionId, metadata);

        // Generate new JWTs
        const newAccessToken = this.signAccessToken(accessSession);
        const newRefreshToken = this.signRefreshToken(refreshSession);

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        };
    }

    /**
     * Logout user (destroy session)
     */
    async logout(sessionId: string, accessToken?: string): Promise<void> {
        // Destroy session
        await this.sessionService.destroyAccessSession(sessionId);

        // Optionally blacklist the token for immediate invalidation
        if (accessToken) {
            await this.sessionService.blacklistToken(accessToken);
        }
    }

    /**
     * Logout from all devices
     */
    async logoutAll(userId: string): Promise<void> {
        await this.sessionService.destroyAllUserSessions(userId);
    }

    /**
     * Validate access token and return session
     */
    async validateAccessToken(token: string): Promise<UserSession> {
        // Check if token is blacklisted
        const isBlacklisted = await this.sessionService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            throw new UnauthorizedException('Token has been revoked');
        }

        // Verify JWT
        let payload: JwtPayload;
        try {
            payload = this.jwtService.verify(token);
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired token');
        }

        // Validate payload type
        if (payload.type !== 'access') {
            throw new UnauthorizedException('Invalid token type');
        }

        // Validate session in Redis
        const session = await this.sessionService.validateAccessSession(
            payload.sessionId
        );

        return session;
    }

    /**
     * Get user active sessions
     */
    async getUserSessions(userId: string): Promise<string[]> {
        return this.sessionService.getUserActiveSessions(userId);
    }

    /**
     * Generate access and refresh tokens with sessions
     */
    private async generateTokens(
        userId: string,
        companyId: string | null,
        email: string,
        role: string,
        isSuperAdmin: boolean,
        metadata?: { ipAddress?: string; userAgent?: string }
    ): Promise<{ accessToken: string; refreshToken: string }> {
        // Create access session
        const accessSession = await this.sessionService.createAccessSession(
            userId,
            companyId,
            email,
            role,
            isSuperAdmin,
            metadata
        );

        // Create refresh session
        const refreshSession = await this.sessionService.createRefreshSession(
            userId,
            companyId,
            accessSession.sessionId
        );

        // Sign JWTs
        const accessToken = this.signAccessToken(accessSession);
        const refreshToken = this.signRefreshToken(refreshSession);

        return { accessToken, refreshToken };
    }

    /**
     * Sign access token
     */
    private signAccessToken(session: UserSession): string {
        const payload: JwtPayload = {
            sub: session.userId,
            companyId: session.companyId,
            email: session.email,
            role: session.role,
            isSuperAdmin: session.isSuperAdmin,
            sessionId: session.sessionId,
            type: 'access'
        };

        return this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: SessionConfig.accessToken.jwtExpiresIn
        });
    }

    /**
     * Sign refresh token
     */
    private signRefreshToken(session: RefreshSession): string {
        const payload: JwtPayload = {
            sub: session.userId,
            companyId: session.companyId,
            email: '', // Not needed in refresh token
            role: '', // Not needed in refresh token
            isSuperAdmin: false, // Not needed in refresh token (will be fetched from session)
            sessionId: session.sessionId,
            type: 'refresh'
        };

        return this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: SessionConfig.refreshToken.jwtExpiresIn
        });
    }

    /**
     * Extract metadata from request
     */
    static extractMetadata(req: any): { ipAddress?: string; userAgent?: string } {
        return {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('user-agent')
        };
    }
}
