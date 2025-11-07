-- Create a table to store student skills verified by project work
CREATE TABLE verified_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Link to the student and the project that proved the skill
    student_id UUID NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    
    -- The skill itself
    skill_name VARCHAR(255) NOT NULL,
    
    -- How the skill was verified
    verification_source VARCHAR(100), -- e.g., 'ai_deliverable_scan', 'employer_rating'
    
    -- Employer-given rating (if applicable)
    employer_rating INTEGER CHECK (employer_rating >= 1 AND employer_rating <= 5),
    
    -- A link to the specific evidence
    portfolio_evidence_url TEXT,
    
    UNIQUE(student_id, project_id, skill_name) -- Prevent duplicate entries
);

-- Add indexes for fast querying
CREATE INDEX idx_competencies_student_id ON verified_competencies(student_id);
CREATE INDEX idx_competencies_skill_name ON verified_competencies(skill_name);

-- Enable Row Level Security
ALTER TABLE verified_competencies ENABLE ROW LEVEL SECURITY;

-- Students can view their own competencies
CREATE POLICY "Students can view own competencies"
ON verified_competencies
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Service role (AI functions) can insert competencies
CREATE POLICY "Service role can insert competencies"
ON verified_competencies
FOR INSERT
TO service_role
WITH CHECK (true);

-- Admins can view all competencies
CREATE POLICY "Admins can view all competencies"
ON verified_competencies
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can update competencies (e.g., add employer ratings)
CREATE POLICY "Admins can update competencies"
ON verified_competencies
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));