import { pool } from '../config/database.config.ts';

const ROLES = ['admin', 'manager', 'agent'];

const seedRoles = async (): Promise<void> => {
  console.log('🌱 Seeding roles...');

  const query = `
    INSERT INTO roles (name)
    VALUES ($1)
    ON CONFLICT (name) DO NOTHING
    RETURNING id, name
  `;

  for (const name of ROLES) {
    try {
      const result = await pool.query(query, [name]);

      if (result.rowCount === 0) {
        console.log(`   ⏭️  Skipped (already exists): ${name}`);
      } else {
        console.log(`   ✅ Inserted: ${name} (id: ${result.rows[0].id})`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to insert ${name}:`, error);
    }
  }

  console.log('🌱 Roles seeding complete.');
};

seedRoles()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
