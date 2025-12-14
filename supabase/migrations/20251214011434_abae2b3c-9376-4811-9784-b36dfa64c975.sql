-- Migration: Expand university_domains table with Apollo data
-- Step 1: Create backup of existing data
CREATE TABLE IF NOT EXISTS university_domains_backup AS 
SELECT * FROM public.university_domains;

-- Step 2: Drop existing table
DROP TABLE IF EXISTS public.university_domains;

-- Step 3: Create new expanded table with all Apollo columns
CREATE TABLE public.university_domains (
  -- Primary key (mapped from Website - extracted domain)
  domain TEXT PRIMARY KEY,
  
  -- Core location columns (backward compatible)
  name TEXT NOT NULL,                    -- ← Company Name
  country TEXT NOT NULL DEFAULT 'United States',  -- ← Company Country  
  city TEXT,                             -- ← Company City
  state TEXT,                            -- ← Company State
  zip TEXT,                              -- ← Company Postal Code
  formatted_location TEXT NOT NULL,      -- ← Company Address
  
  -- NEW: Apollo enrichment columns
  company_name_for_emails TEXT,
  account_stage TEXT,
  employee_count INTEGER,
  industry TEXT,
  company_linkedin_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  company_street TEXT,
  keywords TEXT,
  company_phone TEXT,
  technologies TEXT,
  total_funding TEXT,
  latest_funding TEXT,
  latest_funding_amount TEXT,
  last_raised_at TEXT,
  annual_revenue BIGINT,
  number_of_retail_locations INTEGER,
  apollo_account_id TEXT,
  sic_codes TEXT,
  naics_codes TEXT,
  short_description TEXT,
  founded_year INTEGER,
  logo_url TEXT,
  subsidiary_of TEXT,
  primary_intent_topic TEXT,
  primary_intent_score TEXT,
  secondary_intent_topic TEXT,
  secondary_intent_score TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Restore backup data (existing records)
INSERT INTO public.university_domains (domain, name, country, city, state, zip, formatted_location, created_at)
SELECT domain, name, country, city, state, zip, formatted_location, created_at
FROM public.university_domains_backup
ON CONFLICT (domain) DO NOTHING;

-- Step 5: Enable RLS
ALTER TABLE public.university_domains ENABLE ROW LEVEL SECURITY;

-- Step 6: Recreate RLS policies
CREATE POLICY "Public read access to university domains"
  ON public.university_domains FOR SELECT USING (true);

CREATE POLICY "Service role full access to university domains"
  ON public.university_domains FOR ALL
  USING (auth.role() = 'service_role');

-- Step 7: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_university_domains_state ON public.university_domains(state);
CREATE INDEX IF NOT EXISTS idx_university_domains_city ON public.university_domains(city);

-- Step 8: Cleanup backup table
DROP TABLE IF EXISTS public.university_domains_backup;