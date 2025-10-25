/**
 * Centralized session configuration
 * All session-related settings in one place for easy management
 *
 * Author: george1806
 */

export const SessionConfig = {
  // Access token session
  accessToken: {
    prefix: 'session:access:',
    ttl: 900, // 15 minutes in seconds
    jwtExpiresIn: '15m',
  },

  // Refresh token session
  refreshToken: {
    prefix: 'session:refresh:',
    ttl: 604800, // 7 days in seconds
    jwtExpiresIn: '7d',
  },

  // Token blacklist (for immediate invalidation)
  blacklist: {
    prefix: 'token:blacklist:',
    ttl: 900, // Same as access token TTL
  },

  // User active sessions tracking
  userSessions: {
    prefix: 'user:sessions:',
    maxSessions: 5, // Max concurrent sessions per user
  },

  // Session metadata
  metadata: {
    trackIpAddress: true,
    trackUserAgent: true,
    trackDevice: true,
    trackLocation: false, // Can be enabled with IP geolocation service
  },

  // Security
  security: {
    enableSessionRotation: true, // Rotate session ID on refresh
    enableDeviceFingerprinting: false, // Can be enabled for additional security
    requireIpMatch: false, // Strict IP matching (can break mobile users)
  },
} as const;

export type SessionConfigType = typeof SessionConfig;
