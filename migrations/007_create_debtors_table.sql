CREATE TABLE debtors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    department_id UUID NOT NULL
        REFERENCES departments(id)
        ON DELETE RESTRICT,

    name VARCHAR(200) NOT NULL,

    email VARCHAR(255),

    phone VARCHAR(30),

    risk_level VARCHAR(20) NOT NULL DEFAULT 'low'
        CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

    priority VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (credit_limit >= 0),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);