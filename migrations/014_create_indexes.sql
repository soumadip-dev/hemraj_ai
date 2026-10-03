-- ============================================
-- USERS
-- ============================================

CREATE INDEX idx_users_department
ON users(department_id);

CREATE INDEX idx_users_role
ON users(role_id);


-- ============================================
-- REFRESH TOKENS
-- ============================================

CREATE INDEX idx_refresh_tokens_user
ON refresh_tokens(user_id);

CREATE INDEX idx_refresh_tokens_expires_at
ON refresh_tokens(expires_at);


-- ============================================
-- DEBTORS
-- ============================================

CREATE INDEX idx_debtors_department
ON debtors(department_id);

CREATE INDEX idx_debtors_risk_level
ON debtors(risk_level);

CREATE INDEX idx_debtors_priority
ON debtors(priority);

CREATE INDEX idx_debtors_department_risk_priority
ON debtors(department_id, risk_level, priority);


-- ============================================
-- TRANSACTIONS
-- ============================================

CREATE INDEX idx_transactions_debtor
ON transactions(debtor_id);

CREATE INDEX idx_transactions_due_date
ON transactions(due_date);

CREATE INDEX idx_transactions_status
ON transactions(status);

CREATE INDEX idx_transactions_debtor_due_date
ON transactions(debtor_id, due_date);

CREATE INDEX idx_transactions_debtor_status
ON transactions(debtor_id, status);


-- ============================================
-- AGENT SESSIONS
-- ============================================

CREATE INDEX idx_sessions_user
ON agent_sessions(user_id);

CREATE INDEX idx_sessions_department
ON agent_sessions(department_id);


-- ============================================
-- AGENT MESSAGES
-- ============================================

CREATE INDEX idx_messages_session_created
ON agent_messages(session_id, created_at);


-- ============================================
-- FOLLOW-UPS
-- ============================================

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


-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE INDEX idx_audit_logs_user
ON audit_logs(user_id);

CREATE INDEX idx_audit_logs_created
ON audit_logs(created_at);

CREATE INDEX idx_audit_logs_entity
ON audit_logs(entity_type, entity_id);