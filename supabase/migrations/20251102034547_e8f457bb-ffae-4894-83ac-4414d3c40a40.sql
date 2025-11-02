-- Step 9: Add faculty review flagging column
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;
COMMENT ON COLUMN public.projects.needs_review IS 'Flag indicating project needs faculty review due to AI generation quality issues';