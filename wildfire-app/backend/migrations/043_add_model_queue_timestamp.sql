BEGIN;

-- Calculation request time.
ALTER TABLE models
    ADD COLUMN IF NOT EXISTS calculation_queued_at TIMESTAMP;

COMMENT ON COLUMN models.calculation_queued_at IS
    'Time the calculation was requested; start of the user-visible wait';

-- Marks a backfilled approximation.
ALTER TABLE models
    ADD COLUMN IF NOT EXISTS calculation_queued_at_estimated BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN models.calculation_queued_at_estimated IS
    'True when calculation_queued_at was backfilled and excludes queue wait';

-- Backfill from ready notifications.
WITH ready_times AS (
    SELECT model_id, MAX(created_at) AS ready_at
    FROM user_notifications
    WHERE model_id IS NOT NULL
      AND type = 'success'
      AND deleted_at IS NULL
    GROUP BY model_id
)
UPDATE models AS model
SET calculation_queued_at = model.calculation_started_at,
    calculation_queued_at_estimated = TRUE,
    calculation_completed_at = ready_times.ready_at
FROM ready_times
WHERE model.id = ready_times.model_id
  AND model.status IN ('completed', 'published')
  AND model.calculation_queued_at IS NULL
  AND model.calculation_started_at IS NOT NULL
  AND model.calculation_completed_at IS NOT NULL
  AND ready_times.ready_at >= model.calculation_completed_at;

COMMIT;
