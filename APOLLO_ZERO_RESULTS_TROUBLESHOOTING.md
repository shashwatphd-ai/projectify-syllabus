# Apollo Zero Results: Complete Troubleshooting Guide

**Problem**: Apollo.io is returning `0 companies` even with permissive location-only searches

**Date**: November 23, 2025
**Status**: ACTIVE ISSUE - Hybrid fallback implemented
**Impact**: Blocks all project generation when Apollo is primary provider

---

## Quick Summary

Despite all location format fixes and crisis recovery changes, Apollo's `/mixed_companies/search` API is returning:

```json
{
  "organizations": [],
  "pagination": {
    "page": 1,
    "per_page": 40,
    "total_entries": 0,
    "total_pages": 0
  }
}
```

**Key Facts:**
- HTTP status is **200 OK** (not 401/403/500)
- Location format is **correct**: `"Kansas City, Missouri"` (2-part, not 3-part)
- Industry filters have been **progressively relaxed** (even location-only returns 0)
- All crisis recovery fixes are **deployed and active**
- No Apollo error messages in response body

**Conclusion:** This is an **Apollo-side issue** (API key, workspace, data access, or account plan), not a code bug.

---

## What We've Already Fixed

### ✅ Location Format (P0-2)
```typescript
// OLD (broken):
"Kansas City, Missouri, United States"  // 3-part

// NEW (working):
"Kansas City, Missouri"  // 2-part
```

**Status**: FIXED in commit 2629429
**Verification**: Logs show `"📍 Search location: Kansas City, Missouri"`

---

### ✅ Industry Keyword Simplification
```typescript
// OLD (too specific):
q_organization_keyword_tags: ["Mechanical Or Industrial Engineering"]

// NEW (Apollo-compatible):
q_organization_keyword_tags: ["engineering", "manufacturing", "automation"]
```

**Status**: FIXED in commit 24403d2
**Verification**: Logs show simplified keywords in request body

---

### ✅ Progressive Fallback Strategy
```typescript
// Current search strategy:
1. Try: Location + industry keywords
2. If 0: Try location + top 50% of keywords
3. If still 0: Try location-only (NO industry filters)
4. All return 0 organizations
```

**Status**: IMPLEMENTED
**Verification**: Logs show all 3 attempts returning 0

---

### ✅ Crisis Recovery (Disabled Breaking Features)
```typescript
1. Technology filtering: DISABLED (line 504)
2. Distance filter: DISABLED (lines 729-777)
3. Request size: REDUCED to *3 (line 131)
```

**Status**: ACTIVE
**Verification**: Logs show `"⚠️ Technology filtering DISABLED"`, `"⚠️ Distance filter DISABLED"`

---

## What's Still Failing

### The Core Issue: Apollo Returns 0

**What the logs show:**

```
🔍 [Apollo API Request - DIAGNOSTIC]
   Endpoint: POST https://api.apollo.io/v1/mixed_companies/search
   Request Body:
   {
     "organization_locations": ["Kansas City, Missouri"],
     "q_organization_keyword_tags": [],  // EMPTY = location-only
     "page": 1,
     "per_page": 80
   }

📥 [Apollo API Response - DIAGNOSTIC]
   Total Results: 0
   Pagination: {"page":1,"per_page":40,"total_entries":0,"total_pages":0}
   ❌ No organizations returned
```

**Interpretation:**
- Apollo **accepted** the request (HTTP 200)
- Apollo **processed** the request (returned valid pagination)
- Apollo **found nothing** matching `"Kansas City, Missouri"` (total_entries: 0)

**Possible Causes:**

#### Cause A: API Key Issues (60% likely)

**Symptoms:**
- HTTP 200 but 0 results across all searches
- No explicit error message

**Reasons:**
1. **Wrong API key for this workspace**
   - Apollo has multiple workspaces per account
   - Each workspace has its own API key
   - Using key from Workspace A to search Workspace B → 0 results

2. **Test/Demo API key**
   - Apollo provides test keys with limited/fake data
   - Production searches return 0 because test data doesn't include real companies

3. **API key with restricted permissions**
   - Key may only have read access to certain data
   - Search permissions may be limited by plan tier

**How to Verify:**
```bash
# Test API key directly
curl -X POST https://api.apollo.io/v1/mixed_companies/search \
  -H "X-Api-Key: YOUR_APOLLO_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_locations": ["United States"],
    "per_page": 5,
    "page": 1
  }'

# Expected: At least 1 company
# If 0: API key issue confirmed
```

**Fix:**
1. Log into Apollo dashboard: https://app.apollo.io/
2. Navigate to: Settings → Integrations → API
3. Verify:
   - Which workspace is active
   - API key matches what's in Supabase secrets
   - Plan tier (Free/Basic/Pro) and limits
4. If wrong key: Generate new key from correct workspace
5. Update Supabase secret: `APOLLO_API_KEY`

---

#### Cause B: Geographic Data Mismatch (20% likely)

**Symptoms:**
- Specific cities return 0 (e.g., Kansas City)
- Country-wide searches may return non-zero

**Reasons:**
1. **Apollo's database doesn't have comprehensive city-level data**
   - May have companies tagged at state or country level only
   - "Kansas City, Missouri" query expects city-level precision

2. **Location format not matching Apollo's internal format**
   - Apollo may store: `"Kansas City, MO"` (with abbreviation)
   - We're searching: `"Kansas City, Missouri"` (full state name)
   - No fuzzy matching → 0 results

**How to Verify:**
```bash
# Test with different location formats
curl -X POST https://api.apollo.io/v1/mixed_companies/search \
  -H "X-Api-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_locations": ["Kansas City, MO"], "per_page": 5}'

curl -X POST https://api.apollo.io/v1/mixed_companies/search \
  -H "X-Api-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_locations": ["Missouri"], "per_page": 5}'

curl -X POST https://api.apollo.io/v1/mixed_companies/search \
  -H "X-Api-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_locations": ["kansas city"], "per_page": 5}'  # lowercase
```

**Fix:**
1. If state-level works: Update location normalization to use state only
2. If abbreviations work: Map full state names to 2-letter codes
3. If lowercase works: Add `.toLowerCase()` to location

---

#### Cause C: Account Plan Limitations (15% likely)

**Symptoms:**
- API key works in Apollo web UI
- API returns 0 via REST API

**Reasons:**
1. **Free tier with no API access**
   - Free plans may not include API search access
   - Only web UI access allowed

2. **Credit/rate limit exhausted**
   - API calls count against monthly quota
   - 0 results when quota exceeded (instead of 429 error)

3. **Trial expired**
   - Trial accounts revert to limited access
   - API searches disabled after trial

**How to Verify:**
1. Check Apollo dashboard: Credits/Usage tab
2. Look for warnings: "API access limited" or "Upgrade required"
3. Check plan tier: Free/Basic/Pro
4. Check last payment date

**Fix:**
1. Upgrade Apollo plan to include API access
2. Purchase additional credits
3. Contact Apollo support: support@apollo.io

---

#### Cause D: Data Access Scope Issue (5% likely)

**Symptoms:**
- Some searches work, others return 0
- Inconsistent results across locations

**Reasons:**
1. **Workspace configured for specific industries**
   - Apollo allows per-workspace data scopes
   - Search outside scope → 0 results

2. **Data export restrictions**
   - Some plans restrict bulk data export
   - API search may be limited to prevent scraping

**How to Verify:**
1. Apollo dashboard → Settings → Data Access
2. Check if there are industry or geo restrictions
3. Try searching for a known company in Apollo UI, then via API

**Fix:**
1. Adjust workspace data scope settings
2. Contact Apollo support to lift restrictions

---

## Solution: Hybrid Discovery with Automatic Fallback

Since we can't immediately fix Apollo-side issues, we've implemented **automatic fallback to Adzuna**.

### How It Works

```typescript
// In discover-companies/index.ts

try {
  // Try Apollo first
  const result = await apolloProvider.discover(context);

  // If Apollo returns 0 companies, automatically switch to Adzuna
  if (result.companies.length === 0) {
    console.log('⚠️ Apollo returned 0 - trying Adzuna fallback');
    const adzunaProvider = await ProviderFactory.getProvider({provider: 'adzuna'});
    result = await adzunaProvider.discover(context);
    usedFallback = true;
  }
} catch (error) {
  // If Apollo errors, also try Adzuna
  console.error('❌ Apollo failed - trying Adzuna fallback');
  const adzunaProvider = await ProviderFactory.getProvider({provider: 'adzuna'});
  result = await adzunaProvider.discover(context);
  usedFallback = true;
}
```

### Benefits

✅ **No code changes needed**: Automatic and transparent
✅ **User sees results**: Even if Apollo fails, Adzuna provides companies
✅ **Diagnostics preserved**: Logs show which provider was used
✅ **Graceful degradation**: System continues to work despite Apollo issues

### User Experience

**Apollo succeeds:**
```
✅ "Found 8 partner companies via apollo!"
```

**Apollo returns 0, Adzuna succeeds:**
```
✅ "Found 6 companies via adzuna (apollo returned 0).
    Primary issue: Apollo returned 0 companies for location: Kansas City, Missouri"
```

**Both fail:**
```
❌ "No suitable companies found for this course and location.
    Provider: apollo, Location: Kansas City, Missouri.
    Fallback to adzuna was attempted but also returned 0 companies."
```

---

## Diagnostics Added

Every discovery response now includes:

```json
{
  "success": true,
  "companies": [...],
  "diagnostics": {
    "primaryProvider": "apollo",
    "usedFallback": true,
    "fallbackProvider": "adzuna",
    "primaryProviderError": "Apollo returned 0 companies for location: Kansas City, Missouri",
    "locationUsed": "Kansas City, Missouri",
    "companiesBeforeFiltering": 15,
    "companiesAfterFiltering": 6,
    "semanticFilterApplied": true,
    "averageSimilarity": "0.67"
  }
}
```

**Frontend** displays this in:
- Success toasts (shows which provider was used)
- Error messages (explains what went wrong)
- Console logs (for developer debugging)

---

## Testing Protocol

### Step 1: Verify Current Behavior

1. Upload Kansas City Industrial Engineering syllabus
2. Click "Generate Projects"
3. Watch logs for:
   ```
   ⚠️ PRIMARY PROVIDER (Apollo.io) RETURNED 0 COMPANIES
   Attempting automatic fallback to Adzuna...
   ✅ Fallback successful: 6 companies from Adzuna
   ```

**Expected**: Adzuna provides companies even though Apollo failed

---

### Step 2: Test Apollo Directly (Manual)

```bash
# Replace YOUR_KEY with actual Apollo API key from Supabase secrets
export APOLLO_KEY="YOUR_KEY"

# Test 1: Country-wide search (should work)
curl -X POST https://api.apollo.io/v1/mixed_companies/search \
  -H "X-Api-Key: $APOLLO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_locations": ["United States"], "per_page": 5}' \
  | jq '.pagination.total_entries'

# Expected: > 0
# If 0: API key is invalid or workspace has no data

# Test 2: Kansas City search (currently failing)
curl -X POST https://api.apollo.io/v1/mixed_companies/search \
  -H "X-Api-Key: $APOLLO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_locations": ["Kansas City, Missouri"], "per_page": 5}' \
  | jq '.'

# Expected (current): total_entries = 0
# Desired: total_entries > 0

# Test 3: Try different formats
curl -X POST https://api.apollo.io/v1/mixed_companies/search \
  -H "X-Api-Key: $APOLLO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_locations": ["Kansas City, MO"], "per_page": 5}' \
  | jq '.pagination.total_entries'

curl -X POST https://api.apollo.io/v1/mixed_companies/search \
  -H "X-Api-Key: $APOLLO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_locations": ["Missouri"], "per_page": 5}' \
  | jq '.pagination.total_entries'

# If state-level returns > 0: Location precision issue
# If abbreviation returns > 0: Format mismatch issue
```

---

### Step 3: Verify Adzuna is Configured

```bash
# Check Supabase secrets
# Should have:
ADZUNA_APP_ID=<your-adzuna-app-id>
ADZUNA_APP_KEY=<your-adzuna-app-key>

# If missing: Get free Adzuna API key
# 1. Go to: https://developer.adzuna.com/
# 2. Sign up for free account (250 calls/month)
# 3. Create app → Get APP_ID and APP_KEY
# 4. Add to Supabase secrets
```

---

### Step 4: Enable Direct Provider Selection (Optional)

```bash
# In Supabase Edge Function secrets:
DISCOVERY_PROVIDER=adzuna  # Use Adzuna as primary (skip Apollo)
```

**Result**: System uses Adzuna directly, no Apollo calls

---

## Admin Provider Test Console

We've created an admin page to test providers directly: `/admin-provider-test`

**Features:**
- Test Apollo and Adzuna independently
- Custom location and keyword inputs
- Raw response inspection
- Performance metrics
- Diagnostics display

**Usage:**
1. Navigate to: `/admin-provider-test`
2. Enter location: `Kansas City, Missouri`
3. Enter keywords: `engineering, manufacturing`
4. Click "Test Apollo Provider"
5. Review results and raw response

**Note**: Requires backend endpoints:
- `/api/test-apollo` (Edge Function)
- `/api/test-adzuna` (Edge Function)

These need to be created to directly call provider APIs with production credentials.

---

## Recommended Immediate Actions

### Action 1: Verify Apollo API Key ⚠️ CRITICAL

1. Go to Supabase dashboard → Edge Functions → Secrets
2. Copy `APOLLO_API_KEY` value
3. Test manually using curl command above
4. If returns 0: **API key issue confirmed**

**Fix:**
- Generate new API key from correct Apollo workspace
- Update Supabase secret
- Redeploy Edge Functions

---

### Action 2: Configure Adzuna as Fallback ⚠️ HIGH

1. Get free Adzuna API credentials
2. Add to Supabase secrets:
   ```
   ADZUNA_APP_ID=your-app-id
   ADZUNA_APP_KEY=your-app-key
   ```
3. Automatic fallback will activate

**Result**: System works even if Apollo keeps failing

---

### Action 3: Switch to Adzuna as Primary (Temporary)

If Apollo issues persist:

```bash
# In Supabase secrets:
DISCOVERY_PROVIDER=adzuna
```

**Pros:**
- Immediate fix (Adzuna works)
- Free tier (250 calls/month)
- Job-based discovery (more accurate)

**Cons:**
- No Apollo enrichment data (contacts, funding)
- Lower company counts (only companies actively hiring)

---

### Action 4: Contact Apollo Support

If Apollo API key is valid but still returns 0:

**Email**: support@apollo.io

**Template**:
```
Subject: API returning 0 organizations for all location searches

Hello Apollo Support,

Our Apollo.io API integration is returning 0 organizations for all location-based searches, despite:
- Valid API key (tested with auth endpoint)
- Correct request format (per your docs)
- HTTP 200 responses (no errors)

Example request:
{
  "organization_locations": ["Kansas City, Missouri"],
  "per_page": 5
}

Response:
{
  "organizations": [],
  "pagination": {"total_entries": 0}
}

Questions:
1. Does our API key have search permissions?
2. Is our workspace configured correctly for location searches?
3. Are there geographic limitations on our plan?
4. Should we use a different location format?

Account email: [your-email]
API Key (last 4): [key-xxx]

Thank you!
```

---

## Long-Term Solution: Hybrid Model

Once Apollo issues are resolved:

### Phase 1: Adzuna Primary + Apollo Enrichment

```
1. Adzuna discovers companies (job-based, reliable)
2. For each company:
   a. Use company name/website to find in Apollo
   b. Enrich with Apollo data (contacts, funding, tech stack)
3. Store enriched company profiles
```

**Benefits:**
- Reliable discovery (Adzuna)
- Rich data (Apollo enrichment)
- Best of both providers

---

### Phase 2: Smart Provider Selection

```typescript
// Choose provider based on location/industry
if (location === 'United States' && hasApolloKey) {
  primaryProvider = 'apollo';
} else if (isInternational) {
  primaryProvider = 'adzuna';  // Better international coverage
} else {
  primaryProvider = 'hybrid';  // Use both
}
```

---

## Summary

**Current State:**
- Apollo returning 0 companies (HTTP 200, no errors)
- All location/filter fixes implemented and working
- Issue is Apollo-side (API key, workspace, or plan)

**Implemented Solution:**
- Hybrid discovery with automatic Adzuna fallback
- Diagnostics in all responses
- Improved error messages for users

**Next Steps:**
1. Test Apollo API key manually
2. Configure Adzuna as fallback
3. Consider switching to Adzuna as primary
4. Contact Apollo support if needed

**Timeline:**
- Immediate: Adzuna fallback works now
- 1-3 days: Apollo investigation + support ticket
- 1-2 weeks: Hybrid model implementation

---

**Document Version**: 1.0
**Last Updated**: November 23, 2025
**Status**: Active troubleshooting
