# 🚀 P0-1 Migration Application Guide

## Overview
This guide walks you through applying the atomic project creation migration to fix the orphaned projects bug (P0-1).

**Current Status:**
- ✅ Migration file created: `20251110000001_atomic_project_creation.sql`
- ✅ Edge function updated: `generate-projects/index.ts`
- ❌ Migration NOT yet applied to database
- 🚨 4 orphaned projects currently in database

---

## ⚠️ CRITICAL: Apply Migration Before Next Generation Run

The updated edge function calls `create_project_atomic()` which **does not exist** until this migration is applied.

**If you run project generation before applying this migration, it will fail with:**
```
Error: function create_project_atomic does not exist
```

---

## 📋 Step-by-Step Application Process

### **Step 1: Verify Current Database State** (Optional but Recommended)

Run these queries in Supabase SQL Editor to confirm the issue:

```sql
-- Check if atomic function exists (should return 0 rows)
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'create_project_atomic';

-- Count orphaned projects (should return 4)
SELECT
  COUNT(DISTINCT p.id) as orphaned_count
FROM projects p
LEFT JOIN project_forms pf ON p.id = pf.project_id
LEFT JOIN project_metadata pm ON p.id = pm.project_id
WHERE pf.project_id IS NULL OR pm.project_id IS NULL;
```

**Expected Results Before Migration:**
- Function check: 0 rows (function doesn't exist)
- Orphaned count: 4 projects

---

### **Step 2: Apply the Migration**

**Option A: Via Supabase Dashboard (Recommended)**

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of:
   ```
   supabase/migrations/20251110000001_atomic_project_creation.sql
   ```
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for confirmation: "Success. No rows returned"

**Option B: Via Supabase CLI** (If you have local setup)

```bash
# Make sure you're authenticated
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Apply pending migrations
supabase db push

# Or apply migrations remotely
supabase db push --linked
```

---

### **Step 3: Verify Migration Applied Successfully**

Run these verification queries:

```sql
-- 1. Check atomic function exists (should return 1 row)
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'create_project_atomic',
  'find_orphaned_projects',
  'cleanup_orphaned_projects'
);

-- 2. Check function permissions (should return 3 rows)
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN (
  'create_project_atomic',
  'find_orphaned_projects',
  'cleanup_orphaned_projects'
);

-- 3. Test find_orphaned_projects function (should return 4 rows)
SELECT * FROM find_orphaned_projects();
```

**Expected Results After Migration:**
- Function check: 3 functions found
- Permissions check: 3 EXECUTE grants to service_role
- Orphaned projects: 4 projects (still there, need cleanup)

---

### **Step 4: Clean Up Existing Orphaned Projects**

You have two options:

**Option A: Review First, Delete Later (Recommended)**

```sql
-- View orphaned projects with details
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
```

Review the results, then if you're ready to delete:

```sql
-- Delete orphaned projects (DESTRUCTIVE - cannot be undone)
SELECT * FROM cleanup_orphaned_projects();
```

**Option B: Delete Immediately**

```sql
-- This will delete all 4 orphaned projects
SELECT * FROM cleanup_orphaned_projects();
-- Returns: { cleaned_count: 4, project_ids: [...array of UUIDs...] }
```

---

### **Step 5: Final Verification**

```sql
-- Should return 0 rows (no orphans remaining)
SELECT * FROM find_orphaned_projects();

-- Verify data integrity
SELECT
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(*) FROM project_forms) as total_forms,
  (SELECT COUNT(*) FROM project_metadata) as total_metadata;
-- All three counts should match
```

---

## ✅ Post-Migration Checklist

After completing all steps, verify:

- [ ] `create_project_atomic()` function exists
- [ ] `find_orphaned_projects()` function exists
- [ ] `cleanup_orphaned_projects()` function exists
- [ ] All functions have EXECUTE permission for service_role
- [ ] Orphaned projects cleaned up (0 orphans found)
- [ ] Projects count = Forms count = Metadata count
- [ ] Edge function deployment successful (auto-deploys on push)

---

## 🎯 Testing the Fix

After migration is applied, test by:

1. **Trigger a new project generation**
2. **Monitor the logs** for "Creating project atomically..." message
3. **Verify no orphaned projects created:**
   ```sql
   SELECT * FROM find_orphaned_projects();
   -- Should return 0 rows
   ```

If generation fails for any project, the atomic transaction ensures **no partial data** is created.

---

## 🚨 Rollback (Emergency Only)

If you need to rollback this migration (not recommended):

```sql
-- Drop the functions (WARNING: This breaks the edge function)
DROP FUNCTION IF EXISTS create_project_atomic(JSONB, JSONB, JSONB);
DROP FUNCTION IF EXISTS find_orphaned_projects();
DROP FUNCTION IF EXISTS cleanup_orphaned_projects();
```

**Note:** If you rollback, you MUST also revert the edge function code, otherwise project generation will fail.

---

## 📊 Known Orphaned Projects (As of 2025-11-10)

| Project ID | Title | Company | Missing |
|------------|-------|---------|---------|
| `20438754-...` | Azure Security Project Test 3 | Microsoft | Forms + Metadata |
| `b3fd83f1-...` | Azure Cloud Migration Project - Test 2 | Microsoft | Forms + Metadata |
| `1f8f0887-...` | Microsoft Cloud Integration Project | Microsoft | Forms + Metadata |
| `d1158b1d-...` | Technology: Efficiency & Strategy | Prospect Partner | Metadata |

**Recommendation:** Delete these 4 projects using `cleanup_orphaned_projects()` after migration.

---

## 🔗 Related Files

- Migration: `supabase/migrations/20251110000001_atomic_project_creation.sql`
- Edge Function: `supabase/functions/generate-projects/index.ts` (lines 681-770)
- Implementation Doc: `supabase/functions/generate-projects/ATOMIC_UPDATE.md`

---

## ❓ Troubleshooting

**Error: "function create_project_atomic does not exist"**
- Migration not applied yet. Run Step 2.

**Error: "permission denied for function create_project_atomic"**
- Check GRANT statement executed. Run:
  ```sql
  GRANT EXECUTE ON FUNCTION create_project_atomic TO service_role;
  ```

**Edge function fails after migration**
- Verify function signature matches RPC call
- Check Supabase logs for detailed error messages

**Still finding orphaned projects after migration**
- Migration only prevents NEW orphans
- Run `cleanup_orphaned_projects()` to clean existing ones

---

## 📞 Support

- GitHub Issue: Link to P0-1 issue
- Lovable Support: Check Supabase integration status
- Logs: Check Supabase Functions logs for generation errors
