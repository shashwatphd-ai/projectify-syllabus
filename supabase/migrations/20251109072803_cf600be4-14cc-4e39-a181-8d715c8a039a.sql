-- PHASE 1: Create project generation queue table
-- This replaces the broken "fire and forget" async invocation with a reliable database queue

CREATE TABLE IF NOT EXISTS public.project_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.course_profiles(id) ON DELETE CASCADE,
  generation_run_id UUID REFERENCES public.generation_runs(id) ON DELETE SET NULL,
  
  -- Queue status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Retry logic
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  
  -- Error handling
  error_message TEXT,
  last_error_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Prevent duplicate queue entries
  UNIQUE(project_id)
);

-- Index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_queue_status_created ON public.project_generation_queue(status, created_at) 
  WHERE status IN ('pending', 'processing');

-- Index for monitoring
CREATE INDEX IF NOT EXISTS idx_queue_generation_run ON public.project_generation_queue(generation_run_id);

-- Enable RLS
ALTER TABLE public.project_generation_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Faculty can view queue for their courses"
  ON public.project_generation_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_profiles
      WHERE id = project_generation_queue.course_id 
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to queue"
  ON public.project_generation_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- PHASE 2: Add feedback columns to projects table
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS faculty_rating INTEGER CHECK (faculty_rating >= 1 AND faculty_rating <= 5),
  ADD COLUMN IF NOT EXISTS faculty_feedback TEXT,
  ADD COLUMN IF NOT EXISTS rating_tags TEXT[], -- e.g., ['too_generic', 'great_alignment', 'wrong_scope']
  ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Create index for analytics
CREATE INDEX IF NOT EXISTS idx_projects_rating ON public.projects(faculty_rating, rated_at) 
  WHERE faculty_rating IS NOT NULL;

-- PHASE 3: Add scoring configuration to generation_runs
ALTER TABLE public.generation_runs
  ADD COLUMN IF NOT EXISTS scoring_version TEXT DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS scoring_weights JSONB DEFAULT '{"lo_weight": 0.5, "feasibility_weight": 0.3, "mutual_benefit_weight": 0.2}'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_notes TEXT;

-- Create analytics view for feedback
CREATE OR REPLACE VIEW public.project_feedback_analytics AS
SELECT 
  gr.id as generation_run_id,
  gr.course_id,
  cp.title as course_title,
  COUNT(p.id) as total_projects,
  COUNT(p.faculty_rating) as rated_projects,
  ROUND(AVG(p.faculty_rating)::numeric, 2) as avg_rating,
  ROUND(AVG(p.lo_score)::numeric, 2) as avg_lo_score,
  ROUND(AVG(p.final_score)::numeric, 2) as avg_final_score,
  COUNT(CASE WHEN p.faculty_rating >= 4 THEN 1 END) as high_rated_count,
  COUNT(CASE WHEN p.faculty_rating <= 2 THEN 1 END) as low_rated_count,
  COUNT(CASE WHEN p.needs_review THEN 1 END) as needs_review_count,
  ARRAY_AGG(DISTINCT tag) FILTER (WHERE tag IS NOT NULL) as all_rating_tags
FROM public.generation_runs gr
JOIN public.course_profiles cp ON gr.course_id = cp.id
LEFT JOIN public.projects p ON p.generation_run_id = gr.id
LEFT JOIN LATERAL unnest(p.rating_tags) AS tag ON true
GROUP BY gr.id, gr.course_id, cp.title;

-- Grant access to view
GRANT SELECT ON public.project_feedback_analytics TO authenticated;

-- RLS for the view (inherits from underlying tables)
ALTER VIEW public.project_feedback_analytics SET (security_invoker = true);