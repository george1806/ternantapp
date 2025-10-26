import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Company } from '../../companies/entities/company.entity';
import { UserRole, UserStatus } from '../../../common/enums';

@Entity('users')
@Index(['companyId', 'email'], { unique: true, where: 'company_id IS NOT NULL' })
@Index(['companyId', 'status'])
@Index(['role'])
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ name: 'company_id', type: 'uuid', nullable: true })
    companyId: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
    @Column({ length: 100, name: 'first_name' })
    firstName: string;

    @Column({ length: 100, name: 'last_name' })
    lastName: string;

    @Column({ length: 255 })
    email: string;

    @Exclude()
    @Column({ name: 'password_hash', length: 255 })
    passwordHash: string;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.STAFF })
    role: UserRole;

    @Column({ type: 'boolean', default: false, name: 'is_super_admin' })
    isSuperAdmin: boolean;

    @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
    status: UserStatus;

    @Column({ type: 'json', nullable: true })
    profile: {
        phone?: string;
        avatar?: string;
        timezone?: string;
        language?: string;
        preferences?: Record<string, any>;
    };

    @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
    lastLoginAt: Date;

    @Column({ type: 'varchar', length: 45, nullable: true, name: 'last_login_ip' })
    lastLoginIp: string;

    @Column({ type: 'timestamp', nullable: true, name: 'email_verified_at' })
    emailVerifiedAt: Date;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'verification_token' })
    verificationToken: string;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'reset_token' })
    resetToken: string;

    @Column({ type: 'timestamp', nullable: true, name: 'reset_token_expires_at' })
    resetTokenExpiresAt: Date;

    @ManyToOne(() => Company, (company) => company.users, {
        onDelete: 'CASCADE',
        nullable: true
    })
    @JoinColumn({ name: 'company_id' })
    company: Company | null;

    // Virtual field for full name
    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }
}
