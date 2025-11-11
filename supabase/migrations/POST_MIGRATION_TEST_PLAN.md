# 🧪 P0-1 Post-Migration Test Plan

## Overview
This document outlines testing procedures after applying the P0-1 atomic project creation migration.

---

## ✅ **Migration Verification (COMPLETED)**

**Status:** ✅ PASSED

### Test Results:
- ✅ Functions created: 3/3 (create_project_atomic, find_orphaned_projects, cleanup_orphaned_projects)
- ✅ Orphaned projects: 0 (cleaned up 4 successfully)
- ✅ Data integrity: 161 projects = 161 forms = 161 metadata
- ✅ Security: All functions use SECURITY DEFINER

**Date:** 2025-11-10
**Applied By:** Lovable Agent
**Verification By:** Claude Code

---

## 🧪 **Test 1: Atomic Function Smoke Test**

**Purpose:** Verify the atomic function is callable and has correct permissions

**SQL Test Query:**
```sql
-- Test 1: Check function signature
SELECT
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_project_atomic';
```

**Expected Result:**
- Function name: create_project_atomic
- Return type: TABLE(project_id uuid, success boolean, error_message text)
- Arguments: p_project_data jsonb, p_forms_data jsonb, p_metadata_data jsonb

**Status:** PENDING

---

## 🧪 **Test 2: Monitor for New Orphans**

**Purpose:** Ensure no new orphaned projects are created during normal operation

**SQL Monitor Query:**
```sql
-- Run this query periodically to check for new orphans
SELECT
  p.id,
  p.title,
  p.created_at,
  CASE WHEN pf.project_id IS NULL THEN '❌ Missing' ELSE '✅ Present' END as forms,
  CASE WHEN pm.project_id IS NULL THEN '❌ Missing' ELSE '✅ Present' END as metadata
FROM projects p
LEFT JOIN project_forms pf ON p.id = pf.project_id
LEFT JOIN project_metadata pm ON p.id = pm.project_id
WHERE (pf.project_id IS NULL OR pm.project_id IS NULL)
  AND p.created_at > NOW() - INTERVAL '24 hours'
ORDER BY p.created_at DESC;
```

**Expected Result:** 0 rows (no new orphans)

**Monitoring Schedule:**
- ✅ Immediately after migration
- ⏰ After first project generation
- ⏰ Daily for 1 week
- ⏰ Weekly for 1 month

**Status:** PENDING

---

## 🧪 **Test 3: End-to-End Project Generation**

**Purpose:** Verify project generation works with atomic transactions

**Test Steps:**
1. Trigger project generation via UI or API
2. Monitor Supabase logs for function calls
3. Check for successful completion
4. Verify no orphans created

**Success Criteria:**
- ✅ Project generation completes without errors
- ✅ All 3 records created (project, forms, metadata)
- ✅ `find_orphaned_projects()` returns 0 rows
- ✅ Edge function logs show "Creating project atomically..." message

**How to Test:**
```bash
# Option 1: Via UI
1. Navigate to project generation page
2. Select a course
3. Click "Generate Projects"
4. Wait for completion

# Option 2: Via API (if available)
curl -X POST https://[your-edge-function-url]/generate-projects \
  -H "Content-Type: application/json" \
  -d '{"courseId": "[course-uuid]"}'
```

**Verification:**
```sql
-- Check no orphans created in last hour
SELECT * FROM find_orphaned_projects()
WHERE project_id IN (
  SELECT id FROM projects
  WHERE created_at > NOW() - INTERVAL '1 hour'
);
-- Expected: 0 rows
```

**Status:** PENDING

---

## 🧪 **Test 4: Atomic Rollback Test**

**Purpose:** Verify that if any insert fails, the entire transaction rolls back

**⚠️ WARNING:** This is a destructive test. Only run in a non-production environment.

**Test Scenario:** Simulate a failure in the metadata insert

**Test Query:**
```sql
-- This would test the rollback, but requires modifying test data
-- DO NOT RUN IN PRODUCTION
-- This is for staging/development only
```

**Expected Behavior:**
- If project insert succeeds but forms/metadata fails
- Transaction should rollback
- No partial project should exist
- Error returned to caller

**Status:** SKIPPED (requires staging environment)

---

## 🧪 **Test 5: Performance Test**

**Purpose:** Ensure atomic function doesn't significantly impact performance

**Metrics to Measure:**
- Project generation time (before vs after)
- Database connection count
- Query execution time

**Baseline (3 separate inserts):**
- Estimated: ~300ms per project

**With Atomic Function:**
- Expected: ~300-350ms per project (slight overhead acceptable)

**How to Measure:**
```sql
-- Check recent project generation performance
SELECT
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
FROM projects
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Status:** PENDING

---

## 📊 **Test Results Summary**

| Test | Status | Result | Notes |
|------|--------|--------|-------|
| Migration Verification | ✅ PASS | 3 functions, 0 orphans, data integrity OK | Completed 2025-11-10 |
| Atomic Function Smoke Test | ⏰ PENDING | - | Ready to run |
| Monitor for New Orphans | ⏰ PENDING | - | Set up monitoring |
| End-to-End Project Generation | ⏰ PENDING | - | Next critical test |
| Atomic Rollback Test | ⚠️ SKIP | - | Requires staging |
| Performance Test | ⏰ PENDING | - | Run after generation test |

---

## ✅ **Sign-Off Criteria**

Before considering P0-1 fully complete:

- [x] Migration applied successfully
- [x] Functions created with correct permissions
- [x] Existing orphans cleaned up (4 removed)
- [x] Data integrity verified (161=161=161)
- [ ] End-to-end project generation tested
- [ ] No new orphans created in 24 hours
- [ ] Performance impact acceptable
- [ ] Edge function logs reviewed

---

## 🚨 **Rollback Plan (If Needed)**

If testing reveals issues:

**Option 1: Disable Atomic Function (Keep old behavior)**
```sql
-- Rename function to disable it
ALTER FUNCTION create_project_atomic RENAME TO create_project_atomic_disabled;
```
Then revert edge function code to use 3 separate inserts.

**Option 2: Fix Function Issues**
- Identify the specific error
- Apply corrective migration
- Re-test

**Option 3: Full Rollback**
```sql
DROP FUNCTION IF EXISTS create_project_atomic(JSONB, JSONB, JSONB);
DROP FUNCTION IF EXISTS find_orphaned_projects();
DROP FUNCTION IF EXISTS cleanup_orphaned_projects();
```

---

## 📞 **Support & Monitoring**

**Monitor These Metrics:**
1. Orphaned project count (should stay at 0)
2. Project generation success rate
3. Edge function error logs
4. Database function execution time

**Check Daily:**
```sql
-- Daily orphan check
SELECT * FROM find_orphaned_projects();

-- Daily data integrity check
SELECT
  (SELECT COUNT(*) FROM projects) as p,
  (SELECT COUNT(*) FROM project_forms) as f,
  (SELECT COUNT(*) FROM project_metadata) as m;
```

**Alert Conditions:**
- 🚨 Any orphaned projects detected → Investigate immediately
- ⚠️ Data integrity counts don't match → Review recent generations
- ⚠️ Edge function errors > 5% → Check logs

---

## 🎯 **Next Steps**

1. **Immediate:** Run end-to-end project generation test
2. **Today:** Monitor for 24 hours (check for new orphans)
3. **This Week:** Performance testing and monitoring
4. **This Month:** Review metrics, confirm fix is stable

**Once Complete:** Move to P0-2 (Location Format Validation)

---

**Test Plan Version:** 1.0
**Last Updated:** 2025-11-10
**Owner:** Development Team
