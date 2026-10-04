import { pool } from '../config/database.config';

// Get debtor department.
export const getDebtorById = async (debtorId: string) => {
  const query = `
    SELECT
      id,
      department_id,
      name
    FROM debtors
    WHERE id = $1;
  `;

  const result = await pool.query(query, [debtorId]);

  return result.rows[0] ?? null;
};

// Check if the asignedto userId is present in db or not
export const getUserWithRoleById = async (userId: string) => {
  const query = `
    SELECT
      u.id,
      u.department_id,
      r.name AS role
    FROM users u
    JOIN roles r
      ON r.id = u.role_id
    WHERE u.id = $1;
  `;

  const result = await pool.query(query, [userId]);

  return result.rows[0] ?? null;
};

//  check if similer follow-up exists
export const checkDuplicateFollowupExists = async (
  debtorId: string,
  assignedTo: string,
  type: string,
  followUpDate: Date
) => {
  const query = `
    SELECT
      id,
      debtor_id,
      assigned_to,
      type,
      status,
      follow_up_date,
      note
    FROM followups
    WHERE debtor_id = $1
      AND assigned_to = $2
      AND type = $3
      AND follow_up_date = $4
      AND status IN ('pending', 'in_progress')
    LIMIT 1;
  `;

  const result = await pool.query(query, [debtorId, assignedTo, type, followUpDate]);

  return result.rows[0] ?? null;
};

// Create a follow-up
export const createFollowup = async (
  debtorId: string,
  assignedTo: string,
  createdBy: string,
  type: string,
  followUpDate: Date,
  note?: string
) => {
  const query = `
    INSERT INTO followups (
      debtor_id,
      assigned_to,
      created_by,
      type,
      follow_up_date,
      note
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      debtor_id,
      assigned_to,
      created_by,
      type,
      status,
      follow_up_date,
      note,
      created_at;
  `;

  const result = await pool.query(query, [
    debtorId,
    assignedTo,
    createdBy,
    type,
    followUpDate,
    note ?? null,
  ]);

  return result.rows[0];
};

// Get follow-ups
export const getFollowups = async (
  departmentId: string | null,
  userId: string | null,
  status?: string,
  fromDate?: Date,
  toDate?: Date,
  page: number = 1,
  limit: number = 10
) => {
  const offset = (page - 1) * limit;

  const query = `
    SELECT
      f.id,
      f.debtor_id,
      d.name AS debtor_name,
      f.assigned_to,
      u.full_name AS assigned_to_name,
      f.created_by,
      f.type,
      f.status,
      f.follow_up_date,
      f.note,
      f.created_at
    FROM followups f
    JOIN debtors d
      ON d.id = f.debtor_id
    LEFT JOIN users u
      ON u.id = f.assigned_to

    WHERE
      ($1::UUID IS NULL OR d.department_id = $1::UUID)
      AND ($2::UUID IS NULL OR f.assigned_to = $2::UUID)
      AND ($3::VARCHAR IS NULL OR f.status = $3::VARCHAR)
      AND ($4::DATE IS NULL OR f.follow_up_date >= $4::DATE)
      AND ($5::DATE IS NULL OR f.follow_up_date <= $5::DATE)

    ORDER BY f.follow_up_date ASC, f.created_at DESC
    LIMIT $6
    OFFSET $7;
  `;

  const values = [
    departmentId,
    userId,
    status ?? null,
    fromDate ?? null,
    toDate ?? null,
    limit,
    offset,
  ];

  const result = await pool.query(query, values);

  return result.rows;
};
// Get follow-up with debtor department and assigned user.
export const getFollowupById = async (followupId: string) => {
  const query = `
    SELECT
      f.id,
      f.debtor_id,
      d.department_id,
      f.assigned_to,
      f.created_by,
      f.type,
      f.status,
      f.follow_up_date,
      f.note
    FROM followups f
    JOIN debtors d
      ON d.id = f.debtor_id
    WHERE f.id = $1;
  `;

  const result = await pool.query(query, [followupId]);

  return result.rows[0] ?? null;
};

// Update follow-up
export const updateFollowup = async (
  followupId: string,
  assignedTo?: string,
  status?: string,
  followUpDate?: Date,
  note?: string
) => {
  const existingFollowup = await getFollowupById(followupId);

  if (!existingFollowup) {
    return null;
  }

  const query = `
    UPDATE followups
    SET
      assigned_to = $2,
      status = $3,
      follow_up_date = $4,
      note = $5
    WHERE id = $1
    RETURNING
      id,
      debtor_id,
      assigned_to,
      created_by,
      type,
      status,
      follow_up_date,
      note,
      created_at;
  `;

  const result = await pool.query(query, [
    followupId,
    assignedTo ?? existingFollowup.assigned_to,
    status ?? existingFollowup.status,
    followUpDate ?? existingFollowup.follow_up_date,
    note ?? existingFollowup.note,
  ]);

  return result.rows[0] ?? null;
};
