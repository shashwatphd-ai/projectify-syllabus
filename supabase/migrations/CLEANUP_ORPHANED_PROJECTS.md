# 🧹 Cleanup Guide: Existing Orphaned Projects

## Current Situation

As of **November 10, 2025**, there are **4 orphaned projects** in the database that were created before the atomic transaction fix was deployed.

## 📊 Orphaned Projects Details

| Project ID | Title | Company | Created | Missing Components |
|------------|-------|---------|---------|-------------------|
| `20438754-...` | Azure Security Project Test 3 | Microsoft | Nov 7, 2025 | Forms + Metadata |
| `b3fd83f1-...` | Azure Cloud Migration Project - Test 2 | Microsoft | Nov 7, 2025 | Forms + Metadata |
| `1f8f0887-...` | Microsoft Cloud Integration Project | Microsoft | Nov 7, 2025 | Forms + Metadata |
| `d1158b1d-...` | Technology: Efficiency & Strategy | Prospect Partner | Nov 1, 2025 | Metadata Only |

**Analysis:**
- 3 Microsoft projects are **completely orphaned** (no forms, no metadata)
- 1 Prospect Partner project has forms but is **missing metadata**
- All appear to be test/demo projects
- No production user data appears to be affected

---

## 🎯 Cleanup Strategy

### **Recommended Approach: Delete All 4 Orphaned Projects**

**Rationale:**
1. The 3 Microsoft projects are test projects with no usable data
2. The Prospect Partner project is incomplete without metadata
3. Keeping orphaned projects skews analytics and data integrity
4. These projects cannot be "fixed" retroactively (forms/metadata require AI generation)

**Alternative:** If you want to keep the Prospect Partner project, you would need to manually generate and insert metadata for it, which is complex and error-prone.

---

## 📋 Step-by-Step Cleanup Process

### **Step 1: PREREQUISITE - Apply Migration First**

⚠️ **You MUST apply the migration before cleanup:**

The cleanup function `cleanup_orphaned_projects()` is created by the migration.

If you haven't applied the migration yet:
1. See `APPLY_MIGRATION_GUIDE.md`
2. Apply `20251110000001_atomic_project_creation.sql`
3. Return here for cleanup

---

### **Step 2: Review Orphaned Projects**

Run this query to see what will be deleted:

```sql
-- View all orphaned projects with full details
SELECT
  p.id,
  p.title,
  p.company_name,
  p.status,
  p.created_at,
  p.final_score,
  CASE WHEN pf.project_id IS NULL THEN '❌ Missing' ELSE '✅ Present' END as forms_status,
  CASE WHEN pm.project_id IS NULL THEN '❌ Missing' ELSE '✅ Present' END as metadata_status
FROM projects p
LEFT JOIN project_forms pf ON p.id = pf.project_id
LEFT JOIN project_metadata pm ON p.id = pm.project_id
WHERE pf.project_id IS NULL OR pm.project_id IS NULL
ORDER BY p.created_at DESC;
```

**Expected Output: 4 rows**

---

### **Step 3: Execute Cleanup**

**Option A: Use the Cleanup Function (Recommended)**

```sql
-- This deletes all orphaned projects in one transaction
SELECT * FROM cleanup_orphaned_projects();
```

**Expected Output:**
```json
{
  "cleaned_count": 4,
  "project_ids": [
    "20438754-...",
    "b3fd83f1-...",
    "1f8f0887-...",
    "d1158b1d-..."
  ]
}
```

**Option B: Manual Deletion (If Function Unavailable)**

```sql
-- Delete orphaned projects manually
DELETE FROM projects
WHERE id IN (
  SELECT p.id
  FROM projects p
  LEFT JOIN project_forms pf ON p.id = pf.project_id
  LEFT JOIN project_metadata pm ON p.id = pm.project_id
  WHERE pf.project_id IS NULL OR pm.project_id IS NULL
);
```

---

### **Step 4: Verify Cleanup Successful**

```sql
-- Should return 0 rows (no orphans remaining)
SELECT * FROM find_orphaned_projects();

-- Verify data integrity (all counts should match)
SELECT
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(*) FROM project_forms) as total_forms,
  (SELECT COUNT(*) FROM project_metadata) as total_metadata,
  CASE
    WHEN (SELECT COUNT(*) FROM projects) =
         (SELECT COUNT(*) FROM project_forms) AND
         (SELECT COUNT(*) FROM project_forms) =
         (SELECT COUNT(*) FROM project_metadata)
    THEN '✅ Data integrity verified'
    ELSE '❌ Warning: Counts still do not match'
  END as status;
```

**Expected Output:**
- Orphaned projects: 0
- All three counts match
- Status: ✅ Data integrity verified

---

## 🔄 Alternative: Selective Cleanup

If you want to keep the Prospect Partner project and only delete the Microsoft test projects:

```sql
-- Delete only the 3 Microsoft test projects
DELETE FROM projects
WHERE id IN (
  '20438754-...',  -- Replace with actual UUID
  'b3fd83f1-...',  -- Replace with actual UUID
  '1f8f0887-...'   -- Replace with actual UUID
);

-- Check remaining orphan
SELECT * FROM find_orphaned_projects();
-- Should show only the Prospect Partner project
```

**Note:** The Prospect Partner project will still be orphaned and incomplete. To fully fix it, you would need to:
1. Generate metadata manually (complex, requires AI model)
2. Insert into `project_metadata` table with correct schema
3. Not recommended - easier to regenerate the project properly

---

## 📊 Before/After Comparison

### Before Cleanup:
```
Total Projects: 161
Total Forms: 158 (3 missing)
Total Metadata: 157 (4 missing)
Orphaned Projects: 4
Data Integrity: ❌ FAILED
```

### After Cleanup:
```
Total Projects: 157
Total Forms: 157
Total Metadata: 157
Orphaned Projects: 0
Data Integrity: ✅ PASSED
```

---

## ⚠️ Important Notes

1. **Backup First (Optional):** If you want to preserve the data for analysis:
   ```sql
   -- Export orphaned projects to a backup table
   CREATE TABLE orphaned_projects_backup AS
   SELECT p.*
   FROM projects p
   LEFT JOIN project_forms pf ON p.id = pf.project_id
   LEFT JOIN project_metadata pm ON p.id = pm.project_id
   WHERE pf.project_id IS NULL OR pm.project_id IS NULL;
   ```

2. **Deletion is Permanent:** Once deleted, these projects cannot be recovered (unless you have database backups)

3. **No User Impact:** All orphaned projects appear to be test/demo projects with no production user association

4. **Future Prevention:** After this cleanup + migration, the atomic transaction will prevent new orphaned projects from being created

---

## ✅ Cleanup Checklist

After completing cleanup, verify:

- [ ] Migration applied successfully
- [ ] Cleanup function executed
- [ ] `find_orphaned_projects()` returns 0 rows
- [ ] Projects count = Forms count = Metadata count
- [ ] All 4 orphaned projects removed
- [ ] Database integrity verified

---

## 🚀 Next Steps

After cleanup is complete:

1. ✅ Verify no orphaned projects remain
2. 🧪 Test new project generation
3. 📊 Monitor for new orphans (should be 0)
4. 📝 Update project count in analytics

---

## 🔍 Monitoring for Future Orphans

Run this query periodically to ensure no new orphans are created:

```sql
-- Check for orphaned projects created in the last 24 hours
SELECT
  p.id,
  p.title,
  p.created_at,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN pf.project_id IS NULL THEN 'forms' END,
    CASE WHEN pm.project_id IS NULL THEN 'metadata' END
  ], NULL) as missing_components
FROM projects p
LEFT JOIN project_forms pf ON p.id = pf.project_id
LEFT JOIN project_metadata pm ON p.id = pm.project_id
WHERE (pf.project_id IS NULL OR pm.project_id IS NULL)
  AND p.created_at > NOW() - INTERVAL '24 hours';

-- Expected: 0 rows (if atomic transactions are working correctly)
```

If this query returns any rows after the migration is applied, it indicates a problem with the atomic transaction implementation.

---

## 📞 Support

If you encounter issues during cleanup:
1. Check that migration was applied successfully
2. Verify you're using the service_role or have proper permissions
3. Review Supabase logs for error messages
4. Check `verification_queries.sql` for diagnostic queries
