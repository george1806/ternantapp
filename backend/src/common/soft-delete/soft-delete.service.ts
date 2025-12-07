import { Injectable, Logger } from '@nestjs/common';
import { Repository, FindOptionsWhere, IsNull, Not } from 'typeorm';
import { TenantBaseEntity, BaseEntity } from '../../database/entities/base.entity';

/**
 * Soft Delete Service
 * Handles soft delete operations across the application
 *
 * Responsibilities (SRP):
 * - Perform soft delete (update deletedAt)
 * - Perform restore (clear deletedAt)
 * - Perform hard delete (physical deletion - use carefully!)
 * - Query soft-deleted records
 * - Cleanup old soft-deleted records
 */
@Injectable()
export class SoftDeleteService {
  private readonly logger = new Logger(SoftDeleteService.name);

  /**
   * Soft delete a single record
   */
  async softDelete<T extends TenantBaseEntity | BaseEntity>(
    repository: Repository<T>,
    id: string,
  ): Promise<boolean> {
    try {
      const result = await repository.update({ id } as any, {
        deletedAt: new Date(),
      } as any);

      const deleted: boolean = !!(result.affected && result.affected > 0);

      if (deleted) {
        this.logger.log(`Record ${id} soft deleted from ${repository.metadata.tableName}`);
      }

      return deleted;
    } catch (error) {
      this.logger.error(
        `Failed to soft delete record ${id} from ${repository.metadata.tableName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Soft delete multiple records
   */
  async softDeleteMany<T extends TenantBaseEntity | BaseEntity>(
    repository: Repository<T>,
    ids: string[],
  ): Promise<number> {
    try {
      const result = await repository.update(
        { id: ids } as any,
        {
          deletedAt: new Date(),
        } as any,
      );

      const deletedCount = result.affected || 0;

      this.logger.log(`${deletedCount} records soft deleted from ${repository.metadata.tableName}`);

      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to soft delete multiple records from ${repository.metadata.tableName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Restore a soft deleted record
   */
  async restore<T extends TenantBaseEntity | BaseEntity>(
    repository: Repository<T>,
    id: string,
  ): Promise<boolean> {
    try {
      const result = await repository.update({ id } as any, {
        deletedAt: null,
      } as any);

      const restored: boolean = !!(result.affected && result.affected > 0);

      if (restored) {
        this.logger.log(`Record ${id} restored in ${repository.metadata.tableName}`);
      }

      return restored;
    } catch (error) {
      this.logger.error(
        `Failed to restore record ${id} in ${repository.metadata.tableName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Restore multiple soft deleted records
   */
  async restoreMany<T extends TenantBaseEntity | BaseEntity>(
    repository: Repository<T>,
    ids: string[],
  ): Promise<number> {
    try {
      const result = await repository.update(
        { id: ids } as any,
        {
          deletedAt: null,
        } as any,
      );

      const restoredCount = result.affected || 0;

      this.logger.log(`${restoredCount} records restored in ${repository.metadata.tableName}`);

      return restoredCount;
    } catch (error) {
      this.logger.error(
        `Failed to restore multiple records in ${repository.metadata.tableName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Hard delete a soft deleted record
   * WARNING: This is permanent and cannot be undone
   * Use only for GDPR compliance or after retention period
   */
  async hardDelete<T extends TenantBaseEntity | BaseEntity>(
    repository: Repository<T>,
    id: string,
  ): Promise<boolean> {
    this.logger.warn(
      `HARD DELETE initiated on record ${id} in ${repository.metadata.tableName}. This cannot be undone.`,
    );

    try {
      const result = await repository.delete({ id } as any);

      const deleted: boolean = !!(result.affected && result.affected > 0);

      if (deleted) {
        this.logger.warn(
          `Record ${id} HARD DELETED from ${repository.metadata.tableName}. This action is irreversible.`,
        );
      }

      return deleted;
    } catch (error) {
      this.logger.error(
        `Failed to hard delete record ${id} from ${repository.metadata.tableName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Hard delete multiple soft deleted records
   * WARNING: This is permanent and cannot be undone
   */
  async hardDeleteMany<T extends TenantBaseEntity | BaseEntity>(
    repository: Repository<T>,
    ids: string[],
  ): Promise<number> {
    this.logger.warn(
      `HARD DELETE initiated on ${ids.length} records in ${repository.metadata.tableName}. This cannot be undone.`,
    );

    try {
      const result = await repository.delete({ id: ids } as any);

      const deletedCount = result.affected || 0;

      this.logger.warn(
        `${deletedCount} records HARD DELETED from ${repository.metadata.tableName}. These actions are irreversible.`,
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to hard delete multiple records from ${repository.metadata.tableName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find only soft deleted records
   */
  async findDeleted<T extends TenantBaseEntity | BaseEntity>(
    repository: Repository<T>,
    where?: FindOptionsWhere<T>,
  ): Promise<T[]> {
    const conditions = {
      ...where,
      deletedAt: Not(IsNull()),
    } as FindOptionsWhere<T>;

    return repository.find({
      where: conditions,
    });
  }

  /**
   * Find soft deleted records for a company
   */
  async findDeletedForCompany<T extends TenantBaseEntity>(
    repository: Repository<T>,
    companyId: string,
  ): Promise<T[]> {
    return this.findDeleted(repository, { companyId } as any);
  }

  /**
   * Count soft deleted records
   */
  async countDeleted<T extends TenantBaseEntity | BaseEntity>(
    repository: Repository<T>,
    where?: FindOptionsWhere<T>,
  ): Promise<number> {
    const conditions = {
      ...where,
      deletedAt: Not(IsNull()),
    } as FindOptionsWhere<T>;

    return repository.count({
      where: conditions,
    });
  }

  /**
   * Permanently delete soft deleted records older than specified days
   * Use for GDPR compliance or data retention policies
   *
   * @param repository - TypeORM repository
   * @param daysOld - Only delete records soft deleted more than X days ago
   * @returns Number of records permanently deleted
   */
  async cleanupOldDeletedRecords<T extends TenantBaseEntity | BaseEntity>(
    repository: Repository<T>,
    daysOld: number,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    this.logger.warn(
      `Starting cleanup of soft deleted records in ${repository.metadata.tableName} older than ${daysOld} days (before ${cutoffDate.toISOString()})`,
    );

    try {
      const result = await repository
        .createQueryBuilder()
        .delete()
        .where('deleted_at IS NOT NULL')
        .andWhere('deleted_at < :cutoffDate', { cutoffDate })
        .execute();

      const deletedCount = result.affected || 0;

      this.logger.log(
        `Cleanup complete: ${deletedCount} old soft-deleted records permanently removed from ${repository.metadata.tableName}`,
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old deleted records in ${repository.metadata.tableName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get soft delete statistics for a table
   */
  async getStats<T extends TenantBaseEntity | BaseEntity>(
    repository: Repository<T>,
    companyId?: string,
  ): Promise<{
    total: number;
    active: number;
    deleted: number;
    deletedPercentage: number;
  }> {
    const baseWhere = companyId ? { companyId: companyId as any } : {};

    const total = await repository.count({
      where: baseWhere as FindOptionsWhere<T>,
    });

    const deleted = await this.countDeleted(repository, baseWhere as FindOptionsWhere<T>);
    const active = total - deleted;

    return {
      total,
      active,
      deleted,
      deletedPercentage: total > 0 ? Math.round((deleted / total) * 100) : 0,
    };
  }
}
