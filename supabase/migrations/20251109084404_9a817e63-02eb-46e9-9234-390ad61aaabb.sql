-- Phase 2: Add missing columns to projects table
-- These columns are required by the generate-projects function

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS company_size TEXT,
ADD COLUMN IF NOT EXISTS company_needs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS majors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS lo_alignment TEXT;

-- Add helpful comments for documentation
COMMENT ON COLUMN projects.company_size IS 'Size category of the company (e.g., 1-50, 51-200 employees)';
COMMENT ON COLUMN projects.company_needs IS 'List of specific company needs this project addresses';
COMMENT ON COLUMN projects.skills IS 'Required student skills for this project';
COMMENT ON COLUMN projects.majors IS 'Recommended or required student majors';
COMMENT ON COLUMN projects.website IS 'Company website URL';
COMMENT ON COLUMN projects.lo_alignment IS 'Detailed explanation of how project aligns with learning outcomes';