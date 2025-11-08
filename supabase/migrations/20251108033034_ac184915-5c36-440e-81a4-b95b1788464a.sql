-- Add a column to link a company profile to a specific user in our auth table
ALTER TABLE public.company_profiles
ADD COLUMN owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add an index for fast lookups
CREATE INDEX idx_company_profiles_owner_user_id
  ON public.company_profiles(owner_user_id);