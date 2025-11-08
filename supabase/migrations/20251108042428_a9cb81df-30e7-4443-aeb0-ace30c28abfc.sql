-- Create enum for application status
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

-- Create project_applications table
CREATE TABLE public.project_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'pending',
  UNIQUE(project_id, student_id)
);

-- Enable RLS
ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;

-- Create index for fast lookups
CREATE INDEX idx_project_applications_project_id ON public.project_applications(project_id);
CREATE INDEX idx_project_applications_student_id ON public.project_applications(student_id);

-- Policy: Employers can view applications for projects linked to their company
CREATE POLICY "Employers can view applications for their projects"
ON public.project_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.company_profiles cp ON p.company_profile_id = cp.id
    WHERE p.id = project_applications.project_id
    AND cp.owner_user_id = auth.uid()
  )
);

-- Policy: Students can insert their own applications
CREATE POLICY "Students can create applications"
ON public.project_applications
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Policy: Students can view their own applications
CREATE POLICY "Students can view own applications"
ON public.project_applications
FOR SELECT
USING (auth.uid() = student_id);

-- Policy: Service role full access
CREATE POLICY "Service role full access to applications"
ON public.project_applications
FOR ALL
USING (auth.role() = 'service_role');