-- Enable RLS and add admin access policies

-- Enable RLS on projects if not already enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on course_profiles if not already enabled  
ALTER TABLE public.course_profiles ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all projects
CREATE POLICY "Admins can view all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow faculty to view projects for their courses
CREATE POLICY "Faculty can view their course projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_profiles cp
    WHERE cp.id = projects.course_id
    AND cp.owner_id = auth.uid()
  )
);

-- Allow admins to view all courses
CREATE POLICY "Admins can view all courses"
ON public.course_profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow faculty to view their own courses
CREATE POLICY "Faculty can view their own courses"
ON public.course_profiles
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
);