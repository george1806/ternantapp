import {
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Index,
    Column
} from 'typeorm';

/**
 * Base entity with common fields for all tenant-scoped entities
 * Includes soft delete support via deletedAt column
 *
 * Soft Delete Pattern:
 * - Records are never hard deleted
 * - deletedAt timestamp marks logical deletion
 * - Queries should filter WHERE deletedAt IS NULL
 * - Data preserved for audit trails and compliance
 */
export abstract class TenantBaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ name: 'company_id', type: 'uuid' })
    companyId: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt?: Date | null;

    /**
     * Helper method to check if record is soft deleted
     */
    isDeleted(): boolean {
        return this.deletedAt != null;
    }

    /**
     * Helper method to soft delete the record
     */
    softDelete(): void {
        this.deletedAt = new Date();
    }

    /**
     * Helper method to restore soft deleted record
     */
    restore(): void {
        this.deletedAt = null;
    }
}

/**
 * Base entity without tenant scoping (for companies, audit logs, etc.)
 * Includes soft delete support via deletedAt column
 */
export abstract class BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt?: Date | null;

    /**
     * Helper method to check if record is soft deleted
     */
    isDeleted(): boolean {
        return this.deletedAt != null;
    }

    /**
     * Helper method to soft delete the record
     */
    softDelete(): void {
        this.deletedAt = new Date();
    }

    /**
     * Helper method to restore soft deleted record
     */
    restore(): void {
        this.deletedAt = null;
    }
}
