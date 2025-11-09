-- Fix infinite recursion between project_applications and company_profiles RLS policies
-- by adding a role check short-circuit for employers

DROP POLICY IF EXISTS "Employers can view applications for their projects" ON project_applications;

CREATE POLICY "Employers can view applications for their projects"
ON project_applications
FOR SELECT
TO authenticated
USING (
  -- Short-circuit: Only check the expensive join if user has employer role
  public.has_role(auth.uid(), 'employer') 
  AND EXISTS (
    SELECT 1
    FROM projects p
    JOIN company_profiles cp ON p.company_profile_id = cp.id
    WHERE p.id = project_applications.project_id 
      AND cp.owner_user_id = auth.uid()
  )
);