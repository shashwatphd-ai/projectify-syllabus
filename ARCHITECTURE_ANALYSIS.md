# Comprehensive Architecture & Code Analysis

## Code Metrics Summary

| Metric | Count |
|--------|-------|
| **Total TypeScript Files** | 223 |
| **Total Lines of Code** | 54,458 |
| **Frontend Files (src/)** | 144 files, 24,933 lines |
| **Edge Functions (supabase/functions/)** | 78 files, 29,412 lines |
| **Page Components** | 22 |
| **React Components** | 96 |
| **Custom Hooks** | 9 |
| **Contexts** | 2 |

### Largest Files (Complexity Hotspots)

| File | Lines | Concern |
|------|-------|---------|
| `apollo-provider.ts` | 1,939 | Monolithic provider with too many responsibilities |
| `supabase/types.ts` | 1,753 | Auto-generated, acceptable |
| `discover-companies/index.ts` | 1,468 | God function with 8+ phases in single file |
| `generate-projects/index.ts` | 1,104 | Complex orchestration logic |
| `AdminHub.tsx` | 716 | UI + business logic mixed |
| `ProjectDetail.tsx` | 686 | 12+ tabs, no code splitting |

---

## Critical Architectural Flaws

### 1. Monolithic Edge Functions (God Functions)

**Location:** `supabase/functions/discover-companies/index.ts` (1,468 lines)

The discover-companies function handles 8+ distinct phases in a single file:
1. Authentication
2. Input validation
3. SOC code mapping
4. O*NET occupation fetching
5. Provider discovery (Apollo/Adzuna)
6. Semantic filtering
7. Signal score calculation
8. Career page validation (Firecrawl)
9. Database storage

**Impact:**
- Single function timeout (10 min default) limits total processing
- Cold start latency compounds across all phases
- Failure in any phase aborts entire pipeline
- Cannot scale individual phases independently
- Testing requires mocking 15+ external dependencies

**Recommendation:** Split into a saga pattern with separate functions per phase, coordinated by a state machine stored in `generation_runs`.

---

### 2. Synchronous Sequential API Calls

**Location:** `src/pages/Configure.tsx:192-403`

The project generation flow makes sequential API calls that could be parallelized:

```typescript
// Step 1: Discover companies (waits for completion)
const { data: discoveryData } = await supabase.functions.invoke('discover-companies', {...});

// Step 2: Only THEN generate projects (waits for discovery)
const { data } = await supabase.functions.invoke('generate-projects', {...});
```

**Impact:**
- User waits 30-60 seconds for both operations to complete
- No partial progress visibility
- If generation fails, discovery work is wasted

**Current Mitigation:** Polling every 10 seconds (`pollingInterval.current`), but this is inefficient.

**Recommendation:** Use Supabase Realtime subscriptions on `generation_runs` status changes instead of polling.

---

### 3. Duplicated Business Logic Across Edge Functions

**Files:** `generate-projects/index.ts` and `run-single-project-generation/index.ts`

Both files contain identical copies of:
- `calculateScores()` (lines 65-83 in both)
- `cleanAndValidate()` (lines 85-128 in both)
- `generateMilestones()` (lines 130-143 in both)
- `createForms()` (lines 145-200 in both)
- `CompanyInfo` interface (lines 9-38 in both)
- `ProjectProposal` interface (lines 40-63 in both)

**Impact:**
- Bug fixes must be applied in multiple places
- Drift between implementations causes subtle bugs
- 468 lines of duplicated code

**Recommendation:** Extract to `supabase/functions/_shared/project-utils.ts`.

---

### 4. Missing Database Transactions (Orphaned Data Risk)

**Location:** `run-single-project-generation/index.ts:340-415`

Project creation uses 3 separate database calls that can partially fail:

```typescript
// Call 1: Update project
const { error: updateError } = await serviceRoleClient
  .from('projects')
  .update({...})
  .eq('id', project_id);

// Call 2: Insert forms (can fail independently)
const { error: formsError } = await serviceRoleClient
  .from('project_forms')
  .insert({...});

// Call 3: Insert metadata (can fail independently)
const { error: metadataError } = await serviceRoleClient
  .from('project_metadata')
  .insert({...});
```

**Impact:** If forms insert succeeds but metadata fails, project has incomplete data.

**Note:** The main `generate-projects` function correctly uses `create_project_atomic` RPC, but the worker function does not.

---

### 5. Hardcoded Retry Logic with No Circuit Breaker

**Location:** `generate-projects/index.ts:979-1025`

```typescript
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  // ... retry with exponential backoff
  if (isTransientError) {
    const delay = Math.pow(2, attempt) * 500;
    await new Promise(r => setTimeout(r, delay));
  }
}
```

**Missing:**
- No circuit breaker to stop retrying after repeated failures
- No rate limit tracking across invocations
- No persistent failure tracking

**Impact:** During outages, users experience maximum delays (1s + 2s + 4s = 7s per project) multiplied by number of projects.

---

## Logical Flaws in Business Logic

### 1. Race Condition in Auth Role Fetching

**Location:** `src/contexts/AuthContext.tsx:77-79`

```typescript
setTimeout(() => {
  fetchUserRoles(session.user.id);
}, 0);
```

The comment says this is to "avoid Supabase auth deadlock", but it creates a race condition:
- UI components may render before roles are fetched
- `isAdmin`, `isFaculty`, etc. return `false` during the race window
- Protected routes may incorrectly deny access

---

### 2. Feasibility Score is Hardcoded

**Location:** `generate-projects/index.ts:118-119`

```typescript
const feasibility_score = weeks >= 12 ? 0.85 : 0.65;
const mutual_benefit_score = 0.80;
```

These scores should be calculated based on:
- Company size vs. project complexity
- Student skill match vs. required skills
- Historical completion rates

**Impact:** All projects within the same duration get identical feasibility scores, reducing scoring accuracy.

---

### 3. Semantic Filter Threshold Too Low

**Location:** `discover-companies/index.ts:761-764`

```typescript
let threshold = 0.01; // Extremely low threshold to pass nearly all companies
const MIN_THRESHOLD = 0.01; // Already at minimum
```

With a 1% threshold, the semantic filtering is essentially disabled. This means:
- Staffing agencies match "software engineering" courses
- Unrelated industries pass through
- The "intelligent fallback" at line 841-926 is almost always triggered

---

### 4. Contact Information Fallback to "TBD"

**Location:** `generate-projects/index.ts:401-410`

```typescript
form2: {
  contact_name: company.contact_person || 'TBD',
  contact_email: company.contact_email || '',
  contact_title: company.contact_title || 'TBD',
  // ...
}
```

**Impact:** Projects are created with placeholder contact data, then presented to students as "live" projects. The `needs_review` flag should be set when contact data is missing.

---

## API & Resource Orchestration Inefficiencies

### 1. Polling Instead of Realtime Subscriptions

**Location:** `src/pages/Configure.tsx:99-166`

```typescript
// Start polling every 10 seconds
pollingInterval.current = window.setInterval(checkProjectStatus, 10000);
```

**Cost:**
- At 10s intervals, a 60-second generation makes 6 unnecessary API calls
- Each call queries `projects` table and counts results
- Multiplied across concurrent users

**Better:** Subscribe to `generation_runs` status changes via Supabase Realtime.

---

### 2. Cold Start Cascade in Edge Functions

Each edge function invocation has a cold start penalty (~500ms-2s). The pipeline calls multiple functions sequentially:

1. `discover-companies` (cold start)
2. `generate-projects` (cold start)
3. For each project: internal AI API calls

**Total cold start penalty:** 2-4 seconds just for function initialization.

**Recommendation:** Consider a single orchestrator function that calls shared modules, or warm functions with scheduled pings.

---

### 3. Excessive Apollo API Calls

**Location:** `supabase/functions/discover-companies/providers/apollo-provider.ts`

The Apollo provider makes multiple API calls per discovery:
1. Organization search (1 call)
2. For each organization: People search (N calls)
3. For each person: Email enrichment (N calls)
4. Job postings fetch (N calls)

**For 4 companies:** 1 + 4 + 4 + 4 = 13 API calls minimum

**Recommendation:** Use Apollo's batch API endpoints where available.

---

### 4. Client-Side Data Joining

**Location:** `src/pages/EmployerDashboard.tsx:175-191`

```typescript
// Fetch applications
const { data: applicationsData } = await supabase.from("project_applications")...

// Then fetch student profiles separately
const { data: profilesData } = await supabase.from("profiles").in("id", studentIds);

// Client-side join
const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
const enrichedApplications = applicationsData.map(app => ({
  ...app,
  student_email: profilesMap.get(app.student_id)?.email || null
}));
```

**Impact:** Two sequential queries + O(n) client-side processing instead of a single joined query.

---

### 5. O*NET API Called Serially

**Location:** `discover-companies/index.ts:448-507`

```typescript
for (const socMapping of socMappings.slice(0, 3)) {
  try {
    const occDetails = await onetProvider.getOccupationDetails(socMapping.socCode);
    // ...
  }
}
```

**Impact:** 3 sequential O*NET API calls with no parallelization.

**Fix:**
```typescript
const onetPromises = socMappings.slice(0, 3).map(soc =>
  onetProvider.getOccupationDetails(soc.socCode)
);
const onetResults = await Promise.allSettled(onetPromises);
```

---

### 6. Firecrawl Called Synchronously Per Company

**Location:** `discover-companies/index.ts:1294-1348`

```typescript
for (const company of topCompaniesToValidate) {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {...});
  // ...
}
```

**Impact:** For 3 companies, adds ~6-9 seconds to discovery (2-3s per scrape).

**Fix:** Use `Promise.all()` for parallel scraping.

---

## Missing Infrastructure

### 1. No Request Deduplication

Multiple UI components independently fetch the same data:
- `Header.tsx` fetches notification count
- `Projects.tsx` fetches projects
- Each component maintains its own loading state

**Fix:** Implement React Query's `queryClient.prefetchQuery()` or shared query keys.

---

### 2. No Caching Layer

**Location:** Comments in `generate-projects/index.ts:99-105`

```typescript
// REMOVED: All caching and fallback functions (Phase 3b cleanup)
// - getCompaniesFromDB: Removed in Phase 3a
// - generateCacheKey: Orphaned helper, will be rebuilt in Phase 4
// - getCachedFilteredCompanies: Orphaned caching, will be rebuilt in Phase 4
```

Caching was intentionally removed but not rebuilt. Every discovery query hits Apollo API directly.

---

### 3. No Background Job Queue

Long-running operations (project generation, company enrichment) run synchronously in edge functions with a 10-minute timeout. No job queue means:
- No retry semantics across function invocations
- No priority queuing
- No rate limit coordination

**Recommendation:** Implement using Supabase Edge Function + `pg_net` for async HTTP calls, or external queue (Upstash, Inngest).

---

## Summary Table

| Category | Issues Found | Severity |
|----------|-------------|----------|
| Architectural Flaws | 5 | Critical |
| Logical Flaws | 4 | High |
| API Inefficiencies | 6 | High |
| Missing Infrastructure | 3 | Medium |
| Code Duplication | ~500 lines | Medium |

---

## Recommended Priority Actions

1. **Split `discover-companies` into a saga** with separate functions per phase
2. **Replace polling with Realtime subscriptions** in Configure page
3. **Extract duplicated code** to shared modules
4. **Parallelize O*NET and Firecrawl calls** with `Promise.all()`
5. **Add circuit breaker** to Apollo API calls
6. **Use atomic transactions** in run-single-project-generation
7. **Implement background job queue** for long-running operations

---

*Generated: 2026-01-03*
