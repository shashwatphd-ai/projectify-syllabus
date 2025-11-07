-- Add a column to track which project a lead is matched to
ALTER TABLE public.employer_interest_submissions
ADD COLUMN matched_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add an index for quick lookups
CREATE INDEX idx_employer_submissions_matched_project
  ON public.employer_interest_submissions(matched_project_id);