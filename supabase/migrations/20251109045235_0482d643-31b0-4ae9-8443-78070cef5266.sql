-- Fix 1: Add admin authorization check to admin_assign_role function
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
  -- CRITICAL: Verify caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can assign roles';
  END IF;
  
  -- Prevent self-promotion
  IF auth.uid() = _user_id THEN
    RAISE EXCEPTION 'Cannot assign roles to yourself';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Fix 2: Add missing DELETE policy for storage
CREATE POLICY "Users can delete own syllabi"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'syllabi' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 3: Add UPDATE policy for storage (for metadata changes)
CREATE POLICY "Users can update own syllabi"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'syllabi' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'syllabi' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);