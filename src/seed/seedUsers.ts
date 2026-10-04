import { pool } from '../config/database.config.ts';
import { hashPassword } from '../utils/password.util.ts';

const USERS = [
  {
    fullName: 'Admin User',
    email: 'admin@hemraj.com',
    password: 'Password@123',
    role: 'admin',
    department: 'finance',
  },
  {
    fullName: 'Finance Manager',
    email: 'manager@hemraj.com',
    password: 'Password@123',
    role: 'manager',
    department: 'finance',
  },
  {
    fullName: 'Finance Agent',
    email: 'agent@hemraj.com',
    password: 'Password@123',
    role: 'agent',
    department: 'finance',
  },
  {
    fullName: 'Sales Manager',
    email: 'sales.manager@hemraj.com',
    password: 'Password@123',
    role: 'manager',
    department: 'sales',
  },
];

const seedUsers = async (): Promise<void> => {
  console.log('🌱 Seeding users...');

  const passwordHash = await hashPassword('Password@123');

  const query = `
    INSERT INTO users (
      department_id,
      role_id,
      full_name,
      email,
      password_hash
    )
    SELECT
      d.id,
      r.id,
      $1,
      $2,
      $3
    FROM departments d
    CROSS JOIN roles r
    WHERE d.name = $4
      AND r.name = $5
    ON CONFLICT (email) DO NOTHING
    RETURNING id, full_name, email;
  `;

  for (const user of USERS) {
    try {
      const result = await pool.query(query, [
        user.fullName,
        user.email,
        passwordHash,
        user.department,
        user.role,
      ]);

      if (result.rowCount === 0) {
        console.log(`   ⏭️ Skipped (already exists): ${user.email}`);
      } else {
        console.log(`   ✅ Inserted: ${user.email}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to insert ${user.email}:`, error);
    }
  }

  console.log('🌱 Users seeding complete.');
};

seedUsers()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
