-- Create enum for user roles
CREATE TYPE app_role AS ENUM ('faculty', 'student');

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by authenticated users
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'::app_role)
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Course profiles table
CREATE TABLE public.course_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  level TEXT NOT NULL,
  city_zip TEXT,
  weeks INTEGER NOT NULL,
  hrs_per_week NUMERIC NOT NULL,
  outcomes JSONB NOT NULL,
  artifacts JSONB NOT NULL,
  schedule JSONB,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.course_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own courses"
ON public.course_profiles FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own courses"
ON public.course_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own courses"
ON public.course_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.course_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL,
  team_size INTEGER NOT NULL,
  tasks JSONB NOT NULL,
  deliverables JSONB NOT NULL,
  pricing_usd INTEGER NOT NULL,
  tier TEXT NOT NULL,
  lo_score NUMERIC NOT NULL,
  feasibility_score NUMERIC NOT NULL,
  mutual_benefit_score NUMERIC NOT NULL,
  final_score NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects from own courses"
ON public.projects FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_profiles
    WHERE course_profiles.id = projects.course_id
    AND course_profiles.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert projects for own courses"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.course_profiles
    WHERE course_profiles.id = projects.course_id
    AND course_profiles.owner_id = auth.uid()
  )
);

-- Forms table (stores 6 standardized forms)
CREATE TABLE public.project_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  form1 JSONB NOT NULL,
  form2 JSONB NOT NULL,
  form3 JSONB NOT NULL,
  form4 JSONB NOT NULL,
  form5 JSONB NOT NULL,
  form6 JSONB NOT NULL,
  milestones JSONB NOT NULL
);

ALTER TABLE public.project_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forms from own projects"
ON public.project_forms FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    JOIN public.course_profiles ON projects.course_id = course_profiles.id
    WHERE projects.id = project_forms.project_id
    AND course_profiles.owner_id = auth.uid()
  )
);

-- Evaluations table
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluator_role app_role NOT NULL,
  liked BOOLEAN NOT NULL,
  feasibility INTEGER,
  fit INTEGER,
  alignment INTEGER,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evaluations for accessible projects"
ON public.evaluations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    JOIN public.course_profiles ON projects.course_id = course_profiles.id
    WHERE projects.id = evaluations.project_id
    AND course_profiles.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own evaluations"
ON public.evaluations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = evaluator_id);

-- Storage bucket for PDF uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('syllabi', 'syllabi', false);

-- Storage policies
CREATE POLICY "Users can upload own syllabi"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'syllabi' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own syllabi"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'syllabi'
  AND auth.uid()::text = (storage.foldername(name))[1]
);