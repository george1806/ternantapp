import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './services/auth.service';
import { BruteForceProtectionService } from './services/brute-force-protection.service';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { SessionService } from '../../common/services/session.service';
import { User } from '../users/entities/user.entity';

/**
 * Auth Module
 * Handles authentication and authorization
 *
 * Author: george1806
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        UsersModule,
        forwardRef(() => CompaniesModule),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get('JWT_EXPIRES_IN', '15m')
                }
            }),
            inject: [ConfigService]
        })
    ],
    controllers: [AuthController],
    providers: [AuthService, BruteForceProtectionService, JwtStrategy, SessionService],
    exports: [AuthService, BruteForceProtectionService, SessionService]
})
export class AuthModule {}
