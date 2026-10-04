import { pool } from '../config/database.config';

// Get a session from the database.
export const getSessionById = async (sessionId: string) => {
  const query = `
    SELECT
      s.id,
      s.user_id,
      u.department_id
    FROM agent_sessions s
    JOIN users u
      ON u.id = s.user_id
    WHERE s.id = $1;
  `;

  const result = await pool.query(query, [sessionId]);

  return result.rows[0] ?? null;
};

// Create a new session.
export const createSession = async (userId: string) => {
  const query = `
    INSERT INTO agent_sessions (
      user_id,
      title
    )
    VALUES ($1, $2)
    RETURNING id, user_id, title, created_at;
  `;

  const result = await pool.query(query, [userId, 'New Agent Conversation']);

  return result.rows[0];
};

// Create a new message.
export const createMessage = async (
  sessionId: string,
  sender: 'user' | 'agent',
  content: string
) => {
  const query = `
    INSERT INTO agent_messages (
      session_id,
      sender,
      content
    )
    VALUES ($1, $2, $3)
    RETURNING
      id,
      session_id,
      sender,
      content,
      created_at;
  `;

  const result = await pool.query(query, [sessionId, sender, content]);

  return result.rows[0];
};

// Get all messages from a session.
export const getSessionMessages = async (sessionId: string) => {
  const query = `
    SELECT
      id,
      session_id,
      sender,
      content,
      created_at
    FROM agent_messages
    WHERE session_id = $1
    ORDER BY created_at ASC;
  `;

  const result = await pool.query(query, [sessionId]);

  return result.rows;
};
