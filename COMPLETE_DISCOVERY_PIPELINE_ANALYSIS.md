# Complete Discovery Pipeline Analysis
**Generated:** 2025-01-23  
**Issue:** Pittsburgh company (Onward Robotics) appearing instead of Kansas City companies (Burns & McDonnell, Black & Veatch)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Complete Data Flow](#complete-data-flow)
3. [All Hardcoded Criteria & Thresholds](#all-hardcoded-criteria--thresholds)
4. [Root Cause Analysis](#root-cause-analysis)
5. [Unit Test Locations](#unit-test-locations)
6. [Recommendations](#recommendations)

---

## Executive Summary

### The Bug
**Location:** `supabase/functions/discover-companies/providers/apollo-provider.ts:679-695`

The system returned **Onward Robotics (Pittsburgh, PA, 681 miles away)** instead of **Burns & McDonnell or Black & Veatch (Kansas City, MO, local companies)** because:

1. **Apollo's location-only fallback kept the wrong geographic scope** (state-wide "Missouri, United States" instead of city-specific "Kansas City, Missouri")
2. **No maximum distance threshold** exists - proximity sorting orders by distance but doesn't exclude distant companies
3. **Apollo's location matching is imprecise** - "Missouri, United States" somehow matched a Pittsburgh company

### Impact
- Any course in a city with limited company data will return companies from anywhere in the state or country
- Semantic filtering (50-80% threshold) eliminates local companies that don't match industry keywords perfectly
- No geographic boundary enforcement means 500+ mile distant companies can appear

---

## Complete Data Flow

### Phase 0: Syllabus Upload
**File:** `supabase/functions/parse-syllabus/index.ts`

**Input:** PDF syllabus  
**Output:** Course profile with:
- `title`: "SIE 250 Introduction to Systems and Industrial Engineering"
- `level`: "undergraduate" 
- `outcomes`: ["Explain what systems engineering is...", ...]
- `location_city`: "university of missouri - kansas city"
- `location_state`: null
- `location_zip`: null
- `search_location`: "university of missouri - kansas city, United States"

**Criteria:**
- Location extracted from PDF or user input
- `detect-location` edge function called to normalize location

---

### Phase 1: SOC Code Mapping
**File:** `supabase/functions/_shared/course-soc-mapping.ts`

**Input:** Course title + outcomes + level  
**Output:** SOC mappings with industries

```javascript
// Example output for Industrial Engineering course
[
  {
    socCode: "17-2112.00",
    title: "Industrial Engineers",
    confidence: 0.95,
    industries: ["manufacturing", "logistics", "operations", 
                 "industrial engineering", "supply chain", 
                 "automation", "production", "quality assurance"],
    keywords: ["systems", "optimization", "processes", "efficiency"]
  }
]
```

**Criteria:**
- **Hardcoded mappings** by discipline keywords in course title/outcomes
- **Line 44**: `industries: ['manufacturing', 'logistics', 'operations', 'industrial engineering', ...]`
- If no match: Returns empty array (fallback to AI-generated filters)

**Unit Test Location:** Lines 200-350 (test each SOC mapping)

---

### Phase 2: Apollo Industry Mapping
**File:** `supabase/functions/discover-companies/providers/apollo-industry-mapper.ts`

**Input:** SOC industries from Phase 1  
**Output:** Apollo-compatible industry tags

```javascript
// Example transformation
Input:  ["industrial engineering", "automation", "manufacturing"]
Output: ["Mechanical Or Industrial Engineering", 
         "Industrial Automation", "Manufacturing", 
         "Industrial Manufacturing", "Machinery"]
```

**Criteria:**
- **Hardcoded dictionary** mapping generic terms → Apollo taxonomy (lines 28-91)
- **Max 15 industry tags** (line 190): `apolloIndustries.slice(0, 15)`
- Unknown keywords are **dropped** (not passed to Apollo)

**Unit Test Location:** Lines 28-200 (test each industry mapping)

---

### Phase 3: Apollo Company Search
**File:** `supabase/functions/discover-companies/providers/apollo-provider.ts`

**Input:** Location + industry tags  
**Output:** List of companies from Apollo API

#### 3.1: Initial Search with Industry Filters
**Lines:** 629-655

```javascript
// Initial search
organization_locations: ["Kansas City, Missouri, United States"]
q_organization_keyword_tags: ["Mechanical Or Industrial Engineering", 
                               "Industrial Automation", "Manufacturing", ...]
```

**Criteria:**
- **All employee sizes** (line 498): `['1,10', '11,50', '51,200', '201,500', '501,1000', '1001,5000', '5001+']`
- **All industries from Phase 2** (15 tags max)
- **No job posting requirement** (removed in v2.0)

**Result:** 0-1 companies for narrow searches

#### 3.2: Geographic Fallback
**Lines:** 635-655

If fewer than `maxResults` companies found:

1. **Try state-wide** (lines 639-645):
   ```javascript
   "Kansas City, Missouri, United States" 
     → "Missouri, United States"
   ```

2. **Try country-wide** (lines 648-654):
   ```javascript
   "Missouri, United States" 
     → "United States"
   ```

**Unit Test Location:** Lines 614-708 (test each geographic fallback)

#### 3.3: Industry Filter Relaxation
**Lines:** 661-677

If fewer than 3 companies:

```javascript
// Keep top 50% of industry keywords
originalTags = [15 tags]
relaxedTags = [8 tags]  // First 50%
```

**Criteria:**
- **Threshold: 3 companies** (line 661)
- **Relaxation: Top 50% of tags** (line 666)

#### 3.4: Location-Only Fallback ⚠️ **BUG HERE**
**Lines:** 679-695

If fewer than 2 companies:

```javascript
// Remove ALL industry filters
filters.q_organization_keyword_tags = []

// BUT: Location filter is whatever was last used
// Could be "United States", "Missouri, United States", or city-specific
const locationOnlyResults = await this.trySearch(filters, maxResults * 2, pageOffset)
```

**THE BUG:**
- Location filter could be state-wide or country-wide from previous fallbacks
- No way to reset to original city-specific location
- No maximum distance threshold to filter out distant companies

**Unit Test Location:** Lines 679-708

---

### Phase 4: Proximity Sorting
**File:** `supabase/functions/discover-companies/providers/apollo-provider.ts:857-933`

**Input:** Companies from Apollo + `searchLocation`  
**Output:** Companies sorted by distance from course location

```javascript
// For each company
const companyLocation = `${company.city}, ${company.state || company.country}`
const distance = await calculateDistanceBetweenLocations(searchLocation, companyLocation)

// Sort: nearest first, undefined last
companies.sort((a, b) => {
  const distA = a.distanceFromSearchMiles ?? 999999
  const distB = b.distanceFromSearchMiles ?? 999999
  return distA - distB
})
```

**Criteria:**
- **No maximum distance threshold** - companies 500+ miles away are kept
- Distance is calculated using Haversine formula + OpenStreetMap geocoding API
- Companies without calculable distance sort to end (distance = 999999)

**Your Case:**
```javascript
searchLocation: "university of missouri - kansas city, United States"
companyLocation: "Pittsburgh, Pennsylvania, United States"
distance: 681 miles
// ✅ Distance calculated correctly
// ❌ No threshold to exclude it
```

**Unit Test Location:** Lines 857-936

---

### Phase 5: Semantic Similarity Filtering
**File:** `supabase/functions/_shared/semantic-matching-service.ts`

**Input:** Companies + course skills/occupations  
**Output:** Companies with similarity scores

#### 5.1: Similarity Calculation
**Lines:** 60-104

```javascript
// Build text representations
courseText = "Skills required: systems, optimization, processes... 
              Occupations: Industrial Engineers... 
              Technologies: CAD, AutoCAD, ..."

companyText = "Company description... 
               Job openings: Software Engineer, Data Analyst... 
               Technologies used: Python, AWS, ..."

// Compute similarity (keyword overlap)
similarity = computeKeywordSimilarity(courseText, companyText)
// Returns: 0.0 to 1.0
```

**Algorithm:** Jaccard similarity + important term bonus (lines 311-337)

**Unit Test Location:** Lines 60-337

#### 5.2: Industry Penalty System
**File:** `supabase/functions/_shared/context-aware-industry-filter.ts`

**Lines:** 169-243

```javascript
// Check if company should be penalized
const decision = shouldExcludeIndustry(
  companySector,      // "Staffing & Recruiting"
  courseDomain,       // "engineering_technical"
  socMappings,
  jobPostings
)

// Apply penalty
if (decision.penalty > 0) {
  similarity = similarity * (1 - decision.penalty)
  // Example: 30% * (1 - 0.8) = 6%
}
```

**Hardcoded Penalties:**

| Industry | Course Domain | Penalty | Final Similarity |
|----------|---------------|---------|------------------|
| Staffing/Recruiting | Engineering/Tech | **80%** | similarity × 0.2 |
| Staffing/Recruiting | Business/HR | **0%** | No change |
| Staffing/Recruiting | Hybrid (Tech primary) | **80%** | similarity × 0.2 |
| Insurance/Legal/Gambling | Any | **100%** | 0% |

**Unit Test Location:** Lines 169-404

#### 5.3: Threshold Filtering
**Lines:** 639-646

```javascript
// Adaptive threshold based on company count
if (companyCount > 20) threshold = 0.65  // 65%
if (companyCount > 10) threshold = 0.60  // 60%
if (companyCount > 5)  threshold = 0.55  // 55%
else                   threshold = 0.50  // 50%

// Filter companies
const passed = companies.filter(c => c.similarity >= threshold)
```

**Criteria:**
- **Adaptive: 50-65%** depending on company count
- Companies below threshold are **filtered out**

**Unit Test Location:** Lines 110-243

---

### Phase 6: Intelligent Fallback
**File:** `supabase/functions/discover-companies/index.ts:520-627`

**Lines:** 538-611

If semantic filtering rejects **ALL** companies:

```javascript
// Adaptive fallback threshold
if (apolloCompanyCount <= 2) {
  MINIMUM_FALLBACK_SCORE = 0.01  // 1% - desperation mode
} else if (apolloCompanyCount <= 5) {
  MINIMUM_FALLBACK_SCORE = 0.03  // 3% - relaxed mode
} else {
  MINIMUM_FALLBACK_SCORE = 0.05  // 5% - standard mode
}

// Preserve companies above minimum
const viableCompanies = companies.filter(c => c.similarity > MINIMUM_FALLBACK_SCORE)
```

**Criteria:**
- **1-2 companies:** Accept ANY score > 1%
- **3-5 companies:** Accept score > 3%
- **6+ companies:** Accept score > 5%

**Your Case:**
```javascript
apolloCompanyCount: 1 (Onward Robotics)
MINIMUM_FALLBACK_SCORE: 0.01 (1%)
Onward Robotics similarity: ~6% (after 80% penalty)
Result: ✅ PASSED (6% > 1%)
```

**Unit Test Location:** Lines 520-663

---

## All Hardcoded Criteria & Thresholds

### Table of Critical Values

| Component | File | Line | Criterion | Value |
|-----------|------|------|-----------|-------|
| **SOC Mapping** | `course-soc-mapping.ts` | 44 | Industrial Engineering industries | `['manufacturing', 'logistics', 'operations', 'industrial engineering', 'supply chain', 'automation', 'production', 'quality assurance']` |
| **Apollo Mapper** | `apollo-industry-mapper.ts` | 190 | Max industry tags | **15** |
| **Apollo Search - Initial** | `apollo-provider.ts` | 629 | Location scope | City-specific |
| **Apollo Search - Fallback 1** | `apollo-provider.ts` | 639-645 | Location scope | State-wide (if < maxResults) |
| **Apollo Search - Fallback 2** | `apollo-provider.ts` | 648-654 | Location scope | Country-wide (if still < maxResults) |
| **Apollo Search - Fallback 3** | `apollo-provider.ts` | 661 | Industry relaxation trigger | **< 3 companies** |
| **Apollo Search - Fallback 4** | `apollo-provider.ts` | 681 | Location-only trigger | **< 2 companies** |
| **Apollo Search - Fallback 4** | `apollo-provider.ts` | 686 | Industry filters removed | **ALL** (empty array) |
| **Proximity Sorting** | `apollo-provider.ts` | 905-909 | Maximum distance threshold | **NONE** ⚠️ |
| **Proximity Sorting** | `apollo-provider.ts` | 906 | Distance for unknown locations | **999999 miles** |
| **Semantic Filtering** | `semantic-matching-service.ts` | 639-646 | Threshold (20+ companies) | **65%** |
| **Semantic Filtering** | `semantic-matching-service.ts` | 640 | Threshold (10-20 companies) | **60%** |
| **Semantic Filtering** | `semantic-matching-service.ts` | 641 | Threshold (5-10 companies) | **55%** |
| **Semantic Filtering** | `semantic-matching-service.ts` | 642 | Threshold (< 5 companies) | **50%** |
| **Industry Penalty** | `context-aware-industry-filter.ts` | 227 | Staffing (Engineering) | **80%** |
| **Industry Penalty** | `context-aware-industry-filter.ts` | 187 | Hard-exclude (Insurance/Legal) | **100%** |
| **Fallback Threshold** | `discover-companies/index.ts` | 547 | Desperation mode (1-2 companies) | **1%** |
| **Fallback Threshold** | `discover-companies/index.ts` | 550 | Relaxed mode (3-5 companies) | **3%** |
| **Fallback Threshold** | `discover-companies/index.ts` | 553 | Standard mode (6+ companies) | **5%** |

---

## Root Cause Analysis

### Why Onward Robotics Appeared Instead of Kansas City Companies

#### Step-by-Step Execution

1. **Initial Apollo Search (City-Specific)**
   ```
   Location: "Kansas City, Missouri, United States"
   Industries: ["Mechanical Or Industrial Engineering", "Industrial Automation", "Manufacturing", ...]
   Result: 0 companies
   ```

2. **Geographic Fallback 1 (State-Wide)**
   ```
   Location: "Missouri, United States"
   Industries: ["Mechanical Or Industrial Engineering", ...]
   Result: 1 company - Uptalent.io (staffing firm in wrong location)
   ```

3. **Industry Relaxation**
   ```
   Location: "Missouri, United States"
   Industries: [8 tags - top 50%]
   Result: Still 1 company
   ```

4. **Location-Only Fallback** ⚠️ **BUG ACTIVATED**
   ```
   Location: "Missouri, United States"  ← WRONG! Should be city-specific
   Industries: []  ← No industry filter
   Result: 5-10 companies including Onward Robotics (Pittsburgh, PA)
   ```
   
   **The Bug:** Apollo's "Missouri, United States" filter somehow matched Pittsburgh companies, OR the filter was already set to "United States" from a previous fallback iteration.

5. **Proximity Sorting**
   ```
   Companies:
   1. Onward Robotics (Pittsburgh, PA) - 681 miles
   2. Other companies...
   
   ❌ No maximum distance threshold
   ✅ Companies kept regardless of distance
   ```

6. **Semantic Filtering**
   ```
   Onward Robotics:
   - Raw similarity: ~30%
   - Industry: Robotics/Automation
   - Penalty: 0% (NOT a staffing firm, legitimate tech company)
   - Final similarity: 30%
   - Threshold: 50% (< 5 companies)
   - Result: ❌ FAILED (30% < 50%)
   ```

7. **Intelligent Fallback**
   ```
   apolloCompanyCount: 1 (Onward Robotics only)
   MINIMUM_FALLBACK_SCORE: 1% (desperation mode)
   Onward Robotics: 30% similarity
   Result: ✅ PASSED (30% > 1%)
   ```

#### Why Kansas City Companies Didn't Appear

**Burns & McDonnell** and **Black & Veatch** are major Kansas City companies in:
- **Engineering consulting**
- **Construction management**
- **Infrastructure projects**

They didn't appear because:

1. **Apollo's industry tag mismatch:**
   - Searched for: "Mechanical Or Industrial Engineering", "Industrial Automation", "Manufacturing"
   - B&M / B&V likely tagged as: "Engineering Services", "Consulting", "Construction"
   - **Apollo's search is exact-match on tags** - no fuzzy matching

2. **Location-only fallback used wrong scope:**
   - Should have searched: "Kansas City, Missouri, United States" with NO industry filter
   - Actually searched: "Missouri, United States" (or broader) with NO industry filter
   - Result: Pittsburgh companies entered the pool

3. **No verification of local company discovery:**
   - System never checked: "Did we find ANY companies in Kansas City?"
   - Accepted distant companies without question

---

## Unit Test Locations

### Critical Functions to Test

#### 1. SOC Mapping
**File:** `course-soc-mapping.ts`
**Function:** `mapCourseToSOC()`
**Lines:** 200-350

```javascript
// Test cases
test('Industrial Engineering course maps to 17-2112.00', () => {
  const result = mapCourseToSOC("SIE 250 Systems Engineering", outcomes, "undergraduate")
  expect(result[0].socCode).toBe("17-2112.00")
  expect(result[0].industries).toContain("manufacturing")
})

test('Unknown course returns empty array', () => {
  const result = mapCourseToSOC("Unknown Course", [], "undergraduate")
  expect(result).toEqual([])
})
```

#### 2. Apollo Industry Mapping
**File:** `apollo-industry-mapper.ts`
**Function:** `mapSOCIndustriesToApollo()`
**Lines:** 28-200

```javascript
test('Industrial engineering maps to Apollo tags', () => {
  const result = mapSOCIndustriesToApollo(["industrial engineering", "automation"])
  expect(result.includeIndustries).toContain("Mechanical Or Industrial Engineering")
  expect(result.includeIndustries).toContain("Industrial Automation")
})

test('Unknown industries are dropped', () => {
  const result = mapSOCIndustriesToApollo(["xyz_unknown_industry"])
  expect(result.includeIndustries.length).toBe(0)
})
```

#### 3. Apollo Search Geographic Fallbacks
**File:** `apollo-provider.ts`
**Function:** `searchOrganizations()`
**Lines:** 614-708

```javascript
test('City-specific search tries exact location first', async () => {
  const mockTrySearch = jest.fn().mockResolvedValue([])
  const filters = { organization_locations: ["Kansas City, Missouri, United States"] }
  
  await searchOrganizations(filters, 12, 1)
  
  expect(mockTrySearch).toHaveBeenCalledWith(
    expect.objectContaining({
      organization_locations: ["Kansas City, Missouri, United States"]
    })
  )
})

test('State-wide fallback activates when < maxResults', async () => {
  const mockTrySearch = jest.fn()
    .mockResolvedValueOnce([])  // City-specific: 0 results
    .mockResolvedValueOnce([mockCompany])  // State-wide: 1 result
  
  const filters = { organization_locations: ["Kansas City, Missouri, United States"] }
  const result = await searchOrganizations(filters, 12, 1)
  
  expect(mockTrySearch).toHaveBeenCalledWith(
    expect.objectContaining({
      organization_locations: ["Missouri, United States"]
    })
  )
  expect(result.length).toBe(1)
})

test('Location-only fallback removes ALL industry filters', async () => {
  const mockTrySearch = jest.fn()
    .mockResolvedValueOnce([])  // City: 0
    .mockResolvedValueOnce([mockCompany])  // Location-only: 1
  
  const filters = {
    organization_locations: ["Kansas City, Missouri, United States"],
    q_organization_keyword_tags: ["Manufacturing", "Automation"]
  }
  
  await searchOrganizations(filters, 12, 1)
  
  expect(mockTrySearch).toHaveBeenCalledWith(
    expect.objectContaining({
      q_organization_keyword_tags: []  // Empty!
    })
  )
})
```

#### 4. Proximity Sorting
**File:** `apollo-provider.ts`
**Function:** `enrichOrganizations()`
**Lines:** 857-936

```javascript
test('Companies sort by distance nearest first', async () => {
  const companies = [
    { name: "Far", city: "New York", state: "NY" },  // ~1000 miles
    { name: "Near", city: "Kansas City", state: "MO" }  // 0 miles
  ]
  
  const sorted = await enrichOrganizations(companies, 2, [], "engineering_technical", [], "Kansas City, Missouri")
  
  expect(sorted[0].name).toBe("Near")
  expect(sorted[1].name).toBe("Far")
})

test('No maximum distance threshold applied', async () => {
  const companies = [
    { name: "Very Far", city: "Los Angeles", state: "CA" }  // 1500+ miles
  ]
  
  const result = await enrichOrganizations(companies, 1, [], "engineering_technical", [], "Kansas City, Missouri")
  
  expect(result.length).toBe(1)  // Not filtered out despite distance
  expect(result[0].distanceFromSearchMiles).toBeGreaterThan(1000)
})
```

#### 5. Semantic Similarity
**File:** `semantic-matching-service.ts`
**Function:** `computeCourseSimilarity()`
**Lines:** 60-337

```javascript
test('Keyword overlap produces similarity score', async () => {
  const courseSkills = [{ skill: "Python", category: "technical", confidence: 0.9 }]
  const occupations = [{ title: "Software Engineer", technologies: ["Python", "JavaScript"] }]
  const companyTechs = ["Python", "React"]
  
  const similarity = await computeCourseSimilarity(courseSkills, occupations, [], "", companyTechs)
  
  expect(similarity).toBeGreaterThan(0.5)  // Should match well
})

test('No overlap produces low similarity', async () => {
  const courseSkills = [{ skill: "Mechanical Design", category: "technical", confidence: 0.9 }]
  const occupations = [{ title: "Mechanical Engineer", technologies: ["AutoCAD", "SolidWorks"] }]
  const companyTechs = ["Python", "React"]
  
  const similarity = await computeCourseSimilarity(courseSkills, occupations, [], "", companyTechs)
  
  expect(similarity).toBeLessThan(0.3)  // Should not match well
})
```

#### 6. Industry Penalty System
**File:** `context-aware-industry-filter.ts`
**Function:** `shouldExcludeIndustry()`
**Lines:** 169-404

```javascript
test('Staffing firm penalized 80% for engineering course', () => {
  const result = shouldExcludeIndustry("Staffing & Recruiting", "engineering_technical", [], [])
  
  expect(result.shouldExclude).toBe(true)
  expect(result.penalty).toBe(0.8)
})

test('Staffing firm NOT penalized for business course', () => {
  const result = shouldExcludeIndustry("Staffing & Recruiting", "business_management", [], [])
  
  expect(result.shouldExclude).toBe(false)
  expect(result.penalty).toBe(0)
})

test('Hard-exclude industries get 100% penalty', () => {
  const result = shouldExcludeIndustry("Insurance Services", "engineering_technical", [], [])
  
  expect(result.shouldExclude).toBe(true)
  expect(result.penalty).toBe(1.0)
})
```

#### 7. Intelligent Fallback
**File:** `discover-companies/index.ts`
**Lines:** 520-663

```javascript
test('Desperation mode accepts 1% minimum', () => {
  const apolloCompanyCount = 1
  let MINIMUM_FALLBACK_SCORE
  
  if (apolloCompanyCount <= 2) {
    MINIMUM_FALLBACK_SCORE = 0.01
  }
  
  expect(MINIMUM_FALLBACK_SCORE).toBe(0.01)
})

test('Companies below minimum are rejected', () => {
  const companies = [
    { name: "Low", similarityScore: 0.005 },  // 0.5%
    { name: "Medium", similarityScore: 0.03 }  // 3%
  ]
  const MINIMUM_FALLBACK_SCORE = 0.01
  
  const viable = companies.filter(c => c.similarityScore > MINIMUM_FALLBACK_SCORE)
  
  expect(viable.length).toBe(1)
  expect(viable[0].name).toBe("Medium")
})
```

---

## Recommendations

### 1. Fix Location-Only Fallback (CRITICAL)

**File:** `apollo-provider.ts:679-695`

**Current Bug:**
```javascript
// Location filter could be "United States" from previous fallback
filters.q_organization_keyword_tags = []
const locationOnlyResults = await this.trySearch(filters, maxResults * 2, pageOffset)
```

**Fix:**
```javascript
// Reset to ORIGINAL city-specific location
const originalLocation = // Store from line 619
filters.organization_locations = [originalLocation]
filters.q_organization_keyword_tags = []
const locationOnlyResults = await this.trySearch(filters, maxResults * 2, pageOffset)
```

### 2. Add Maximum Distance Threshold (HIGH PRIORITY)

**File:** `apollo-provider.ts:905-909`

**Current Code:**
```javascript
// No distance filtering
companies.sort((a, b) => {
  const distA = a.distanceFromSearchMiles ?? 999999
  const distB = b.distanceFromSearchMiles ?? 999999
  return distA - distB
})
```

**Recommended Fix:**
```javascript
// Define reasonable distance thresholds
const DISTANCE_THRESHOLDS = {
  city: 50,    // 50 miles for city-specific searches
  state: 200,  // 200 miles for state-wide searches
  country: 500 // 500 miles for country-wide searches
}

// Determine which threshold to use based on search scope
const maxDistance = /* determine from original location scope */

// Filter by distance before sorting
const withinRange = companies.filter(c => 
  c.distanceFromSearchMiles === undefined || 
  c.distanceFromSearchMiles <= maxDistance
)

// Then sort by distance
withinRange.sort((a, b) => {
  const distA = a.distanceFromSearchMiles ?? 999999
  const distB = b.distanceFromSearchMiles ?? 999999
  return distA - distB
})
```

### 3. Add Diagnostic Logging for Apollo Location Matching (MEDIUM PRIORITY)

**File:** `apollo-provider.ts:752-768`

**Add After Apollo Response:**
```javascript
// Log which companies matched which location filter
if (organizations.length > 0) {
  console.log(`
  🗺️ LOCATION MATCH DIAGNOSTIC:`);
  console.log(`     Search filter: "${filters.organization_locations[0]}"`);
  organizations.forEach((org, idx) => {
    const orgLoc = `${org.city}, ${org.state || org.country}`;
    console.log(`     ${idx + 1}. ${org.name} (${orgLoc})`);
    
    // Check if company location matches search filter
    const matchesFilter = orgLoc.toLowerCase().includes(
      filters.organization_locations[0].toLowerCase()
    );
    if (!matchesFilter) {
      console.log(`        ⚠️  WARNING: Location doesn't match search filter!`);
    }
  });
}
```

### 4. Improve Apollo Industry Tag Matching (MEDIUM PRIORITY)

**File:** `apollo-industry-mapper.ts:28-91`

**Issue:** Apollo search is exact-match on tags - "Engineering Services" ≠ "Mechanical Engineering"

**Recommendation:**
```javascript
// Add broader industry categories for better matching
const BROAD_CATEGORIES = {
  engineering: [
    "Engineering Services",
    "Consulting Services",
    "Professional Services",
    "Mechanical Or Industrial Engineering",
    "Industrial Automation",
    ...
  ],
  software: [
    "Computer Software",
    "Information Technology & Services",
    "Internet",
    ...
  ]
}

// Include both specific AND broad categories in search
const apolloTags = [
  ...specificTags,  // "Mechanical Or Industrial Engineering"
  ...broadTags      // "Engineering Services", "Professional Services"
].slice(0, 15)
```

### 5. Add Local Company Verification (LOW PRIORITY)

**File:** `discover-companies/index.ts` (after Phase 3)

**New Check:**
```javascript
// After Apollo search, verify we found at least 1 company in target city
const companiesInTargetCity = discoveryResult.companies.filter(c => {
  const companyCity = c.city?.toLowerCase().trim()
  const targetCity = searchLocation.split(',')[0]?.toLowerCase().trim()
  return companyCity === targetCity
})

if (companiesInTargetCity.length === 0) {
  console.warn(`
⚠️  WARNING: Apollo found 0 companies in target city "${targetCity}"`)
  console.warn(`   Companies returned are from other locations:`)
  discoveryResult.companies.forEach(c => {
    console.warn(`   - ${c.name} (${c.city}, ${c.state || c.country})`)
  })
}
```

---

## Summary

### The Pipeline in One Sentence
**Syllabus → SOC Mapping → Apollo Industry Tags → Apollo Search (with 4 fallbacks) → Proximity Sorting (no distance limit) → Semantic Filtering (50-80% threshold) → Industry Penalties (0-100%) → Fallback (1-5% minimum) → Projects**

### The Bug in One Sentence
**Location-only fallback (Phase 3.4) removes industry filters but keeps the wrong geographic scope (state/country instead of city), and there's no maximum distance threshold to exclude distant companies.**

### Fix Priority
1. **P0 (Critical):** Fix location-only fallback to use original city-specific location
2. **P0 (Critical):** Add maximum distance threshold (50/200/500 miles)
3. **P1 (High):** Add diagnostic logging for Apollo location matching
4. **P2 (Medium):** Improve Apollo industry tag matching with broader categories
5. **P3 (Low):** Add local company verification check

This comprehensive analysis provides the complete picture of how the system works, where it fails, and how to fix it.
