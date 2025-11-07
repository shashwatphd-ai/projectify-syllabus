-- Add the new column to store Apollo's native Organization ID
ALTER TABLE public.company_profiles
ADD COLUMN apollo_organization_id TEXT;

-- Add an index for this new ID, as we will use it for JOINs/lookups
CREATE INDEX idx_company_profiles_apollo_org_id
  ON public.company_profiles(apollo_organization_id);