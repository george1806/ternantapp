import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { JwtPayload } from '../interfaces/session.interface';

/**
 * JWT Strategy for Passport
 * Validates JWT and checks session in Redis
 *
 * SECURITY: Extracts JWT from httpOnly cookie (primary) or Authorization header (backward compatibility)
 *
 * Author: george1806
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService
    ) {
        super({
            jwtFromRequest: JwtStrategy.extractJwtFromCookieOrHeader,
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
            passReqToCallback: true // Pass request to validate method
        });
    }

    /**
     * Custom JWT extractor
     * SECURITY: Prioritizes httpOnly cookie over Authorization header
     */
    private static extractJwtFromCookieOrHeader(req: Request): string | null {
        // 1. Try to extract from httpOnly cookie (SECURE - prevents XSS)
        if (req.cookies && req.cookies.accessToken) {
            return req.cookies.accessToken;
        }

        // 2. Fallback to Authorization header (backward compatibility, less secure)
        return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    }

    async validate(request: any, payload: JwtPayload) {
        // Validate payload type
        if (payload.type !== 'access') {
            throw new UnauthorizedException('Invalid token type');
        }

        // Get raw token from cookie or header
        const token = JwtStrategy.extractJwtFromCookieOrHeader(request);

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        // Validate token and get session from Redis
        const session = await this.authService.validateAccessToken(token);

        // Return user data to be attached to request.user
        return {
            userId: session.userId,
            companyId: session.companyId,
            email: session.email,
            role: session.role,
            isSuperAdmin: session.isSuperAdmin,
            sessionId: session.sessionId
        };
    }
}
