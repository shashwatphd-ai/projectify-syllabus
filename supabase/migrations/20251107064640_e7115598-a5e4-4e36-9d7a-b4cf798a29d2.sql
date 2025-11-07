-- Task 2.4: Create automatic scoring trigger
-- This trigger will automatically call project-suitability-scorer when a new signal is inserted

-- First, ensure pg_net extension is enabled for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the trigger function that calls the scorer
CREATE OR REPLACE FUNCTION public.handle_new_company_signal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  service_role_key text;
BEGIN
  -- Get the service role key from environment
  -- Note: In production, this should be stored in Supabase Vault
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If not set in settings, use the one from secrets (Supabase Cloud pattern)
  IF service_role_key IS NULL THEN
    service_role_key := current_setting('supabase.service_role_key', true);
  END IF;
  
  -- Asynchronously invoke the project-suitability-scorer Edge Function
  SELECT net.http_post(
    url := 'https://wnxjeldvzjubfgzvvzov.supabase.co/functions/v1/project-suitability-scorer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := jsonb_build_object('signal_id', NEW.id)
  ) INTO request_id;
  
  -- Log the request for debugging
  RAISE NOTICE 'Scoring request sent for signal %: request_id=%', NEW.id, request_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to trigger scoring for signal %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger on company_signals table
DROP TRIGGER IF EXISTS on_new_company_signal ON public.company_signals;

CREATE TRIGGER on_new_company_signal
  AFTER INSERT ON public.company_signals
  FOR EACH ROW
  WHEN (NEW.status = 'pending_scoring')
  EXECUTE FUNCTION public.handle_new_company_signal();