-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for tracking partnership proposals/interests
CREATE TABLE public.partnership_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_profile_id UUID REFERENCES public.company_profiles(id) ON DELETE SET NULL,
  proposer_id UUID NOT NULL,
  proposer_email TEXT NOT NULL,
  proposer_name TEXT,
  message TEXT,
  pitch_type TEXT CHECK (pitch_type IN ('email', 'linkedin', 'anonymous')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partnership_proposals ENABLE ROW LEVEL SECURITY;

-- Users can view proposals for their own projects
CREATE POLICY "Users can view proposals for own projects"
ON public.partnership_proposals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN course_profiles c ON p.course_id = c.id
    WHERE p.id = partnership_proposals.project_id 
    AND c.owner_id = auth.uid()
  )
);

-- Users can insert proposals for projects they have access to
CREATE POLICY "Users can create proposals for accessible projects"
ON public.partnership_proposals
FOR INSERT
WITH CHECK (
  auth.uid() = proposer_id AND
  EXISTS (
    SELECT 1 FROM projects p
    JOIN course_profiles c ON p.course_id = c.id
    WHERE p.id = partnership_proposals.project_id 
    AND c.owner_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_partnership_proposals_project ON public.partnership_proposals(project_id);
CREATE INDEX idx_partnership_proposals_company ON public.partnership_proposals(company_profile_id);

-- Trigger for updated_at
CREATE TRIGGER update_partnership_proposals_updated_at
BEFORE UPDATE ON public.partnership_proposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();