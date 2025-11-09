-- Add pending roles to app_role enum for verification workflow
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pending_faculty';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pending_employer';

-- Update handle_new_user trigger to implement "Choose & Verify" workflow
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  role_choice TEXT;
BEGIN
  -- Get the role the user selected on the signup form
  role_choice := NEW.raw_user_meta_data->>'chosen_role';
  
  -- Insert basic profile
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  -- The "Sorting Hat" v2 Logic
  IF role_choice = 'student' AND NEW.email LIKE '%.edu' THEN
    -- Auto-approved student
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student'::app_role);
    
  ELSIF role_choice = 'faculty' AND NEW.email LIKE '%.edu' THEN
    -- Student by default, but marked for faculty approval
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student'::app_role);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'pending_faculty'::app_role);
    
  ELSIF role_choice = 'employer' AND NEW.email NOT LIKE '%.edu' THEN
    -- Marked for employer approval (no student access)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'pending_employer'::app_role);
    
  ELSE
    -- Invalid combination (e.g., faculty with .com email)
    RAISE EXCEPTION 'Invalid role selection or email address. Students and Faculty must use .edu emails.';
  END IF;
  
  RETURN NEW;
END;
$function$;