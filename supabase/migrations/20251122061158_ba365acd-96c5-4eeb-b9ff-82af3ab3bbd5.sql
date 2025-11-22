-- Add error diagnostic columns to generation_runs table
ALTER TABLE public.generation_runs
ADD COLUMN IF NOT EXISTS error_category TEXT,
ADD COLUMN IF NOT EXISTS error_details JSONB;

-- Add index for querying failed runs by category
CREATE INDEX IF NOT EXISTS idx_generation_runs_error_category 
ON public.generation_runs(error_category) 
WHERE error_category IS NOT NULL;