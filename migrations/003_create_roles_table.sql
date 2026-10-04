CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(20) NOT NULL UNIQUE
        CHECK (name IN ('admin', 'manager', 'agent')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);