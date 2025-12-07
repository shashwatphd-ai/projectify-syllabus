-- Enable realtime for job_matches, project_applications, and projects
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- Ensure REPLICA IDENTITY is set to FULL for complete row data in updates
ALTER TABLE public.job_matches REPLICA IDENTITY FULL;
ALTER TABLE public.project_applications REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;