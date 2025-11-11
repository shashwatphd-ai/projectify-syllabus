-- Phase 3: Add semantic similarity scoring to company_profiles and generation_runs
-- Part of P0-4 intelligent company matching system

-- Add semantic similarity data to company_profiles
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS similarity_score NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS match_confidence TEXT CHECK (match_confidence IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS matching_skills JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS matching_dwas TEXT[],
  ADD COLUMN IF NOT EXISTS match_explanation TEXT,
  ADD COLUMN IF NOT EXISTS semantic_matched_at TIMESTAMPTZ;

-- Create index for filtering by similarity score
CREATE INDEX IF NOT EXISTS idx_company_profiles_similarity_score
  ON public.company_profiles(similarity_score DESC)
  WHERE similarity_score IS NOT NULL;

-- Create index for filtering by confidence
CREATE INDEX IF NOT EXISTS idx_company_profiles_match_confidence
  ON public.company_profiles(match_confidence)
  WHERE match_confidence IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.company_profiles.similarity_score IS 'Semantic similarity score between course and company (0.0 to 1.0, Phase 3)';
COMMENT ON COLUMN public.company_profiles.match_confidence IS 'Match confidence level: high (0.8+), medium (0.65-0.8), low (<0.65)';
COMMENT ON COLUMN public.company_profiles.matching_skills IS 'Skills that matched between course and company';
COMMENT ON COLUMN public.company_profiles.matching_dwas IS 'O*NET work activities that matched';
COMMENT ON COLUMN public.company_profiles.match_explanation IS 'Human-readable explanation of match quality';
COMMENT ON COLUMN public.company_profiles.semantic_matched_at IS 'Timestamp when semantic matching was performed';

-- Add semantic filtering stats to generation_runs
ALTER TABLE public.generation_runs
  ADD COLUMN IF NOT EXISTS semantic_filter_threshold NUMERIC(3,2) DEFAULT 0.70,
  ADD COLUMN IF NOT EXISTS semantic_filter_applied BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS companies_before_filter INTEGER,
  ADD COLUMN IF NOT EXISTS companies_after_filter INTEGER,
  ADD COLUMN IF NOT EXISTS average_similarity_score NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS semantic_processing_time_ms INTEGER;

-- Add comments
COMMENT ON COLUMN public.generation_runs.semantic_filter_threshold IS 'Similarity threshold used for filtering (0.0 to 1.0)';
COMMENT ON COLUMN public.generation_runs.semantic_filter_applied IS 'Whether Phase 3 semantic filtering was applied';
COMMENT ON COLUMN public.generation_runs.companies_before_filter IS 'Number of companies before semantic filtering';
COMMENT ON COLUMN public.generation_runs.companies_after_filter IS 'Number of companies after semantic filtering';
COMMENT ON COLUMN public.generation_runs.average_similarity_score IS 'Average similarity score across all companies';
COMMENT ON COLUMN public.generation_runs.semantic_processing_time_ms IS 'Processing time for semantic matching (milliseconds)';

-- Create view for match quality analytics
CREATE OR REPLACE VIEW public.company_match_quality_analytics AS
SELECT
  gr.id as generation_run_id,
  gr.course_id,
  cp_course.title as course_title,
  gr.location,
  COUNT(cp.id) as total_companies,
  COUNT(cp.id) FILTER (WHERE cp.match_confidence = 'high') as high_confidence_matches,
  COUNT(cp.id) FILTER (WHERE cp.match_confidence = 'medium') as medium_confidence_matches,
  COUNT(cp.id) FILTER (WHERE cp.match_confidence = 'low') as low_confidence_matches,
  ROUND(AVG(cp.similarity_score)::numeric, 2) as avg_similarity,
  ROUND(MAX(cp.similarity_score)::numeric, 2) as max_similarity,
  ROUND(MIN(cp.similarity_score)::numeric, 2) as min_similarity,
  gr.semantic_filter_threshold as threshold_used,
  gr.semantic_filter_applied,
  gr.onet_api_calls,
  gr.onet_cache_hits,
  gr.created_at
FROM public.generation_runs gr
JOIN public.course_profiles cp_course ON gr.course_id = cp_course.id
LEFT JOIN public.company_profiles cp ON cp.generation_run_id = gr.id
WHERE gr.semantic_filter_applied = TRUE
GROUP BY gr.id, gr.course_id, cp_course.title, gr.location;

-- Grant access to view
GRANT SELECT ON public.company_match_quality_analytics TO authenticated;

-- RLS for the view (inherits from underlying tables)
ALTER VIEW public.company_match_quality_analytics SET (security_invoker = true);
