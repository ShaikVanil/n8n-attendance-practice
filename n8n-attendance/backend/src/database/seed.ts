import { userService } from '../services/userService';
import { CreateUserRequest } from '../types/user';

export async function seedTestUsers() {
  const testUsers: CreateUserRequest[] = [
    {
      email: 'admin@company.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin' as const,
      isActive: true,
      officeLocation: 'Main Office'
    },
    {
      email: 'manager@company.com',
      password: 'manager123',
      firstName: 'Manager',
      lastName: 'User',
      role: 'manager' as const,
      isActive: true,
      officeLocation: 'Main Office'
    },
    {
      email: 'employee@company.com',
      password: 'employee123',
      firstName: 'Employee',
      lastName: 'User',
      role: 'employee' as const,
      isActive: true,
      officeLocation: 'Main Office'
    }
  ];

  for (const userData of testUsers) {
    try {
      await userService.createUser(userData, 'system');
      console.log(`✅ Created user: ${userData.email}`);
    } catch (error: any) {
      if (error.message && error.message.includes('User with this email already exists')) {
        console.log(`ℹ️  User ${userData.email} already exists, skipping...`);
      } else {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }
  }

  console.log('✅ Test user seeding completed!');
  console.log('Available test accounts:');
  console.log('Admin: admin@company.com / admin123');
  console.log('Manager: manager@company.com / manager123');
  console.log('Employee: employee@company.com / employee123');
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedTestUsers();
}