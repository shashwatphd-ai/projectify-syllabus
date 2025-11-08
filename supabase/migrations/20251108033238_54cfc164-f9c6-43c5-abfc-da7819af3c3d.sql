-- Add 'employer' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employer';

-- Add RLS policies for company_profiles based on owner_user_id
CREATE POLICY "Employers can view their own company profile"
ON public.company_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = owner_user_id);

CREATE POLICY "Employers can update their own company profile"
ON public.company_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_user_id);