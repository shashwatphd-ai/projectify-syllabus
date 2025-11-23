# 📚 Projectify-Syllabus: Complete Codebase Overview for AI Agents & Project Managers

**Purpose**: Onboard new AI agents or PMs to understand the entire system in 15 minutes
**Date**: November 23, 2025
**Status**: Up-to-date with current codebase state

---

## Quick Start: What Is This System?

**Projectify-Syllabus** = Automated University-Industry Project Matching Platform

```
Professor uploads PDF syllabus
    ↓
AI extracts learning outcomes
    ↓
System finds real companies with matching needs
    ↓
AI generates custom project proposals
    ↓
Students work on real industry projects
```

**Value Proposition:**
- Professors: Save 20+ hours finding industry partners
- Students: Work on real projects (not fake academic exercises)
- Companies: Get free consulting from student teams

---

## Architecture at a Glance

### Technology Stack

```
┌─────────────────────────────────────────────┐
│           FRONTEND (React + TypeScript)      │
│  - Upload syllabus (PDF)                     │
│  - Configure preferences                     │
│  - View generated projects                   │
└─────────────────┬───────────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────────┐
│      SUPABASE EDGE FUNCTIONS (Deno)         │
│  ┌─────────────────────────────────────┐   │
│  │ parse-syllabus     ← PDF parsing     │   │
│  │ discover-companies ← Company search  │   │
│  │ generate-projects  ← AI generation   │   │
│  └─────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐  ┌──────▼─────────┐
│  POSTGRESQL    │  │  EXTERNAL APIs  │
│  (Supabase)    │  │                 │
│  - Courses     │  │  - Apollo.io    │
│  - Companies   │  │  - O*NET (BLS)  │
│  - Projects    │  │  - AI Gateway   │
└────────────────┘  └────────────────┘
```

### Data Flow

```
1. Syllabus Upload
   PDF file → AI parsing → course_profiles table

2. Company Discovery
   Course outcomes → O*NET SOC codes → Apollo search → company_profiles table

3. Semantic Filtering
   Companies + Course → Sentence-BERT embeddings → Similarity scores → Filter

4. Project Generation
   Company + Course → AI prompt → Project proposal → projects table

5. Results Display
   Frontend polls → Shows progress → Displays projects
```

---

## Directory Structure

```
projectify-syllabus/
│
├── src/                          # FRONTEND (React)
│   ├── pages/                    # Main pages
│   │   ├── Upload.tsx           # 📄 Syllabus upload
│   │   ├── ReviewSyllabus.tsx   # ✅ Review extracted data
│   │   ├── Configure.tsx        # ⚙️  Configure generation
│   │   ├── Projects.tsx         # 📊 View projects
│   │   └── ProjectDetail.tsx    # 🔍 Detailed project view
│   │
│   ├── components/              # Reusable UI components
│   │   ├── Header.tsx          # Navigation
│   │   ├── project-detail/     # 6 project detail tabs
│   │   └── ui/                 # Shadcn/UI components
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts          # Authentication
│   │   └── useDemandSignals.ts # Job market trends
│   │
│   ├── utils/                   # Frontend utilities
│   │   └── locationValidation.ts  # ⚠️ CRITICAL: Location format validation
│   │
│   └── integrations/
│       └── supabase/
│           └── client.ts        # Supabase client
│
├── supabase/
│   ├── functions/               # BACKEND (Edge Functions)
│   │   │
│   │   ├── parse-syllabus/      # PDF parsing
│   │   │   └── index.ts        # AI extracts: title, outcomes, deliverables
│   │   │
│   │   ├── detect-location/     # Auto-detect institution location
│   │   │   └── index.ts        # Email domain → City, State
│   │   │
│   │   ├── discover-companies/  # ⚠️ CRITICAL: Company discovery pipeline
│   │   │   ├── index.ts        # Main orchestrator (873 lines)
│   │   │   └── providers/      # Pluggable provider system
│   │   │       ├── types.ts    # Common interface
│   │   │       ├── provider-factory.ts  # Factory pattern
│   │   │       ├── apollo-provider.ts   # Apollo.io (1348 lines) ⚠️
│   │   │       ├── adzuna-provider.ts   # Adzuna (job-based)
│   │   │       ├── apollo-industry-mapper.ts
│   │   │       └── apollo-technology-mapping.ts
│   │   │
│   │   ├── generate-projects/   # AI project generation
│   │   │   └── index.ts        # Creates project proposals
│   │   │
│   │   ├── _shared/             # Shared services (19 files)
│   │   │   ├── skill-extraction-service.ts    # Extract skills from outcomes
│   │   │   ├── occupation-coordinator.ts      # O*NET occupation mapping
│   │   │   ├── onet-service.ts               # O*NET API client
│   │   │   ├── semantic-matching-service.ts  # Sentence-BERT filtering
│   │   │   ├── embedding-service.ts          # BERT embeddings
│   │   │   ├── course-soc-mapping.ts         # SOC code mapping
│   │   │   ├── generation-service.ts         # AI project proposals
│   │   │   ├── alignment-service.ts          # LO alignment scoring
│   │   │   ├── pricing-service.ts            # Budget estimation
│   │   │   ├── context-aware-industry-filter.ts  # Exclude staffing firms
│   │   │   └── geo-distance.ts               # Distance calculation
│   │   │
│   │   └── ... (40+ other functions)
│   │
│   └── migrations/              # Database migrations (30+)
│       └── 20251112225311_add_p0_4_phase_1_columns.sql  # Latest
│
├── docs/                        # Documentation (50+ files)
│   ├── COMPLETE_ARCHITECTURE_DOCUMENTATION.md
│   ├── P0-2_LOCATION_VALIDATION_FIX.md
│   ├── P0-3_COURSE_FIRST_AI_FIX_IMPLEMENTATION.md
│   ├── P0-4_INTELLIGENT_COMPANY_MATCHING.md
│   └── ...
│
├── CRISIS_RECOVERY_TESTING_GUIDE.md  # Crisis recovery procedure
├── DEVELOPMENT_BEST_PRACTICES.md     # 475-line best practices guide
├── APOLLO_API_COMPLETE_ISSUE_ANALYSIS.md  # Apollo issues documented
└── GENERATION_FAILURE_COMPLETE_ANALYSIS.md  # Current failure analysis
```

---

## Database Schema (PostgreSQL)

### Core Tables

#### `course_profiles` - Uploaded Syllabi

```sql
course_profiles (
  id UUID PRIMARY KEY,
  user_id UUID,                    -- Professor who uploaded
  title TEXT,                      -- "Industrial Engineering 101"
  level TEXT,                      -- "UG" | "MBA"
  weeks INTEGER,                   -- Course duration
  hrs_per_week INTEGER,            -- Expected hours per week

  outcomes TEXT[],                 -- Learning outcomes array
  artifacts TEXT[],                -- Expected deliverables
  topics TEXT[],                   -- Extracted topics
  schedule JSONB[],                -- Weekly schedule

  city_zip TEXT,                   -- Original location input
  search_location TEXT,            -- ⚠️ Apollo-friendly format (2-part)

  created_at TIMESTAMP
)
```

**Key Field**: `search_location` MUST be 2-part format: `"City, State"` (NOT 3-part with country)

---

#### `generation_runs` - Discovery Pipeline Executions

```sql
generation_runs (
  id UUID PRIMARY KEY,
  course_id UUID,                  -- FK to course_profiles

  -- Phase 1: Skill Extraction
  extracted_skills JSONB,          -- [{skill, category, confidence}]
  skill_extraction_model TEXT,     -- "soc-mapping" | "ai-extracted"

  -- Phase 2: Occupation Mapping
  onet_occupations JSONB,          -- [{code, title, skills, dwas, technologies}]
  occupation_mapping_provider TEXT,  -- "onet" | "esco" | "skills-ml"
  occupation_mapping_confidence FLOAT,
  unmapped_skills TEXT[],          -- Skills without occupation match

  -- Phase 3: Semantic Filtering
  semantic_filter_applied BOOLEAN,
  semantic_filter_threshold FLOAT,  -- 0.50 = 50% similarity required
  companies_before_filtering INT,   -- 15
  companies_after_filtering INT,    -- 8
  average_similarity_score FLOAT,   -- 0.67
  semantic_processing_time_ms INT,

  -- Discovery Stats
  companies_discovered INT,
  companies_enriched INT,
  status TEXT,                      -- "in_progress" | "completed" | "failed"
  error_category TEXT,              -- "CONFIG_ERROR" | "DATA_ERROR" | etc.
  error_message TEXT,
  error_details JSONB,

  processing_time_seconds FLOAT,
  apollo_credits_used INT,
  ai_models_used JSONB,

  created_at TIMESTAMP,
  completed_at TIMESTAMP
)
```

---

#### `company_profiles` - Discovered Companies

```sql
company_profiles (
  id UUID PRIMARY KEY,
  generation_run_id UUID,          -- FK to generation_runs

  -- Basic Info
  name TEXT,                       -- "Burns & McDonnell"
  website TEXT,                    -- "burnsmcd.com"
  sector TEXT,                     -- "Engineering Services"
  size TEXT,                       -- "1001-5000"
  full_address TEXT,
  city TEXT,                       -- "Kansas City"
  state TEXT,                      -- "Missouri"
  zip TEXT,                        -- "64105"
  country TEXT,                    -- "United States"

  -- Contact Info (Apollo Enrichment)
  contact_person TEXT,             -- "John Smith"
  contact_email TEXT,              -- "john.smith@burnsmcd.com"
  contact_phone TEXT,              -- "+1-816-333-9400"
  contact_title TEXT,              -- "Director of Partnerships"
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_headline TEXT,           -- LinkedIn headline
  contact_photo_url TEXT,
  contact_linkedin_url TEXT,
  contact_city TEXT,
  contact_state TEXT,
  contact_country TEXT,
  contact_email_status TEXT,       -- "verified" | "likely" | "guessed"
  contact_employment_history JSONB,
  contact_phone_numbers JSONB,

  -- Organization Info (Apollo)
  organization_linkedin_url TEXT,
  organization_twitter_url TEXT,
  organization_facebook_url TEXT,
  organization_logo_url TEXT,
  organization_founded_year INT,
  organization_employee_count TEXT,  -- "1001-5000"
  organization_revenue_range TEXT,   -- "$100M-$500M"
  organization_industry_keywords TEXT[],

  -- Market Intelligence (Apollo)
  job_postings JSONB,              -- [{title, description, location, posted_date}]
  job_postings_last_fetched TIMESTAMP,
  technologies_used TEXT[],        -- ["Python", "AWS", "AutoCAD"]
  buying_intent_signals JSONB,     -- [{signal_type, confidence, timing}]
  funding_stage TEXT,              -- "Series A" | "Bootstrapped"
  total_funding_usd DECIMAL,

  -- Phase 3: Semantic Matching
  similarity_score FLOAT,          -- 0.0-1.0 (0.75 = 75% match)
  match_confidence TEXT,           -- "high" | "medium" | "low"
  matching_skills TEXT[],          -- ["CAD", "thermal analysis"]
  matching_dwas TEXT[],            -- ["Design HVAC systems"]

  -- Metadata
  source TEXT,                     -- "apollo_discovery" | "adzuna"
  discovery_source TEXT,           -- "syllabus_generation"
  data_enrichment_level TEXT,      -- "basic" | "apollo_verified" | "fully_enriched"
  data_completeness_score INT,     -- 0-100
  last_enriched_at TIMESTAMP,
  last_verified_at TIMESTAMP,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

#### `projects` - Generated Project Proposals

```sql
projects (
  id UUID PRIMARY KEY,
  course_id UUID,                  -- FK to course_profiles
  generation_run_id UUID,          -- FK to generation_runs
  company_id UUID,                 -- FK to company_profiles

  -- Project Info
  title TEXT,                      -- "Automated HVAC System Optimization"
  description TEXT,                -- Full description
  status TEXT,                     -- "ai_shell" | "curated_live" | "completed"
  tier TEXT,                       -- "Gold" | "Silver" | "Bronze"

  -- Scoring
  lo_score FLOAT,                  -- Learning outcome alignment (0-1)
  feasibility_score FLOAT,         -- Can students complete? (0-1)
  mutual_benefit_score FLOAT,      -- Win-win for both sides? (0-1)
  final_score FLOAT,               -- Weighted average

  -- Project Details
  tasks TEXT[],                    -- ["Analyze data", "Design algorithm"]
  deliverables TEXT[],             -- ["Technical report", "Python prototype"]
  budget_estimate DECIMAL,         -- Inferred from company revenue

  -- Contact
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  -- Forms (6 sections)
  project_forms JSONB,             -- {overview, academic, logistics, contact, timeline, verification}

  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## Critical Code Paths

### Path 1: Discovery Pipeline (discover-companies)

**File**: `supabase/functions/discover-companies/index.ts`

```typescript
// PHASE 1: SOC Code Mapping (Lines 217-296)
const socMappings = mapCourseToSOC(courseTitle, outcomes, level);
// Example: "Industrial Engineering" → 17-2112.00

// Fetch O*NET occupation details
const onetOccupations = await fetchOccupationDetails(socMappings);
// Returns: skills, DWAs, technologies, tools

// Extract skills for semantic matching
const extractedSkills = extractSkillsFromOccupations(onetOccupations);
// Example: ["CAD design", "thermal analysis", "fluid dynamics"]

// PHASE 2: Store in database (Lines 368-401)
await supabase.from('generation_runs').update({
  onet_occupations: primaryOccupations,
  extracted_skills: skillExtractionResult.skills,
  skill_extraction_model: 'soc-mapping'
}).eq('id', generationRunId);

// PHASE 3: Apollo Discovery (Lines 405-434)
const apolloProvider = await ProviderFactory.getProvider({provider: 'apollo'});
const discoveryResult = await apolloProvider.discover(courseContext);

// PHASE 4: Semantic Filtering (Lines 444-638)
const semanticResult = await rankCompaniesBySimilarity(
  extractedSkills,
  onetOccupations,
  discoveryResult.companies,
  threshold = 0.50
);

// INTELLIGENT FALLBACK: If all filtered out
if (semanticResult.matches.length === 0) {
  // Preserve top N companies above minimum threshold
  const viableCompanies = allCompanies.filter(c => c.score > 0.01);
  // Better to return low-confidence matches than 0 results
}

// PHASE 5: Store companies (Lines 680-777)
for (const company of filteredCompanies) {
  await supabase.from('company_profiles').upsert(companyData);
}

// PHASE 6: Return success (Lines 800-815)
return {
  success: true,
  companies: discoveryResult.companies,
  count: discoveryResult.companies.length,
  generation_run_id: generationRunId
};
```

---

### Path 2: Apollo Provider (apollo-provider.ts)

**File**: `supabase/functions/discover-companies/providers/apollo-provider.ts`

```typescript
// INTELLIGENT FILTER GENERATION (Lines 226-546)
const filters: ApolloSearchFilters = {
  // Location (2-part format)
  organization_locations: ["Kansas City, Missouri"],  // NOT 3-part

  // Industry keywords (Apollo-compatible)
  q_organization_keyword_tags: [
    "engineering",       // NOT "Mechanical Or Industrial Engineering"
    "manufacturing",
    "automation",
    "industrial"
  ],

  // Exclude recruiters
  person_not_titles: ["Recruiter", "HR Manager", "Talent Acquisition"],

  // All company sizes
  organization_num_employees_ranges: ["1,10", "11,50", ..., "1001,10000"],

  // CRISIS RECOVERY: DISABLED
  currently_using_any_of_technology_uids: undefined  // Was causing 0 results
};

// MULTI-STAGE SEARCH (Lines 632-790)
// 1. Try specific location
let orgs = await trySearch(filters, maxResults, page);

// 2. If 0 results, try state level
if (orgs.length === 0 && location.includes(',')) {
  filters.organization_locations = [state];  // "Missouri"
  orgs = await trySearch(filters, maxResults, page);
}

// 3. If still 0, try country level
if (orgs.length === 0) {
  filters.organization_locations = ["United States"];
  orgs = await trySearch(filters, maxResults, page);
}

// 4. If still <2, try location-only (no industry filters)
if (orgs.length < 2) {
  filters.q_organization_keyword_tags = [];
  orgs = await trySearch(filters, maxResults * 2, page);
}

// ENRICHMENT (Lines 855-1043)
for (const org of orgs) {
  // 1. Organization enrichment (technologies, revenue, funding)
  const enrichedOrg = await apolloEnrich(org);

  // 2. Find decision-maker contact
  const contact = await apolloPeopleSearch({
    organization_ids: [org.id],
    person_titles: ['Director of Partnerships', 'VP', 'COO', 'CEO'],
    person_seniorities: ['c_suite', 'vp', 'director', 'owner']
  });

  // 3. Fetch job postings
  const jobPostings = await apolloJobPostings(org.id);

  // 4. Calculate data completeness
  const completeness = calculateDataCompleteness({
    contact,
    org: enrichedOrg,
    jobPostings,
    technologies: enrichedOrg.technologies
  });

  return {
    name: org.name,
    website: org.website,
    contactEmail: contact.email,
    jobPostings: jobPostings,
    technologiesUsed: enrichedOrg.technologies,
    dataCompletenessScore: completeness.score,
    enrichmentLevel: completeness.level  // "fully_enriched" | "apollo_verified" | "basic"
  };
}
```

---

### Path 3: Semantic Matching (semantic-matching-service.ts)

**File**: `supabase/functions/_shared/semantic-matching-service.ts`

```typescript
// SENTENCE-BERT EMBEDDINGS
const embeddingService = new EmbeddingService();

// 1. Create course content embedding
const courseText = [
  ...extractedSkills.map(s => s.skill),
  ...onetOccupations.flatMap(o => o.dwas.map(d => d.name))
].join(' ');

const courseEmbedding = await embeddingService.embed(courseText);

// 2. For each company, create embedding
for (const company of companies) {
  const companyText = [
    company.sector,
    ...company.jobPostings.map(j => j.title + ' ' + j.description),
    ...company.technologiesUsed
  ].join(' ');

  const companyEmbedding = await embeddingService.embed(companyText);

  // 3. Calculate cosine similarity
  const similarity = cosineSimilarity(courseEmbedding, companyEmbedding);

  // 4. Also check keyword overlap for transparency
  const matchingSkills = findMatchingSkills(extractedSkills, company);
  const matchingDWAs = findMatchingDWAs(onetOccupations, company);

  return {
    companyName: company.name,
    similarityScore: similarity,  // 0.0-1.0
    confidence: similarity > 0.7 ? 'high' : similarity > 0.5 ? 'medium' : 'low',
    matchingSkills,
    matchingDWAs,
    explanation: generateExplanation(similarity, matchingSkills, matchingDWAs)
  };
}

// 5. Filter by threshold
const matches = allMatches.filter(m => m.similarityScore >= threshold);

// GRACEFUL DEGRADATION: If empty, use fallback
if (matches.length === 0) {
  console.log('⚠️ All companies filtered out - applying intelligent fallback');
  // Preserve top N with score > 1% (adaptive based on Apollo result count)
}
```

---

## Environment Variables

**Required:**

```bash
# Apollo.io (Primary Provider)
APOLLO_API_KEY=<your-apollo-key>

# Lovable AI Gateway (AI Generation)
LOVABLE_API_KEY=<your-lovable-key>

# Supabase (Database)
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_ANON_KEY=<your-anon-key>
```

**Optional:**

```bash
# Provider Selection
DISCOVERY_PROVIDER=apollo  # Default
FALLBACK_PROVIDER=adzuna   # Optional

# Feature Flags (not currently used, but recommended)
FF_TECH_FILTER=false       # Technology filtering
FF_DISTANCE_FILTER=false   # 150-mile maximum distance
FF_REQUEST_MULT=3          # Request size multiplier
```

---

## Common Workflows

### Workflow 1: Normal Generation (Happy Path)

```
1. User uploads syllabus PDF
   → parse-syllabus extracts outcomes
   → detect-location auto-detects "Kansas City, Missouri"
   → Stores in course_profiles

2. User clicks "Generate Projects"
   → Configure page validates location format
   → Calls discover-companies with:
     {
       courseId: "...",
       location: "Kansas City, Missouri",
       count: 4
     }

3. discover-companies pipeline:
   Phase 1: Extract skills from outcomes
   Phase 2: Map to O*NET occupations (SOC codes)
   Phase 3: Apollo discovers 15 companies
   Phase 4: Semantic filter → 8 companies pass
   Phase 5: Store companies in database

4. generate-projects:
   For each company:
     - AI generates project proposal
     - Calculates LO alignment score
     - Creates project forms
     - Stores in projects table

5. Frontend polling:
   Every 10 seconds:
     - Check projects table for completed status
     - Show progress: "3 of 4 projects completed"

   When all done:
     - Navigate to /projects page
     - Display generated projects
```

---

### Workflow 2: Discovery Failure (What Goes Wrong)

```
1. User uploads syllabus → Success
2. User clicks "Generate Projects"
3. discover-companies starts:
   ✅ Phase 1: Skills extracted
   ✅ Phase 2: O*NET mapping complete
   ❌ Phase 3: Apollo returns 0 companies

   REASON: One of:
     - Stale database: search_location = "Kansas City, Missouri, United States" (3-part)
     - Apollo API key invalid/expired
     - Industry keywords don't match Apollo's index
     - Location format not recognized by Apollo

4. Pipeline error handling:
   - Classifies error as "DATA_ERROR"
   - Stores in generation_runs.error_category
   - Returns to frontend:
     {
       success: false,
       error: "No suitable companies found",
       category: "DATA_ERROR"
     }

5. Frontend displays user-friendly message:
   "No suitable companies found for this course and location.
    Try adjusting the location or number of teams."
```

---

### Workflow 3: Semantic Filtering Rejects All (Edge Case)

```
1. Discovery runs normally
2. Apollo returns 15 companies
   BUT: All are staffing/recruiting firms
   - Robert Half
   - Adecco
   - Kelly Services
   - ManpowerGroup

3. Semantic matching:
   Course: Industrial Engineering (CAD, thermal systems, fluid dynamics)
   Companies: Staffing firms (no technical job postings)

   Similarity scores:
   - Robert Half: 0.08 (8%)
   - Adecco: 0.12 (12%)
   - Kelly Services: 0.05 (5%)

   Threshold: 0.50 (50% required)

   Result: ALL REJECTED

4. Intelligent fallback activated:
   "All companies filtered out - checking if ANY are above 1% threshold"

   If yes:
     - Preserve top 4 with "low confidence" flag
     - Generate projects with warning

   If no (all truly 0%):
     - Return 0 companies
     - Error: "All discovered companies were staffing firms (not relevant)"
```

---

## Crisis Recovery State

### What Was Disabled (Commit b476171)

1. **Technology Filtering**
   - `currently_using_any_of_technology_uids` set to `undefined`
   - Reason: May not be supported by Apollo or needs numeric IDs

2. **Distance Filter**
   - 150-mile maximum distance check commented out
   - Reason: Too restrictive after Apollo returned distant companies

3. **Request Size Reduced**
   - Changed from `targetCount * 10` to `targetCount * 3`
   - Reason: Larger requests may have caused Apollo API issues

### What Was Kept

✅ Location format validation (2-part: "City, State")
✅ Industry keyword simplification (Apollo-compatible)
✅ Diagnostic logging (comprehensive console output)
✅ Geographic fallback (city → state → country)

---

## Known Issues & Status

| Issue | Severity | Status | Fix Available |
|-------|----------|--------|---------------|
| Stale 3-part location format in database | CRITICAL | ⚠️ Identified | SQL update script |
| Apollo industry keyword mismatch | CRITICAL | ✅ Partially Fixed | Simplified keywords |
| Geographic fallback too aggressive | HIGH | ❌ Not Fixed | Change threshold to 0 |
| Technology filtering format unknown | HIGH | ⚠️ Disabled | Needs Apollo docs research |
| Request size too small (12 companies) | MEDIUM | ⚠️ Changed | Could increase to *5 or *7 |
| Semantic filter rejecting all | MEDIUM | ✅ Has Fallback | Intelligent fallback at 1-5% |
| Apollo API key validation | HIGH | ❓ Unknown | Need to verify credentials |

---

## Testing Checklist for Agents

When debugging generation failures, check these in order:

### 1. Database State
```sql
-- Check location format
SELECT id, title, search_location
FROM course_profiles
WHERE id = '<course-id>';

-- Should be: "Kansas City, Missouri" (2-part)
-- NOT: "Kansas City, Missouri, United States" (3-part)
```

### 2. Environment Variables
```bash
# In Supabase dashboard
- APOLLO_API_KEY is set and not empty
- LOVABLE_API_KEY is set and not empty
```

### 3. Apollo API Key Validity
```bash
curl -X POST https://api.apollo.io/v1/mixed_companies/search \
  -H "X-Api-Key: $APOLLO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_locations": ["United States"], "per_page": 1}'

# Should return JSON with 1 company
# If 401/403: Invalid key
# If 429: Rate limit
```

### 4. Recent Generation Run
```sql
SELECT
  id,
  status,
  error_category,
  error_message,
  companies_discovered,
  companies_after_filtering,
  created_at
FROM generation_runs
ORDER BY created_at DESC
LIMIT 5;

-- status should be 'completed'
-- companies_discovered should be > 0
-- companies_after_filtering should be > 0
```

### 5. Companies in Database
```sql
SELECT
  c.name,
  c.city,
  c.state,
  c.similarity_score,
  c.match_confidence
FROM company_profiles c
WHERE generation_run_id = '<run-id-from-above>'
ORDER BY similarity_score DESC;

-- Should have 4+ companies
-- similarity_score should be > 0.5
```

### 6. Edge Function Logs
- In Supabase dashboard → Edge Functions → Logs
- Look for:
  - ✅ "✅ Apollo search complete: 15 companies found"
  - ❌ "❌ ZERO RESULTS FROM APOLLO"
  - ❌ "Semantic filtering: 15 → 0 companies"

---

## Quick Fixes

### Fix 1: Update Stale Location Data

```sql
UPDATE course_profiles
SET search_location = CASE
  WHEN search_location LIKE '%,%,%' THEN
    substring(search_location from '^([^,]+,\s*[^,]+)')
  ELSE search_location
END
WHERE search_location LIKE '%,%,%';
```

### Fix 2: Re-enable Technology Filtering (Test)

```typescript
// File: apollo-provider.ts, Line 504
currently_using_any_of_technology_uids: technologyUIDs.length > 0 ? technologyUIDs : undefined
```

### Fix 3: Increase Request Size

```typescript
// File: apollo-provider.ts, Line 131
const organizations = await this.searchOrganizations(
  filters,
  context.targetCount * 7,  // Increase from 3 to 7
  pageOffset
);
```

### Fix 4: Enable Adzuna Fallback

```typescript
// File: discover-companies/index.ts
try {
  const result = await apolloProvider.discover(context);
  if (result.companies.length === 0) {
    const adzunaProvider = await ProviderFactory.getProvider({provider: 'adzuna'});
    return await adzunaProvider.discover(context);
  }
  return result;
} catch (error) {
  const adzunaProvider = await ProviderFactory.getProvider({provider: 'adzuna'});
  return await adzunaProvider.discover(context);
}
```

---

## For AI Agents: Decision Tree

```
START: Generation failed
  │
  ├─ Check: Is error_category = "CONFIG_ERROR"?
  │   YES → Verify environment variables (APOLLO_API_KEY, LOVABLE_API_KEY)
  │   NO ↓
  │
  ├─ Check: Is error_category = "DATA_ERROR"?
  │   YES ↓
  │   ├─ Check: companies_discovered = 0?
  │   │   YES → Apollo returning 0 companies
  │   │   ├─ Fix 1: Update stale location data (SQL)
  │   │   ├─ Fix 2: Test Apollo API key manually
  │   │   └─ Fix 3: Try Adzuna fallback
  │   │
  │   └─ Check: companies_discovered > 0 but companies_after_filtering = 0?
  │       YES → Semantic filter rejecting all
  │       ├─ Check logs: Are they staffing firms?
  │       │   YES → Strengthen Apollo exclusion filters
  │       └─ Lower semantic threshold or verify fallback logic
  │
  ├─ Check: Is error_category = "EXTERNAL_API_ERROR"?
  │   YES → Apollo API issue
  │   ├─ Check details.status = 429? → Rate limit (wait or upgrade plan)
  │   ├─ Check details.status = 401/403? → Invalid API key
  │   └─ Check details.status = 500? → Apollo service down (use Adzuna)
  │
  └─ Check: Is error_category = "UNKNOWN_ERROR"?
      YES → Check Edge Function logs for stack trace
```

---

## Success Metrics

When generation is working correctly:

✅ **Discovery Pipeline:**
- companies_discovered: 10-20+
- companies_after_filtering: 4-8
- status: "completed"
- processing_time_seconds: < 60

✅ **Semantic Matching:**
- average_similarity_score: > 0.55
- semantic_filter_applied: true
- semantic_filter_threshold: 0.50

✅ **Companies:**
- data_completeness_score: > 70
- enrichment_level: "apollo_verified" or "fully_enriched"
- similarity_score: > 0.50
- match_confidence: "high" or "medium"

✅ **Projects:**
- All projects with status: "ai_shell"
- final_score: > 0.70
- lo_score: > 0.60

---

## Conclusion for Agents

**This system is a sophisticated 5-phase pipeline:**

1. Upload & Parse (PDF → Learning Outcomes)
2. Skill Extraction (Outcomes → SOC Codes)
3. Company Discovery (SOC → Apollo Search)
4. Semantic Filtering (Embeddings → Relevance Scores)
5. Project Generation (AI → Custom Proposals)

**Current issue:**
- **Most likely**: Stale database data (3-part location format)
- **Second likely**: Apollo API key issues or rate limiting
- **Third likely**: Semantic filter too aggressive

**First action:**
1. Run SQL to fix location format
2. Verify Apollo API key
3. Test discovery with fresh course

**If still failing:**
- Check Edge Function logs for specific error
- Use decision tree above to diagnose
- Consider switching to Adzuna as fallback

---

**Document Version**: 1.0
**Date**: November 23, 2025
**For**: AI Agents & Project Managers
**Status**: Complete and Ready for Use
