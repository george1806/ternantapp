import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole, UserStatus } from '../../common/enums';

/**
 * Seed script to create a super admin user
 *
 * Usage: npm run seed:create-super-admin
 */
export async function createSuperAdminSeed(dataSource: DataSource) {
    const userRepository = dataSource.getRepository(User);

    // Check if super admin already exists
    const existingSuperAdmin = await userRepository.findOne({
        where: { email: 'superadmin@ternantapp.com' }
    });

    if (existingSuperAdmin) {
        console.log('✅ Super admin already exists');
        console.log('Email:', existingSuperAdmin.email);
        return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('SuperAdmin@2025', 10);

    // Create super admin user (Platform Admin)
    const superAdmin = userRepository.create({
        companyId: null, // Platform admin doesn't belong to any company
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@ternantapp.com',
        passwordHash,
        role: UserRole.ADMIN,
        isSuperAdmin: true,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date()
    });

    await userRepository.save(superAdmin);

    console.log('✅ Super admin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', superAdmin.email);
    console.log('Password: SuperAdmin@2025');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  IMPORTANT: Change this password after first login!');
}
