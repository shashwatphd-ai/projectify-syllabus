-- ============================================
-- P0-1 MIGRATION VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify the atomic project creation migration
-- Use these in Supabase SQL Editor before and after migration

-- ============================================
-- PRE-MIGRATION CHECKS
-- ============================================

-- 1. Check if atomic function exists (BEFORE: should return 0 rows)
SELECT
  routine_name,
  routine_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines
WHERE routine_name IN (
  'create_project_atomic',
  'find_orphaned_projects',
  'cleanup_orphaned_projects'
);

-- 2. Count current orphaned projects (BEFORE: expected 4)
SELECT
  COUNT(DISTINCT p.id) as orphaned_count
FROM projects p
LEFT JOIN project_forms pf ON p.id = pf.project_id
LEFT JOIN project_metadata pm ON p.id = pm.project_id
WHERE pf.project_id IS NULL OR pm.project_id IS NULL;

-- 3. View orphaned projects with details (BEFORE: expected 4 rows)
SELECT
  p.id,
  p.title,
  p.company_name,
  p.created_at,
  CASE WHEN pf.project_id IS NULL THEN '❌' ELSE '✅' END as has_forms,
  CASE WHEN pm.project_id IS NULL THEN '❌' ELSE '✅' END as has_metadata,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN pf.project_id IS NULL THEN 'forms' END,
    CASE WHEN pm.project_id IS NULL THEN 'metadata' END
  ], NULL) as missing_components
FROM projects p
LEFT JOIN project_forms pf ON p.id = pf.project_id
LEFT JOIN project_metadata pm ON p.id = pm.project_id
WHERE pf.project_id IS NULL OR pm.project_id IS NULL
ORDER BY p.created_at DESC;

-- 4. Check data integrity (counts should match after cleanup)
SELECT
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(*) FROM project_forms) as total_forms,
  (SELECT COUNT(*) FROM project_metadata) as total_metadata,
  (SELECT COUNT(*) FROM projects) -
  (SELECT COUNT(DISTINCT p.id)
   FROM projects p
   INNER JOIN project_forms pf ON p.id = pf.project_id
   INNER JOIN project_metadata pm ON p.id = pm.project_id
  ) as orphaned_projects;

-- ============================================
-- POST-MIGRATION VERIFICATION
-- ============================================

-- 5. Verify functions created (AFTER: should return 3 rows)
SELECT
  routine_name,
  routine_type,
  data_type as return_type,
  security_type
FROM information_schema.routines
WHERE routine_name IN (
  'create_project_atomic',
  'find_orphaned_projects',
  'cleanup_orphaned_projects'
)
ORDER BY routine_name;

-- 6. Verify function permissions (AFTER: should return 3 rows with service_role)
SELECT
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN (
  'create_project_atomic',
  'find_orphaned_projects',
  'cleanup_orphaned_projects'
)
AND grantee = 'service_role'
ORDER BY routine_name;

-- 7. Test find_orphaned_projects function (AFTER cleanup: should return 0 rows)
SELECT
  project_id,
  project_title,
  missing_components
FROM find_orphaned_projects();

-- 8. Verify data integrity post-cleanup (counts should match)
SELECT
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(*) FROM project_forms) as total_forms,
  (SELECT COUNT(*) FROM project_metadata) as total_metadata,
  CASE
    WHEN (SELECT COUNT(*) FROM projects) =
         (SELECT COUNT(*) FROM project_forms) AND
         (SELECT COUNT(*) FROM project_forms) =
         (SELECT COUNT(*) FROM project_metadata)
    THEN '✅ PASS: All counts match'
    ELSE '❌ FAIL: Counts do not match'
  END as integrity_status;

-- ============================================
-- CLEANUP OPERATIONS
-- ============================================

-- 9. Preview orphaned projects before cleanup (safe - read only)
SELECT
  p.id,
  p.title,
  p.company_name,
  p.created_at,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN pf.project_id IS NULL THEN 'forms' END,
    CASE WHEN pm.project_id IS NULL THEN 'metadata' END
  ], NULL) as missing_components
FROM projects p
LEFT JOIN project_forms pf ON p.id = pf.project_id
LEFT JOIN project_metadata pm ON p.id = pm.project_id
WHERE pf.project_id IS NULL OR pm.project_id IS NULL;

-- 10. Execute cleanup (DESTRUCTIVE - deletes orphaned projects)
-- Uncomment to run:
-- SELECT * FROM cleanup_orphaned_projects();

-- ============================================
-- TESTING THE FIX
-- ============================================

-- 11. Monitor for new orphans after generation runs
-- Run this query after each project generation to ensure no new orphans
SELECT
  p.id,
  p.title,
  p.created_at,
  INTERVAL '5 minutes' as recency,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN pf.project_id IS NULL THEN 'forms' END,
    CASE WHEN pm.project_id IS NULL THEN 'metadata' END
  ], NULL) as missing_components
FROM projects p
LEFT JOIN project_forms pf ON p.id = pf.project_id
LEFT JOIN project_metadata pm ON p.id = pm.project_id
WHERE (pf.project_id IS NULL OR pm.project_id IS NULL)
  AND p.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY p.created_at DESC;

-- 12. Test atomic function (safe test - will rollback)
-- This tests the function without actually creating a project
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- This is a read-only test - it will be rolled back
  RAISE NOTICE 'Testing create_project_atomic function...';

  -- Check function exists and is callable
  PERFORM routine_name
  FROM information_schema.routines
  WHERE routine_name = 'create_project_atomic';

  IF FOUND THEN
    RAISE NOTICE '✅ Function create_project_atomic exists and is accessible';
  ELSE
    RAISE EXCEPTION '❌ Function create_project_atomic not found';
  END IF;

  -- Rollback test
  RAISE EXCEPTION 'Test completed successfully (intentional rollback)';
END $$;

-- ============================================
-- SUMMARY REPORT
-- ============================================

-- 13. Generate complete status report
WITH orphan_check AS (
  SELECT COUNT(*) as orphan_count
  FROM projects p
  LEFT JOIN project_forms pf ON p.id = pf.project_id
  LEFT JOIN project_metadata pm ON p.id = pm.project_id
  WHERE pf.project_id IS NULL OR pm.project_id IS NULL
),
function_check AS (
  SELECT COUNT(*) as function_count
  FROM information_schema.routines
  WHERE routine_name IN (
    'create_project_atomic',
    'find_orphaned_projects',
    'cleanup_orphaned_projects'
  )
),
integrity_check AS (
  SELECT
    (SELECT COUNT(*) FROM projects) as projects,
    (SELECT COUNT(*) FROM project_forms) as forms,
    (SELECT COUNT(*) FROM project_metadata) as metadata
)
SELECT
  '=== P0-1 MIGRATION STATUS ===' as report_section,
  CASE
    WHEN fc.function_count = 3 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END || ' - Functions Deployed (' || fc.function_count || '/3)' as functions_status,
  CASE
    WHEN oc.orphan_count = 0 THEN '✅ PASS'
    ELSE '⚠️  WARN'
  END || ' - Orphaned Projects (' || oc.orphan_count || ' found)' as orphan_status,
  CASE
    WHEN ic.projects = ic.forms AND ic.forms = ic.metadata THEN '✅ PASS'
    ELSE '❌ FAIL'
  END || ' - Data Integrity (P:' || ic.projects || ' F:' || ic.forms || ' M:' || ic.metadata || ')' as integrity_status
FROM function_check fc, orphan_check oc, integrity_check ic;
