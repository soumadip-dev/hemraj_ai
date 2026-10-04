-- USERS

CREATE INDEX idx_users_department_id
ON users(department_id);

CREATE INDEX idx_users_role_id
ON users(role_id);


-- DEBTORS

CREATE INDEX idx_debtors_department_id
ON debtors(department_id);

CREATE INDEX idx_debtors_risk_level
ON debtors(risk_level);

CREATE INDEX idx_debtors_priority
ON debtors(priority);


-- TRANSACTIONS

CREATE INDEX idx_transactions_debtor_id
ON transactions(debtor_id);

CREATE INDEX idx_transactions_due_date
ON transactions(due_date);

CREATE INDEX idx_transactions_status
ON transactions(status);


-- AGENT SESSIONS

CREATE INDEX idx_agent_sessions_user_id
ON agent_sessions(user_id);


-- AGENT MESSAGES

CREATE INDEX idx_agent_messages_session_id
ON agent_messages(session_id);


-- FOLLOWUPS

CREATE INDEX idx_followups_assigned_to
ON followups(assigned_to);

CREATE INDEX idx_followups_status_date
ON followups(status, follow_up_date);


-- FEEDBACK

CREATE INDEX idx_feedback_message_id
ON feedback(message_id);