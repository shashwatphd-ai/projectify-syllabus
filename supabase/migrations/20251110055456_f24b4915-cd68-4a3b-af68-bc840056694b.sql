-- Fix ambiguous column reference in cleanup_orphaned_projects function
CREATE OR REPLACE FUNCTION cleanup_orphaned_projects()
RETURNS TABLE (
  cleaned_count INTEGER,
  project_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_orphan_ids UUID[];
  v_count INTEGER;
BEGIN
  -- Find all orphaned projects (fix ambiguous column reference)
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

COMMENT ON FUNCTION cleanup_orphaned_projects IS
'Deletes all orphaned projects (projects without forms or metadata).
Returns count of deleted projects and their IDs.
USE WITH CAUTION: This permanently deletes data.';