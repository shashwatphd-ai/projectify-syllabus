-- 1. CREATE THE NEW 'company_profiles' TABLE
-- This table will store real company data populated by your offline pipeline.
CREATE TABLE public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source TEXT, -- 'google_places', 'bing_news', 'apollo.io', etc.
  website TEXT,
  city TEXT,
  zip TEXT,
  sector TEXT,
  size TEXT, -- 'Small', 'Medium', 'Large'
  technologies JSONB, -- ['Shopify', 'Salesforce', 'SAP']
  open_roles JSONB, -- ['Supply Chain Analyst', 'E-commerce Manager']
  recent_news TEXT,
  inferred_needs JSONB, -- ['workflow optimization', 'e-commerce expansion']
  last_enriched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate entries for the same company in the same zip
  UNIQUE(name, zip) 
);

-- Enable RLS and set a policy
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access"
ON public.company_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow service_role full access"
ON public.company_profiles
FOR ALL
USING (auth.role() = 'service_role');

-- 2. ALTER THE EXISTING 'projects' TABLE
-- This adds a foreign key to link a project to a real company profile.
ALTER TABLE public.projects
ADD COLUMN company_profile_id UUID REFERENCES public.company_profiles(id) ON DELETE SET NULL;