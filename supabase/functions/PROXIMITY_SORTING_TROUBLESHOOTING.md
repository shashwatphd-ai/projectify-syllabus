# Proximity Sorting Troubleshooting Guide

## Overview

The proximity sorting system calculates distances between a search location and discovered companies, then sorts companies by distance (nearest first). This guide helps diagnose and fix issues when proximity sorting isn't working as expected.

---

## Quick Diagnostic Checklist

When proximity sorting isn't working, check these in order:

### ✅ 1. Is `searchLocation` populated?

**Where to Check:** `discover-companies` edge function logs

**Look for:**
```
🎓 COURSE DISCOVERY INITIALIZATION
   📍 Location Tracing:
      - location (request param): "Kansas City, Missouri"
      - course.search_location (DB): "(not set)"
      - Final searchLocation: "Kansas City, Missouri"
```

**Problem Indicators:**
- ❌ `Final searchLocation: ""` (empty)
- ❌ `location (request param): ""` AND `course.search_location (DB): "(not set)"`

**Solution:** Populate one of these sources:
- **Option A:** Pass `location` in the request body when calling `discover-companies`
- **Option B:** Populate `course.search_location` field during syllabus parsing

---

### ✅ 2. Is proximity sorting enabled?

**Where to Check:** `discover-companies` edge function logs

**Look for:**
```
🔍 ENRICHMENT STAGE
   📍 Proximity sorting: ENABLED
   📍 Search location: "Kansas City, Missouri"
```

**Problem Indicators:**
- ❌ `Proximity sorting: DISABLED (no search location)`

**Root Cause:** `searchLocation` is empty (see #1 above)

---

### ✅ 3. Are distances being calculated?

**Where to Check:** `discover-companies` edge function logs

**Look for:**
```
   📍 Acme Manufacturing (Kansas City, MO): 2.5 miles
   📍 Regional Tech (Overland Park, KS): 12.3 miles
   📍 Metro Services (Independence, MO): 18.7 miles
```

**Problem Indicators:**
- ❌ No `📍` logs with distances
- ❌ `⚠️ Could not calculate distance` for all companies

**Possible Causes:**
- Location format not recognized (see #4 below)
- `searchLocation` empty (see #1 above)

---

### ✅ 4. Are locations recognized in the database?

**Where to Check:** `discover-companies` edge function logs

**Look for:**
```
   ⚠️  Unknown Corp: Could not calculate distance
      Search: "Kansas City, Missouri" → Company: "Obscure Town, XX"
```

**Understanding the Issue:**
- The system has a database of **290+ known locations** (cities, states, countries)
- If a location string doesn't match any known entry, distance calculation fails
- Partial matching is attempted (e.g., "Kansas City, Missouri, United States" → "kansas city, missouri")

**Solution:** Check `KNOWN_LOCATIONS` in `geo-distance.ts`

**Coverage:**
- ✅ 100+ US cities (including university towns)
- ✅ 60+ international cities (Canada, UK, Australia, India, Asia, Europe)
- ✅ All 50 US states + territories
- ✅ Country-level fallbacks

**Common Formats Supported:**
- `"Kansas City, Missouri"` ✅
- `"Kansas City, MO"` ✅
- `"kansas city, missouri"` ✅ (case-insensitive)
- `"Kansas City, Missouri, United States"` ✅ (partial match)
- `"Missouri"` ✅ (state-level fallback)

**Not Supported:**
- `"KC, MO"` ❌ (abbreviations not in database)
- `"Small Town, XX"` ❌ (not in known locations)

---

### ✅ 5. Is sorting actually happening?

**Where to Check:** `discover-companies` edge function logs

**Look for:**
```
🗺️ PROXIMITY SORTING
   4 companies with calculated distance

   📍 TOP 4 CLOSEST:
      1. Acme Manufacturing (Kansas City, MO) - 2.5 miles
      2. Regional Tech (Overland Park, KS) - 12.3 miles
      3. Metro Services (Independence, MO) - 18.7 miles
      4. Midwest Industries (Columbus, OH) - 587.3 miles

   📊 STATISTICS:
      Closest: 2.5 miles
      Farthest: 587.3 miles
      Average: 155.2 miles
```

**Problem Indicators:**
- ❌ `PROXIMITY SORTING SKIPPED: No calculable distances`
- ❌ `PROXIMITY SORTING SKIPPED: No search location provided`

**Understanding:**
- If NO companies have calculable distances → sorting is skipped
- If SOME companies have distances → they're sorted first, others go to end

---

## Common Problems & Solutions

### Problem 1: `searchLocation` is Always Empty

**Symptoms:**
```
   Final searchLocation: ""
   ⚠️ WARNING: searchLocation is EMPTY
   ⚠️ Proximity sorting: DISABLED (no search location)
```

**Root Causes:**

#### A. No location passed in request
**Check:** Request body when calling `discover-companies`
```json
{
  "courseId": "123",
  "count": 4,
  "location": ""  // ❌ Empty!
}
```

**Solution:**
```json
{
  "courseId": "123",
  "count": 4,
  "location": "Kansas City, Missouri"  // ✅ Populated
}
```

#### B. `course.search_location` field not set in database
**Check:** Database `courses` table
```sql
SELECT id, title, search_location FROM courses WHERE id = '123';
-- search_location is NULL ❌
```

**Solution:** Populate during syllabus parsing
```typescript
// In syllabus parsing logic:
const searchLocation = extractLocationFrom Syllabus(syllabus);
await supabase
  .from('courses')
  .update({ search_location: searchLocation })
  .eq('id', courseId);
```

---

### Problem 2: Distances Calculated But Companies Not Sorted

**Symptoms:**
```
   📍 Company A (Columbus, OH): 587.3 miles
   📍 Company B (Kansas City, MO): 2.5 miles

   // But final results show Company A first!
```

**Root Cause:** Frontend not respecting `distanceFromSearchMiles` field

**Solution:** Ensure UI sorts by distance:
```typescript
const sortedCompanies = companies.sort((a, b) => {
  const distA = a.distanceFromSearchMiles ?? 999999;
  const distB = b.distanceFromSearchMiles ?? 999999;
  return distA - distB;
});
```

---

### Problem 3: All Companies Show "Unknown Distance"

**Symptoms:**
```
   ⚠️  Acme Corp: Could not calculate distance
      Search: "Kansas City, Missouri" → Company: "Springfield, XX"
   ⚠️  Beta Inc: Could not calculate distance
      Search: "Kansas City, Missouri" → Company: "Riverside, YY"
```

**Root Cause:** Company locations not in `KNOWN_LOCATIONS` database

**Solution Options:**

#### Option A: Add locations to `KNOWN_LOCATIONS`
Edit `geo-distance.ts`:
```typescript
const KNOWN_LOCATIONS: Record<string, GeoCoordinates> = {
  // ... existing entries
  'springfield, xx': { latitude: XX.XXXX, longitude: -YY.YYYY },
  'riverside, yy': { latitude: XX.XXXX, longitude: -YY.YYYY },
};
```

#### Option B: Use state-level fallback
Companies in "Springfield, Missouri" will fall back to "Missouri" state center if "springfield, missouri" isn't in the database.

**Current Coverage:**
- Run `getKnownLocationsStats()` to see coverage
- Expected: 290+ locations (100+ US cities, 60+ international, 50+ states)

---

### Problem 4: Distances Calculated But Stats Show Odd Numbers

**Symptoms:**
```
🗺️ PROXIMITY SORTING
   4 companies with calculated distance
   2 companies without distance (will sort to end)
```

**Explanation:** This is **normal behavior** when some companies can't be located:
- Companies **with** distances are sorted nearest-first
- Companies **without** distances sort to the end (treated as 999,999 miles away)

**Not a Bug:** System degrades gracefully instead of failing completely

---

## Debugging Tools

### 1. Location Diagnostics Function

Use `getLocationDiagnostics()` to debug location parsing:

```typescript
import { getLocationDiagnostics } from './_shared/geo-distance.ts';

const diagnostics = getLocationDiagnostics("Some City, Some State");
console.log(diagnostics);
```

**Output:**
```json
{
  "normalized": "some city, some state",
  "parts": ["some city", "some state"],
  "exactMatch": false,
  "partialMatches": [],
  "cityStateMatch": null,
  "stateMatch": "some state",
  "suggestions": ["city a, some state", "city b, some state"],
  "totalKnownLocations": 290
}
```

**Interpretation:**
- `exactMatch: true` → Location found directly
- `partialMatches: [...]` → Location can be fuzzy-matched
- `cityStateMatch: "..."` → City+State pattern works
- `stateMatch: "..."` → State-level fallback available
- `suggestions: [...]` → Similar locations in database

---

### 2. Known Locations Statistics

Use `getKnownLocationsStats()` to check database coverage:

```typescript
import { getKnownLocationsStats } from './_shared/geo-distance.ts';

const stats = getKnownLocationsStats();
console.log(stats);
```

**Output:**
```json
{
  "total": 290,
  "usCities": 142,
  "internationalCities": 58,
  "states": 58,
  "countries": 10
}
```

---

## Expected Log Flow (When Everything Works)

When proximity sorting is working correctly, you should see:

```
🎓 COURSE DISCOVERY INITIALIZATION
   Course: ME 111 Fluid Mechanics
   📍 Location Tracing:
      - location (request param): "Kansas City, Missouri"
      - course.search_location (DB): "(not set)"
      - Final searchLocation: "Kansas City, Missouri"
   Target: 4 companies

... [Discovery happens] ...

🔍 ENRICHMENT STAGE
   Organizations to enrich: 12
   Target count: 4
   🎓 Course Domain: ENGINEERING_TECHNICAL
   📍 Proximity sorting: ENABLED
   📍 Search location: "Kansas City, Missouri"

   📍 Acme Manufacturing (Kansas City, MO): 2.5 miles
   ✅ Enriched Acme Manufacturing (1/4)

   📍 Regional Tech (Overland Park, KS): 12.3 miles
   ✅ Enriched Regional Tech (2/4)

   📍 Metro Services (Independence, MO): 18.7 miles
   ✅ Enriched Metro Services (3/4)

   📍 Midwest Industries (Columbus, OH): 587.3 miles
   ✅ Enriched Midwest Industries (4/4)

🗺️ PROXIMITY SORTING
   4 companies with calculated distance

   📍 TOP 4 CLOSEST:
      1. Acme Manufacturing (Kansas City, MO) - 2.5 miles
      2. Regional Tech (Overland Park, KS) - 12.3 miles
      3. Metro Services (Independence, MO) - 18.7 miles
      4. Midwest Industries (Columbus, OH) - 587.3 miles

   📊 STATISTICS:
      Closest: 2.5 miles
      Farthest: 587.3 miles
      Average: 155.2 miles
```

---

## FAQ

### Q: Why are companies from far away still being returned?

**A:** The current implementation uses **"nearest first" sorting**, not a hard radius filter. This ensures:
- ✅ Companies are always returned (even for small cities)
- ✅ Local companies are prioritized (appear first)
- ✅ Regional companies serve as fallback
- ✅ No "0 results" errors due to strict radius limits

If you need a hard radius filter (e.g., "only within 100 miles"), you can add:
```typescript
const nearbyCompanies = enriched.filter(c =>
  (c.distanceFromSearchMiles ?? 999999) <= 100
);
```

### Q: Can I see distance in the UI?

**A:** Yes! The `distanceFromSearchMiles` field is included in `DiscoveredCompany`. Display it:
```typescript
{companies.map(company => (
  <div>
    {company.name} - {formatDistance(company.distanceFromSearchMiles)}
  </div>
))}
```

### Q: What if my city isn't in the database?

**A:** Two options:

1. **Add it to `KNOWN_LOCATIONS`** in `geo-distance.ts`:
   ```typescript
   'your city, your state': { latitude: XX.XXXX, longitude: -YY.YYYY },
   ```

2. **Use state-level fallback** (automatic):
   - "Unknown City, Missouri" → falls back to "Missouri" state center
   - Less accurate but still provides ordering

### Q: How accurate are the distances?

**A:** Distances use the Haversine formula which calculates great-circle distance:
- ✅ Accurate for city-to-city distances
- ✅ Accounts for Earth's curvature
- ❌ Does NOT account for driving routes
- ❌ Measures straight-line distance, not road distance

For most use cases (finding nearby companies), this is sufficient.

### Q: Why are some companies missing distances?

**A:** Company location couldn't be parsed. Check:
1. Company's `city` and `state` fields in the database
2. Whether that city/state combo exists in `KNOWN_LOCATIONS`
3. Use `getLocationDiagnostics()` to see why it failed

Companies without distances are sorted to the end (not discarded).

---

## Still Having Issues?

If proximity sorting still isn't working after checking this guide:

1. **Collect full edge function logs** from a complete run
2. **Check for these specific log sections:**
   - `🎓 COURSE DISCOVERY INITIALIZATION`
   - `🔍 ENRICHMENT STAGE`
   - `📍` distance calculation logs
   - `🗺️ PROXIMITY SORTING`
3. **Share logs** with the development team for analysis

The enhanced diagnostic logging will show exactly where the process is failing.
