-- Phase 2: Add O*NET mapping data to generation_runs and company_profiles
-- Part of P0-4 intelligent company matching system

-- Add O*NET data to generation_runs
ALTER TABLE public.generation_runs
  ADD COLUMN IF NOT EXISTS onet_occupations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS onet_mapping_method TEXT DEFAULT 'keyword-search',
  ADD COLUMN IF NOT EXISTS onet_mapped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onet_api_calls INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onet_cache_hits INTEGER DEFAULT 0;

-- Create index for querying by O*NET occupations
CREATE INDEX IF NOT EXISTS idx_generation_runs_onet_occupations
  ON public.generation_runs USING GIN (onet_occupations);

-- Add comments
COMMENT ON COLUMN public.generation_runs.onet_occupations IS 'O*NET occupations mapped from extracted skills (Phase 2 of intelligent matching)';
COMMENT ON COLUMN public.generation_runs.onet_mapping_method IS 'Method used for O*NET mapping (e.g., keyword-search, ml-classifier)';
COMMENT ON COLUMN public.generation_runs.onet_mapped_at IS 'Timestamp when O*NET mapping was performed';
COMMENT ON COLUMN public.generation_runs.onet_api_calls IS 'Number of O*NET API calls made (for rate limit monitoring)';
COMMENT ON COLUMN public.generation_runs.onet_cache_hits IS 'Number of cache hits (for performance monitoring)';

-- Add O*NET-derived filtering data to company_profiles
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS onet_relevance_score NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS matching_job_titles TEXT[],
  ADD COLUMN IF NOT EXISTS matching_skills JSONB DEFAULT '[]'::jsonb;

-- Create index for filtering by O*NET relevance
CREATE INDEX IF NOT EXISTS idx_company_profiles_onet_relevance
  ON public.company_profiles(onet_relevance_score DESC)
  WHERE onet_relevance_score IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.company_profiles.onet_relevance_score IS 'Relevance score based on O*NET occupation match (0.0 to 1.0)';
COMMENT ON COLUMN public.company_profiles.matching_job_titles IS 'Job titles from O*NET that match this company';
COMMENT ON COLUMN public.company_profiles.matching_skills IS 'Skills from O*NET that this company needs';
