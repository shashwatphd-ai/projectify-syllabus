-- Bit 2.2: Atomic Project Deletion Function
-- Safely deletes a project and ALL related data in a single transaction

CREATE OR REPLACE FUNCTION public.delete_project_atomic(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS TABLE(success BOOLEAN, error_message TEXT, deleted_related_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_course_owner_id UUID;
  v_related_count INTEGER := 0;
  v_temp_count INTEGER;
  v_error_msg TEXT;
BEGIN
  -- Step 1: Verify project exists and user owns the course it belongs to
  SELECT c.owner_id INTO v_course_owner_id
  FROM projects p
  JOIN course_profiles c ON p.course_id = c.id
  WHERE p.id = p_project_id;

  IF v_course_owner_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Project not found'::TEXT, 0;
    RETURN;
  END IF;

  IF v_course_owner_id != p_user_id THEN
    RETURN QUERY SELECT FALSE, 'Not authorized to delete this project'::TEXT, 0;
    RETURN;
  END IF;

  -- Step 2: Delete all related data in correct order (respecting FK constraints)
  BEGIN
    -- Delete partnership proposals
    DELETE FROM partnership_proposals WHERE project_id = p_project_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_related_count := v_related_count + v_temp_count;

    -- Delete project applications
    DELETE FROM project_applications WHERE project_id = p_project_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_related_count := v_related_count + v_temp_count;

    -- Delete evaluations
    DELETE FROM evaluations WHERE project_id = p_project_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_related_count := v_related_count + v_temp_count;

    -- Delete verified competencies (project_id is nullable, so these are optional)
    DELETE FROM verified_competencies WHERE project_id = p_project_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_related_count := v_related_count + v_temp_count;

    -- Delete project generation queue entries
    DELETE FROM project_generation_queue WHERE project_id = p_project_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_related_count := v_related_count + v_temp_count;

    -- Delete project forms
    DELETE FROM project_forms WHERE project_id = p_project_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_related_count := v_related_count + v_temp_count;

    -- Delete project metadata
    DELETE FROM project_metadata WHERE project_id = p_project_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_related_count := v_related_count + v_temp_count;

    -- Finally delete the project itself
    DELETE FROM projects WHERE id = p_project_id;

    -- All successful
    RETURN QUERY SELECT TRUE, NULL::TEXT, v_related_count;

  EXCEPTION
    WHEN OTHERS THEN
      v_error_msg := 'Deletion failed: ' || SQLERRM;
      RETURN QUERY SELECT FALSE, v_error_msg, 0;
      RETURN;
  END;
END;
$$;