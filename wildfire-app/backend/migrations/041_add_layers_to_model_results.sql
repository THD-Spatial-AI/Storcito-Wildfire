-- Add layers column to model_results to store extra visualizable rasters
-- (vegetation, FWI, slope, etc.) produced alongside the main risk map.
ALTER TABLE model_results ADD COLUMN IF NOT EXISTS layers jsonb;
