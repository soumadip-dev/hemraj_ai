import { pool } from '../config/database.config';
import type { GetDebtorsInput } from '../validator/debtor.validator';

// Get all debtors
export const getDebtorsQuery = async (
  userRole: string,
  userDepartmentId: string,
  filters: GetDebtorsInput
) => {
  const { page, limit, search, riskLevel, priority, dateFrom, dateTo } = filters;

  // Calculate pagination offset.
  const offset = (page - 1) * limit;

  // Admin can see all departments other can see only there own department.
  const departmentId = userRole === 'admin' ? null : userDepartmentId;

  // make values
  const values = [
    departmentId,
    search ? `%${search}%` : null,
    riskLevel ?? null,
    priority ?? null,
    dateFrom ?? null,
    dateTo ?? null,
    limit,
    offset,
  ];

  // Get debtors.
  const query = `
    SELECT d.id, d.department_id, d.name, d.email, d.phone, d.risk_level, d.priority, d.credit_limit, d.created_at,
      (
        SELECT SUM(t.outstanding_amount)
        FROM transactions t
        WHERE t.debtor_id = d.id
          AND t.outstanding_amount > 0
      ) AS total_outstanding,
      (
        SELECT MAX(CURRENT_DATE - t.due_date)
        FROM transactions t
        WHERE t.debtor_id = d.id
          AND t.type = 'invoice'
          AND t.outstanding_amount > 0
          AND t.due_date IS NOT NULL
          AND t.due_date < CURRENT_DATE
      ) AS ageing_days

    FROM debtors d

    WHERE
      ($1::UUID IS NULL OR d.department_id = $1::UUID)
      AND (
        $2::VARCHAR IS NULL
        OR d.name ILIKE $2::VARCHAR
        OR d.email ILIKE $2::VARCHAR
        OR d.phone ILIKE $2::VARCHAR
      )
      AND ($3::VARCHAR IS NULL OR d.risk_level = $3::VARCHAR)
      AND ($4::VARCHAR IS NULL OR d.priority = $4::VARCHAR)
      AND ($5::DATE IS NULL OR d.created_at::DATE >= $5::DATE)
      AND ($6::DATE IS NULL OR d.created_at::DATE <= $6::DATE)
    LIMIT $7
    OFFSET $8;
  `;

  const result = await pool.query(query, values);

  return {
    debtors: result.rows,
    page,
    limit,
  };
};

// Get single debtor by id
export const getDebtorByIdQuery = async (
  debtorId: string,
  userRole: string,
  userDepartmentId: string
) => {
  // Admin can see all departments, others can see only their own department.
  const departmentId = userRole === 'admin' ? null : userDepartmentId;

  // Values for the SQL query.
  const values = [debtorId, departmentId];

  const query = `
    SELECT
      d.id,
      d.department_id,
      d.name,
      d.email,
      d.phone,
      d.risk_level,
      d.priority,
      d.credit_limit,
      d.created_at
    FROM debtors d
    WHERE
      d.id = $1
      AND ($2::UUID IS NULL OR d.department_id = $2::UUID);
  `;

  const result = await pool.query(query, values);

  return result.rows[0] ?? null;
};

// export const checkDebtorAccessQuery = async (
//   debtorId: string,
//   userRole: string,
//   userDepartmentId: string
// ) => {
//   const values: string[] = [debtorId];

//   let departmentCondition = '';

//   if (userRole !== 'admin') {
//     values.push(userDepartmentId);

//     departmentCondition = `
//       AND department_id = $2
//     `;
//   }

//   const query = `
//     SELECT id
//     FROM debtors
//     WHERE id = $1
//     ${departmentCondition}
//   `;

//   const result = await pool.query(query, values);

//   return result.rows[0] ?? null;
// };
