-- Add market intelligence pricing fields to project_metadata
ALTER TABLE project_metadata 
ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS estimated_roi JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS market_alignment_score NUMERIC DEFAULT 0;

-- Add index for faster queries on market alignment
CREATE INDEX IF NOT EXISTS idx_project_metadata_market_alignment 
ON project_metadata(market_alignment_score DESC);

-- Update existing records with default values
UPDATE project_metadata 
SET 
  pricing_breakdown = '{"base_calculation": {}, "multipliers_applied": []}'::jsonb,
  estimated_roi = '{"estimated_budget": 0, "total_estimated_value": 0, "roi_multiplier": "1.00"}'::jsonb,
  market_alignment_score = 0
WHERE pricing_breakdown IS NULL 
   OR estimated_roi IS NULL 
   OR market_alignment_score IS NULL;