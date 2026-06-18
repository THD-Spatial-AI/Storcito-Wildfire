ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS model_intro_card_dismissed BOOLEAN DEFAULT FALSE;
