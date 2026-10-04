import { pool } from '../config/database.config';

export const getMessageWithSession = async (messageId: string) => {
  const query = `
    SELECT
      m.id,
      m.sender,
      s.user_id,
      u.department_id
    FROM agent_messages m
    JOIN agent_sessions s
      ON s.id = m.session_id
    JOIN users u
      ON u.id = s.user_id
    WHERE m.id = $1;
  `;

  const result = await pool.query(query, [messageId]);

  return result.rows[0] ?? null;
};

export const getFeedbackByMessageAndUser = async (messageId: string, userId: string) => {
  const query = `
    SELECT
      id,
      message_id,
      user_id,
      rating,
      comment,
      created_at
    FROM feedback
    WHERE message_id = $1
      AND user_id = $2;
  `;

  const result = await pool.query(query, [messageId, userId]);

  return result.rows[0] ?? null;
};

export const createFeedback = async (
  messageId: string,
  userId: string,
  rating: number,
  comment?: string
) => {
  const query = `
    INSERT INTO feedback (
      message_id,
      user_id,
      rating,
      comment
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      message_id,
      user_id,
      rating,
      comment,
      created_at;
  `;

  const result = await pool.query(query, [messageId, userId, rating, comment ?? null]);

  return result.rows[0];
};
