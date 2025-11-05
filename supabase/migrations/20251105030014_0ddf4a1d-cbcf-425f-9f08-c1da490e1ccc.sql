-- Add value analysis intelligence fields to project_metadata
ALTER TABLE project_metadata 
ADD COLUMN IF NOT EXISTS value_analysis JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS stakeholder_insights JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS partnership_quality_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS synergistic_value_index NUMERIC DEFAULT 0;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_project_metadata_partnership_quality 
ON project_metadata(partnership_quality_score DESC);

CREATE INDEX IF NOT EXISTS idx_project_metadata_synergistic_value 
ON project_metadata(synergistic_value_index DESC);

-- Update existing records with default values
UPDATE project_metadata 
SET 
  value_analysis = '{}'::jsonb,
  stakeholder_insights = '{}'::jsonb,
  partnership_quality_score = 0,
  synergistic_value_index = 0
WHERE value_analysis IS NULL 
   OR stakeholder_insights IS NULL 
   OR partnership_quality_score IS NULL 
   OR synergistic_value_index IS NULL;