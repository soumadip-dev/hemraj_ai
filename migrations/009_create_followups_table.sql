CREATE TABLE followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    debtor_id UUID NOT NULL
        REFERENCES debtors(id)
        ON DELETE RESTRICT,

    assigned_to UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_by UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    type VARCHAR(20) NOT NULL
        CHECK (type IN ('call', 'email', 'escalation')),

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),

    follow_up_date DATE NOT NULL,

    note TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);