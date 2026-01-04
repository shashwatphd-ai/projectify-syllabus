# Performance Analysis Report

## Executive Summary

This document identifies performance anti-patterns, N+1 queries, unnecessary re-renders, and inefficient algorithms found in the codebase. Issues are categorized by severity (Critical, High, Medium, Low).

---

## Critical Issues

### 1. N+1 Query Pattern in Realtime Notifications Hook

**File:** `src/hooks/useRealtimeNotifications.ts:93-115`

```typescript
// For EVERY project update, makes a separate database query
.on("postgres_changes", { ... }, async (payload) => {
  const { data: course } = await supabase
    .from("course_profiles")
    .select("id, owner_id")
    .eq("id", updated.course_id)
    .eq("owner_id", user.id)
    .maybeSingle();
```

**Impact:** Each project update event triggers a database query to check ownership. With N projects, this creates N database calls.

**Recommendation:** Pre-fetch faculty courses on login and cache them, then check ownership client-side using the cached data.

---

### 2. N+1 Query in Employer Notifications

**File:** `src/hooks/useRealtimeNotifications.ts:147-170`

```typescript
// For EVERY application INSERT, makes a separate database query
async (payload) => {
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, company_profile_id, company_profiles!inner(owner_user_id)")
    .eq("id", newApp.project_id)
    .maybeSingle();
```

**Impact:** Every student application triggers an ownership verification query.

**Recommendation:** Subscribe only to applications for projects owned by the employer (use filter in the subscription).

---

### 3. Sequential Database Calls in Admin Hub

**File:** `src/pages/AdminHub.tsx:117-160`

```typescript
const loadProjects = async () => {
  const { data: projectData } = await supabase.from('projects')... // Query 1
  const { data: signalData } = await supabase.from('company_signals')... // Query 2
  // Then client-side join
```

**Impact:** Two sequential queries instead of a single join query. Client-side mapping of signals to projects (O(n*m) complexity).

**Recommendation:** Use a single query with a join, or use a database view that pre-joins this data.

---

### 4. Sequential Waterfall Queries in EmployerDashboard

**File:** `src/pages/EmployerDashboard.tsx:81-92, 147-198`

```typescript
// Waterfall pattern: each useEffect waits for the previous
useEffect(() => { if (user && isEmployer) { fetchCompanyProfile(); } }, [user, isEmployer]);
useEffect(() => { if (companyProfile) { fetchProjects(); fetchApplications(); } }, [companyProfile]);

// fetchApplications makes 2 sequential queries:
const { data: applicationsData } = await supabase.from("project_applications")...
const { data: profilesData } = await supabase.from("profiles").in("id", studentIds);
```

**Impact:** 4 waterfall database calls on page load (companyProfile -> projects + applications -> profiles).

**Recommendation:** Combine into a single edge function call that returns all dashboard data in one request.

---

## High Severity Issues

### 5. Client-Side Skill Filtering in useDemandSignals

**File:** `src/hooks/useDemandSignals.ts:60-70`

```typescript
// Fetches ALL signals, then filters client-side
let results = (data ?? []) as DemandSignal[];
if (filters?.skills && filters.skills.length > 0) {
  results = results.filter((signal) =>
    filters.skills!.some((skill) =>
      (signal.required_skills ?? []).some((s) =>
        s.toLowerCase().includes(skill.toLowerCase())
      )
    )
  );
}
```

**Impact:** Downloads all demand signals from the database, then filters in JavaScript. O(signals * filterSkills * signalSkills) complexity.

**Recommendation:** Use PostgreSQL's array operators (`@>`, `&&`) to filter server-side.

---

### 6. Missing React.memo on Frequently Re-rendered Components

**Files affected:** Most components in `src/components/`

Only 7 files use `useMemo`, `useCallback`, or `memo`:
- `src/pages/Projects.tsx` (uses useMemo for flatMap)
- `src/pages/InstructorDashboard.tsx` (uses useMemo)
- `src/contexts/NotificationContext.tsx` (uses useCallback)

**Missing memoization in high-traffic components:**
- `Header.tsx` - Re-renders on every route change
- `ProjectCard` components (inside `.map()` in Projects.tsx)
- All tab components in `project-detail/`

**Recommendation:** Wrap stable callback functions in `useCallback`, expensive computations in `useMemo`, and pure list item components in `React.memo`.

---

### 7. Inline Functions in Render Causing Re-renders

**File:** `src/pages/Projects.tsx:327-471`

```typescript
{projects.map((project) => (
  <Card
    key={project.id}
    onClick={() => navigate(`/projects/${project.id}`, { state: { courseId: selectedCourseId } })}
  >
    // Multiple inline arrow functions for onClick handlers
    onClick={(e) => handleApplyToProject(project.id, e)}
    onClick={(e) => handleRateProject(project, e)}
```

**Impact:** New function instances created on every render, causing child component re-renders.

**Recommendation:** Extract handlers with `useCallback` and pass stable references.

---

### 8. Synchronous localStorage Operations on Every Project View

**File:** `src/hooks/useProjectAnalytics.ts:51-76`

```typescript
useEffect(() => {
  // Runs on EVERY project view
  const recentViews = JSON.parse(localStorage.getItem('recentProjectViews') || '[]');
  recentViews.unshift(analyticsData);
  localStorage.setItem('recentProjectViews', JSON.stringify(recentViews));

  // Also calculates aggregate metrics synchronously
  const enrichmentLevels = recentViews.reduce((acc, view) => {...}, {});
  const avgCompleteness = recentViews.reduce((sum, view) => sum + view.completenessScore, 0);
});
```

**Impact:** Synchronous JSON parse/stringify and localStorage I/O blocks the main thread. Aggregate calculations run on every view.

**Recommendation:** Debounce analytics writes, use web workers for aggregation, or batch writes.

---

## Medium Severity Issues

### 9. Duplicate Category/Region Queries

**File:** `src/hooks/useDemandSignals.ts:79-114`

```typescript
export const useDemandCategories = () => {
  // Fetches ALL demand_signals just to extract unique categories
  const { data } = await supabase.from("demand_signals").select("project_category")...
  const categories = [...new Set((data ?? []).map((d) => d.project_category))];
};

export const useDemandRegions = () => {
  // Same pattern - fetches ALL to get unique regions
  const { data } = await supabase.from("demand_signals").select("geographic_region")...
};
```

**Impact:** Two queries that could be one, and both fetch all rows to extract unique values.

**Recommendation:** Create a database view or use `SELECT DISTINCT` queries. Better: cache these values as they change infrequently.

---

### 10. NotificationContext Value Object Recreated Every Render

**File:** `src/contexts/NotificationContext.tsx:54-65`

```typescript
// `unreadCount` is computed on every render
const unreadCount = notifications.filter((n) => !n.read).length;

// This object is recreated every render
return (
  <NotificationContext.Provider value={{
    notifications,
    unreadCount, // Triggers re-renders when computed
    // ...
  }}>
```

**Impact:** `unreadCount` computation and new object reference trigger re-renders in all consumers.

**Recommendation:** Memoize `unreadCount` with `useMemo` and the context value object.

---

### 11. Large Job Postings Payload in Projects List

**File:** `src/hooks/usePaginatedProjects.ts:70, 100, 128`

```typescript
.select("*, course_profiles(owner_id, title), company_profiles(job_postings)")
```

**Impact:** `job_postings` can be a large array (job titles, descriptions, etc.) loaded for EVERY project in the list, when only a count might be needed.

**Recommendation:** Either select only `job_postings_count` or use a computed field to avoid transferring full job data.

---

### 12. Missing Query Deduplication Across Components

**Files:** Multiple pages/components independently fetch the same data

- `Header.tsx` - fetches `newMatchCount`
- `Projects.tsx` - fetches courses, projects
- `AdminHub.tsx` - fetches projects, submissions, faculty
- Multiple components may fetch the same project detail

**Impact:** Redundant API calls when navigating between pages that need similar data.

**Recommendation:** Leverage React Query's cache more aggressively, use query prefetching on hover/navigation intent.

---

## Low Severity Issues

### 13. Double Session Check in AuthContext

**File:** `src/contexts/AuthContext.tsx:65-101`

```typescript
// Auth state listener
supabase.auth.onAuthStateChange((_event, session) => {
  // Fetches roles here
});

// ALSO checks session separately
supabase.auth.getSession().then(({ data: { session } }) => {
  // Fetches roles again
});
```

**Impact:** Initial page load may trigger two role fetches.

**Recommendation:** Consolidate to a single session initialization path.

---

### 14. Array Spread in Notification Update

**File:** `src/pages/Projects.tsx:186`

```typescript
setAppliedProjects(prev => new Set([...prev, projectId]));
```

**Impact:** Spreads entire Set into array, creates new Set. Minor but could use `.add()` on a cloned Set.

**Recommendation:** `setAppliedProjects(prev => { const next = new Set(prev); next.add(projectId); return next; });`

---

### 15. Timer Deferral in Role Fetching

**File:** `src/contexts/AuthContext.tsx:77-79`

```typescript
setTimeout(() => {
  fetchUserRoles(session.user.id);
}, 0);
```

**Impact:** Creates a microtask for every auth state change. Comment says it's to "avoid Supabase auth deadlock" but adds complexity.

**Recommendation:** Investigate if the deadlock still exists; if not, remove the deferral.

---

## Positive Patterns Found

1. **Lazy Loading Routes** (`src/App.tsx`) - All page routes use `React.lazy()` for code splitting
2. **React Query Configuration** - Good stale time (2min), GC time (5min), disabled refetch on focus
3. **Pagination** - Projects and courses use `useInfiniteQuery` with cursor-based pagination
4. **Single Edge Function for Project Detail** - `get-project-detail` consolidates 5 separate queries
5. **Notification Context uses useCallback** - Stable function references for handlers
6. **Skeleton Loading States** - Good UX while data loads

---

## Recommended Priority Order

1. **Critical:** Fix N+1 queries in realtime notification hooks
2. **Critical:** Consolidate EmployerDashboard waterfall queries
3. **High:** Move skill filtering server-side in useDemandSignals
4. **High:** Add memoization to frequently rendered components
5. **Medium:** Reduce job_postings payload size
6. **Medium:** Deduplicate category/region queries
7. **Low:** Clean up AuthContext double session check

---

## Estimated Impact

| Issue | Current Latency | Expected After Fix |
|-------|-----------------|-------------------|
| Realtime N+1 queries | Variable (per event) | Eliminated |
| EmployerDashboard load | 800-1200ms (4 waterfalls) | 200-400ms (1 call) |
| DemandSignals filtering | O(n*m*k) client-side | O(1) server index |
| Project list with job_postings | 50-100KB payload | 10-20KB payload |

---

*Generated: 2026-01-03*
