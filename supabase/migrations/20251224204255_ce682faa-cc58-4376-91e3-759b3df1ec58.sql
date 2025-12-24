-- Fix: Convert SECURITY DEFINER view to SECURITY INVOKER
-- This ensures the view respects the querying user's permissions

DROP VIEW IF EXISTS public.partnership_proposals_masked;

-- Recreate view with SECURITY INVOKER (default, explicit for clarity)
CREATE VIEW public.partnership_proposals_masked
WITH (security_invoker = true)
AS
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