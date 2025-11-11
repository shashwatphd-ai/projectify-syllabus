-- Migration: Fix type cast for status column in create_project_atomic function
-- Created: 2025-11-10
-- Issue: P0-1B - status field not cast to project_status enum, causing insert failure
-- Error: "column status is of type project_status but expression is of type text"

-- ============================================
-- FIX: Update create_project_atomic function with correct status type cast
-- ============================================

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
      (p_project_data->>'status')::project_status,  -- P0-1B FIX: Cast to enum
      p_project_data->>'title',
      p_project_data->>'description',
      (p_project_data->'tasks')::TEXT[],
      (p_project_data->'deliverables')::TEXT[],
      p_project_data->>'tier',
      p_project_data->>'sector',
      p_project_data->>'company_size',
      (p_project_data->'company_needs')::TEXT[],
      p_project_data->>'lo_alignment',
      (p_project_data->>'lo_score')::NUMERIC,
      (p_project_data->>'feasibility_score')::NUMERIC,
      (p_project_data->>'mutual_benefit_score')::NUMERIC,
      (p_project_data->>'final_score')::NUMERIC,
      (p_project_data->'skills')::TEXT[],
      (p_project_data->'majors')::TEXT[],
      p_project_data->>'website',
      p_project_data->>'faculty_feedback',
      (p_project_data->>'needs_review')::BOOLEAN,
      (p_project_data->>'duration_weeks')::INTEGER,
      (p_project_data->>'team_size')::INTEGER,
      (p_project_data->>'pricing_usd')::NUMERIC
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

-- Grant execute permission to service role (redundant but safe)
GRANT EXECUTE ON FUNCTION create_project_atomic TO service_role;

-- Update comment
COMMENT ON FUNCTION create_project_atomic IS
'Atomically creates a project with its forms and metadata.
If any insert fails, the entire transaction is rolled back to prevent orphaned projects.
P0-1B FIX: Corrected status field type cast to project_status enum.
Used by generate-projects edge function.';
