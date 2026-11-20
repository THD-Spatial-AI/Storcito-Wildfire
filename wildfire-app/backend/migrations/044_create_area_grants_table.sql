BEGIN;

-- area access grants
CREATE TABLE IF NOT EXISTS area_grants (
    id           BIGSERIAL PRIMARY KEY,
    subject_type VARCHAR(8)  NOT NULL CHECK (subject_type IN ('user', 'group')),
    subject_id   VARCHAR(64) NOT NULL,
    level        VARCHAR(16) NOT NULL CHECK (level IN ('community', 'province', 'municipality')),
    code         VARCHAR(16) NOT NULL,
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_area_grant UNIQUE (subject_type, subject_id, level, code)
);

CREATE INDEX IF NOT EXISTS idx_area_grants_subject ON area_grants (subject_type, subject_id);

COMMENT ON TABLE area_grants IS
    'Areas a user or group may model in; codes and outlines come from the risk engine boundaries';

COMMIT;
