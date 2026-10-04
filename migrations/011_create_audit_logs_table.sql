CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(50),

    entity_id UUID,

    metadata JSONB, --- JSONB is a PostgreSQL extension that allows storing JSON data in a column.

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);