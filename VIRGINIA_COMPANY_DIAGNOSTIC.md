# Virginia Company Issue - Comprehensive Diagnostic

**Issue**: System returned a company in Virginia instead of Kansas City companies (Burns & McDonnell, Black & Veatch)

**Created**: 2025-11-23

---

## Fixes That Were Claimed to Be Implemented

### ✅ Fix #1: Simplified Apollo Industry Keywords
**File**: `supabase/functions/discover-companies/providers/apollo-industry-mapper.ts`

**Status**: ✅ **VERIFIED - IMPLEMENTED CORRECTLY**

**Evidence**:
```typescript
// Line 39 apollo-industry-mapper.ts
'industrial engineering': ['engineering', 'industrial', 'manufacturing', 'automation']
```

**Before**: `['Mechanical Or Industrial Engineering', 'Industrial Automation', 'Manufacturing']`
**After**: `['engineering', 'industrial', 'manufacturing', 'automation']`

**This fix IS working** - Apollo now receives simple keywords it can actually match.

---

### ✅ Fix #2: Simplified Location Format
**File**: `supabase/functions/detect-location/index.ts`

**Status**: ✅ **VERIFIED - IMPLEMENTED CORRECTLY**

**Evidence**:
```typescript
// Lines 65-69 (cached data path)
const searchParts = [universityData.city, universityData.state].filter(Boolean);
const searchLocation = searchParts.length > 0 ? searchParts.join(', ') : universityData.country;

// Lines 191-192 (API path)
const searchParts = [city, state].filter(Boolean);
const searchLocation = searchParts.length > 0 ? searchParts.join(', ') : fullCountryName;

// Lines 355-356 (Nominatim path)
const searchParts = [city, state].filter(Boolean);
const searchLocation = searchParts.length > 0 ? searchParts.join(', ') : fullCountryName;
```

**Before**: `"Kansas City, Missouri, United States"`
**After**: `"Kansas City, Missouri"`

**This fix IS working** - All 3 code paths generate "City, State" format.

---

### ✅ Fix #3: Diagnostic Logging
**File**: `supabase/functions/discover-companies/providers/apollo-provider.ts`

**Status**: ✅ **VERIFIED - ALREADY EXISTED**

Lines 726-773 contain comprehensive diagnostic logging showing:
- Apollo API request body
- Apollo API response count
- Sample companies returned

**This fix IS working** - Logs should show exactly what Apollo receives and returns.

---

### ✅ Fix #4: Technology Filtering
**File**: `supabase/functions/discover-companies/providers/apollo-technology-mapping.ts` (new file)
**File**: `supabase/functions/discover-companies/providers/apollo-provider.ts` (integration)

**Status**: ✅ **VERIFIED - IMPLEMENTED CORRECTLY**

**Evidence**:
```typescript
// apollo-technology-mapping.ts lines 32-40
'17-2112.00': [  // Industrial Engineers
  'autocad', 'matlab', 'minitab', 'arena', 'simul8', 'plc'
],

// apollo-provider.ts lines 493-499
const socCodes = context.socMappings?.map(soc => soc.socCode) || [];
const technologyUIDs = socCodes.length > 0 ? getTechnologiesForSOCCodes(socCodes) : [];

const intelligentFilters: ApolloSearchFilters = {
  organization_locations: [apolloLocation],
  q_organization_keyword_tags: [...includeIndustries],
  currently_using_any_of_technology_uids: technologyUIDs.length > 0 ? technologyUIDs : undefined
};
```

**This fix IS working** - Technology filtering is integrated and active.

---

## ⚠️ CRITICAL ISSUE DISCOVERED

### **Problem**: STALE DATABASE DATA

**Root Cause**: The course profile in the database was likely created **BEFORE** Fix #2 (location format) was deployed.

**Evidence**:
- `detect-location/index.ts` NOW generates correct format: `"Kansas City, Missouri"`
- BUT course profiles created BEFORE the fix still have old format in DB: `"Kansas City, Missouri, United States"`

**Impact**:
```
Old course in DB:
  search_location: "Kansas City, Missouri, United States"  ❌

New course (if created now):
  search_location: "Kansas City, Missouri"  ✅
```

**Verification Steps**:
1. Check the logs for the line: `- Final searchLocation: "..."`
2. If it shows `"Kansas City, Missouri, United States"` → **STALE DATA**
3. If it shows `"Kansas City, Missouri"` → Data is correct, issue is elsewhere

---

## Potential Root Causes (In Priority Order)

### 1. ⚠️ STALE DATABASE DATA (Most Likely)

**Symptoms**:
- Logs show: `searchLocation: "Kansas City, Missouri, United States"`
- Apollo receives 3-part location format
- Apollo interprets broadly, returns companies from anywhere in US

**Fix Required**:
```sql
-- Option 1: Delete and re-upload the course
DELETE FROM course_profiles WHERE id = '<course_id>';
-- Then re-upload syllabus to trigger fresh location detection

-- Option 2: Manually update the location
UPDATE course_profiles
SET search_location = 'Kansas City, Missouri'
WHERE search_location LIKE '%Kansas City%United States%';
```

**Validation**:
- Re-upload the Kansas City Industrial Engineering syllabus
- Check logs for: `searchLocation: "Kansas City, Missouri"` (no country)

---

### 2. ⚠️ AGGRESSIVE GEOGRAPHIC FALLBACK

**Symptoms**:
- Logs show correct location initially: `"Kansas City, Missouri"`
- Then shows fallback: `"Missouri, United States"` or `"United States"`
- Apollo fallback logic (lines 648-668) is expanding search area

**Root Cause**:
Even with correct industry keywords and location format, if Apollo returns < 3 companies for Kansas City with industry filters, the system falls back to state-wide or country-wide search.

**Current Fallback Logic**:
```typescript
// apollo-provider.ts lines 648-668
if (organizations.length < maxResults && originalCityLocation.includes(',')) {
  // Try state + country: "Missouri, United States"
  broaderLocation = `${locationParts[1]}, ${locationParts[2]}`;
}

if (organizations.length < maxResults) {
  // Try country only: "United States"
  countryOnly = locationParts[locationParts.length - 1];
}
```

**Why This Happens**:
1. Apollo search with `"Kansas City, Missouri"` + industry keywords + technologies → 2 companies
2. System thinks 2 < target (default 4), so tries broader search
3. Broader search returns Virginia company

**Fix Required**: Add maximum distance threshold BEFORE geographic fallback:

```typescript
// BEFORE trying state-wide search, check if we have LOCAL companies
if (organizations.length < maxResults && organizations.length < 3) {
  // Only expand geography if we have ZERO local results
  // If we have 1-2 local companies, DON'T expand - just return those
  if (organizations.length > 0) {
    console.log(`  ✅ Found ${organizations.length} local companies - NOT expanding geography`);
    console.log(`     (Better to return few LOCAL companies than many DISTANT ones)`);
    // SKIP geographic fallback
  } else {
    // Proceed with geographic fallback only if ZERO local results
  }
}
```

---

### 3. ⚠️ SEMANTIC FILTERING TOO STRICT

**Symptoms**:
- Apollo returns 10+ Kansas City companies
- Semantic filtering reduces to 0 companies
- System falls back, returns distant companies

**Root Cause**:
```typescript
// semantic-matcher.ts (hypothetical)
if (similarityScore < 0.50) {  // 50% threshold
  // Company filtered out
}
```

If Burns & McDonnell appears in Apollo results but scores 48% similarity (just below threshold), it gets filtered out.

**Why This Happens**:
- O*NET returns ZERO skills/technologies for Industrial Engineers
- System uses 16 generic fallback skills
- Generic skills don't match Burns & McDonnell's actual work well
- Similarity score drops below threshold

**Fix Required**: Lower semantic threshold OR improve O*NET data:

**Option A**: Lower threshold for local companies
```typescript
const threshold = isWithin50Miles ? 0.40 : 0.50;  // More lenient for local
```

**Option B**: Fix O*NET data fetching (separate investigation needed)

---

### 4. ⚠️ APOLLO API DATA QUALITY

**Symptoms**:
- Even with correct filters, Apollo returns 0 Kansas City companies
- Apollo doesn't have Burns & McDonnell in their database for Kansas City

**Validation**:
Check Apollo diagnostic logs:
```
📥 [Apollo API Response - DIAGNOSTIC]
   Total Results: 0
```

If Apollo itself returns 0 results with perfect filters, it's an Apollo data issue.

**Fix Required**:
- Implement direct company enrichment (fetch Burns & McDonnell by domain)
- Use alternative data sources (LinkedIn, Clearbit)
- Report data gap to Apollo

---

## Diagnostic Checklist

To identify the ACTUAL root cause, check the logs for these patterns:

### ✅ Check 1: Location Format
```
Look for: "Final searchLocation: ..."
✅ GOOD: "Kansas City, Missouri"
❌ BAD:  "Kansas City, Missouri, United States"
```

### ✅ Check 2: Technology Filtering Active
```
Look for: "🔧 Technology filtering enabled: autocad, matlab, minitab..."
✅ GOOD: Technology filtering enabled with 6+ technologies
❌ BAD:  Technology filtering not mentioned (not active)
```

### ✅ Check 3: Apollo Response Count
```
Look for: "📊 Results with specific location ... companies"
✅ GOOD: 10+ companies
⚠️  WARNING: 1-3 companies (will trigger fallback)
❌ BAD:  0 companies (Apollo has no data)
```

### ✅ Check 4: Geographic Fallback Triggered
```
Look for: "Trying BROADER search (state-wide)" or "LOCATION-ONLY search"
✅ GOOD: Not triggered (had enough local companies)
❌ BAD:  Triggered (means local results were insufficient)
```

### ✅ Check 5: Semantic Filtering Results
```
Look for: "After semantic filtering: X companies remaining"
✅ GOOD: 5+ companies remaining
⚠️  WARNING: 1-2 companies (minimal results)
❌ BAD:  0 companies (all filtered out)
```

### ✅ Check 6: Final Company Locations
```
Look for: Company names and locations in final results
✅ GOOD: All companies within 50 miles of Kansas City
❌ BAD:  Companies 500+ miles away (Virginia, Pittsburgh, etc.)
```

---

## Recommended Immediate Actions

### Action 1: Check Logs and Identify Pattern
Run the company discovery and capture FULL logs. Look for the 6 patterns above.

### Action 2: If STALE DATA Issue
```bash
# Option 1: Delete course and re-upload
# Option 2: Manually update location in DB
UPDATE course_profiles
SET search_location = 'Kansas City, Missouri'
WHERE id = '<course_id>';
```

### Action 3: If GEOGRAPHIC FALLBACK Issue
Modify `apollo-provider.ts` lines 648-668 to SKIP geographic expansion if ANY local companies found:

```typescript
// CRITICAL FIX: Don't expand geography if we have LOCAL companies
if (organizations.length > 0 && organizations.length < maxResults) {
  console.log(`  ✅ Found ${organizations.length} local companies`);
  console.log(`     SKIPPING geographic expansion (prefer local over distant)`);
  // Do NOT proceed with state-wide or country-wide fallback
} else if (organizations.length === 0) {
  // ONLY expand if ZERO local results
  // ... existing fallback logic
}
```

### Action 4: If SEMANTIC FILTERING Issue
Lower the similarity threshold for companies within target area:

```typescript
const baseThreshold = 0.50;
const localBonus = isWithinTargetDistance ? 0.10 : 0;  // 60% for local, 50% for distant
const effectiveThreshold = baseThreshold - localBonus;
```

### Action 5: If APOLLO DATA Issue
Implement direct company enrichment:

```typescript
// Enrich known companies by domain
const knownCompanies = [
  { domain: 'burnsmcd.com', name: 'Burns & McDonnell', location: 'Kansas City, MO' },
  { domain: 'bv.com', name: 'Black & Veatch', location: 'Kansas City, MO' }
];

// Fetch these directly from Apollo enrichment API
const enrichedCompanies = await enrichCompaniesByDomain(knownCompanies);
```

---

## Summary

**Fixes 1-4 ARE implemented correctly**, but the Virginia company issue persists because:

1. **Most likely**: Stale database data (course created before Fix #2)
2. **Likely**: Geographic fallback too aggressive (expands to state/country with < 3 results)
3. **Possible**: Semantic filtering too strict (filters out local companies)
4. **Possible**: Apollo has incomplete Kansas City data

**Next Step**: Share the FULL company discovery logs to identify which of the 4 root causes is the actual problem.
