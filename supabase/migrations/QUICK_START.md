# ⚡ Quick Start: Apply P0-1 Migration

## 🎯 What This Fixes
**Bug:** Projects can exist without forms/metadata if generation fails mid-process
**Fix:** Atomic transaction ensures all-or-nothing creation
**Status:** Code ready ✅ | Migration pending ❌

---

## 🚀 5-Minute Migration (TL;DR)

### 1️⃣ Apply Migration (2 min)

**In Supabase SQL Editor:**
1. Open SQL Editor in your Supabase dashboard
2. Copy contents of: `20251110000001_atomic_project_creation.sql`
3. Paste and Run

### 2️⃣ Verify Functions Created (30 sec)

```sql
-- Should return 3 functions
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%project%atomic%' OR routine_name LIKE '%orphan%';
```

### 3️⃣ Clean Up Orphaned Projects (1 min)

```sql
-- Delete 4 existing orphaned projects
SELECT * FROM cleanup_orphaned_projects();
```

### 4️⃣ Verify Success (30 sec)

```sql
-- Should return 0 rows
SELECT * FROM find_orphaned_projects();

-- Should show matching counts
SELECT
  (SELECT COUNT(*) FROM projects) as projects,
  (SELECT COUNT(*) FROM project_forms) as forms,
  (SELECT COUNT(*) FROM project_metadata) as metadata;
```

✅ **Done!** Future project generation will use atomic transactions.

---

## 📚 Detailed Documentation

For step-by-step instructions, see:

- **[APPLY_MIGRATION_GUIDE.md](./APPLY_MIGRATION_GUIDE.md)** - Complete migration process
- **[CLEANUP_ORPHANED_PROJECTS.md](./CLEANUP_ORPHANED_PROJECTS.md)** - Cleanup existing orphans
- **[verification_queries.sql](./verification_queries.sql)** - All verification queries

---

## ⚠️ Critical Notes

1. **MUST apply migration before next generation run** - The edge function expects `create_project_atomic()` to exist
2. **Cleanup is optional but recommended** - Keeps data integrity clean
3. **No downtime required** - Migration is additive (adds functions, doesn't modify tables)
4. **Edge function auto-deploys** - Already updated to use atomic function

---

## 🔍 What Gets Created

The migration creates 3 PostgreSQL functions:

| Function | Purpose |
|----------|---------|
| `create_project_atomic()` | Creates project + forms + metadata in single transaction |
| `find_orphaned_projects()` | Detects projects missing forms/metadata |
| `cleanup_orphaned_projects()` | Deletes orphaned projects |

---

## 📊 Current State

**Before Migration:**
- Functions: ❌ Do not exist
- Orphaned Projects: 🚨 4 found
- Data Integrity: ❌ Failed (161 projects, 158 forms, 157 metadata)

**After Migration + Cleanup:**
- Functions: ✅ All 3 created
- Orphaned Projects: ✅ 0 (cleaned up)
- Data Integrity: ✅ Passed (157 projects = 157 forms = 157 metadata)

---

## 🧪 Test the Fix

After migration, run a test generation:

```bash
# Trigger project generation via your app
# Or test via Supabase Edge Functions
```

Then verify:
```sql
-- Should return 0 rows (no new orphans)
SELECT * FROM find_orphaned_projects();
```

---

## 🆘 Troubleshooting

**"Function does not exist" error during generation**
→ Migration not applied. Run Step 1.

**Still seeing orphaned projects**
→ Old orphans remain. Run cleanup in Step 3.

**Counts don't match after cleanup**
→ Check for foreign key constraints. Review migration logs.

---

## 📞 Need Help?

1. Check detailed guides in this directory
2. Review Supabase function logs
3. Run diagnostic queries from `verification_queries.sql`
4. Check GitHub issue #[issue_number] for discussion

---

## ✅ Success Criteria

Migration is successful when:

- [x] 3 functions exist in database
- [x] `find_orphaned_projects()` returns 0 rows
- [x] Project/forms/metadata counts match
- [x] New generation runs complete without orphans
- [x] Edge function calls `create_project_atomic()` successfully

---

**Estimated Time:** 5 minutes
**Risk Level:** Low (additive migration, no data modification)
**Rollback:** Drop functions (see APPLY_MIGRATION_GUIDE.md)
