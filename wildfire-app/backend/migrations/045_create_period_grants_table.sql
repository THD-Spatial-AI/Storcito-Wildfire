BEGIN;

-- date access grants
CREATE TABLE IF NOT EXISTS period_grants (
    id           BIGSERIAL PRIMARY KEY,
    subject_type VARCHAR(8)  NOT NULL CHECK (subject_type IN ('user', 'group')),
    subject_id   VARCHAR(64) NOT NULL,
    date_from    DATE        NOT NULL,
    date_to      DATE        NOT NULL,
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_period_order CHECK (date_from <= date_to),
    CONSTRAINT uq_period_grant UNIQUE (subject_type, subject_id, date_from, date_to)
);

CREATE INDEX IF NOT EXISTS idx_period_grants_subject ON period_grants (subject_type, subject_id);

COMMENT ON TABLE period_grants IS
    'Date ranges a user or group may model; a model range must fit inside one allowed period';

COMMIT;
