/**
 * User session stored in Redis
 */
export interface UserSession {
  userId: string;
  companyId: string | null;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  sessionId: string;
  createdAt: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Refresh token session stored in Redis
 */
export interface RefreshSession {
  userId: string;
  companyId: string | null;
  sessionId: string;
  accessTokenId: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * JWT Payload
 */
export interface JwtPayload {
  sub: string; // userId
  companyId: string | null;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  sessionId: string;
  type: 'access' | 'refresh';
}
