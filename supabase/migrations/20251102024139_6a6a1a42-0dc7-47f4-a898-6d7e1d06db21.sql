-- Fix RLS policy issue: The edge function needs to use the authenticated user context
-- The current INSERT operation uses anon context, but the policy checks auth.uid()

-- Recreate the INSERT policy to be more explicit
DROP POLICY IF EXISTS "Users can insert own courses" ON public.course_profiles;

CREATE POLICY "Users can insert own courses"
ON public.course_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);