import { Module, Global } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

/**
 * Audit Log Module
 *
 * Provides audit logging services globally throughout the application.
 * This module is marked as @Global() so AuditLogService can be injected
 * anywhere without importing this module explicitly.
 *
 * @author george1806
 */
@Global()
@Module({
    providers: [AuditLogService],
    exports: [AuditLogService]
})
export class AuditLogModule {}
