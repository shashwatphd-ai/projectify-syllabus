-- Create cache table for AI filtering results
CREATE TABLE IF NOT EXISTS public.company_filter_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.course_profiles(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  filtered_companies JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  UNIQUE(course_id, cache_key)
);

-- Enable RLS
ALTER TABLE public.company_filter_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access for edge functions
CREATE POLICY "Service role full access"
ON public.company_filter_cache
FOR ALL
USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_company_filter_cache_course_key ON public.company_filter_cache(course_id, cache_key);
CREATE INDEX idx_company_filter_cache_expires ON public.company_filter_cache(expires_at);

-- Add cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.company_filter_cache
  WHERE expires_at < now();
END;
$$;