-- Phase 1: Add missing columns to company_profiles for complete Apollo data capture
-- These columns enable accurate company descriptions and enhanced market intelligence

-- Primary company description from Apollo enrichment API
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS description TEXT;
COMMENT ON COLUMN company_profiles.description IS 'Primary company description from Apollo short_description';

-- SEO description as fallback
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS seo_description TEXT;
COMMENT ON COLUMN company_profiles.seo_description IS 'SEO marketing description from Apollo as backup';

-- Multi-industry support (array instead of single sector)
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS industries JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN company_profiles.industries IS 'Array of industry classifications from Apollo';

-- Company capability keywords for better matching
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN company_profiles.keywords IS 'Company capability keywords from Apollo for skill matching';

-- Department headcount for intelligent contact discovery
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS departmental_head_count JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN company_profiles.departmental_head_count IS 'Headcount by department from Apollo for contact intelligence';

-- Funding events history for market intelligence
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS funding_events JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN company_profiles.funding_events IS 'Full funding history from Apollo enrichment';