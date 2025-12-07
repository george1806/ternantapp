import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../modules/users/entities/user.entity';
import { Company } from '../../modules/companies/entities/company.entity';
import { UserRole, UserStatus } from '../../common/enums';

/**
 * User Seeder
 * Creates test users with different roles
 *
 * Author: george1806
 */
export class UserSeeder {
    constructor(private readonly dataSource: DataSource) {}

    async run(companies: Company[]): Promise<User[]> {
        const userRepository = this.dataSource.getRepository(User);

        console.log('👥 Seeding users...');

        const users = [];
        const password = await bcrypt.hash('Password123!', 12);

        // Platform Admin (not tied to any company)
        users.push({
            companyId: null,
            firstName: 'Platform',
            lastName: 'Admin',
            email: 'admin@platform.com',
            passwordHash: password,
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
            profile: {
                phone: '+254-700-000-000'
            }
        });

        for (const company of companies) {
            // Owner
            users.push({
                companyId: company.id,
                firstName: 'John',
                lastName: 'Owner',
                email: `owner@${company.slug}.com`,
                passwordHash: password,
                role: UserRole.OWNER,
                status: UserStatus.ACTIVE,
                profile: {
                    phone: '+254-700-000-001'
                }
            });

            // Worker 1
            users.push({
                companyId: company.id,
                firstName: 'Mike',
                lastName: 'Worker',
                email: `worker1@${company.slug}.com`,
                passwordHash: password,
                role: UserRole.WORKER,
                status: UserStatus.ACTIVE,
                profile: {
                    phone: '+254-700-000-002'
                }
            });

            // Worker 2
            users.push({
                companyId: company.id,
                firstName: 'Jane',
                lastName: 'Worker',
                email: `worker2@${company.slug}.com`,
                passwordHash: password,
                role: UserRole.WORKER,
                status: UserStatus.ACTIVE,
                profile: {
                    phone: '+254-700-000-003'
                }
            });
        }

        const savedUsers: User[] = [];

        for (const userData of users) {
            // For platform admin (no companyId), check by email only
            const where = userData.companyId
                ? { companyId: userData.companyId, email: userData.email }
                : { email: userData.email };

            let user = await userRepository.findOne({ where });

            if (!user) {
                user = userRepository.create(userData);
                await userRepository.save(user);
                console.log(`  ✓ Created user: ${user.email} (${user.role})`);
            } else {
                console.log(`  ⊙ User already exists: ${user.email}`);
            }

            savedUsers.push(user);
        }

        console.log(`✅ Seeded ${savedUsers.length} users\n`);
        console.log(`📝 Default password for all users: Password123!`);
        console.log(`📧 Platform Admin: admin@platform.com\n`);
        return savedUsers;
    }

    async clear(): Promise<void> {
        const userRepository = this.dataSource.getRepository(User);
        await userRepository.clear();
        console.log('🗑️  Cleared all users');
    }
}
