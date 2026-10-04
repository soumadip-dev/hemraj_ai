import { pool } from '../config/database.config';

// check if department exists
export const checkDepartmentExists = async (departmentId: string) => {
  const query = `
    SELECT
      id,
      name,
      created_at,
      updated_at
    FROM departments
    WHERE id = $1
  `;
  const result = await pool.query(query, [departmentId]);
  return result.rows[0] ?? null;
};
