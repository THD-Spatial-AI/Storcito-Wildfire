-- Remove unsupported model resolution parameter.
ALTER TABLE models DROP COLUMN IF EXISTS resolution;
