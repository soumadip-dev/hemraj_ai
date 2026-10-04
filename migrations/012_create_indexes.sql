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

CREATE INDEX idx_debtors_department_risk_priority
ON debtors(department_id, risk_level, priority);


-- TRANSACTIONS

CREATE INDEX idx_transactions_debtor_id
ON transactions(debtor_id);

CREATE INDEX idx_transactions_due_date
ON transactions(due_date);

CREATE INDEX idx_transactions_status
ON transactions(status);

CREATE INDEX idx_transactions_debtor_due_date
ON transactions(debtor_id, due_date);

CREATE INDEX idx_transactions_debtor_status
ON transactions(debtor_id, status);

CREATE INDEX idx_transactions_issue_date
ON transactions(issue_date);


-- AGENT SESSIONS

CREATE INDEX idx_agent_sessions_user_id
ON agent_sessions(user_id);

CREATE INDEX idx_agent_sessions_department_id
ON agent_sessions(department_id);

CREATE INDEX idx_agent_sessions_user_created
ON agent_sessions(user_id, created_at);


-- AGENT MESSAGES

CREATE INDEX idx_agent_messages_session_created
ON agent_messages(session_id, created_at);


-- FOLLOW-UPS

CREATE INDEX idx_followups_assigned_status_date
ON followups(
    assigned_to,
    status,
    follow_up_date
);

CREATE INDEX idx_followups_debtor_status
ON followups(
    debtor_id,
    status
);

CREATE INDEX idx_followups_created_by
ON followups(created_by);

CREATE INDEX idx_followups_status_date
ON followups(status, follow_up_date);


-- FEEDBACK

CREATE INDEX idx_feedback_message_id
ON feedback(message_id);

CREATE INDEX idx_feedback_user_id
ON feedback(user_id);


-- AUDIT LOGS

CREATE INDEX idx_audit_logs_user_id
ON audit_logs(user_id);

CREATE INDEX idx_audit_logs_created_at
ON audit_logs(created_at);

CREATE INDEX idx_audit_logs_entity
ON audit_logs(entity_type, entity_id);

CREATE INDEX idx_audit_logs_action
ON audit_logs(action);