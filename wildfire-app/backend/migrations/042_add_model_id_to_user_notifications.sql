-- Model-completion notifications knew which model they were about, but never
-- stored it, so the UI could not link straight to the results.
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS model_id bigint;
CREATE INDEX IF NOT EXISTS idx_user_notifications_model_id ON user_notifications (model_id);
