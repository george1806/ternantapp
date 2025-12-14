import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    Req,
    Res,
    UseGuards,
    Get
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/tenant.decorator';
import { Public } from '../../../common/decorators/public.decorator';

/**
 * Authentication Controller
 * Handles registration, login, logout, and token refresh
 *
 * Author: george1806
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService
    ) {}

    /**
     * Detect client type from request headers
     * SECURITY: Different clients need different token delivery methods
     */
    private getClientType(req: Request): 'web' | 'mobile' | 'api' {
        // Check for explicit client type header
        const clientType = req.headers['x-client-type'] as string;
        if (clientType === 'mobile' || clientType === 'api') {
            return clientType;
        }

        // Check user agent for mobile apps
        const userAgent = req.headers['user-agent'] || '';
        if (
            userAgent.includes('Mobile') ||
            userAgent.includes('Android') ||
            userAgent.includes('iOS') ||
            userAgent.includes('ReactNative') ||
            userAgent.includes('Flutter') ||
            userAgent.includes('Dart')
        ) {
            return 'mobile';
        }

        // Check for API clients (Postman, curl, etc.)
        if (
            userAgent.includes('Postman') ||
            userAgent.includes('curl') ||
            userAgent.includes('HTTPie') ||
            userAgent.includes('Insomnia') ||
            !userAgent // No user agent = likely API client
        ) {
            return 'api';
        }

        // Default to web browser
        return 'web';
    }

    /**
     * Set secure httpOnly cookies for JWT tokens
     * SECURITY: Tokens stored in httpOnly cookies prevent XSS attacks
     * NOTE: Only used for web browsers. Mobile/API clients get tokens in response body.
     */
    private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
        const isProduction = this.configService.get('NODE_ENV') === 'production';

        // Access token cookie (15 minutes)
        res.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: isProduction, // HTTPS only in production
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: '/'
        });

        // Refresh token cookie (7 days)
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/api/auth/refresh' // Only send on refresh endpoint
        });
    }

    /**
     * Clear authentication cookies
     */
    private clearAuthCookies(res: Response) {
        res.clearCookie('accessToken', { path: '/' });
        res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    }

    @Public()
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Login with email and password',
        description: 'HYBRID SECURITY: Web browsers get httpOnly cookies. Mobile/API clients get tokens in response body. ' +
                     'Set X-Client-Type header to "mobile" or "api" to receive tokens in response.'
    })
    @ApiResponse({ status: 200, description: 'Login successful. Token delivery depends on client type.' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    @ApiResponse({ status: 429, description: 'Too many login attempts. Please try again later.' })
    async login(
        @Body() loginDto: LoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        const metadata = AuthService.extractMetadata(req);
        const result = await this.authService.login(loginDto, metadata);

        // Detect client type (web browser vs mobile/API)
        const clientType = this.getClientType(req);

        if (clientType === 'web') {
            // WEB BROWSERS: Use httpOnly cookies (SECURITY: prevents XSS attacks)
            this.setAuthCookies(res, result.tokens);

            // Return user info WITHOUT tokens (they're in cookies)
            return {
                message: 'Login successful',
                user: result.user,
                company: result.company,
                tokenDelivery: 'cookies' // Inform client where tokens are
            };
        } else {
            // MOBILE/API CLIENTS: Return tokens in response body
            // Client is responsible for secure storage (Keychain, KeyStore, etc.)
            return {
                message: 'Login successful',
                user: result.user,
                company: result.company,
                tokens: result.tokens, // Tokens in body for mobile/API
                tokenDelivery: 'body', // Inform client
                securityNote: 'Store tokens securely using platform-specific secure storage (Keychain/KeyStore)'
            };
        }
    }

    @Public()
    @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Refresh access token using refresh token',
        description: 'HYBRID: Web browsers send refresh token via cookie. Mobile/API clients send in request body. ' +
                     'Set X-Client-Type header to "mobile" or "api" to use body-based refresh.'
    })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
    @ApiResponse({ status: 401, description: 'Invalid or missing refresh token' })
    @ApiResponse({ status: 429, description: 'Too many refresh attempts. Please try again later.' })
    async refreshTokens(
        @Body() refreshDto: RefreshTokenDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        // Detect client type
        const clientType = this.getClientType(req);

        // Extract refresh token from cookie (web) or body (mobile/API)
        let refreshToken: string;

        if (clientType === 'web') {
            // Web browsers: Get from cookie
            refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) {
                res.status(HttpStatus.UNAUTHORIZED);
                return {
                    statusCode: HttpStatus.UNAUTHORIZED,
                    message: 'Refresh token not found in cookies',
                    error: 'Unauthorized'
                };
            }
        } else {
            // Mobile/API: Get from request body
            refreshToken = refreshDto.refreshToken;
            if (!refreshToken) {
                res.status(HttpStatus.UNAUTHORIZED);
                return {
                    statusCode: HttpStatus.UNAUTHORIZED,
                    message: 'Refresh token not provided in request body',
                    error: 'Unauthorized'
                };
            }
        }

        const metadata = AuthService.extractMetadata(req);
        const tokens = await this.authService.refreshTokens(refreshToken, metadata);

        if (clientType === 'web') {
            // Web browsers: Set new tokens as httpOnly cookies
            this.setAuthCookies(res, tokens);
            return {
                message: 'Token refreshed successfully',
                tokenDelivery: 'cookies'
            };
        } else {
            // Mobile/API: Return tokens in response body
            return {
                message: 'Token refreshed successfully',
                tokens,
                tokenDelivery: 'body'
            };
        }
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Logout from current device',
        description: 'SECURITY: Clears httpOnly cookies and invalidates session'
    })
    @ApiResponse({ status: 204, description: 'Logout successful. Cookies cleared.' })
    async logout(
        @CurrentUser() user: any,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        // Get token from cookie or Authorization header (backward compatibility)
        const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
        await this.authService.logout(user.sessionId, token);

        // Clear authentication cookies
        this.clearAuthCookies(res);
    }

    @Post('logout-all')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Logout from all devices',
        description: 'SECURITY: Clears cookies and invalidates all user sessions'
    })
    @ApiResponse({ status: 204, description: 'Logged out from all devices. Cookies cleared.' })
    async logoutAll(
        @CurrentUser() user: any,
        @Res({ passthrough: true }) res: Response
    ) {
        await this.authService.logoutAll(user.userId);

        // Clear authentication cookies
        this.clearAuthCookies(res);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current authenticated user' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully' })
    async getCurrentUser(@CurrentUser() user: any) {
        return {
            userId: user.userId,
            companyId: user.companyId,
            email: user.email,
            role: user.role,
            isSuperAdmin: user.isSuperAdmin || false
        };
    }

    @Get('sessions')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all active sessions for current user' })
    @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
    async getUserSessions(@CurrentUser() user: any) {
        const sessions = await this.authService.getUserSessions(user.userId);
        return {
            sessionCount: sessions.length,
            sessions
        };
    }
}
