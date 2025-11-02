-- Fix 1: Add UPDATE policy for profiles table
-- This allows users to update their own profile while preventing privilege escalation
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Note: DELETE policy intentionally omitted - profile deletion not supported
-- Profiles should persist for data integrity with course ownership

-- Fix 2: Add policy to allow users to view their own evaluations
-- This fixes the UX issue where evaluators can't see their own submitted feedback
CREATE POLICY "Users can view own evaluations"
ON public.evaluations FOR SELECT
TO authenticated
USING (auth.uid() = evaluator_id);

-- The existing "Users can view evaluations for accessible projects" policy remains
-- to allow course owners to see all evaluations for their projects