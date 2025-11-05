-- Add comprehensive Apollo.io enrichment fields to company_profiles table

-- Person/Contact fields from Apollo.io
ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS contact_first_name text,
ADD COLUMN IF NOT EXISTS contact_last_name text,
ADD COLUMN IF NOT EXISTS contact_title text,
ADD COLUMN IF NOT EXISTS contact_headline text,
ADD COLUMN IF NOT EXISTS contact_photo_url text,
ADD COLUMN IF NOT EXISTS contact_city text,
ADD COLUMN IF NOT EXISTS contact_state text,
ADD COLUMN IF NOT EXISTS contact_country text,
ADD COLUMN IF NOT EXISTS contact_twitter_url text,
ADD COLUMN IF NOT EXISTS contact_email_status text,
ADD COLUMN IF NOT EXISTS contact_employment_history jsonb,
ADD COLUMN IF NOT EXISTS contact_phone_numbers jsonb;

-- Organization fields from Apollo.io
ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS organization_linkedin_url text,
ADD COLUMN IF NOT EXISTS organization_twitter_url text,
ADD COLUMN IF NOT EXISTS organization_facebook_url text,
ADD COLUMN IF NOT EXISTS organization_founded_year integer,
ADD COLUMN IF NOT EXISTS organization_logo_url text,
ADD COLUMN IF NOT EXISTS organization_employee_count text,
ADD COLUMN IF NOT EXISTS organization_revenue_range text,
ADD COLUMN IF NOT EXISTS organization_industry_keywords jsonb;

-- Data quality tracking fields
ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS data_enrichment_level text DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS apollo_enrichment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS data_completeness_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_verified_at timestamp with time zone;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_profiles_enrichment_level 
ON company_profiles(data_enrichment_level);

CREATE INDEX IF NOT EXISTS idx_company_profiles_completeness_score 
ON company_profiles(data_completeness_score DESC);

CREATE INDEX IF NOT EXISTS idx_company_profiles_apollo_date 
ON company_profiles(apollo_enrichment_date DESC);

-- Add comments for documentation
COMMENT ON COLUMN company_profiles.data_enrichment_level IS 'Level of data enrichment: basic, apollo_verified, fully_enriched';
COMMENT ON COLUMN company_profiles.data_completeness_score IS 'Score from 0-100 indicating percentage of fields populated';
COMMENT ON COLUMN company_profiles.contact_employment_history IS 'Array of previous positions from Apollo.io';
COMMENT ON COLUMN company_profiles.organization_industry_keywords IS 'Industry tags and keywords from Apollo.io';