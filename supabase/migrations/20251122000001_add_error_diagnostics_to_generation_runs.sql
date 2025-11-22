-- Add structured error diagnostics to generation_runs table
-- Enables classification of failures by category for better debugging and UX

ALTER TABLE generation_runs
  ADD COLUMN IF NOT EXISTS error_category TEXT,
  ADD COLUMN IF NOT EXISTS error_details JSONB DEFAULT '{}';

-- Add index on error_category for filtering failed runs by type
CREATE INDEX IF NOT EXISTS idx_generation_runs_error_category ON generation_runs(error_category);

-- Add comment explaining error categories
COMMENT ON COLUMN generation_runs.error_category IS 'Error classification: CONFIG_ERROR | EXTERNAL_API_ERROR | DATA_ERROR | DB_ERROR | UNKNOWN_ERROR';
COMMENT ON COLUMN generation_runs.error_details IS 'Structured error details including source, status, phase, and sanitized error message';
