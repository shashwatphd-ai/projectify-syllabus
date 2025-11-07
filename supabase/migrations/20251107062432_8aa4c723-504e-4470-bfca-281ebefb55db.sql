-- CRITICAL FIX: Risk-003 - Lock down company_profiles to admin-only SELECT
-- This prevents competitors from scraping our entire company database
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.company_profiles;

CREATE POLICY "Admins can view all company profiles"
ON public.company_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- CRITICAL FIX: Risk-004 - Ensure only admins can SELECT from employer_interest_submissions
-- This prevents competitors from stealing our newest leads from the Demand Dashboard
CREATE POLICY "Admins can view employer submissions"
ON public.employer_interest_submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));