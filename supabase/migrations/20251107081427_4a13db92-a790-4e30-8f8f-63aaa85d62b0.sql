-- Create the table to store matches between students and open jobs
CREATE TABLE job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Link to the student and the skill that made the match
    student_id UUID NOT NULL,
    competency_id UUID REFERENCES public.verified_competencies(id) ON DELETE CASCADE,
    
    -- The Job data from Apollo
    apollo_job_id TEXT NOT NULL,
    apollo_job_title TEXT,
    apollo_company_name TEXT,
    apollo_job_url TEXT,
    apollo_job_payload JSONB, -- Store the raw job object for the UI
    
    -- Our internal status for this match
    status VARCHAR(50) DEFAULT 'pending_notification', -- e.g., 'pending_notification', 'notified', 'viewed_by_student'
    
    -- Prevent duplicate job matches for same student/competency/job
    UNIQUE(student_id, competency_id, apollo_job_id)
);

-- Add indexes for fast querying by the student
CREATE INDEX idx_matches_student_id ON job_matches(student_id);

-- Add index for our future notification/alert system
CREATE INDEX idx_matches_status ON job_matches(status);

-- Add index for competency lookups
CREATE INDEX idx_matches_competency_id ON job_matches(competency_id);

-- Enable Row Level Security
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

-- Students can view their own job matches
CREATE POLICY "Students can view their own job matches"
  ON job_matches
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Service role (our functions) can insert/update matches
CREATE POLICY "Service role can manage matches"
  ON job_matches
  FOR ALL
  TO service_role
  WITH CHECK (true);

-- Admins can view all job matches
CREATE POLICY "Admins can view all job matches"
  ON job_matches
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));