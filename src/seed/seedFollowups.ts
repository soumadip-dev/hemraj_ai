import { pool } from '../config/database.config.ts';

const FOLLOWUPS = [
  {
    debtor: 'ABC Manufacturing',
    assignedTo: 'agent@hemraj.com',
    createdBy: 'manager@hemraj.com',
    type: 'call',
    status: 'pending',
    followUpDate: '2026-10-05',
    note: 'Contact customer regarding overdue invoice INV-1001.',
  },
  {
    debtor: 'Global Traders',
    assignedTo: 'agent@hemraj.com',
    createdBy: 'manager@hemraj.com',
    type: 'call',
    status: 'in_progress',
    followUpDate: '2026-10-06',
    note: 'Call customer regarding critical outstanding balance.',
  },
  {
    debtor: 'XYZ Industries',
    assignedTo: 'manager@hemraj.com',
    createdBy: 'manager@hemraj.com',
    type: 'email',
    status: 'pending',
    followUpDate: '2026-10-07',
    note: 'Send payment reminder email.',
  },
  {
    debtor: 'Retail World',
    assignedTo: 'sales.manager@hemraj.com',
    createdBy: 'sales.manager@hemraj.com',
    type: 'call',
    status: 'done',
    followUpDate: '2026-09-30',
    note: 'Customer contacted successfully.',
  },
];

const seedFollowups = async (): Promise<void> => {
  console.log('🌱 Seeding follow-ups...');

  const query = `
    INSERT INTO followups (
      debtor_id,
      assigned_to,
      created_by,
      type,
      status,
      follow_up_date,
      note
    )
    SELECT
      d.id,
      assigned_user.id,
      creator.id,
      $4::VARCHAR,
      $5::VARCHAR,
      $6::DATE,
      $7::TEXT
    FROM debtors d
    JOIN users assigned_user
      ON assigned_user.email = $2::VARCHAR
    JOIN users creator
      ON creator.email = $3::VARCHAR
    WHERE d.name = $1::VARCHAR
    RETURNING id;
  `;

  for (const followup of FOLLOWUPS) {
    try {
      const result = await pool.query(query, [
        followup.debtor,
        followup.assignedTo,
        followup.createdBy,
        followup.type,
        followup.status,
        followup.followUpDate,
        followup.note,
      ]);

      if (result.rowCount === 0) {
        console.log(`   ⚠️ Could not insert: ${followup.debtor}`);
      } else {
        console.log(`   ✅ Inserted: ${followup.debtor}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${followup.debtor}`, error);
    }
  }

  console.log('🌱 Follow-ups seeding complete.');
};

seedFollowups()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
