-- Fix: Restrict profiles table SELECT policy to owner-only access
-- This prevents email harvesting by limiting profile visibility to the owner

DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);