# Crisis Recovery Testing Guide

## What Was Done

Based on the principle: **"Apollo was working before our 'fixes' - we may have broken it"**

### Changes Disabled (Temporarily)

1. **Technology Filtering** - `currently_using_any_of_technology_uids`
   - May not be supported by Apollo or needs different format
   - Was returning 0 companies

2. **Distance Filter** - 150-mile maximum distance enforcement
   - New addition that may have been too restrictive
   - Apollo + semantic filtering should handle this

3. **Request Size** - Reverted from 40 to 12 companies
   - Larger requests may have caused issues
   - Return to known working configuration

### Changes Kept (Known Good)

- ✅ Location format simplification (2-part format)
- ✅ Diagnostic logging
- ✅ Industry keyword simplification
- ✅ Geographic fallback improvements

---

## Testing Protocol

### Test 1: Verify Crisis Recovery Works

**Run company discovery for Kansas City Industrial Engineering**

**Expected Result if Our Changes Broke It:**
- ✅ Apollo returns 10-20+ companies
- ✅ Companies are from Kansas City area
- ✅ Discovery completes successfully
- ✅ Database shows companies stored

**If This Works:**
- **Conclusion**: Our recent changes DID break Apollo
- **Next Step**: Re-enable features ONE AT A TIME (see below)

**If This Still Fails:**
- **Conclusion**: Problem existed before our changes OR different issue
- **Next Step**: Check Apollo API key, verify endpoint, test with curl

---

### Test 2: Re-Enable Features One at a Time

**Only do this if Test 1 succeeds**

#### Test 2A: Re-enable Technology Filtering

**Change:**
```typescript
// Line 503 in apollo-provider.ts
currently_using_any_of_technology_uids: technologyUIDs.length > 0 ? technologyUIDs : undefined
```

**Test Discovery**

**If it works:**
- ✅ Technology filtering is fine, move to next test

**If it breaks (0 companies):**
- ❌ Technology filtering is the problem
- Options:
  1. Remove it permanently
  2. Research correct Apollo technology UID format
  3. Use different approach (industry keywords instead)

#### Test 2B: Re-enable Distance Filter

**Change:** Uncomment lines 733-772 in apollo-provider.ts

**Test Discovery**

**If it works:**
- ✅ Distance filter is fine, move to next test

**If it breaks:**
- ❌ Distance filter is the problem
- Options:
  1. Adjust the 150-mile limit higher
  2. Make it configurable
  3. Only apply after ensuring local companies exist

#### Test 2C: Increase Request Size

**Change:**
```typescript
// Line 131
const organizations = await this.searchOrganizations(filters, context.targetCount * 10, pageOffset);
```

**Test Discovery**

**If it works:**
- ✅ Larger request size is fine

**If it breaks:**
- ❌ Apollo may have rate limits or issues with large requests
- Keep at * 3 or try * 5 as middle ground

---

## Diagnostic Checklist

If crisis recovery STILL fails, check these:

### 1. Apollo API Key
```bash
# Get API key from database
# Test manually
curl -X POST https://api.apollo.io/v1/mixed_companies/search \
  -H "X-Api-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_locations": ["Kansas City, Missouri"], "per_page": 5}'
```

**Expected**: JSON with companies
**If 401/403**: API key invalid
**If 429**: Rate limit exceeded

### 2. Database Location Format
```sql
SELECT id, search_location FROM course_profiles
WHERE search_location LIKE '%Kansas City%';
```

**Expected**: `"Kansas City, Missouri"` (2-part)
**If 3-part**: Database migration didn't complete

### 3. Edge Function Logs
- Check for errors at line 434 (`provider.discover()`)
- Look for Apollo API error responses
- Verify request body being sent

### 4. Browser Network Tab
- Find `/discover-companies` request
- Check response body for error message
- Should show: `{ "error": "actual error message" }`

---

## Best Practices for Future Changes

### 1. Always Test Current State First
```
BEFORE changing anything:
1. Run discovery and verify current behavior
2. Document what currently works
3. Save current commit hash as "last known good"
4. Only then make changes
```

### 2. Change One Thing at a Time
```
❌ BAD: Change 7 things → Test → Everything breaks → No idea what broke
✅ GOOD: Change 1 thing → Test → Commit → Change next thing
```

### 3. Use Feature Flags
```typescript
// Instead of changing code:
const USE_TECHNOLOGY_FILTER = Deno.env.get('USE_TECH_FILTER') === 'true';

if (USE_TECHNOLOGY_FILTER) {
  // New experimental behavior
} else {
  // Known working behavior
}
```

### 4. Always Have Rollback Plan
```bash
# Before making changes:
git log --oneline -1  # Note this commit hash

# Make changes and test
# If broken:
git revert HEAD  # Immediately rollback
```

### 5. Document Dependencies
```
BEFORE changing a module:
1. What does this module do?
2. What calls it?
3. What does it call?
4. What features depend on it?
5. Test those features after changes
```

### 6. Incremental Deployment
```
1. Make change on feature branch
2. Test thoroughly
3. Merge to staging
4. Test in staging environment
5. Monitor for issues
6. Only then merge to production
```

---

## Success Criteria

### Minimum Viable Recovery (Must Achieve)
- ✅ Apollo returns companies (not 0)
- ✅ Discovery pipeline completes (reaches Phase 3)
- ✅ Companies stored in database
- ✅ No silent errors

### Optimal Recovery (Goal)
- ✅ 10-20+ companies for Kansas City Industrial Engineering
- ✅ Companies are local (Kansas City area)
- ✅ Semantic filtering works
- ✅ Projects generated successfully

### Stretch Goals (Nice to Have)
- Re-enable technology filtering (if possible)
- Re-enable distance filter (if needed)
- Increase request size (if beneficial)

---

## Communication Protocol

### After Test 1
**Report:**
- Did crisis recovery work? (Yes/No)
- How many companies returned?
- Any errors in logs?
- Database status?

### After Each Feature Re-enable
**Report:**
- Which feature was re-enabled?
- Did it work or break?
- Number of companies before/after
- Decision: Keep, remove, or modify?

### If Still Failing
**Report:**
- All diagnostic checklist results
- Apollo API key test results
- Database verification results
- Exact error messages from logs

---

## Rollback Commands

If anything goes wrong:

```bash
# Rollback this crisis recovery commit
git revert b476171

# Or go back to specific commit
git checkout <commit-hash>

# Or reset to origin/main
git reset --hard origin/main
```

---

## Summary

**Current State:** Crisis recovery mode - disabled potentially breaking changes

**Test Plan:**
1. Test if Apollo works now
2. If yes: Re-enable features one by one
3. If no: Check API key and diagnostics

**Success:** Apollo returns companies and pipeline completes

**Next:** Document what broke and implement properly with feature flags
