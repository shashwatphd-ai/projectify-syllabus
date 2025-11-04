-- Add linkedin_profile column to company_profiles table
ALTER TABLE public.company_profiles 
ADD COLUMN IF NOT EXISTS linkedin_profile text;

-- Add comment for documentation
COMMENT ON COLUMN public.company_profiles.linkedin_profile IS 'LinkedIn profile URL of key contact person for business partnerships';