# 📚 Database Migrations

This directory contains SQL migrations for the Projectify Syllabus database.

---

## 🚨 P0-1: Atomic Project Creation (Active Migration)

**Status:** Ready to apply
**Priority:** High
**Issue:** Projects can exist without forms/metadata if generation fails mid-process
**Impact:** 4 orphaned projects currently in database

### Quick Links

| Document | Purpose | Time |
|----------|---------|------|
| **[QUICK_START.md](./QUICK_START.md)** | Fast 5-minute guide | ⚡ 5 min |
| **[APPLY_MIGRATION_GUIDE.md](./APPLY_MIGRATION_GUIDE.md)** | Detailed step-by-step instructions | 📖 15 min |
| **[CLEANUP_ORPHANED_PROJECTS.md](./CLEANUP_ORPHANED_PROJECTS.md)** | Clean up existing orphans | 🧹 10 min |
| **[verification_queries.sql](./verification_queries.sql)** | SQL verification queries | 🔍 Reference |

### Migration File

```
20251110000001_atomic_project_creation.sql
```

**What it does:**
- Creates `create_project_atomic()` function for atomic project creation
- Creates `find_orphaned_projects()` helper to detect incomplete projects
- Creates `cleanup_orphaned_projects()` function to remove orphans

---

## 🎯 Choose Your Path

### Path A: Just Get It Done (5 minutes)
→ Read **[QUICK_START.md](./QUICK_START.md)**

### Path B: Understand Everything (15 minutes)
→ Read **[APPLY_MIGRATION_GUIDE.md](./APPLY_MIGRATION_GUIDE.md)**

### Path C: Fix Existing Data Issues (10 minutes)
→ Read **[CLEANUP_ORPHANED_PROJECTS.md](./CLEANUP_ORPHANED_PROJECTS.md)**

---

## 📊 Migration Status Dashboard

### Code Status
- ✅ Migration SQL file created
- ✅ Edge function updated to use atomic RPC
- ✅ Documentation complete
- ✅ Verification queries ready

### Database Status
- ❌ Migration NOT yet applied
- ❌ Functions do NOT exist in database
- 🚨 4 orphaned projects detected

### What Needs to Happen
1. **Apply migration** in Supabase SQL Editor
2. **Clean up** 4 existing orphaned projects
3. **Verify** atomic function is working

---

## 🔧 How to Apply This Migration

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy contents of `20251110000001_atomic_project_creation.sql`
4. Paste and click **Run**
5. Verify with queries from `verification_queries.sql`

### Option 2: Supabase CLI

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

---

## 📈 Expected Outcomes

### Before Migration
```
Database:
  Projects: 161
  Forms: 158 (❌ 3 missing)
  Metadata: 157 (❌ 4 missing)
  Orphaned Projects: 4

Functions:
  create_project_atomic: ❌ Does not exist
  find_orphaned_projects: ❌ Does not exist
  cleanup_orphaned_projects: ❌ Does not exist

Edge Function:
  Status: ⚠️ Will fail (calls non-existent function)
```

### After Migration + Cleanup
```
Database:
  Projects: 157
  Forms: 157 (✅ All present)
  Metadata: 157 (✅ All present)
  Orphaned Projects: 0

Functions:
  create_project_atomic: ✅ Created
  find_orphaned_projects: ✅ Created
  cleanup_orphaned_projects: ✅ Created

Edge Function:
  Status: ✅ Working (calls atomic function successfully)
```

---

## 🧪 Testing the Fix

After applying migration, test by:

1. **Trigger a project generation run**
2. **Check logs** for "Creating project atomically..." message
3. **Verify no orphans created:**
   ```sql
   SELECT * FROM find_orphaned_projects();
   -- Should return 0 rows
   ```

---

## ⚠️ Important Notes

### Why This Migration is Critical

**Before fix:**
```
1. Insert project ✅
2. Insert forms ❌ (fails)
3. Insert metadata ❌ (skipped)
Result: Orphaned project with no forms or metadata
```

**After fix:**
```
1. BEGIN TRANSACTION
2. Insert project
3. Insert forms (if fails → rollback all)
4. Insert metadata (if fails → rollback all)
5. COMMIT (only if all succeed)
Result: Either complete project or nothing at all
```

### Migration Safety

- **No downtime required** - Functions are added, no tables modified
- **Backward compatible** - Existing data not affected
- **Rollback available** - Can drop functions if needed (see guide)
- **Idempotent** - Safe to run multiple times (uses CREATE OR REPLACE)

### Timeline

- **Created:** November 10, 2025
- **Code Deployed:** November 10, 2025
- **Migration Applied:** Pending
- **Cleanup Completed:** Pending

---

## 📞 Support & Resources

### Documentation Structure
```
supabase/migrations/
├── README.md (you are here)
├── QUICK_START.md (5-min guide)
├── APPLY_MIGRATION_GUIDE.md (detailed guide)
├── CLEANUP_ORPHANED_PROJECTS.md (cleanup guide)
├── verification_queries.sql (SQL helpers)
└── 20251110000001_atomic_project_creation.sql (migration file)
```

### Related Files
- Edge Function: `supabase/functions/generate-projects/index.ts` (lines 681-770)
- Implementation Doc: `supabase/functions/generate-projects/ATOMIC_UPDATE.md`

### Getting Help
1. Check the detailed guides in this directory
2. Run diagnostic queries from `verification_queries.sql`
3. Review Supabase function logs
4. Check GitHub issue for P0-1

---

## ✅ Completion Checklist

After applying this migration, verify:

- [ ] Ran migration SQL in Supabase
- [ ] 3 functions created successfully
- [ ] Permissions granted to service_role
- [ ] Cleaned up 4 orphaned projects
- [ ] `find_orphaned_projects()` returns 0 rows
- [ ] Project/forms/metadata counts match
- [ ] Tested new project generation
- [ ] Verified no new orphans created

---

## 🎓 Migration Best Practices

For future migrations, follow this pattern:

1. **Create migration file** with timestamp prefix
2. **Document the change** with comments in SQL
3. **Write verification queries** to test success
4. **Create rollback plan** in case of issues
5. **Test in staging** before production (if available)
6. **Apply during low-traffic period** (this one is safe anytime)

---

**Need to apply this migration? Start with [QUICK_START.md](./QUICK_START.md)**
