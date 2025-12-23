import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Currency } from '../../../common/enums';

@Entity('companies')
export class Company extends BaseEntity {
    @Column({ length: 255 })
    name: string;

    @Column({ length: 100, unique: true })
    slug: string;

    @Column({ length: 255, nullable: true })
    email: string;

    @Column({ length: 50, nullable: true })
    phone: string;

    @Column({
        type: 'enum',
        enum: Currency,
        default: Currency.USD,
    })
    currency: Currency;

    @Column({ length: 50, default: 'UTC' })
    timezone: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ length: 100, nullable: true })
    city: string;

    @Column({ length: 100, nullable: true })
    region: string;

    @Column({ length: 100, nullable: true })
    country: string;

    @Column({ name: 'postal_code', length: 20, nullable: true })
    postalCode: string;

    @Column({ length: 255, nullable: true })
    website: string;

    @Column({ type: 'json', nullable: true, name: 'email_settings' })
    emailSettings: {
        smtpHost?: string;
        smtpPort?: number;
        smtpUser?: string;
        smtpPassword?: string;
        fromName?: string;
        fromEmail?: string;
    };

    @Column({ type: 'json', nullable: true, name: 'reminder_preferences' })
    reminderPreferences: {
        enabled?: boolean;
        daysBefore?: number;
        daysAfter?: number;
        sendTime?: string;
        ccEmails?: string[];
    };

    @Column({ type: 'json', nullable: true, name: 'branding' })
    branding: {
        logo?: string;
        primaryColor?: string;
        secondaryColor?: string;
    };

    @Column({ default: true, name: 'is_active' })
    isActive: boolean;

    // Relations
    @OneToMany(() => User, (user) => user.company)
    users: User[];
}
