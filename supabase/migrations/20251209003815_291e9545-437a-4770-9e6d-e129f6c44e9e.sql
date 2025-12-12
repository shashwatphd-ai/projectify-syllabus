-- Fix infinite recursion between project_applications and company_profiles
-- The issue: project_applications policy queries company_profiles, 
-- and company_profiles policy queries project_applications

-- Step 1: Create security definer functions to break the cycle

-- Function to check if employer owns the company linked to a project
CREATE OR REPLACE FUNCTION public.employer_owns_project_company(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM projects p
    JOIN company_profiles cp ON p.company_profile_id = cp.id
    WHERE p.id = p_project_id
      AND cp.owner_user_id = p_user_id
  )
$$;

-- Function to check if student has applied to project with specific company
CREATE OR REPLACE FUNCTION public.student_has_project_with_company(p_company_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM projects p
    JOIN project_applications pa ON pa.project_id = p.id
    WHERE p.company_profile_id = p_company_id
      AND pa.student_id = p_user_id
  )
$$;

-- Step 2: Drop the problematic policies
DROP POLICY IF EXISTS "Employers can view applications for their projects" ON project_applications;
DROP POLICY IF EXISTS "Students can view companies for their projects" ON company_profiles;

-- Step 3: Recreate policies using security definer functions

-- project_applications: Employers can view applications for their projects
CREATE POLICY "Employers can view applications for their projects"
ON project_applications
FOR SELECT
USING (
  has_role(auth.uid(), 'employer') 
  AND employer_owns_project_company(project_id, auth.uid())
);

-- company_profiles: Students can view companies for their projects
CREATE POLICY "Students can view companies for their projects"
ON company_profiles
FOR SELECT
USING (
  student_has_project_with_company(id, auth.uid())
);