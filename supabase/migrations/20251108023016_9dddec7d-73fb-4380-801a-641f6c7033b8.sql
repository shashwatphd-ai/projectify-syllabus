-- Add 'pending_generation' status for async project generation
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'pending_generation';

-- Add helpful comment documenting the project lifecycle
COMMENT ON TYPE project_status IS 'Project lifecycle: pending_generation → ai_shell → curated_live → in_progress → completed';