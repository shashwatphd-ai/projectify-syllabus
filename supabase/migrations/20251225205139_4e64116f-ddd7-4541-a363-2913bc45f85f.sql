-- Create atomic course deletion function
-- This ensures that course deletion and all related data is deleted in a single transaction
-- If any part fails, the entire operation is rolled back

CREATE OR REPLACE FUNCTION public.delete_course_atomic(p_course_id UUID, p_user_id UUID)
RETURNS TABLE(success BOOLEAN, error_message TEXT, deleted_projects_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_course_owner_id UUID;
  v_projects_count INTEGER;
  v_error_msg TEXT;
BEGIN
  -- Step 1: Verify course exists and user owns it
  SELECT owner_id INTO v_course_owner_id
  FROM course_profiles
  WHERE id = p_course_id;

  IF v_course_owner_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Course not found'::TEXT, 0;
    RETURN;
  END IF;

  IF v_course_owner_id != p_user_id THEN
    RETURN QUERY SELECT FALSE, 'Not authorized to delete this course'::TEXT, 0;
    RETURN;
  END IF;

  -- Step 2: Count projects to be deleted (for return value)
  SELECT COUNT(*) INTO v_projects_count
  FROM projects
  WHERE course_id = p_course_id;

  -- Step 3: Delete related data in correct order
  -- Note: Most cascade deletes are handled by FK constraints, but we explicitly
  -- delete to ensure everything is cleaned up and we can track counts
  
  BEGIN
    -- Delete generation runs (CASCADE will handle company_profiles references)
    DELETE FROM generation_runs WHERE course_id = p_course_id;
    
    -- Delete company filter cache
    DELETE FROM company_filter_cache WHERE course_id = p_course_id;
    
    -- Delete projects (CASCADE handles: project_forms, project_metadata, 
    -- project_applications, evaluations, project_generation_queue, partnership_proposals)
    DELETE FROM projects WHERE course_id = p_course_id;
    
    -- Finally delete the course profile
    DELETE FROM course_profiles WHERE id = p_course_id;

    -- All successful
    RETURN QUERY SELECT TRUE, NULL::TEXT, v_projects_count;

  EXCEPTION
    WHEN OTHERS THEN
      v_error_msg := 'Deletion failed: ' || SQLERRM;
      RETURN QUERY SELECT FALSE, v_error_msg, 0;
      RETURN;
  END;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_course_atomic(UUID, UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.delete_course_atomic IS 'Atomically deletes a course and all related data (projects, forms, metadata, etc.) in a single transaction. Returns success status, error message if any, and count of deleted projects.';