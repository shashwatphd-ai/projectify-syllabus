-- Create function to handle project completion and trigger competency extraction
CREATE OR REPLACE FUNCTION public.handle_project_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Check if the status was updated to 'completed' (and wasn't already completed)
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Asynchronously invoke the competency-extractor Edge Function
    SELECT net.http_post(
      url := 'https://wnxjeldvzjubfgzvvzov.supabase.co/functions/v1/competency-extractor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
      ),
      body := jsonb_build_object('project_id', NEW.id)
    ) INTO request_id;
    
    -- Log the request for debugging
    RAISE NOTICE 'Competency extraction request sent for project %: request_id=%', NEW.id, request_id;
    
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the update
    RAISE WARNING 'Failed to trigger competency extraction for project %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger on the projects table
CREATE TRIGGER on_project_completed
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_project_completion();