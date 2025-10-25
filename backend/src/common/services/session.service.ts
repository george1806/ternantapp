import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { SessionConfig } from '../config/session.config';
import { UserSession, RefreshSession } from '../../modules/auth/interfaces/session.interface';

/**
 * Reusable Session Management Service
 * Handles all session operations with Redis
 *
 * Author: george1806
 */
@Injectable()
export class SessionService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Create a new access token session
   */
  async createAccessSession(
    userId: string,
    companyId: string | null,
    email: string,
    role: string,
    isSuperAdmin: boolean,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<UserSession> {
    const sessionId = uuidv4();
    const now = Date.now();

    const session: UserSession = {
      userId,
      companyId,
      email,
      role,
      isSuperAdmin,
      sessionId,
      createdAt: now,
      expiresAt: now + SessionConfig.accessToken.ttl * 1000,
      ...(metadata && {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      }),
    };

    // Store session in Redis
    const key = `${SessionConfig.accessToken.prefix}${sessionId}`;
    await this.cacheManager.set(key, session, SessionConfig.accessToken.ttl * 1000);

    // Track this session for the user
    await this.addUserSession(userId, sessionId, 'access');

    return session;
  }

  /**
   * Create a new refresh token session
   */
  async createRefreshSession(
    userId: string,
    companyId: string | null,
    accessSessionId: string,
  ): Promise<RefreshSession> {
    const sessionId = uuidv4();
    const now = Date.now();

    const session: RefreshSession = {
      userId,
      companyId,
      sessionId,
      accessTokenId: accessSessionId,
      createdAt: now,
      expiresAt: now + SessionConfig.refreshToken.ttl * 1000,
    };

    // Store session in Redis
    const key = `${SessionConfig.refreshToken.prefix}${sessionId}`;
    await this.cacheManager.set(key, session, SessionConfig.refreshToken.ttl * 1000);

    // Track this session for the user
    await this.addUserSession(userId, sessionId, 'refresh');

    return session;
  }

  /**
   * Get access session by ID
   */
  async getAccessSession(sessionId: string): Promise<UserSession | null> {
    const key = `${SessionConfig.accessToken.prefix}${sessionId}`;
    const result = await this.cacheManager.get<UserSession>(key);
    return result ?? null;
  }

  /**
   * Get refresh session by ID
   */
  async getRefreshSession(sessionId: string): Promise<RefreshSession | null> {
    const key = `${SessionConfig.refreshToken.prefix}${sessionId}`;
    const result = await this.cacheManager.get<RefreshSession>(key);
    return result ?? null;
  }

  /**
   * Validate access session
   */
  async validateAccessSession(sessionId: string): Promise<UserSession> {
    const session = await this.getAccessSession(sessionId);

    if (!session) {
      throw new UnauthorizedException('Session not found or expired');
    }

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      await this.destroyAccessSession(sessionId);
      throw new UnauthorizedException('Session expired');
    }

    return session;
  }

  /**
   * Validate refresh session
   */
  async validateRefreshSession(sessionId: string): Promise<RefreshSession> {
    const session = await this.getRefreshSession(sessionId);

    if (!session) {
      throw new UnauthorizedException('Refresh session not found or expired');
    }

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      await this.destroyRefreshSession(sessionId);
      throw new UnauthorizedException('Refresh session expired');
    }

    return session;
  }

  /**
   * Destroy access session (logout)
   */
  async destroyAccessSession(sessionId: string): Promise<void> {
    const session = await this.getAccessSession(sessionId);
    if (session) {
      const key = `${SessionConfig.accessToken.prefix}${sessionId}`;
      await this.cacheManager.del(key);
      await this.removeUserSession(session.userId, sessionId);
    }
  }

  /**
   * Destroy refresh session
   */
  async destroyRefreshSession(sessionId: string): Promise<void> {
    const session = await this.getRefreshSession(sessionId);
    if (session) {
      const key = `${SessionConfig.refreshToken.prefix}${sessionId}`;
      await this.cacheManager.del(key);
      await this.removeUserSession(session.userId, sessionId);
    }
  }

  /**
   * Destroy all sessions for a user (logout from all devices)
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserActiveSessions(userId);

    for (const sessionId of sessions) {
      // Try both access and refresh
      await this.destroyAccessSession(sessionId);
      await this.destroyRefreshSession(sessionId);
    }

    // Clear the tracking set
    const key = `${SessionConfig.userSessions.prefix}${userId}`;
    await this.cacheManager.del(key);
  }

  /**
   * Refresh session (rotate session ID for security)
   */
  async refreshSession(
    refreshSessionId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ accessSession: UserSession; refreshSession: RefreshSession }> {
    // Validate refresh session
    const refreshSession = await this.validateRefreshSession(refreshSessionId);

    // Get user data from old access session (if still exists)
    const oldAccessSession = await this.getAccessSession(refreshSession.accessTokenId);

    if (!oldAccessSession) {
      throw new UnauthorizedException('Original session not found');
    }

    // Destroy old sessions
    await this.destroyAccessSession(refreshSession.accessTokenId);
    await this.destroyRefreshSession(refreshSessionId);

    // Create new sessions
    const newAccessSession = await this.createAccessSession(
      oldAccessSession.userId,
      oldAccessSession.companyId,
      oldAccessSession.email,
      oldAccessSession.role,
      oldAccessSession.isSuperAdmin,
      metadata,
    );

    const newRefreshSession = await this.createRefreshSession(
      oldAccessSession.userId,
      oldAccessSession.companyId,
      newAccessSession.sessionId,
    );

    return {
      accessSession: newAccessSession,
      refreshSession: newRefreshSession,
    };
  }

  /**
   * Blacklist a token (for immediate invalidation)
   */
  async blacklistToken(token: string): Promise<void> {
    const key = `${SessionConfig.blacklist.prefix}${token}`;
    await this.cacheManager.set(key, true, SessionConfig.blacklist.ttl * 1000);
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${SessionConfig.blacklist.prefix}${token}`;
    const result = await this.cacheManager.get(key);
    return !!result;
  }

  /**
   * Track user sessions
   */
  private async addUserSession(userId: string, sessionId: string, type: 'access' | 'refresh'): Promise<void> {
    const key = `${SessionConfig.userSessions.prefix}${userId}`;
    const sessions = await this.cacheManager.get<string[]>(key) || [];

    sessions.push(sessionId);

    // Enforce max sessions limit
    if (sessions.length > SessionConfig.userSessions.maxSessions) {
      const oldestSession = sessions.shift();
      if (oldestSession) {
        // Remove oldest session
        if (type === 'access') {
          await this.destroyAccessSession(oldestSession);
        } else {
          await this.destroyRefreshSession(oldestSession);
        }
      }
    }

    // Store with long TTL (will be managed by individual session expiry)
    await this.cacheManager.set(key, sessions, SessionConfig.refreshToken.ttl * 1000);
  }

  /**
   * Remove user session from tracking
   */
  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `${SessionConfig.userSessions.prefix}${userId}`;
    const sessions = await this.cacheManager.get<string[]>(key) || [];

    const filtered = sessions.filter(id => id !== sessionId);

    if (filtered.length > 0) {
      await this.cacheManager.set(key, filtered, SessionConfig.refreshToken.ttl * 1000);
    } else {
      await this.cacheManager.del(key);
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<string[]> {
    const key = `${SessionConfig.userSessions.prefix}${userId}`;
    return await this.cacheManager.get<string[]>(key) || [];
  }

  /**
   * Get user session count
   */
  async getUserSessionCount(userId: string): Promise<number> {
    const sessions = await this.getUserActiveSessions(userId);
    return sessions.length;
  }

  /**
   * Extend session expiry (for "remember me" functionality)
   */
  async extendSession(sessionId: string, type: 'access' | 'refresh'): Promise<void> {
    const config = type === 'access' ? SessionConfig.accessToken : SessionConfig.refreshToken;
    const key = `${config.prefix}${sessionId}`;

    const session = await this.cacheManager.get(key);
    if (session) {
      await this.cacheManager.set(key, session, config.ttl * 1000);
    }
  }
}
