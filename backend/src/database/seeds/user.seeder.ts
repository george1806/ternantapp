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

            // Admin
            users.push({
                companyId: company.id,
                firstName: 'Sarah',
                lastName: 'Admin',
                email: `admin@${company.slug}.com`,
                passwordHash: password,
                role: UserRole.ADMIN,
                status: UserStatus.ACTIVE,
                profile: {
                    phone: '+254-700-000-002'
                }
            });

            // Staff
            users.push({
                companyId: company.id,
                firstName: 'Mike',
                lastName: 'Staff',
                email: `staff@${company.slug}.com`,
                passwordHash: password,
                role: UserRole.STAFF,
                status: UserStatus.ACTIVE,
                profile: {
                    phone: '+254-700-000-003'
                }
            });

            // Auditor
            users.push({
                companyId: company.id,
                firstName: 'Jane',
                lastName: 'Auditor',
                email: `auditor@${company.slug}.com`,
                passwordHash: password,
                role: UserRole.AUDITOR,
                status: UserStatus.ACTIVE,
                profile: {
                    phone: '+254-700-000-004'
                }
            });
        }

        const savedUsers: User[] = [];

        for (const userData of users) {
            let user = await userRepository.findOne({
                where: { companyId: userData.companyId, email: userData.email }
            });

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
        console.log(`📝 Default password for all users: Password123!\n`);
        return savedUsers;
    }

    async clear(): Promise<void> {
        const userRepository = this.dataSource.getRepository(User);
        await userRepository.clear();
        console.log('🗑️  Cleared all users');
    }
}
