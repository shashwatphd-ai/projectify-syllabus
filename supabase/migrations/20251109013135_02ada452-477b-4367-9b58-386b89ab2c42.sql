-- Add server-side .edu email validation to handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Validate .edu email on server side
  IF NEW.email NOT LIKE '%.edu' THEN
    RAISE EXCEPTION 'Only .edu email addresses are allowed';
  END IF;
  
  -- Insert profile without role
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Always assign 'student' role by default
  -- Ignore user-provided role metadata for security
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role);
  
  RETURN NEW;
END;
$function$;

-- Add RLS policies for students and instructors to view company profiles
CREATE POLICY "Students can view companies for their projects"
ON company_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN project_applications pa ON pa.project_id = p.id
    WHERE p.company_profile_id = company_profiles.id
    AND pa.student_id = auth.uid()
  )
);

CREATE POLICY "Instructors can view companies for their courses"
ON company_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN course_profiles c ON c.id = p.course_id
    WHERE p.company_profile_id = company_profiles.id
    AND c.owner_id = auth.uid()
  )
);