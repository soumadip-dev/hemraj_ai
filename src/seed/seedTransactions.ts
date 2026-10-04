import { pool } from '../config/database.config.ts';

const TRANSACTIONS = [
  {
    debtorEmail: 'accounts@abcmfg.com',
    type: 'invoice',
    referenceNo: 'INV-1001',
    amount: 200000,
    outstandingAmount: 150000,
    issueDate: '2026-05-01',
    dueDate: '2026-06-01',
    status: 'partially_paid',
  },
  {
    debtorEmail: 'accounts@abcmfg.com',
    type: 'invoice',
    referenceNo: 'INV-1002',
    amount: 100000,
    outstandingAmount: 100000,
    issueDate: '2026-07-15',
    dueDate: '2026-08-15',
    status: 'open',
  },
  {
    debtorEmail: 'accounts@abcmfg.com',
    type: 'payment',
    referenceNo: 'PAY-1001',
    amount: 50000,
    outstandingAmount: 0,
    issueDate: '2026-07-01',
    dueDate: null,
    status: 'paid',
  },

  {
    debtorEmail: 'accounts@xyzindustries.com',
    type: 'invoice',
    referenceNo: 'INV-2001',
    amount: 300000,
    outstandingAmount: 200000,
    issueDate: '2026-06-01',
    dueDate: '2026-07-01',
    status: 'partially_paid',
  },
  {
    debtorEmail: 'accounts@xyzindustries.com',
    type: 'payment',
    referenceNo: 'PAY-2001',
    amount: 100000,
    outstandingAmount: 0,
    issueDate: '2026-07-15',
    dueDate: null,
    status: 'paid',
  },

  {
    debtorEmail: 'finance@globaltraders.com',
    type: 'invoice',
    referenceNo: 'INV-3001',
    amount: 500000,
    outstandingAmount: 500000,
    issueDate: '2026-03-01',
    dueDate: '2026-04-01',
    status: 'open',
  },
  {
    debtorEmail: 'finance@globaltraders.com',
    type: 'invoice',
    referenceNo: 'INV-3002',
    amount: 150000,
    outstandingAmount: 150000,
    issueDate: '2026-07-01',
    dueDate: '2026-08-01',
    status: 'open',
  },

  {
    debtorEmail: 'billing@techsolutions.com',
    type: 'invoice',
    referenceNo: 'INV-4001',
    amount: 100000,
    outstandingAmount: 0,
    issueDate: '2026-07-01',
    dueDate: '2026-08-01',
    status: 'paid',
  },

  {
    debtorEmail: 'accounts@retailworld.com',
    type: 'invoice',
    referenceNo: 'INV-5001',
    amount: 180000,
    outstandingAmount: 120000,
    issueDate: '2026-06-15',
    dueDate: '2026-07-15',
    status: 'partially_paid',
  },

  {
    debtorEmail: 'finance@superstore.com',
    type: 'invoice',
    referenceNo: 'INV-6001',
    amount: 80000,
    outstandingAmount: 80000,
    issueDate: '2026-08-01',
    dueDate: '2026-09-01',
    status: 'open',
  },
];

const seedTransactions = async (): Promise<void> => {
  console.log('🌱 Seeding transactions...');

  const query = `
    INSERT INTO transactions (
      debtor_id,
      type,
      reference_no,
      amount,
      outstanding_amount,
      issue_date,
      due_date,
      status
    )
    SELECT
      d.id,
      $1::VARCHAR,
      $2::VARCHAR,
      $3::NUMERIC,
      $4::NUMERIC,
      $5::DATE,
      $6::DATE,
      $7::VARCHAR
    FROM debtors d
    WHERE d.email = $8::VARCHAR
    AND NOT EXISTS (
      SELECT 1
      FROM transactions existing
      WHERE existing.reference_no = $2::VARCHAR
    )
    RETURNING id, reference_no;
  `;

  for (const transaction of TRANSACTIONS) {
    try {
      const result = await pool.query(query, [
        transaction.type,
        transaction.referenceNo,
        transaction.amount,
        transaction.outstandingAmount,
        transaction.issueDate,
        transaction.dueDate,
        transaction.status,
        transaction.debtorEmail,
      ]);

      if (result.rowCount === 0) {
        console.log(
          `   ⏭️ Skipped (already exists or debtor not found): ${transaction.referenceNo}`
        );
      } else {
        console.log(`   ✅ Inserted: ${transaction.referenceNo}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to insert ${transaction.referenceNo}:`, error);
    }
  }

  console.log('🌱 Transactions seeding complete.');
};

seedTransactions()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
