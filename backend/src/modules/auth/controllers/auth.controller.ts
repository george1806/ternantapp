import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    Req,
    UseGuards,
    Get
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
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
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto, @Req() req: Request) {
        const metadata = AuthService.extractMetadata(req);
        const result = await this.authService.login(loginDto, metadata);

        return {
            message: 'Login successful',
            user: result.user,
            company: result.company,
            tokens: result.tokens
        };
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refreshTokens(@Body() refreshDto: RefreshTokenDto, @Req() req: Request) {
        const metadata = AuthService.extractMetadata(req);
        const tokens = await this.authService.refreshTokens(
            refreshDto.refreshToken,
            metadata
        );

        return {
            message: 'Token refreshed successfully',
            tokens
        };
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Logout from current device' })
    @ApiResponse({ status: 204, description: 'Logout successful' })
    async logout(@CurrentUser() user: any, @Req() req: Request) {
        const token = req.headers.authorization?.split(' ')[1];
        await this.authService.logout(user.sessionId, token);
    }

    @Post('logout-all')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Logout from all devices' })
    @ApiResponse({ status: 204, description: 'Logged out from all devices' })
    async logoutAll(@CurrentUser() user: any) {
        await this.authService.logoutAll(user.userId);
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
