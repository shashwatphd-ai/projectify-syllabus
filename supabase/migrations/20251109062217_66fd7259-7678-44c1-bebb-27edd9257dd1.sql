-- Update handle_new_user() function to support global university emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  role_choice TEXT;
  email_domain TEXT;
BEGIN
  role_choice := NEW.raw_user_meta_data->>'chosen_role';
  email_domain := split_part(NEW.email, '@', 2);
  
  -- Insert basic profile
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Updated "Sorting Hat" Logic - Global University Support
  IF role_choice = 'student' THEN
    -- Accept any email - detect-location will validate university
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student'::app_role);
    
  ELSIF role_choice = 'faculty' THEN
    -- Accept any email, marked for faculty approval
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student'::app_role);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'pending_faculty'::app_role);
    
  ELSIF role_choice = 'employer' THEN
    -- Reject common educational domains
    IF email_domain LIKE '%.edu' 
       OR email_domain LIKE '%.ac.uk' 
       OR email_domain LIKE '%.edu.au'
       OR email_domain LIKE '%.ac.in'
       OR email_domain LIKE '%.edu.%' THEN
      RAISE EXCEPTION 'Employers cannot use educational institution email addresses.';
    END IF;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'pending_employer'::app_role);
    
  ELSE
    RAISE EXCEPTION 'Invalid role selection.';
  END IF;
  
  RETURN NEW;
END;
$function$;