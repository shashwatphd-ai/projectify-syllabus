-- Phase 1: Create generation_runs Table
CREATE TABLE generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course_profiles(id) ON DELETE CASCADE,
  
  -- Configuration used
  location TEXT,
  industries JSONB,
  specific_companies JSONB,
  num_teams INTEGER NOT NULL,
  
  -- Discovery results
  companies_discovered INTEGER DEFAULT 0,
  companies_enriched INTEGER DEFAULT 0,
  projects_generated INTEGER DEFAULT 0,
  
  -- Processing metadata
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  error_message TEXT,
  
  -- AI usage tracking
  ai_models_used JSONB,
  ai_tokens_consumed INTEGER DEFAULT 0,
  
  -- Cost tracking
  apollo_credits_used INTEGER DEFAULT 0,
  processing_time_seconds NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE generation_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own generation runs"
  ON generation_runs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM course_profiles 
    WHERE course_profiles.id = generation_runs.course_id 
    AND course_profiles.owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert generation runs for own courses"
  ON generation_runs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM course_profiles 
    WHERE course_profiles.id = generation_runs.course_id 
    AND course_profiles.owner_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_generation_runs_course_id ON generation_runs(course_id);
CREATE INDEX idx_generation_runs_status ON generation_runs(status);
CREATE INDEX idx_generation_runs_created_at ON generation_runs(created_at DESC);

-- Phase 2: Add Market Intelligence Fields to company_profiles
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS job_postings JSONB DEFAULT '[]';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS job_postings_last_fetched TIMESTAMP WITH TIME ZONE;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS technologies_used JSONB DEFAULT '[]';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS buying_intent_signals JSONB DEFAULT '[]';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS funding_stage TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS total_funding_usd INTEGER;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS generation_run_id UUID REFERENCES generation_runs(id);

CREATE INDEX idx_company_profiles_generation_run_id ON company_profiles(generation_run_id);

-- Phase 3: Add generation_run_id to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS generation_run_id UUID REFERENCES generation_runs(id);
CREATE INDEX idx_projects_generation_run_id ON projects(generation_run_id);

-- Phase 4: Add market_signals_used to project_metadata
ALTER TABLE project_metadata ADD COLUMN IF NOT EXISTS market_signals_used JSONB DEFAULT '{}';