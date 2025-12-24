-- Phase 0: Security Fixes
-- Issue 1: Profiles email field - ensure proper protection
-- Issue 2: Partnership proposals - add contact masking and missing policies

-- =====================================================
-- 1. Create email masking function for privacy
-- =====================================================
CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  at_pos integer;
  local_part text;
  domain_part text;
BEGIN
  IF email IS NULL THEN
    RETURN NULL;
  END IF;
  
  at_pos := position('@' in email);
  IF at_pos = 0 THEN
    RETURN '***';
  END IF;
  
  local_part := substring(email from 1 for at_pos - 1);
  domain_part := substring(email from at_pos);
  
  -- Show first 2 chars, mask the rest
  IF length(local_part) <= 2 THEN
    RETURN local_part || '***' || domain_part;
  ELSE
    RETURN substring(local_part from 1 for 2) || '***' || domain_part;
  END IF;
END;
$$;

-- =====================================================
-- 2. Create function to check if user owns the project's course
-- =====================================================
CREATE OR REPLACE FUNCTION public.user_owns_proposal_project(proposal_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM partnership_proposals pp
    JOIN projects p ON pp.project_id = p.id
    JOIN course_profiles c ON p.course_id = c.id
    WHERE pp.id = proposal_id
      AND c.owner_id = user_id
  )
$$;

-- =====================================================
-- 3. Create function to check if user is the proposer
-- =====================================================
CREATE OR REPLACE FUNCTION public.user_is_proposer(proposal_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM partnership_proposals
    WHERE id = proposal_id
      AND proposer_id = user_id
  )
$$;

-- =====================================================
-- 4. Drop existing partnership_proposals policies and recreate with proper access
-- =====================================================
DROP POLICY IF EXISTS "Users can create proposals for accessible projects" ON public.partnership_proposals;
DROP POLICY IF EXISTS "Users can view proposals for own projects" ON public.partnership_proposals;

-- Policy: Users can create proposals (authenticated users only)
CREATE POLICY "Authenticated users can create proposals"
ON public.partnership_proposals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = proposer_id);

-- Policy: Project owners can view proposals for their projects
CREATE POLICY "Project owners can view proposals"
ON public.partnership_proposals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM projects p
    JOIN course_profiles c ON p.course_id = c.id
    WHERE p.id = partnership_proposals.project_id
      AND c.owner_id = auth.uid()
  )
);

-- Policy: Proposers can view their own proposals
CREATE POLICY "Proposers can view own proposals"
ON public.partnership_proposals
FOR SELECT
TO authenticated
USING (proposer_id = auth.uid());

-- Policy: Project owners can update proposal status
CREATE POLICY "Project owners can update proposals"
ON public.partnership_proposals
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM projects p
    JOIN course_profiles c ON p.course_id = c.id
    WHERE p.id = partnership_proposals.project_id
      AND c.owner_id = auth.uid()
  )
);

-- Policy: Admins can view all proposals
CREATE POLICY "Admins can view all proposals"
ON public.partnership_proposals
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Policy: Admins can update all proposals
CREATE POLICY "Admins can update all proposals"
ON public.partnership_proposals
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5. Create a secure view for masked partnership proposals
-- =====================================================
CREATE OR REPLACE VIEW public.partnership_proposals_masked AS
SELECT 
  pp.id,
  pp.project_id,
  pp.company_profile_id,
  pp.proposer_id,
  pp.created_at,
  pp.updated_at,
  -- Mask email unless viewer is the proposer, project owner, or admin
  CASE 
    WHEN pp.proposer_id = auth.uid() THEN pp.proposer_email
    WHEN has_role(auth.uid(), 'admin') THEN pp.proposer_email
    WHEN EXISTS (
      SELECT 1 FROM projects p 
      JOIN course_profiles c ON p.course_id = c.id 
      WHERE p.id = pp.project_id AND c.owner_id = auth.uid()
    ) THEN pp.proposer_email
    ELSE mask_email(pp.proposer_email)
  END as proposer_email,
  -- Mask name unless viewer has proper access
  CASE 
    WHEN pp.proposer_id = auth.uid() THEN pp.proposer_name
    WHEN has_role(auth.uid(), 'admin') THEN pp.proposer_name
    WHEN EXISTS (
      SELECT 1 FROM projects p 
      JOIN course_profiles c ON p.course_id = c.id 
      WHERE p.id = pp.project_id AND c.owner_id = auth.uid()
    ) THEN pp.proposer_name
    ELSE COALESCE(split_part(pp.proposer_name, ' ', 1), 'Anonymous') || ' ***'
  END as proposer_name,
  pp.message,
  pp.pitch_type,
  pp.status
FROM public.partnership_proposals pp;

-- Grant access to the masked view
GRANT SELECT ON public.partnership_proposals_masked TO authenticated;

-- =====================================================
-- 6. Add service role bypass for profiles (for edge functions)
-- =====================================================
DROP POLICY IF EXISTS "Service role full access to profiles" ON public.profiles;
CREATE POLICY "Service role full access to profiles"
ON public.profiles
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');