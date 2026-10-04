import { pool } from '../config/database.config';

// check if email exists
export const findUserByEmail = async (email: string) => {
  const query = `
    SELECT
      id,
      full_name,
      email,
      password_hash,
      failed_login_attempts,
      locked_until,
      department_id,
      role_id,
      created_at,
      updated_at
    FROM users
    WHERE email = $1
  `;
  const result = await pool.query(query, [email]);
  return result.rows[0] ?? null;
};

export const findUserById = async (userId: string) => {
  const query = `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.password_hash,
      u.failed_login_attempts,
      u.locked_until,
      u.last_login_at,
      u.department_id,
      u.role_id,
      u.created_at,
      u.updated_at,
      u.refresh_token,
      r.name AS role_name,
      d.name AS department_name
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    INNER JOIN departments d ON d.id = u.department_id
    WHERE u.id = $1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] ?? null;
};

// create a new user
export const createUser = async (data: {
  fullName: string;
  email: string;
  passwordHash: string;
  departmentId: string;
  roleId: string;
}) => {
  const { fullName, email, passwordHash, departmentId, roleId } = data;

  const query = `
    INSERT INTO users (
      full_name,
      email,
      password_hash,
      department_id,
      role_id
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      full_name,
      email,
      department_id,
      role_id,
      created_at
  `;
  const result = await pool.query(query, [fullName, email, passwordHash, departmentId, roleId]);

  return result.rows[0];
};

// user.depertment_id = department.id(join)
// user.role_id = role.id(join)
export const findUserByEmailWithRole = async (email: string) => {
  const query = `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.password_hash,
      u.failed_login_attempts,
      u.locked_until,
      u.last_login_at,
      u.department_id,
      u.role_id,
      u.created_at,
      u.updated_at,
      r.name AS role_name,
      d.name AS department_name
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    INNER JOIN departments d ON d.id = u.department_id
    WHERE u.email = $1
  `;
  const result = await pool.query(query, [email]);
  return result.rows[0] ?? null;
};

// increment failed login attempts
export const incrementFailedAttempts = async (userId: string) => {
  const query = `
    UPDATE users
    SET
      failed_login_attempts = failed_login_attempts + 1,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      failed_login_attempts
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] ?? null;
};

// lock user account
export const lockUser = async (userId: string, until: Date) => {
  const query = `
    UPDATE users
    SET
      locked_until = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      locked_until
  `;
  const result = await pool.query(query, [userId, until]);
  return result.rows[0] ?? null;
};

// reset failed attempts + update last login
export const resetFailedAttempts = async (userId: string) => {
  const query = `
    UPDATE users
    SET
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      failed_login_attempts,
      locked_until,
      last_login_at
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] ?? null;
};

// save refresh token to user
export const saveRefreshToken = async (userId: string, refreshToken: string) => {
  const query = `
    UPDATE users
    SET
      refresh_token = $2,
      updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        refresh_token
  `;
  const result = await pool.query(query, [userId, refreshToken]);
  return result.rows[0] ?? null;
};

// delete refresh token
export const deleteRefreshToken = async (userId: string) => {
  const query = `
    UPDATE users
    SET
      refresh_token = NULL,
      updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        refresh_token
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] ?? null;
};
