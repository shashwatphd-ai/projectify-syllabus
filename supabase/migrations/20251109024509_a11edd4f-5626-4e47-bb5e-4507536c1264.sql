-- Add company_logo_url column to projects table
ALTER TABLE public.projects 
ADD COLUMN company_logo_url text;

-- Create function to sync company logo to projects
CREATE OR REPLACE FUNCTION public.sync_company_logo_to_projects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a company's logo is updated, update all linked projects
  IF TG_OP = 'UPDATE' AND (OLD.organization_logo_url IS DISTINCT FROM NEW.organization_logo_url) THEN
    UPDATE public.projects
    SET company_logo_url = NEW.organization_logo_url
    WHERE company_profile_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on company_profiles to sync logo changes
CREATE TRIGGER sync_company_logo_on_update
AFTER UPDATE ON public.company_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_company_logo_to_projects();

-- Create function to set logo when project is linked to company
CREATE OR REPLACE FUNCTION public.set_project_company_logo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a project is created or updated with a company_profile_id
  IF NEW.company_profile_id IS NOT NULL THEN
    -- Fetch the logo from company_profiles and set it
    SELECT organization_logo_url INTO NEW.company_logo_url
    FROM public.company_profiles
    WHERE id = NEW.company_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on projects to set logo on insert/update
CREATE TRIGGER set_company_logo_on_project
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_project_company_logo();

-- Backfill existing projects with company logos
UPDATE public.projects p
SET company_logo_url = cp.organization_logo_url
FROM public.company_profiles cp
WHERE p.company_profile_id = cp.id
  AND p.company_logo_url IS NULL;