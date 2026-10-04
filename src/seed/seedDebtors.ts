import { pool } from '../config/database.config.ts';

const DEBTORS = [
  {
    department: 'finance',
    name: 'ABC Manufacturing',
    email: 'accounts@abcmfg.com',
    phone: '9876543210',
    riskLevel: 'high',
    priority: 'urgent',
    creditLimit: 500000,
  },
  {
    department: 'finance',
    name: 'XYZ Industries',
    email: 'accounts@xyzindustries.com',
    phone: '9876543211',
    riskLevel: 'medium',
    priority: 'high',
    creditLimit: 300000,
  },
  {
    department: 'finance',
    name: 'Global Traders',
    email: 'finance@globaltraders.com',
    phone: '9876543212',
    riskLevel: 'critical',
    priority: 'urgent',
    creditLimit: 750000,
  },
  {
    department: 'finance',
    name: 'Tech Solutions',
    email: 'billing@techsolutions.com',
    phone: '9876543213',
    riskLevel: 'low',
    priority: 'medium',
    creditLimit: 200000,
  },
  {
    department: 'sales',
    name: 'Retail World',
    email: 'accounts@retailworld.com',
    phone: '9876543214',
    riskLevel: 'medium',
    priority: 'high',
    creditLimit: 250000,
  },
  {
    department: 'sales',
    name: 'Super Store',
    email: 'finance@superstore.com',
    phone: '9876543215',
    riskLevel: 'low',
    priority: 'low',
    creditLimit: 150000,
  },
];

const seedDebtors = async (): Promise<void> => {
  console.log('🌱 Seeding debtors...');

  const query = `
    INSERT INTO debtors (
      department_id,
      name,
      email,
      phone,
      risk_level,
      priority,
      credit_limit
    )
    SELECT
      d.id,
      $1::VARCHAR,
      $2::VARCHAR,
      $3::VARCHAR,
      $4::VARCHAR,
      $5::VARCHAR,
      $6::NUMERIC
    FROM departments d
    WHERE d.name = $7::VARCHAR
    AND NOT EXISTS (
      SELECT 1
      FROM debtors existing
      WHERE existing.email = $2::VARCHAR
    )
    RETURNING id, name;
  `;

  for (const debtor of DEBTORS) {
    try {
      const result = await pool.query(query, [
        debtor.name,
        debtor.email,
        debtor.phone,
        debtor.riskLevel,
        debtor.priority,
        debtor.creditLimit,
        debtor.department,
      ]);

      if (result.rowCount === 0) {
        console.log(`   ⏭️ Skipped (already exists): ${debtor.name}`);
      } else {
        console.log(`   ✅ Inserted: ${debtor.name}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to insert ${debtor.name}:`, error);
    }
  }

  console.log('🌱 Debtors seeding complete.');
};

seedDebtors()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
