import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditLogEntry, AuditLogFilter, AuditAction, AuditStatus } from './audit-log.types';

/**
 * Audit Log Service
 * Handles audit log operations
 *
 * Responsibilities (SRP):
 * - Log audit entries
 * - Query audit logs with filtering
 * - Clean up old audit logs (GDPR compliance)
 * - Generate audit reports
 *
 * Current Implementation: In-memory storage (demo)
 * Production Implementation: Should use dedicated table/service
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly auditLogs: AuditLogEntry[] = [];
  private readonly maxLogAge: number; // Days

  constructor(private readonly configService: ConfigService) {
    this.maxLogAge = this.configService.get('AUDIT_LOG_MAX_AGE_DAYS', 90);
    this.logger.log(`Audit logging initialized. Max age: ${this.maxLogAge} days`);
  }

  /**
   * Log an audit entry
   */
  log(entry: Omit<AuditLogEntry, 'id'>): void {
    try {
      const auditEntry: AuditLogEntry = {
        id: this.generateId(),
        ...entry,
        timestamp: entry.timestamp || new Date(),
      };

      // In production, persist to database
      this.auditLogs.push(auditEntry);

      // Log to application logger as well (for immediate visibility)
      this.logger.log(
        `[${auditEntry.action}] ${auditEntry.method} ${auditEntry.path} - ` +
          `${auditEntry.status} (${auditEntry.statusCode}) - ${auditEntry.duration}ms`,
        {
          userId: auditEntry.userId,
          companyId: auditEntry.companyId,
          correlationId: auditEntry.correlationId,
        },
      );

      // Handle failures
      if (auditEntry.status === AuditStatus.FAILURE) {
        this.logger.warn(
          `[${auditEntry.action}] Failed: ${auditEntry.errorMessage}`,
          {
            userId: auditEntry.userId,
            companyId: auditEntry.companyId,
            resource: auditEntry.resource,
            resourceId: auditEntry.resourceId,
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to create audit log entry', error);
    }
  }

  /**
   * Query audit logs with filtering
   */
  async query(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    let results = [...this.auditLogs];

    // Apply filters
    if (filter.companyId) {
      results = results.filter((log) => log.companyId === filter.companyId);
    }

    if (filter.userId) {
      results = results.filter((log) => log.userId === filter.userId);
    }

    if (filter.action) {
      results = results.filter((log) => log.action === filter.action);
    }

    if (filter.resource) {
      results = results.filter((log) => log.resource === filter.resource);
    }

    if (filter.status) {
      results = results.filter((log) => log.status === filter.status);
    }

    if (filter.startDate) {
      results = results.filter((log) => log.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      results = results.filter((log) => log.timestamp <= filter.endDate!);
    }

    if (filter.minDuration !== undefined) {
      results = results.filter((log) => (log.duration || 0) >= filter.minDuration!);
    }

    if (filter.maxDuration !== undefined) {
      results = results.filter((log) => (log.duration || 0) <= filter.maxDuration!);
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return results;
  }

  /**
   * Get audit logs for a specific company
   */
  async getCompanyLogs(companyId: string, limit = 100): Promise<AuditLogEntry[]> {
    const logs = await this.query({ companyId });
    return logs.slice(0, limit);
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserLogs(userId: string, limit = 100): Promise<AuditLogEntry[]> {
    const logs = await this.query({ userId });
    return logs.slice(0, limit);
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceLogs(resource: string, limit = 100): Promise<AuditLogEntry[]> {
    const logs = await this.query({ resource });
    return logs.slice(0, limit);
  }

  /**
   * Get audit logs for a specific resource ID
   */
  async getResourceIdLogs(resourceId: string, limit = 100): Promise<AuditLogEntry[]> {
    const logs = await this.query({});
    return logs
      .filter((log) => log.resourceId === resourceId)
      .slice(0, limit);
  }

  /**
   * Get failed operations
   */
  async getFailedOperations(companyId?: string): Promise<AuditLogEntry[]> {
    const filter: AuditLogFilter = { status: AuditStatus.FAILURE };
    if (companyId) {
      filter.companyId = companyId;
    }
    return this.query(filter);
  }

  /**
   * Get login history
   */
  async getLoginHistory(userId: string): Promise<AuditLogEntry[]> {
    return (await this.query({ userId, action: AuditAction.LOGIN })).slice(0, 50);
  }

  /**
   * Get recent changes to a resource
   */
  async getRecentChanges(resource: string, limit = 50): Promise<AuditLogEntry[]> {
    const logs = await this.query({ resource });
    return logs.filter((log) => [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE].includes(log.action))
      .slice(0, limit);
  }

  /**
   * Count audit logs matching criteria
   */
  async count(filter: AuditLogFilter): Promise<number> {
    const logs = await this.query(filter);
    return logs.length;
  }

  /**
   * Clean up old audit logs (GDPR compliance)
   * @returns Number of logs deleted
   */
  async cleanup(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxLogAge);

    const beforeCount = this.auditLogs.length;
    const filtered = this.auditLogs.filter((log) => log.timestamp > cutoffDate);
    const deletedCount = beforeCount - filtered.length;

    // Update array
    this.auditLogs.length = 0;
    this.auditLogs.push(...filtered);

    this.logger.log(`Audit log cleanup: ${deletedCount} old entries removed`);
    return deletedCount;
  }

  /**
   * Get statistics about audit logs
   */
  async getStats(companyId?: string): Promise<{
    total: number;
    byAction: Record<string, number>;
    byStatus: Record<string, number>;
    failureRate: number;
    averageDuration: number;
  }> {
    const filter: AuditLogFilter = {};
    if (companyId) {
      filter.companyId = companyId;
    }

    const logs = await this.query(filter);

    const byAction: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalDuration = 0;
    let failureCount = 0;

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;
      totalDuration += log.duration || 0;

      if (log.status === AuditStatus.FAILURE) {
        failureCount += 1;
      }
    }

    return {
      total: logs.length,
      byAction,
      byStatus,
      failureRate: logs.length > 0 ? (failureCount / logs.length) * 100 : 0,
      averageDuration: logs.length > 0 ? Math.round(totalDuration / logs.length) : 0,
    };
  }

  /**
   * Generate unique ID for audit entry
   */
  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
