-- Step 1: Create secure user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Users can ONLY view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- NO INSERT/UPDATE/DELETE policies = admin-only via service role

-- Step 3: Security definer function for safe role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 4: Update handle_new_user trigger to ignore user-provided roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile without role
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Always assign 'student' role by default
  -- Ignore user-provided role metadata for security
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role);
  
  RETURN NEW;
END;
$$;

-- Step 5: Create admin function for role management
CREATE OR REPLACE FUNCTION public.admin_assign_role(
  _user_id UUID,
  _role app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function should only be called by edge functions
  -- with proper admin verification
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Step 6: Migrate existing roles from profiles table
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT id, role, created_at 
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 7: Drop UPDATE policy on profiles to prevent any modifications
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Step 8: Drop role column from profiles (data already migrated)
ALTER TABLE public.profiles DROP COLUMN role;