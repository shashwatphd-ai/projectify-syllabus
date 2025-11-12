-- P0-4 Phase 1: Add skill extraction tracking to generation_runs
-- Enables tracking of skills extracted from course outcomes

-- Add extracted_skills column to store skill extraction results
ALTER TABLE generation_runs
ADD COLUMN IF NOT EXISTS extracted_skills jsonb DEFAULT '[]'::jsonb;

-- Add comment explaining the column
COMMENT ON COLUMN generation_runs.extracted_skills IS 'Skills extracted from course outcomes using AI (Phase 1 of P0-4 intelligent matching)';

-- Create index for querying by skills
CREATE INDEX IF NOT EXISTS idx_generation_runs_extracted_skills 
ON generation_runs USING gin(extracted_skills);

-- Add skill_extraction_model column to track which AI model was used
ALTER TABLE generation_runs
ADD COLUMN IF NOT EXISTS skill_extraction_model text;

COMMENT ON COLUMN generation_runs.skill_extraction_model IS 'AI model used for skill extraction (e.g., gemini-2.0-flash-exp)';

-- P0-4 Phase 2: Add O*NET occupation mapping to generation_runs
-- Enables tracking of occupations mapped from extracted skills

-- Add onet_occupations column to store occupation mapping results
ALTER TABLE generation_runs
ADD COLUMN IF NOT EXISTS onet_occupations jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN generation_runs.onet_occupations IS 'O*NET occupations mapped from extracted skills (Phase 2 of P0-4 intelligent matching)';

-- Create index for querying by occupations
CREATE INDEX IF NOT EXISTS idx_generation_runs_onet_occupations 
ON generation_runs USING gin(onet_occupations);

-- Add occupation_mapping_provider column to track which provider was used
ALTER TABLE generation_runs
ADD COLUMN IF NOT EXISTS occupation_mapping_provider text;

COMMENT ON COLUMN generation_runs.occupation_mapping_provider IS 'Provider used for occupation mapping (onet, esco, skills-ml, or multi)';

-- Add unmapped_skills column to track skills that couldn't be mapped
ALTER TABLE generation_runs
ADD COLUMN IF NOT EXISTS unmapped_skills jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN generation_runs.unmapped_skills IS 'Skills that could not be mapped to any occupation';

-- Add occupation_mapping_confidence column
ALTER TABLE generation_runs
ADD COLUMN IF NOT EXISTS occupation_mapping_confidence numeric;

COMMENT ON COLUMN generation_runs.occupation_mapping_confidence IS 'Overall confidence score for occupation mapping (0.0 to 1.0)';

-- P0-4 Phase 3: Add semantic similarity scoring to company_profiles
-- Enables filtering companies by relevance to course skills/occupations

-- Add similarity_score to company_profiles
ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS similarity_score numeric;

COMMENT ON COLUMN company_profiles.similarity_score IS 'Semantic similarity score (0.0 to 1.0) between company and course context';

-- Add match_confidence to company_profiles
ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS match_confidence text;

COMMENT ON COLUMN company_profiles.match_confidence IS 'Confidence level of match: high (0.8+), medium (0.65-0.8), low (<0.65)';

-- Add matching_skills to company_profiles
ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS matching_skills jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN company_profiles.matching_skills IS 'Course skills that match this company';

-- Add matching_dwas to company_profiles
ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS matching_dwas jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN company_profiles.matching_dwas IS 'Detailed Work Activities from O*NET that match this company';

-- Create indexes for querying
CREATE INDEX IF NOT EXISTS idx_company_profiles_similarity_score 
ON company_profiles(similarity_score DESC);

CREATE INDEX IF NOT EXISTS idx_company_profiles_match_confidence 
ON company_profiles(match_confidence);

CREATE INDEX IF NOT EXISTS idx_company_profiles_matching_skills 
ON company_profiles USING gin(matching_skills);

-- Add semantic_filter_applied to generation_runs
ALTER TABLE generation_runs
ADD COLUMN IF NOT EXISTS semantic_filter_applied boolean DEFAULT false;

COMMENT ON COLUMN generation_runs.semantic_filter_applied IS 'Whether semantic similarity filtering was applied (Phase 3)';

-- Add semantic_filter_threshold to generation_runs
ALTER TABLE generation_runs
ADD COLUMN IF NOT EXISTS semantic_filter_threshold numeric;

COMMENT ON COLUMN generation_runs.semantic_filter_threshold IS 'Threshold used for semantic filtering (e.g., 0.7)';

-- Add companies_before_filtering to generation_runs
ALTER TABLE generation_runs
ADD COLUMN IF NOT EXISTS companies_before_filtering integer;

COMMENT ON COLUMN generation_runs.companies_before_filtering IS 'Number of companies discovered before semantic filtering';

-- Add companies_after_filtering to generation_runs
ALTER TABLE generation_runs
ADD COLUMN IF NOT EXISTS companies_after_filtering integer;

COMMENT ON COLUMN generation_runs.companies_after_filtering IS 'Number of companies remaining after semantic filtering';

-- Add average_similarity_score to generation_runs
ALTER TABLE generation_runs
ADD COLUMN IF NOT EXISTS average_similarity_score numeric;

COMMENT ON COLUMN generation_runs.average_similarity_score IS 'Average similarity score of filtered companies';