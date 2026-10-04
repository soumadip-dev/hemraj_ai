import { pool } from '../config/database.config';

// find role by name (e.g., 'agent', 'admin', 'manager')
export const findRoleByName = async (name: string) => {
  const query = `
    SELECT
      id,
      name,
      created_at
    FROM roles
    WHERE name = $1
  `;
  const result = await pool.query(query, [name]);
  return result.rows[0] ?? null;
};

// find role by id
export const findRoleById = async (roleId: string) => {
  const query = `
    SELECT
      id,
      name,
      created_at
    FROM roles
    WHERE id = $1
  `;
  const result = await pool.query(query, [roleId]);
  return result.rows[0] ?? null;
};
