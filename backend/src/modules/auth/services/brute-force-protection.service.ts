import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../users/entities/user.entity';

/**
 * Brute Force Protection Service
 *
 * SECURITY: Implements progressive account lockout to prevent brute force attacks
 * on user accounts. Tracks failed login attempts and locks accounts temporarily.
 *
 * Lockout Policy:
 * - 3 failures → 5 minute lockout
 * - 5 failures → 15 minute lockout
 * - 10 failures → 1 hour lockout
 * - 20 failures → 24 hour lockout (requires manual unlock)
 *
 * @author george1806
 */
@Injectable()
export class BruteForceProtectionService {
    private readonly logger = new Logger(BruteForceProtectionService.name);

    // Lockout thresholds (attempts → lockout duration in minutes)
    private readonly lockoutPolicy = [
        { threshold: 3, duration: 5 },      // 3 attempts → 5 min
        { threshold: 5, duration: 15 },     // 5 attempts → 15 min
        { threshold: 10, duration: 60 },    // 10 attempts → 1 hour
        { threshold: 20, duration: 1440 }   // 20 attempts → 24 hours
    ];

    // Reset failed attempts after this many minutes of inactivity
    private readonly resetAttemptsAfter = 60; // 1 hour

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly configService: ConfigService
    ) {}

    /**
     * Check if user account is locked
     * @throws UnauthorizedException if account is locked
     */
    async checkAccountLocked(user: User): Promise<void> {
        if (!user.lockedUntil) {
            return; // Not locked
        }

        const now = new Date();

        if (user.lockedUntil > now) {
            const remainingMinutes = Math.ceil(
                (user.lockedUntil.getTime() - now.getTime()) / (1000 * 60)
            );

            this.logger.warn(
                `Account locked: ${user.email} (${user.loginAttempts} attempts). ` +
                `Unlocks in ${remainingMinutes} minutes.`
            );

            throw new UnauthorizedException(
                `Account temporarily locked due to multiple failed login attempts. ` +
                `Please try again in ${remainingMinutes} minute(s).`
            );
        }

        // Lock expired - reset attempts
        await this.resetLockout(user);
    }

    /**
     * Record failed login attempt and apply lockout if needed
     */
    async recordFailedAttempt(user: User): Promise<void> {
        const now = new Date();

        // Reset attempts if last failure was more than resetAttemptsAfter minutes ago
        if (user.lastFailedLogin) {
            const minutesSinceLastFailure =
                (now.getTime() - user.lastFailedLogin.getTime()) / (1000 * 60);

            if (minutesSinceLastFailure > this.resetAttemptsAfter) {
                user.loginAttempts = 0;
                this.logger.log(
                    `Reset failed attempts for ${user.email} due to inactivity`
                );
            }
        }

        // Increment failed attempts
        user.loginAttempts += 1;
        user.lastFailedLogin = now;

        // Calculate lockout duration based on policy
        const lockoutDuration = this.calculateLockoutDuration(user.loginAttempts);

        if (lockoutDuration > 0) {
            user.lockedUntil = new Date(now.getTime() + lockoutDuration * 60 * 1000);

            this.logger.warn(
                `Account locked: ${user.email} (${user.loginAttempts} attempts). ` +
                `Locked for ${lockoutDuration} minutes until ${user.lockedUntil.toISOString()}`
            );

            // TODO: Send email notification to user about account lockout
        } else {
            user.lockedUntil = null;
        }

        await this.userRepository.save(user);

        this.logger.log(
            `Failed login attempt recorded for ${user.email}. ` +
            `Attempts: ${user.loginAttempts}`
        );
    }

    /**
     * Reset failed attempts and unlock account
     */
    async recordSuccessfulLogin(user: User): Promise<void> {
        if (user.loginAttempts > 0 || user.lockedUntil) {
            this.logger.log(
                `Successful login for ${user.email}. Resetting ${user.loginAttempts} failed attempts.`
            );

            user.loginAttempts = 0;
            user.lockedUntil = null;
            user.lastFailedLogin = null;

            await this.userRepository.save(user);
        }
    }

    /**
     * Calculate lockout duration based on number of attempts
     */
    private calculateLockoutDuration(attempts: number): number {
        // Find the highest threshold met
        for (let i = this.lockoutPolicy.length - 1; i >= 0; i--) {
            const policy = this.lockoutPolicy[i];
            if (attempts >= policy.threshold) {
                return policy.duration;
            }
        }

        return 0; // No lockout
    }

    /**
     * Reset lockout (called when lock expires)
     */
    private async resetLockout(user: User): Promise<void> {
        this.logger.log(`Lockout expired for ${user.email}. Resetting attempts.`);

        user.loginAttempts = 0;
        user.lockedUntil = null;
        user.lastFailedLogin = null;

        await this.userRepository.save(user);
    }

    /**
     * Manually unlock account (admin function)
     */
    async manualUnlock(userId: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.loginAttempts > 0 || user.lockedUntil) {
            this.logger.log(
                `Manual unlock for ${user.email} by admin. ` +
                `Clearing ${user.loginAttempts} attempts.`
            );

            user.loginAttempts = 0;
            user.lockedUntil = null;
            user.lastFailedLogin = null;

            await this.userRepository.save(user);
        }
    }

    /**
     * Get lockout status for a user
     */
    async getLockoutStatus(user: User): Promise<{
        isLocked: boolean;
        attempts: number;
        lockedUntil: Date | null;
        remainingMinutes: number | null;
    }> {
        const now = new Date();
        const isLocked = user.lockedUntil && user.lockedUntil > now;

        let remainingMinutes = null;
        if (isLocked && user.lockedUntil) {
            remainingMinutes = Math.ceil(
                (user.lockedUntil.getTime() - now.getTime()) / (1000 * 60)
            );
        }

        return {
            isLocked: !!isLocked,
            attempts: user.loginAttempts,
            lockedUntil: user.lockedUntil,
            remainingMinutes
        };
    }
}
