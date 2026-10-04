import { pool } from '../config/database.config';
import type { GetDebtorTransactionsInput } from '../validator/debtor.validator';

// Get transactions of a debtor
export const getDebtorTransactionsQuery = async (filters: GetDebtorTransactionsInput) => {
  const {
    id: debtorId,
    page,
    limit,
    type,
    status,
    dateFrom,
    dateTo,
    minAgeingDays,
    sortBy,
    sortOrder,
  } = filters;

  // Calculate which records to skip.
  const offset = (page - 1) * limit;

  // Values used by the SQL query.
  const values = [
    debtorId,
    type ?? null,
    status ?? null,
    dateFrom ?? null,
    dateTo ?? null,
    minAgeingDays ?? null,
    limit,
    offset,
  ];

  // Decide which column to use for sorting if nothing send then use issue_date
  let sortColumn = 't.issue_date';

  if (sortBy === 'due_date') {
    sortColumn = 't.due_date';
  } else if (sortBy === 'amount') {
    sortColumn = 't.amount';
  } else if (sortBy === 'created_at') {
    sortColumn = 't.created_at';
  }

  // Decide sorting order.
  const sortOrderValue = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Get transactions.
  const query = `
    SELECT
      t.id,
      t.debtor_id,
      t.type,
      t.reference_no,
      t.amount,
      t.outstanding_amount,
      t.issue_date,
      t.due_date,
      t.status,
      t.created_at,

      CASE
        WHEN t.due_date IS NOT NULL
          AND t.due_date < CURRENT_DATE
          AND t.outstanding_amount > 0
        THEN CURRENT_DATE - t.due_date
        ELSE 0
      END AS ageing_days

    FROM transactions t

    WHERE
      t.debtor_id = $1

      AND ($2::VARCHAR IS NULL OR t.type = $2::VARCHAR)

      AND ($3::VARCHAR IS NULL OR t.status = $3::VARCHAR)

      AND ($4::DATE IS NULL OR t.issue_date >= $4::DATE)

      AND ($5::DATE IS NULL OR t.issue_date <= $5::DATE)

      AND (
        $6::INTEGER IS NULL
        OR (
          t.type = 'invoice'
          AND t.outstanding_amount > 0
          AND t.due_date IS NOT NULL
          AND CURRENT_DATE - t.due_date >= $6::INTEGER
        )
      )

    ORDER BY ${sortColumn} ${sortOrderValue}

    LIMIT $7
    OFFSET $8;
  `;

  const result = await pool.query(query, values);

  return {
    transactions: result.rows,
    page,
    limit,
  };
};
