import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { JwtPayload } from '../interfaces/session.interface';

/**
 * JWT Strategy for Passport
 * Validates JWT and checks session in Redis
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
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
            passReqToCallback: true // Pass request to validate method
        });
    }

    async validate(request: any, payload: JwtPayload) {
        // Validate payload type
        if (payload.type !== 'access') {
            throw new UnauthorizedException('Invalid token type');
        }

        // Get raw token from header
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

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
