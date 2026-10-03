CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    debtor_id UUID NOT NULL
        REFERENCES debtors(id)
        ON DELETE RESTRICT,

    type VARCHAR(15) NOT NULL
        CHECK (type IN ('invoice', 'payment', 'credit_note')),

    reference_no VARCHAR(60) NOT NULL,

    amount NUMERIC(14,2) NOT NULL
        CHECK (amount >= 0),

    outstanding_amount NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (
            outstanding_amount >= 0
            AND outstanding_amount <= amount
        ),

    issue_date DATE NOT NULL,

    due_date DATE,

    status VARCHAR(15) NOT NULL DEFAULT 'open'
        CHECK (
            status IN (
                'open',
                'partially_paid',
                'paid',
                'written_off'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_invoice_due_date
        CHECK (
            type <> 'invoice'
            OR due_date IS NOT NULL
        )
);