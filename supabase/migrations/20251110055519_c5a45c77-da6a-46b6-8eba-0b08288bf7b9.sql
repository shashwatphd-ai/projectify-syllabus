-- Fix security warnings: Set search_path for all three functions

-- 1. Fix create_project_atomic
CREATE OR REPLACE FUNCTION create_project_atomic(
  p_project_data JSONB,
  p_forms_data JSONB,
  p_metadata_data JSONB
)
RETURNS TABLE (
  project_id UUID,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_error_msg TEXT;
BEGIN
  -- Start transaction (implicit in function)

  -- Step 1: Insert project record
  BEGIN
    INSERT INTO projects (
      course_id,
      generation_run_id,
      company_profile_id,
      company_name,
      company_logo_url,
      status,
      title,
      description,
      tasks,
      deliverables,
      tier,
      sector,
      company_size,
      company_needs,
      lo_alignment,
      lo_score,
      feasibility_score,
      mutual_benefit_score,
      final_score,
      skills,
      majors,
      website,
      faculty_feedback,
      needs_review,
      duration_weeks,
      team_size,
      pricing_usd
    )
    SELECT
      (p_project_data->>'course_id')::UUID,
      (p_project_data->>'generation_run_id')::UUID,
      (p_project_data->>'company_profile_id')::UUID,
      p_project_data->>'company_name',
      p_project_data->>'company_logo_url',
      p_project_data->>'status',
      p_project_data->>'title',
      p_project_data->>'description',
      (p_project_data->'tasks')::JSONB,
      (p_project_data->'deliverables')::JSONB,
      p_project_data->>'tier',
      p_project_data->>'sector',
      p_project_data->>'company_size',
      (p_project_data->'company_needs')::JSONB,
      p_project_data->>'lo_alignment',
      (p_project_data->>'lo_score')::NUMERIC,
      (p_project_data->>'feasibility_score')::NUMERIC,
      (p_project_data->>'mutual_benefit_score')::NUMERIC,
      (p_project_data->>'final_score')::NUMERIC,
      (p_project_data->'skills')::JSONB,
      (p_project_data->'majors')::JSONB,
      p_project_data->>'website',
      p_project_data->>'faculty_feedback',
      (p_project_data->>'needs_review')::BOOLEAN,
      (p_project_data->>'duration_weeks')::INTEGER,
      (p_project_data->>'team_size')::INTEGER,
      (p_project_data->>'pricing_usd')::INTEGER
    RETURNING id INTO v_project_id;

  EXCEPTION
    WHEN OTHERS THEN
      v_error_msg := 'Failed to insert project: ' || SQLERRM;
      RETURN QUERY SELECT NULL::UUID, FALSE, v_error_msg;
      RETURN;
  END;

  -- Step 2: Insert project forms
  BEGIN
    INSERT INTO project_forms (
      project_id,
      form1,
      form2,
      form3,
      form4,
      form5,
      form6,
      milestones
    )
    VALUES (
      v_project_id,
      (p_forms_data->'form1')::JSONB,
      (p_forms_data->'form2')::JSONB,
      (p_forms_data->'form3')::JSONB,
      (p_forms_data->'form4')::JSONB,
      (p_forms_data->'form5')::JSONB,
      (p_forms_data->'form6')::JSONB,
      (p_forms_data->'milestones')::JSONB
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- Transaction will automatically rollback
      v_error_msg := 'Failed to insert forms: ' || SQLERRM;
      RETURN QUERY SELECT NULL::UUID, FALSE, v_error_msg;
      RETURN;
  END;

  -- Step 3: Insert project metadata
  BEGIN
    INSERT INTO project_metadata (
      project_id,
      market_alignment_score,
      estimated_roi,
      stakeholder_insights,
      lo_alignment_detail,
      pricing_breakdown,
      algorithm_version,
      ai_model_version
    )
    VALUES (
      v_project_id,
      (p_metadata_data->>'market_alignment_score')::NUMERIC,
      (p_metadata_data->'estimated_roi')::JSONB,
      (p_metadata_data->'stakeholder_insights')::JSONB,
      (p_metadata_data->'lo_alignment_detail')::JSONB,
      (p_metadata_data->'pricing_breakdown')::JSONB,
      p_metadata_data->>'algorithm_version',
      p_metadata_data->>'ai_model_version'
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- Transaction will automatically rollback
      v_error_msg := 'Failed to insert metadata: ' || SQLERRM;
      RETURN QUERY SELECT NULL::UUID, FALSE, v_error_msg;
      RETURN;
  END;

  -- All inserts successful - commit (automatic)
  RETURN QUERY SELECT v_project_id, TRUE, NULL::TEXT;

END;
$$;

-- 2. Fix find_orphaned_projects
CREATE OR REPLACE FUNCTION find_orphaned_projects()
RETURNS TABLE (
  project_id UUID,
  project_title TEXT,
  missing_components TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN pf.project_id IS NULL THEN 'forms' END,
      CASE WHEN pm.project_id IS NULL THEN 'metadata' END
    ], NULL) as missing_components
  FROM projects p
  LEFT JOIN project_forms pf ON p.id = pf.project_id
  LEFT JOIN project_metadata pm ON p.id = pm.project_id
  WHERE pf.project_id IS NULL OR pm.project_id IS NULL;
END;
$$;

-- 3. Fix cleanup_orphaned_projects
CREATE OR REPLACE FUNCTION cleanup_orphaned_projects()
RETURNS TABLE (
  cleaned_count INTEGER,
  project_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orphan_ids UUID[];
  v_count INTEGER;
BEGIN
  -- Find all orphaned projects
  SELECT ARRAY_AGG(p.id) INTO v_orphan_ids
  FROM projects p
  LEFT JOIN project_forms pf ON p.id = pf.project_id
  LEFT JOIN project_metadata pm ON p.id = pm.project_id
  WHERE pf.project_id IS NULL OR pm.project_id IS NULL;

  -- Delete orphaned projects
  DELETE FROM projects
  WHERE id = ANY(v_orphan_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count, COALESCE(v_orphan_ids, ARRAY[]::UUID[]);
END;
$$;