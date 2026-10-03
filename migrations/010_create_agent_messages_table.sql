CREATE TABLE agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL
        REFERENCES agent_sessions(id)
        ON DELETE CASCADE,

    sender VARCHAR(10) NOT NULL
        CHECK (sender IN ('user', 'agent')),

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);