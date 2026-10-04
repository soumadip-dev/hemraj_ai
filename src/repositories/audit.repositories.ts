import { pool } from '../config/database.config';

export const createAuditLog = async (
  userId: string,
  action: string,
  method: string,
  path: string,
  statusCode: number
) => {
  const query = `
    INSERT INTO audit_logs (user_id, action, method, path, status_code)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id,user_id,
      action,
      method,
      path,
      status_code,
      created_at;
      `;

  const result = await pool.query(query, [userId, action, method, path, statusCode]);

  return result.rows[0];
};

export const getAuditLogs = async (
  departmentId: string | null,
  userId: string | null,
  page: number = 1,
  limit: number = 20
) => {
  const offset = (page - 1) * limit;

  const query = `
    SELECT
      a.id,
      a.user_id,
      u.full_name AS user_name,
      u.department_id,
      a.action,
      a.method,
      a.path,
      a.status_code,
      a.created_at
    FROM audit_logs a
    LEFT JOIN users u
      ON u.id = a.user_id
    WHERE
      ($1::UUID IS NULL OR u.department_id = $1::UUID)
      AND ($2::UUID IS NULL OR a.user_id = $2::UUID)
    ORDER BY a.created_at DESC
    LIMIT $3
    OFFSET $4;
  `;

  const result = await pool.query(query, [departmentId, userId, limit, offset]);

  return result.rows;
};
