-- Create project_metadata table to store algorithm details
CREATE TABLE IF NOT EXISTS project_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Algorithm execution tracking
  algorithm_version TEXT DEFAULT 'v1.0',
  generation_timestamp TIMESTAMPTZ DEFAULT now(),
  companies_considered JSONB,
  selection_criteria JSONB,
  
  -- Learning Outcome Alignment (structured)
  lo_alignment_detail JSONB,
  lo_mapping_tasks JSONB,
  lo_mapping_deliverables JSONB,
  
  -- Scoring breakdown
  scoring_rationale JSONB,
  
  -- AI generation context
  ai_prompts_used JSONB,
  ai_model_version TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(project_id)
);

-- Add RLS policies
ALTER TABLE project_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metadata for own projects"
  ON project_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN course_profiles c ON p.course_id = c.id
      WHERE p.id = project_metadata.project_id 
      AND c.owner_id = auth.uid()
    )
  );

-- Add index for performance
CREATE INDEX idx_project_metadata_project_id ON project_metadata(project_id);