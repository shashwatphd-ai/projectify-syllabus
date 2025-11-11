# 🛡️ Zero-Downtime Deployment Strategy

## Overview

This document defines the deployment strategy to ensure the application remains live and functional during all updates, with backward compatibility for all users.

---

## 🎯 **Core Principles**

1. **Always Backward Compatible** - New code works with old database, old code works with new database
2. **Additive First** - Add new features before removing old ones
3. **Database Changes Before Code** - Migrations applied before code deployment
4. **Graceful Degradation** - If new features fail, fall back to old behavior
5. **Feature Flags** - Toggle new features without deployment

---

## 📋 **Safe Deployment Checklist**

### ✅ **Before Every Deployment**

- [ ] Database migration is additive (adds columns/functions, doesn't remove)
- [ ] New code can work with old database schema
- [ ] Old code can work with new database schema
- [ ] Rollback plan documented
- [ ] Testing completed in staging/development

### ✅ **Deployment Order**

1. **Database First:** Apply migrations
2. **Code Second:** Deploy application code
3. **Cleanup Last:** Remove deprecated code (after monitoring period)

---

## 🔄 **Migration Patterns**

### **Pattern 1: Adding a New Database Function**

**✅ SAFE ORDER:**
```
Step 1: Apply migration (add function to database)
Step 2: Deploy code that uses the function
Step 3: Monitor for errors
```

**❌ UNSAFE ORDER (Current P0-1 Issue):**
```
Step 1: Deploy code that calls new function  ← BREAKS!
Step 2: Apply migration (function doesn't exist yet)
```

**Example - P0-1 Fix:**
```sql
-- Migration creates create_project_atomic()
CREATE OR REPLACE FUNCTION create_project_atomic(...) ...;
```

**Then deploy code:**
```typescript
// Edge function calls it
await supabase.rpc('create_project_atomic', {...});
```

---

### **Pattern 2: Adding a New Table Column**

**✅ SAFE 3-STEP PROCESS:**

**Phase 1: Add Column (Optional)**
```sql
-- Migration adds new column with default value
ALTER TABLE projects ADD COLUMN new_field TEXT DEFAULT 'default_value';
```
- Old code: Ignores new column ✅
- New code: Can use new column ✅

**Phase 2: Deploy Code Using New Column**
```typescript
// New code writes to new column
await supabase.from('projects').insert({
  title: 'test',
  new_field: 'value'  // New column
});
```
- All users can access old and new data ✅

**Phase 3: Cleanup (Optional, after monitoring period)**
```sql
-- Only if you need to remove old column
ALTER TABLE projects DROP COLUMN old_field;
```

---

### **Pattern 3: Changing Data Format**

**Example:** Changing location from string to JSONB

**❌ UNSAFE (Breaking Change):**
```sql
-- This breaks old code!
ALTER TABLE company_profiles ALTER COLUMN location TYPE JSONB USING location::JSONB;
```

**✅ SAFE 4-STEP PROCESS:**

**Phase 1: Add New Column**
```sql
ALTER TABLE company_profiles ADD COLUMN location_structured JSONB;
```

**Phase 2: Backfill Data**
```sql
UPDATE company_profiles
SET location_structured = jsonb_build_object('city', location)
WHERE location_structured IS NULL;
```

**Phase 3: Deploy Code Using Both Fields**
```typescript
// Write to both (dual-write pattern)
const location = 'San Francisco';
await supabase.from('company_profiles').insert({
  location: location,  // Old format (for backward compat)
  location_structured: { city: location }  // New format
});

// Read from new field, fallback to old
const loc = profile.location_structured?.city || profile.location;
```

**Phase 4: Monitor for 1-2 Weeks**
- Verify no errors
- Ensure all old code has migrated

**Phase 5: Remove Old Column (Optional)**
```sql
ALTER TABLE company_profiles DROP COLUMN location;
ALTER TABLE company_profiles RENAME COLUMN location_structured TO location;
```

---

### **Pattern 4: Replacing a Function (Like P0-1)**

**✅ SAFE APPROACH:**

**Phase 1: Add New Function (Keep Old Working)**
```sql
-- Add new atomic function
CREATE FUNCTION create_project_atomic(...) ...;

-- Old insert pattern still works
-- (Edge function could use either)
```

**Phase 2: Deploy Code with Feature Flag**
```typescript
const USE_ATOMIC_CREATION = Deno.env.get('USE_ATOMIC_CREATION') === 'true';

if (USE_ATOMIC_CREATION) {
  // New atomic approach
  await supabase.rpc('create_project_atomic', {...});
} else {
  // Old 3-insert approach (fallback)
  await supabase.from('projects').insert({...});
  await supabase.from('project_forms').insert({...});
  await supabase.from('project_metadata').insert({...});
}
```

**Phase 3: Enable Feature Flag Gradually**
- Start: 10% of requests
- Monitor for errors
- Increase to 50%, then 100%

**Phase 4: Remove Old Code (After Success)**
```typescript
// Only atomic approach remains
await supabase.rpc('create_project_atomic', {...});
```

---

## 🚨 **Emergency Rollback Procedures**

### **If New Deployment Breaks:**

**Option 1: Rollback Code (Fast)**
```bash
# Revert to previous git commit
git revert HEAD
git push origin main

# Edge functions auto-deploy
# Old code restored in ~2 minutes
```

**Option 2: Rollback Database (Slower)**
```sql
-- Drop new function
DROP FUNCTION IF EXISTS create_project_atomic;

-- Restore old behavior
-- (Usually not needed if migration is additive)
```

**Option 3: Feature Flag Toggle (Instant)**
```bash
# In Supabase dashboard or CLI
supabase secrets set USE_ATOMIC_CREATION=false

# Instantly switches to old code path
# No deployment needed
```

---

## 📊 **Deployment Checklist by Change Type**

### **Adding a Function (P0-1 Type)**

- [ ] Write function in migration file
- [ ] Test function in development
- [ ] Apply migration to production database
- [ ] Verify function exists: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'function_name';`
- [ ] Deploy code that uses function
- [ ] Test end-to-end
- [ ] Monitor logs for errors

### **Adding a Column**

- [ ] Add column with DEFAULT value
- [ ] Verify old code doesn't break
- [ ] Deploy new code that uses column
- [ ] Backfill existing rows (if needed)
- [ ] Monitor for issues
- [ ] (Optional) Remove old column after monitoring period

### **Changing Data Format**

- [ ] Add new column (don't modify existing)
- [ ] Dual-write to both old and new columns
- [ ] Read from new column, fallback to old
- [ ] Monitor for 1-2 weeks
- [ ] Remove old column only after success

---

## 🎯 **P0-1 Specific: What We Should Have Done**

### **What Actually Happened (Problematic):**
```
Timeline:
1. Nov 10: Code deployed (calls create_project_atomic)
2. Nov 10: Migration NOT applied yet
3. Result: Project generation BROKEN until migration applied
```

### **What We Should Have Done:**
```
Timeline:
1. Nov 10: Apply migration FIRST (create function)
2. Nov 10: Verify function exists
3. Nov 10: THEN deploy code (calls function)
4. Result: Zero downtime, seamless transition
```

### **How to Fix Now:**
```
1. URGENT: Apply migration immediately
2. Test project generation works
3. Document this lesson learned
```

---

## 🛡️ **Best Practices for Future Deployments**

### **1. Use Feature Flags**

```typescript
// In edge function
const FEATURES = {
  atomicProjectCreation: Deno.env.get('FEATURE_ATOMIC_PROJECTS') === 'true',
  enhancedValidation: Deno.env.get('FEATURE_VALIDATION') === 'true',
};

if (FEATURES.atomicProjectCreation) {
  // New code path
} else {
  // Old code path (fallback)
}
```

### **2. Gradual Rollout**

```typescript
// Progressive deployment
const rolloutPercentage = 10; // Start with 10%
const userId = getUserId();
const bucket = hash(userId) % 100;

if (bucket < rolloutPercentage) {
  // New feature for 10% of users
} else {
  // Old behavior for 90% of users
}
```

### **3. Database Migrations Are Additive**

**✅ SAFE:**
- `CREATE FUNCTION`
- `ALTER TABLE ADD COLUMN`
- `CREATE INDEX`
- `INSERT INTO`

**⚠️ RISKY (Require Dual-Write Period):**
- `ALTER TABLE ALTER COLUMN` (changing type)
- `ALTER TABLE DROP COLUMN` (removing field)
- `DROP FUNCTION` (removing function)
- `RENAME COLUMN` (changing name)

### **4. Always Test Backward Compatibility**

**Test Matrix:**
| Old Code | New Database | Result |
|----------|--------------|--------|
| ✅ | ✅ | Should work |
| New Code | Old Database | Should work |

**Example Test:**
```bash
# Deploy new database
supabase db push

# Run OLD version of edge function
# Verify it still works

# Then deploy new code
git push origin main
```

---

## 🔍 **Monitoring After Deployment**

### **Metrics to Watch:**

1. **Error Rate**
   ```sql
   -- Check for errors in last hour
   SELECT COUNT(*) FROM logs
   WHERE level = 'error'
   AND timestamp > NOW() - INTERVAL '1 hour';
   ```

2. **Function Success Rate**
   ```sql
   -- Monitor atomic function calls
   SELECT
     COUNT(*) as total_calls,
     SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful,
     SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed
   FROM project_creation_logs
   WHERE timestamp > NOW() - INTERVAL '1 hour';
   ```

3. **Data Integrity**
   ```sql
   -- Ensure no orphaned projects created
   SELECT * FROM find_orphaned_projects();
   -- Should always return 0 rows after P0-1 fix
   ```

### **Alert Thresholds:**

- Error rate > 5% → Investigate immediately
- New orphaned projects detected → Rollback deployment
- Function call failures > 10% → Enable fallback

---

## 📚 **Communication Template**

### **Before Deployment:**
```
Subject: Database Migration - [Feature Name]
Timeline: [Date & Time]
Expected Downtime: None (zero-downtime deployment)
Impact: No user impact expected
Rollback Plan: [Brief description]
```

### **After Deployment:**
```
Subject: ✅ Deployment Complete - [Feature Name]
Status: Successful
Issues: None
Monitoring: Enabled for 24 hours
Next Steps: [If any]
```

---

## ✅ **Deployment Approval Checklist**

Before ANY production deployment:

- [ ] Migration is additive (adds, doesn't remove)
- [ ] Old code tested with new database
- [ ] New code tested with old database
- [ ] Feature flags implemented (if risky change)
- [ ] Rollback plan documented
- [ ] Monitoring queries prepared
- [ ] Team notified of deployment
- [ ] Tested in staging environment
- [ ] Database migration applied BEFORE code deployment
- [ ] Verification queries ready

---

## 🎓 **Lessons Learned from P0-1**

### **What Went Wrong:**
1. Code deployed before database migration
2. No feature flag to toggle between old/new behavior
3. No staging environment test

### **What We'll Do Differently:**
1. **ALWAYS** apply database migrations before code deployment
2. Use feature flags for major changes
3. Test backward compatibility explicitly
4. Document deployment order in PR description

---

## 📞 **Emergency Contacts & Procedures**

### **If Production Breaks:**

1. **Check Supabase Logs**
   - Dashboard → Logs → Filter by "error"
   - Look for function errors

2. **Quick Rollback Options:**
   - Feature flag toggle (instant)
   - Code rollback via git revert (2 minutes)
   - Database rollback (10 minutes, last resort)

3. **Communication:**
   - Notify team immediately
   - Post status update
   - Document incident for retrospective

---

## 🚀 **Next Steps for Projectify-Syllabus**

### **Immediate (P0-1 Fix):**
1. Apply migration NOW to restore functionality
2. Verify project generation works
3. Clean up orphaned projects

### **Short-term (This Week):**
1. Implement feature flag system
2. Create staging environment
3. Document all current migrations

### **Long-term (This Month):**
1. Automate migration testing
2. Set up monitoring dashboards
3. Create deployment runbooks

---

**Remember:** The goal is to keep the application live and working for ALL users during ALL updates. When in doubt, choose the safer, slower rollout over the risky quick deploy.
