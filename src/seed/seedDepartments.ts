// src/seed/seedDepartments.ts — SIMPLEST VERSION
import { pool } from '../config/database.config.ts';

const DEPARTMENTS = ['finance', 'sales', 'hr', 'operations', 'admin'];

const seedDepartments = async (): Promise<void> => {
  console.log('🌱 Seeding departments...');

  const query = `
    INSERT INTO departments (name)
    VALUES ($1)
    ON CONFLICT (name) DO NOTHING
    RETURNING id, name
  `;

  for (const name of DEPARTMENTS) {
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

  console.log('🌱 Departments seeding complete.');
};

// Direct execution
seedDepartments()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
