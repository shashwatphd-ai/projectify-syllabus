-- Step 2: Add signal score columns to company_profiles and generation_runs
-- These columns store the 4-signal scoring system results

-- =============================================================================
-- COMPANY_PROFILES: Add individual signal scores and composite
-- =============================================================================

ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS skill_match_score numeric NULL,
ADD COLUMN IF NOT EXISTS market_signal_score numeric NULL,
ADD COLUMN IF NOT EXISTS department_fit_score numeric NULL,
ADD COLUMN IF NOT EXISTS contact_quality_score numeric NULL,
ADD COLUMN IF NOT EXISTS composite_signal_score numeric NULL,
ADD COLUMN IF NOT EXISTS signal_confidence text NULL,
ADD COLUMN IF NOT EXISTS signal_data jsonb NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.company_profiles.skill_match_score IS 'Signal 1: Job-skills semantic match score (0-100)';
COMMENT ON COLUMN public.company_profiles.market_signal_score IS 'Signal 2: Market intelligence score from news/funding (0-100)';
COMMENT ON COLUMN public.company_profiles.department_fit_score IS 'Signal 3: Department growth alignment score (0-100)';
COMMENT ON COLUMN public.company_profiles.contact_quality_score IS 'Signal 4: Decision-maker availability score (0-100)';
COMMENT ON COLUMN public.company_profiles.composite_signal_score IS 'Weighted composite of all 4 signals (0-100)';
COMMENT ON COLUMN public.company_profiles.signal_confidence IS 'Confidence level: high, medium, or low';
COMMENT ON COLUMN public.company_profiles.signal_data IS 'Full CompositeScore JSON with breakdown and signals detected';

-- =============================================================================
-- GENERATION_RUNS: Add signal summary metrics
-- =============================================================================

ALTER TABLE public.generation_runs
ADD COLUMN IF NOT EXISTS signal_scores_summary jsonb NULL,
ADD COLUMN IF NOT EXISTS companies_above_threshold integer NULL,
ADD COLUMN IF NOT EXISTS fallback_threshold_used numeric NULL,
ADD COLUMN IF NOT EXISTS news_api_calls integer NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS people_api_calls integer NULL DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.generation_runs.signal_scores_summary IS 'Aggregate statistics of signal scores for this run';
COMMENT ON COLUMN public.generation_runs.companies_above_threshold IS 'Count of companies that passed the signal threshold';
COMMENT ON COLUMN public.generation_runs.fallback_threshold_used IS 'If fallback was triggered, what threshold was used';
COMMENT ON COLUMN public.generation_runs.news_api_calls IS 'Number of Apollo News API calls made';
COMMENT ON COLUMN public.generation_runs.people_api_calls IS 'Number of Apollo People Search API calls made';

-- =============================================================================
-- INDEXES: For efficient filtering by signal scores
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_company_profiles_composite_signal_score 
ON public.company_profiles (composite_signal_score DESC NULLS LAST)
WHERE composite_signal_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_company_profiles_signal_confidence
ON public.company_profiles (signal_confidence)
WHERE signal_confidence IS NOT NULL;