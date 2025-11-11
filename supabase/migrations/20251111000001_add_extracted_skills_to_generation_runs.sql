-- Phase 1: Add extracted skills columns to generation_runs table
-- Part of P0-4 intelligent company matching system

ALTER TABLE public.generation_runs
  ADD COLUMN IF NOT EXISTS extracted_skills JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS skill_extraction_method TEXT DEFAULT 'pattern-based-nlp',
  ADD COLUMN IF NOT EXISTS skills_extracted_at TIMESTAMPTZ;

-- Create index for querying by skills
CREATE INDEX IF NOT EXISTS idx_generation_runs_extracted_skills
  ON public.generation_runs USING GIN (extracted_skills);

-- Add comment
COMMENT ON COLUMN public.generation_runs.extracted_skills IS 'Skills extracted from course learning outcomes using NLP (Phase 1 of intelligent matching)';
COMMENT ON COLUMN public.generation_runs.skill_extraction_method IS 'Method used for skill extraction (e.g., pattern-based-nlp, ml-classifier)';
COMMENT ON COLUMN public.generation_runs.skills_extracted_at IS 'Timestamp when skills were extracted';
