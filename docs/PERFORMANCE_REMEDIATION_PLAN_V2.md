# Performance Remediation Plan v2.0

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2026-01-04 | Claude + Lovable | Complete rewrite with session management, gap fixes, and step-by-step execution |

---

## How to Use This Document

### For AI Agents (Lovable/Claude)

This document is divided into **Sessions**. Each session:
- Can be completed in a single context window
- Has explicit **Entry Conditions** (what must be true before starting)
- Has explicit **Exit Conditions** (what must be verified before ending)
- Includes **Handoff Notes** for the next session

**Start each session by:**
1. Reading the Session Overview
2. Verifying Entry Conditions are met
3. Following tasks in order
4. Completing all verification steps
5. Recording results in the Session Completion Checklist

**If a session is interrupted:**
- Note which task was in progress
- Document any partial changes
- The next agent should check git status and resume from the last completed task

---

## Executive Summary

### Problem Statement
The codebase has 27 identified performance issues causing:
- 4x slower page loads than necessary
- 80x more database operations than optimal
- Excessive API calls during user interactions
- Poor user experience with loading states

### Solution Overview
A phased remediation across 8 sessions, estimated 2-3 days total:

| Session | Focus | Duration | Risk | Impact |
|---------|-------|----------|------|--------|
| 1 | Search Debouncing | 30 min | Low | High |
| 2 | Dashboard Parallelization | 45 min | Low | High |
| 3 | AdminHub O(N×M) Fix | 30 min | Low | High |
| 4 | N+1 Query Fixes (Part 1) | 1 hour | Medium | Critical |
| 5 | N+1 Query Fixes (Part 2) | 1 hour | Medium | Critical |
| 6 | Waterfall Consolidation | 1.5 hours | Medium | High |
| 7 | React Optimization | 1 hour | Low | Medium |
| 8 | Backend & Realtime | 2 hours | Medium | High |

### Success Metrics
After completing all sessions:
- [ ] MyOpportunities search: 1-2 API calls instead of N (per character)
- [ ] StudentDashboard load: <600ms instead of ~2000ms
- [ ] AdminHub filtering: <50ms instead of ~500ms for 100 projects
- [ ] Zero N+1 queries in realtime notification handlers
- [ ] Employer dashboard: <500ms instead of ~1200ms

---

## Pre-Implementation Checklist

Before starting Session 1, verify:

- [ ] Access to the repository at `shashwatphd-ai/projectify-syllabus`
- [ ] Ability to create and switch branches
- [ ] Understanding of the codebase structure (reviewed ARCHITECTURE_ANALYSIS.md)
- [ ] Development environment can run `npm run build` without errors

---

# SESSION 1: Search Debouncing

## Session Overview
| Attribute | Value |
|-----------|-------|
| **Estimated Duration** | 30 minutes |
| **Files Modified** | 1 |
| **Risk Level** | Low |
| **Rollback Complexity** | Simple revert |

## Entry Conditions
- [ ] On a clean branch (no uncommitted changes)
- [ ] `npm run build` passes
- [ ] Can access `src/pages/MyOpportunities.tsx`

## Context for This Session

The MyOpportunities page triggers an API call on every keystroke when users type in the search box. Typing "software" causes 8 API calls. We need to debounce this to wait 300ms after the user stops typing.

**Current behavior (problematic):**
```
User types: s → API call
User types: o → API call
User types: f → API call
... (8 total calls for "software")
```

**Target behavior:**
```
User types: software (within 300ms)
User stops typing
→ Wait 300ms
→ 1 API call
```

---

## Task 1.1: Add Debounced Search State

### Step 1: Read the current file
First, read the file to understand the current implementation:

```
READ: src/pages/MyOpportunities.tsx
```

Locate these key sections:
- Line ~35: `const [searchQuery, setSearchQuery] = useState("");`
- Line ~60-64: The `useEffect` that calls `fetchJobMatches()`
- Line ~129: The input's `onChange` handler

### Step 2: Add the debounced state variable

After the existing state declarations (around line 36), add a new state for the debounced value:

```typescript
const [searchQuery, setSearchQuery] = useState("");
const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(""); // ADD THIS LINE
const [statusFilter, setStatusFilter] = useState<string>("all");
```

### Step 3: Add the debounce effect

Add a new `useEffect` after the auth effect (around line 58) but BEFORE the fetch effect:

```typescript
// Debounce search query - waits 300ms after user stops typing
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchQuery(searchQuery);
  }, 300);

  // Cleanup: cancel timer if searchQuery changes before 300ms
  return () => clearTimeout(timer);
}, [searchQuery]);
```

### Step 4: Update the fetch effect dependencies

Change the existing fetch effect from:

```typescript
useEffect(() => {
  if (user) {
    fetchJobMatches();
  }
}, [user, searchQuery, statusFilter]); // OLD - triggers on every keystroke
```

To:

```typescript
useEffect(() => {
  if (user) {
    fetchJobMatches();
  }
}, [user, debouncedSearchQuery, statusFilter]); // NEW - uses debounced value
```

### Step 5: Update the fetchJobMatches function

Inside `fetchJobMatches`, update the search filter to use the debounced value:

Change:
```typescript
if (searchQuery.trim()) {
  query = query.or(
    `apollo_job_title.ilike.%${searchQuery}%,apollo_company_name.ilike.%${searchQuery}%`
  );
}
```

To:
```typescript
if (debouncedSearchQuery.trim()) {
  query = query.or(
    `apollo_job_title.ilike.%${debouncedSearchQuery}%,apollo_company_name.ilike.%${debouncedSearchQuery}%`
  );
}
```

**IMPORTANT:** Keep the input's `onChange` using `searchQuery` (not debounced) so the input remains responsive:
```typescript
onChange={(e) => setSearchQuery(e.target.value)} // Keep this unchanged!
```

---

## Verification Steps

### V1.1: Build passes
```bash
npm run build
```
Expected: No TypeScript errors

### V1.2: Functional test
1. Open the app in browser
2. Navigate to MyOpportunities page
3. Open DevTools → Network tab
4. Clear network log
5. Type "software engineer" in the search box
6. Count API calls to the `job_matches` endpoint

**Expected:** 1-2 API calls (not 17)
**Actual:** __________ (fill in during testing)

### V1.3: UX verification
- [ ] Search input updates immediately as you type (no lag)
- [ ] Results update ~300ms after you stop typing
- [ ] Clearing the search box works correctly
- [ ] Status filter still works immediately

---

## Session 1 Completion Checklist

- [ ] Task 1.1 completed
- [ ] V1.1 Build passes
- [ ] V1.2 API calls reduced (record actual count: ____)
- [ ] V1.3 UX verified
- [ ] Changes committed with message: `perf: debounce search in MyOpportunities (300ms delay)`

## Exit Conditions
- [ ] All verification steps pass
- [ ] Code committed to branch
- [ ] No console errors in browser

## Handoff Notes for Session 2
```
Session 1 Status: [COMPLETE/INCOMPLETE]
Branch: [branch name]
Last Commit: [commit hash]
Notes: [any issues encountered]
```

---

# SESSION 2: Dashboard Query Parallelization

## Session Overview
| Attribute | Value |
|-----------|-------|
| **Estimated Duration** | 45 minutes |
| **Files Modified** | 1 |
| **Risk Level** | Low |
| **Rollback Complexity** | Simple revert |

## Entry Conditions
- [ ] Session 1 completed successfully OR starting fresh
- [ ] On the correct branch
- [ ] `npm run build` passes

## Context for This Session

The StudentDashboard makes 4 sequential database queries. Each query waits for the previous one to complete. If each takes 500ms, total time is 2000ms. By running them in parallel, we reduce this to ~500ms (the time of the slowest query).

**Current flow:**
```
Query 1 (applications) → 500ms
                         Query 2 (job_matches) → 500ms
                                                 Query 3 (competencies) → 500ms
                                                                          Query 4 (projects) → 500ms
Total: ~2000ms
```

**Target flow:**
```
Query 1 (applications) → 500ms ─┐
Query 2 (job_matches)  → 400ms ─┤
Query 3 (competencies) → 300ms ─┼→ Total: ~500ms (slowest query)
Query 4 (projects)     → 500ms ─┘
```

---

## Task 2.1: Parallelize Dashboard Queries

### Step 1: Read the current file
```
READ: src/pages/StudentDashboard.tsx
```

Locate the `fetchDashboardData` function (around line 48-99).

### Step 2: Replace sequential queries with Promise.allSettled

Replace the entire `fetchDashboardData` function with:

```typescript
const fetchDashboardData = async () => {
  try {
    setLoading(true);

    // Execute all queries in parallel using Promise.allSettled
    // This ensures one failure doesn't block others
    const [
      applicationsResult,
      jobCountResult,
      compCountResult,
      projectCountResult
    ] = await Promise.allSettled([
      // Query 1: Applications with project details
      supabase
        .from("project_applications")
        .select("*, projects(title, company_name)")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5),

      // Query 2: Job matches count
      supabase
        .from("job_matches")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user!.id)
        .eq("status", "new"),

      // Query 3: Verified competencies count
      supabase
        .from("verified_competencies")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user!.id),

      // Query 4: Available projects count
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "curated_live")
    ]);

    // Extract data from settled results, handling failures gracefully
    const applications = applicationsResult.status === 'fulfilled'
      ? applicationsResult.value.data
      : [];

    const jobCount = jobCountResult.status === 'fulfilled'
      ? jobCountResult.value.count ?? 0
      : 0;

    const compCount = compCountResult.status === 'fulfilled'
      ? compCountResult.value.count ?? 0
      : 0;

    const projectCount = projectCountResult.status === 'fulfilled'
      ? projectCountResult.value.count ?? 0
      : 0;

    // Log any errors for debugging (but don't fail the whole dashboard)
    const errors = [
      applicationsResult.status === 'rejected' ? applicationsResult.reason : null,
      jobCountResult.status === 'rejected' ? jobCountResult.reason : null,
      compCountResult.status === 'rejected' ? compCountResult.reason : null,
      projectCountResult.status === 'rejected' ? projectCountResult.reason : null,
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error("Some dashboard queries failed:", errors);
    }

    // Also check for Supabase errors in fulfilled results
    const supabaseErrors = [
      applicationsResult.status === 'fulfilled' ? applicationsResult.value.error : null,
      jobCountResult.status === 'fulfilled' ? jobCountResult.value.error : null,
      compCountResult.status === 'fulfilled' ? compCountResult.value.error : null,
      projectCountResult.status === 'fulfilled' ? projectCountResult.value.error : null,
    ].filter(Boolean);

    if (supabaseErrors.length > 0) {
      console.error("Supabase query errors:", supabaseErrors);
    }

    const pending = applications?.filter(a => a.status === "pending").length || 0;
    const approved = applications?.filter(a => a.status === "approved").length || 0;

    setMetrics({
      totalApplications: applications?.length || 0,
      pendingApplications: pending,
      approvedApplications: approved,
      matchedJobs: jobCount,
      verifiedCompetencies: compCount,
      availableProjects: projectCount,
    });

    setRecentApplications(applications || []);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
  } finally {
    setLoading(false);
  }
};
```

---

## Verification Steps

### V2.1: Build passes
```bash
npm run build
```
Expected: No TypeScript errors

### V2.2: Performance test
1. Open browser DevTools → Network tab
2. Navigate to Student Dashboard
3. Note the timing of the API calls

**Expected:** All 4 queries start at nearly the same time
**Before (sequential):** Queries are staggered by ~500ms each
**After (parallel):** All queries start within ~50ms of each other

### V2.3: Measure load time
Add temporary timing logs:
```typescript
// Add at start of fetchDashboardData
console.time('dashboard-load');

// Add at end (before setLoading(false))
console.timeEnd('dashboard-load');
```

**Expected:** <700ms
**Actual:** __________ ms (fill in during testing)

### V2.4: Graceful degradation test
1. Temporarily break one query (e.g., wrong table name)
2. Verify dashboard still loads with partial data
3. Verify error is logged to console
4. Revert the intentional break

### V2.5: UX verification
- [ ] All stat cards display correct numbers
- [ ] Recent applications list populates
- [ ] No visual errors or blank sections

---

## Session 2 Completion Checklist

- [ ] Task 2.1 completed
- [ ] V2.1 Build passes
- [ ] V2.2 Queries run in parallel (verified in Network tab)
- [ ] V2.3 Load time improved (record: ____ ms → ____ ms)
- [ ] V2.4 Graceful degradation works
- [ ] V2.5 UX verified
- [ ] Temporary console.time logs removed
- [ ] Changes committed with message: `perf: parallelize StudentDashboard queries with Promise.allSettled`

## Exit Conditions
- [ ] All verification steps pass
- [ ] Code committed to branch
- [ ] Load time is under 700ms

## Handoff Notes for Session 3
```
Session 2 Status: [COMPLETE/INCOMPLETE]
Branch: [branch name]
Last Commit: [commit hash]
Load Time Before: ____ms
Load Time After: ____ms
Notes: [any issues encountered]
```

---

# SESSION 3: AdminHub O(N×M) Fix

## Session Overview
| Attribute | Value |
|-----------|-------|
| **Estimated Duration** | 30 minutes |
| **Files Modified** | 1 |
| **Risk Level** | Low |
| **Rollback Complexity** | Simple revert |

## Entry Conditions
- [ ] Sessions 1-2 completed OR starting fresh
- [ ] On the correct branch
- [ ] `npm run build` passes

## Context for This Session

The AdminHub page maps signals to projects using nested loops. For each project, it scans ALL signals to find matches. This is O(N×M) complexity.

With 100 projects and 500 signals = 50,000 filter operations.

By building a Map first, we reduce this to O(N+M) = 600 operations.

---

## Task 3.1: Optimize Signal Mapping

### Step 1: Read the current file
```
READ: src/pages/AdminHub.tsx
```

Locate the `loadProjects` function (around line 117-160).

### Step 2: Find the problematic code

Look for this pattern around lines 140-153:
```typescript
const projectsWithSignals = (projectData || []).map(project => {
  const companySignals = (signalData || [])
    .filter(signal => signal.company_id === project.company_profile_id);
  // ...
});
```

### Step 3: Replace with Map-based lookup

Replace the signal mapping section with:

```typescript
// Build signal lookup map first - O(M) where M = number of signals
const signalMap = new Map<string, Array<{
  project_score: number;
  signal_type: string;
  status: string;
  created_at: string;
}>>();

(signalData || []).forEach(signal => {
  if (!signal.company_id) return;

  const existing = signalMap.get(signal.company_id);
  if (existing) {
    existing.push(signal);
  } else {
    signalMap.set(signal.company_id, [signal]);
  }
});

// Map projects with O(1) signal lookup - O(N) where N = number of projects
const projectsWithSignals = (projectData || []).map(project => {
  const companySignals = project.company_profile_id
    ? signalMap.get(project.company_profile_id) || []
    : [];

  const latestScore = companySignals.length > 0
    ? companySignals[0].project_score
    : 0;

  return {
    ...project,
    company_signals: companySignals,
    latest_score: latestScore
  };
});
```

### Step 4: Verify signal ordering assumption

The code assumes `signalData` is sorted by `created_at DESC` so that `companySignals[0]` is the latest. Verify this query exists earlier in the function:

```typescript
const { data: signalData, error: signalError } = await supabase
  .from('company_signals')
  .select('company_id, project_score, signal_type, status, created_at')
  .eq('status', 'processed')
  .order('created_at', { ascending: false }); // This must exist!
```

If the `.order()` clause is missing, add it.

---

## Verification Steps

### V3.1: Build passes
```bash
npm run build
```
Expected: No TypeScript errors

### V3.2: Performance measurement
Add temporary timing:

```typescript
// Before the signalMap creation
console.time('signal-mapping');

// After projectsWithSignals is complete
console.timeEnd('signal-mapping');
```

**Expected:** <10ms for 100 projects × 500 signals
**Actual:** __________ ms

### V3.3: Data integrity test
1. Open AdminHub as admin
2. Check that projects display with correct signal scores
3. Verify sorting by score works correctly
4. Verify "Latest Signal" badge shows correct signal type

### V3.4: Edge cases
- [ ] Projects with no signals show score of 0
- [ ] Projects with null company_profile_id don't cause errors
- [ ] Empty projects list doesn't cause errors
- [ ] Empty signals list doesn't cause errors

---

## Session 3 Completion Checklist

- [ ] Task 3.1 completed
- [ ] V3.1 Build passes
- [ ] V3.2 Performance improved (record: ____ ms)
- [ ] V3.3 Data integrity verified
- [ ] V3.4 Edge cases handled
- [ ] Temporary console.time logs removed
- [ ] Changes committed with message: `perf: optimize AdminHub signal mapping O(N×M) → O(N+M)`

## Exit Conditions
- [ ] All verification steps pass
- [ ] Code committed to branch
- [ ] Signal mapping completes in <50ms

## Handoff Notes for Session 4
```
Session 3 Status: [COMPLETE/INCOMPLETE]
Branch: [branch name]
Last Commit: [commit hash]
Mapping Time: ____ms
Notes: [any issues encountered]
```

---

# SESSION 4: N+1 Query Fixes (Part 1 - Faculty Notifications)

## Session Overview
| Attribute | Value |
|-----------|-------|
| **Estimated Duration** | 1 hour |
| **Files Modified** | 1 |
| **Risk Level** | Medium |
| **Rollback Complexity** | Moderate |

## Entry Conditions
- [ ] Sessions 1-3 completed
- [ ] On the correct branch
- [ ] `npm run build` passes
- [ ] Understand realtime subscription patterns

## Context for This Session

The realtime notification system has N+1 query problems. When a project is updated, EVERY faculty member's browser queries the database to check if they own the course. With 50 faculty and 100 daily updates = 5,000 unnecessary queries.

**Current flow (problematic):**
```
Project updated →
  Faculty 1 browser: SELECT * FROM course_profiles WHERE id=X AND owner_id=user1
  Faculty 2 browser: SELECT * FROM course_profiles WHERE id=X AND owner_id=user2
  Faculty 3 browser: SELECT * FROM course_profiles WHERE id=X AND owner_id=user3
  ... (50 queries per project update)
```

**Target flow:**
```
Faculty 1 login → Pre-fetch: "I own courses [A, B, C]" (cached in state)
Faculty 2 login → Pre-fetch: "I own courses [D]" (cached in state)

Project updated →
  Faculty 1 browser: Check local Set (0 DB queries)
  Faculty 2 browser: Check local Set (0 DB queries)
```

---

## Task 4.1: Pre-fetch Faculty Course Ownership

### Step 1: Read the current file
```
READ: src/hooks/useRealtimeNotifications.ts
```

Understand the current structure:
- The hook subscribes to multiple realtime channels
- For faculty, it listens to project updates
- Currently, it queries the DB on every event to check ownership

### Step 2: Add state for owned course IDs

Near the top of the hook (after existing state declarations), add:

```typescript
// Pre-fetched course IDs owned by this faculty member
const [ownedCourseIds, setOwnedCourseIds] = useState<Set<string>>(new Set());
const [ownershipLoaded, setOwnershipLoaded] = useState(false);
```

### Step 3: Add effect to pre-fetch owned courses

Add a new `useEffect` for pre-fetching (before the realtime subscription effect):

```typescript
// Pre-fetch courses owned by this faculty member
useEffect(() => {
  if (!user?.id || !roles.includes('faculty')) {
    setOwnedCourseIds(new Set());
    setOwnershipLoaded(true);
    return;
  }

  const fetchOwnedCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("course_profiles")
        .select("id")
        .eq("owner_id", user.id);

      if (error) {
        console.error("Error fetching owned courses:", error);
        setOwnedCourseIds(new Set());
      } else {
        setOwnedCourseIds(new Set(data?.map(c => c.id) || []));
      }
    } catch (err) {
      console.error("Failed to fetch owned courses:", err);
      setOwnedCourseIds(new Set());
    } finally {
      setOwnershipLoaded(true);
    }
  };

  fetchOwnedCourses();
}, [user?.id, roles]);
```

### Step 4: Add realtime subscription for course ownership changes

This prevents stale cache when a faculty member is assigned a new course:

```typescript
// Subscribe to changes in courses owned by this faculty
useEffect(() => {
  if (!user?.id || !roles.includes('faculty')) return;

  const channel = supabase
    .channel('my-course-ownership')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'course_profiles',
        filter: `owner_id=eq.${user.id}`
      },
      (payload) => {
        console.log('Course ownership changed:', payload.eventType);

        if (payload.eventType === 'INSERT') {
          const newCourse = payload.new as { id: string };
          setOwnedCourseIds(prev => new Set([...prev, newCourse.id]));
        } else if (payload.eventType === 'DELETE') {
          const oldCourse = payload.old as { id: string };
          setOwnedCourseIds(prev => {
            const next = new Set(prev);
            next.delete(oldCourse.id);
            return next;
          });
        }
        // UPDATE events don't change ownership, so no action needed
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id, roles]);
```

### Step 5: Update the project update handler

Find the existing project update subscription handler (look for `table: "projects"` and `event: "UPDATE"`).

Replace the async ownership check with a synchronous Set lookup:

**Before:**
```typescript
.on("postgres_changes", {
  event: "UPDATE",
  schema: "public",
  table: "projects",
}, async (payload) => {
  const updated = payload.new as any;

  // N+1 QUERY - BAD!
  const { data: course } = await supabase
    .from("course_profiles")
    .select("id, owner_id")
    .eq("id", updated.course_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (course) {
    // Show notification...
  }
})
```

**After:**
```typescript
.on("postgres_changes", {
  event: "UPDATE",
  schema: "public",
  table: "projects",
}, (payload) => {
  // Don't process events until ownership data is loaded
  if (!ownershipLoaded) return;

  const updated = payload.new as any;

  // O(1) local check - NO DATABASE QUERY!
  if (ownedCourseIds.has(updated.course_id)) {
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: crypto.randomUUID(),
        type: "project_update",
        title: "Project Updated",
        message: `Project "${updated.title}" status changed to ${updated.status}`,
        read: false,
        created_at: new Date().toISOString(),
        data: { projectId: updated.id }
      }
    });
  }
})
```

**IMPORTANT:** Note that the handler is no longer `async`. Remove the `async` keyword.

### Step 6: Add ownedCourseIds to dependency array

Make sure the realtime subscription effect has `ownedCourseIds` and `ownershipLoaded` in its dependency array so it re-subscribes when ownership changes.

---

## Verification Steps

### V4.1: Build passes
```bash
npm run build
```
Expected: No TypeScript errors

### V4.2: Pre-fetch verification
1. Log in as a faculty member
2. Open DevTools → Network tab
3. Filter for "course_profiles"
4. Verify ONE query at login (the pre-fetch)
5. Verify NO additional queries when projects are updated

### V4.3: Notification delivery test
1. Log in as faculty in Browser A
2. Log in as admin in Browser B
3. In Browser B, update a project owned by the faculty member
4. Verify notification appears in Browser A
5. Verify NO database query was made in Browser A

### V4.4: Cache invalidation test
1. Log in as faculty in Browser A
2. Log in as admin in Browser B
3. In Browser B, assign a new course to the faculty member
4. In Browser B, update a project for that new course
5. Verify notification appears in Browser A (cache was updated)

### V4.5: Non-owned projects test
1. Update a project the faculty does NOT own
2. Verify NO notification appears
3. Verify no console errors

---

## Session 4 Completion Checklist

- [ ] Task 4.1 completed
- [ ] V4.1 Build passes
- [ ] V4.2 Only one pre-fetch query at login
- [ ] V4.3 Notifications work without DB queries
- [ ] V4.4 Cache invalidation works for new courses
- [ ] V4.5 Non-owned projects don't trigger notifications
- [ ] Changes committed with message: `perf: eliminate N+1 queries in faculty notification handler`

## Exit Conditions
- [ ] All verification steps pass
- [ ] Code committed to branch
- [ ] No per-event database queries for ownership checks

## Handoff Notes for Session 5
```
Session 4 Status: [COMPLETE/INCOMPLETE]
Branch: [branch name]
Last Commit: [commit hash]
Notes: [any issues encountered]
```

---

# SESSION 5: N+1 Query Fixes (Part 2 - Employer Notifications)

## Session Overview
| Attribute | Value |
|-----------|-------|
| **Estimated Duration** | 1 hour |
| **Files Modified** | 1 |
| **Risk Level** | Medium |
| **Rollback Complexity** | Moderate |

## Entry Conditions
- [ ] Session 4 completed
- [ ] On the correct branch
- [ ] `npm run build` passes
- [ ] Faculty notification fix is working

## Context for This Session

Similar to Session 4, employers have N+1 queries when applications are submitted. We need to pre-fetch and cache the project IDs they own.

---

## Task 5.1: Pre-fetch Employer Project Ownership

### Step 1: Continue in the same file
```
READ: src/hooks/useRealtimeNotifications.ts
```

### Step 2: Add state for owned projects

Near the faculty ownership state, add:

```typescript
// Pre-fetched project IDs and titles owned by this employer
const [ownedProjectIds, setOwnedProjectIds] = useState<Set<string>>(new Set());
const [projectTitles, setProjectTitles] = useState<Map<string, string>>(new Map());
const [employerOwnershipLoaded, setEmployerOwnershipLoaded] = useState(false);
```

### Step 3: Add effect to pre-fetch owned projects

```typescript
// Pre-fetch projects owned by this employer
useEffect(() => {
  if (!user?.id || !roles.includes('employer')) {
    setOwnedProjectIds(new Set());
    setProjectTitles(new Map());
    setEmployerOwnershipLoaded(true);
    return;
  }

  const fetchOwnedProjects = async () => {
    try {
      // First, get the employer's company profile
      const { data: companyProfile, error: companyError } = await supabase
        .from("company_profiles")
        .select("id")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (companyError) {
        console.error("Error fetching company profile:", companyError);
        setOwnedProjectIds(new Set());
        setProjectTitles(new Map());
        setEmployerOwnershipLoaded(true);
        return;
      }

      if (!companyProfile) {
        // Employer doesn't have a company profile yet
        setOwnedProjectIds(new Set());
        setProjectTitles(new Map());
        setEmployerOwnershipLoaded(true);
        return;
      }

      // Then, get all projects for that company
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, title")
        .eq("company_profile_id", companyProfile.id);

      if (projectsError) {
        console.error("Error fetching owned projects:", projectsError);
        setOwnedProjectIds(new Set());
        setProjectTitles(new Map());
      } else {
        setOwnedProjectIds(new Set(projects?.map(p => p.id) || []));
        setProjectTitles(new Map(projects?.map(p => [p.id, p.title]) || []));
      }
    } catch (err) {
      console.error("Failed to fetch owned projects:", err);
      setOwnedProjectIds(new Set());
      setProjectTitles(new Map());
    } finally {
      setEmployerOwnershipLoaded(true);
    }
  };

  fetchOwnedProjects();
}, [user?.id, roles]);
```

### Step 4: Add realtime subscription for project changes

```typescript
// Subscribe to changes in projects owned by this employer
useEffect(() => {
  if (!user?.id || !roles.includes('employer')) return;

  // We need the company profile ID for the filter
  const setupProjectSubscription = async () => {
    const { data: companyProfile } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (!companyProfile) return null;

    const channel = supabase
      .channel('my-project-ownership')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `company_profile_id=eq.${companyProfile.id}`
        },
        (payload) => {
          console.log('Project ownership changed:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            const newProject = payload.new as { id: string; title: string };
            setOwnedProjectIds(prev => new Set([...prev, newProject.id]));
            setProjectTitles(prev => new Map([...prev, [newProject.id, newProject.title]]));
          } else if (payload.eventType === 'DELETE') {
            const oldProject = payload.old as { id: string };
            setOwnedProjectIds(prev => {
              const next = new Set(prev);
              next.delete(oldProject.id);
              return next;
            });
            setProjectTitles(prev => {
              const next = new Map(prev);
              next.delete(oldProject.id);
              return next;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as { id: string; title: string };
            setProjectTitles(prev => new Map([...prev, [updated.id, updated.title]]));
          }
        }
      )
      .subscribe();

    return channel;
  };

  let channel: ReturnType<typeof supabase.channel> | null = null;

  setupProjectSubscription().then(ch => {
    channel = ch;
  });

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}, [user?.id, roles]);
```

### Step 5: Update the application insert handler

Find the existing application subscription handler (look for `table: "project_applications"` and `event: "INSERT"`).

Replace the async ownership check:

**Before:**
```typescript
.on("postgres_changes", {
  event: "INSERT",
  schema: "public",
  table: "project_applications",
}, async (payload) => {
  const newApp = payload.new as any;

  // N+1 QUERY - BAD!
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, company_profile_id, company_profiles!inner(owner_user_id)")
    .eq("id", newApp.project_id)
    .maybeSingle();

  if (project?.company_profiles?.owner_user_id === user.id) {
    // Show notification...
  }
})
```

**After:**
```typescript
.on("postgres_changes", {
  event: "INSERT",
  schema: "public",
  table: "project_applications",
}, (payload) => {
  // Don't process events until ownership data is loaded
  if (!employerOwnershipLoaded) return;

  const newApp = payload.new as any;

  // O(1) local check - NO DATABASE QUERY!
  if (ownedProjectIds.has(newApp.project_id)) {
    const projectTitle = projectTitles.get(newApp.project_id) || "your project";

    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: crypto.randomUUID(),
        type: "new_application",
        title: "New Application",
        message: `New application received for "${projectTitle}"`,
        read: false,
        created_at: new Date().toISOString(),
        data: {
          applicationId: newApp.id,
          projectId: newApp.project_id
        }
      }
    });
  }
})
```

---

## Verification Steps

### V5.1: Build passes
```bash
npm run build
```

### V5.2: Pre-fetch verification
1. Log in as an employer
2. Open DevTools → Network tab
3. Verify company_profiles and projects queries at login
4. Verify NO additional queries when applications are submitted

### V5.3: Notification delivery test
1. Log in as employer in Browser A
2. Log in as student in Browser B
3. In Browser B, apply to a project owned by the employer
4. Verify notification appears in Browser A
5. Verify NO database query was made in Browser A

### V5.4: Edge cases
- [ ] Employer without company profile doesn't cause errors
- [ ] Employer with company but no projects works correctly
- [ ] New project added mid-session gets cached correctly

---

## Session 5 Completion Checklist

- [ ] Task 5.1 completed
- [ ] V5.1 Build passes
- [ ] V5.2 Pre-fetch works correctly
- [ ] V5.3 Notifications work without DB queries
- [ ] V5.4 Edge cases handled
- [ ] Changes committed with message: `perf: eliminate N+1 queries in employer notification handler`

## Exit Conditions
- [ ] All verification steps pass
- [ ] Code committed to branch

## Handoff Notes for Session 6
```
Session 5 Status: [COMPLETE/INCOMPLETE]
Branch: [branch name]
Last Commit: [commit hash]
Notes: [any issues encountered]
```

---

# SESSION 6: Waterfall Query Consolidation

## Session Overview
| Attribute | Value |
|-----------|-------|
| **Estimated Duration** | 1.5 hours |
| **Files Modified** | 2 (create 1, update 1) |
| **Risk Level** | Medium |
| **Rollback Complexity** | Moderate |

## Entry Conditions
- [ ] Sessions 1-5 completed
- [ ] On the correct branch
- [ ] `npm run build` passes

## Context for This Session

The EmployerDashboard has a waterfall pattern:
1. Query 1: Get company profile (wait)
2. Query 2: Get projects (wait for 1)
3. Query 3: Get applications (wait for 1)
4. Query 4: Get student profiles (wait for 3)

Total: 4 sequential round trips. We'll consolidate this into a single React Query hook.

---

## Task 6.1: Create Consolidated Dashboard Hook

### Step 1: Create new hook file

Create file: `src/hooks/useEmployerDashboardData.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmployerDashboardData {
  companyProfile: {
    id: string;
    name: string;
    description: string | null;
    website: string | null;
    organization_logo_url: string | null;
  } | null;
  projects: Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    company_name: string;
  }>;
  applications: Array<{
    id: string;
    student_id: string;
    project_id: string;
    status: string;
    created_at: string;
    projects: {
      id: string;
      title: string;
    };
    student_email: string | null;
  }>;
  metrics: {
    totalProjects: number;
    activeProjects: number;
    totalApplications: number;
    pendingApplications: number;
  };
}

export function useEmployerDashboardData(userId: string | undefined, isEmployer: boolean) {
  return useQuery({
    queryKey: ["employerDashboard", userId],
    queryFn: async (): Promise<EmployerDashboardData> => {
      if (!userId) {
        throw new Error("No user ID provided");
      }

      // Step 1: Get company profile
      const { data: companyProfile, error: profileError } = await supabase
        .from("company_profiles")
        .select("id, name, description, website, organization_logo_url")
        .eq("owner_user_id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching company profile:", profileError);
        throw profileError;
      }

      // If no company profile, return empty data
      if (!companyProfile) {
        return {
          companyProfile: null,
          projects: [],
          applications: [],
          metrics: {
            totalProjects: 0,
            activeProjects: 0,
            totalApplications: 0,
            pendingApplications: 0,
          },
        };
      }

      // Step 2: Parallel fetch projects and applications
      const [projectsResult, applicationsResult] = await Promise.allSettled([
        supabase
          .from("projects")
          .select("id, title, status, created_at, company_name")
          .eq("company_profile_id", companyProfile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_applications")
          .select(`
            id,
            student_id,
            project_id,
            status,
            created_at,
            projects!inner(id, title, company_profile_id)
          `)
          .eq("projects.company_profile_id", companyProfile.id)
          .order("created_at", { ascending: false }),
      ]);

      // Extract projects data
      const projects = projectsResult.status === "fulfilled" && !projectsResult.value.error
        ? projectsResult.value.data || []
        : [];

      // Extract applications data
      const applications = applicationsResult.status === "fulfilled" && !applicationsResult.value.error
        ? applicationsResult.value.data || []
        : [];

      // Step 3: Fetch student profiles for applications (only if we have applications)
      const studentIds = [...new Set(applications.map(a => a.student_id))];

      let studentProfiles = new Map<string, { email: string }>();

      if (studentIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", studentIds);

        if (!profilesError && profiles) {
          studentProfiles = new Map(profiles.map(p => [p.id, { email: p.email }]));
        }
      }

      // Enrich applications with student emails
      const enrichedApplications = applications.map(app => ({
        ...app,
        student_email: studentProfiles.get(app.student_id)?.email || null,
      }));

      // Calculate metrics
      const activeStatuses = ["curated_live", "in_progress"];
      const activeProjects = projects.filter(p => activeStatuses.includes(p.status)).length;
      const pendingApplications = enrichedApplications.filter(a => a.status === "pending").length;

      return {
        companyProfile,
        projects,
        applications: enrichedApplications,
        metrics: {
          totalProjects: projects.length,
          activeProjects,
          totalApplications: enrichedApplications.length,
          pendingApplications,
        },
      };
    },
    enabled: !!userId && isEmployer,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}
```

---

## Task 6.2: Update EmployerDashboard to Use Hook

### Step 1: Read the current file
```
READ: src/pages/EmployerDashboard.tsx
```

### Step 2: Replace multiple useStates with the hook

At the top of the component, replace the multiple state declarations and fetch effects with:

```typescript
import { useEmployerDashboardData } from "@/hooks/useEmployerDashboardData";

const EmployerDashboard = () => {
  const { user, isEmployer, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Single consolidated data hook
  const {
    data: dashboardData,
    isLoading: dataLoading,
    error: dataError,
    refetch
  } = useEmployerDashboardData(user?.id, isEmployer);

  // Redirect non-employers
  useEffect(() => {
    if (!authLoading && !isEmployer) {
      navigate("/");
    }
  }, [authLoading, isEmployer, navigate]);

  // Combined loading state
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <EmployerDashboardSkeleton />
      </div>
    );
  }

  // Error state
  if (dataError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-destructive">Failed to load dashboard data</p>
              <Button onClick={() => refetch()} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Destructure for easier access
  const { companyProfile, projects, applications, metrics } = dashboardData || {};

  // ... rest of component rendering using these variables
```

### Step 3: Remove old state and effects

Delete:
- `useState` for `companyProfile`, `projects`, `applications`, `loading`
- `useEffect` for `fetchCompanyProfile`
- `useEffect` for `fetchProjects`, `fetchApplications`
- The individual fetch functions

### Step 4: Update component body

Replace references throughout the component:
- `loading` → `dataLoading`
- Access data via `metrics.totalProjects`, `metrics.pendingApplications`, etc.

---

## Verification Steps

### V6.1: Build passes
```bash
npm run build
```

### V6.2: Load time measurement
1. Open browser DevTools → Network tab
2. Navigate to Employer Dashboard
3. Measure time from navigation to data displayed

**Expected:** <500ms
**Actual:** __________ ms

### V6.3: Query reduction
1. Count network requests to Supabase
2. Should see at most 3 requests (company profile, then parallel projects/applications, then student profiles)

### V6.4: Error handling
1. Temporarily break a query (wrong table name)
2. Verify error message displays
3. Verify "Retry" button works
4. Revert the break

### V6.5: Data accuracy
- [ ] Company profile info displays correctly
- [ ] Projects list is complete
- [ ] Applications show student emails
- [ ] Metrics are accurate

---

## Session 6 Completion Checklist

- [ ] Task 6.1 completed (hook created)
- [ ] Task 6.2 completed (dashboard updated)
- [ ] V6.1 Build passes
- [ ] V6.2 Load time improved (record: ____ ms → ____ ms)
- [ ] V6.3 Query count reduced
- [ ] V6.4 Error handling works
- [ ] V6.5 Data accuracy verified
- [ ] Changes committed with message: `perf: consolidate EmployerDashboard queries into single hook`

## Exit Conditions
- [ ] All verification steps pass
- [ ] Code committed to branch

## Handoff Notes for Session 7
```
Session 6 Status: [COMPLETE/INCOMPLETE]
Branch: [branch name]
Last Commit: [commit hash]
Load Time Before: ____ms
Load Time After: ____ms
Notes: [any issues encountered]
```

---

# SESSION 7: React Optimization

## Session Overview
| Attribute | Value |
|-----------|-------|
| **Estimated Duration** | 1 hour |
| **Files Modified** | 3-4 |
| **Risk Level** | Low |
| **Rollback Complexity** | Simple |

## Entry Conditions
- [ ] Sessions 1-6 completed
- [ ] On the correct branch
- [ ] `npm run build` passes

## Context for This Session

React components re-render when their parent re-renders, even if their props haven't changed. We'll use `React.memo` and `useMemo` to prevent unnecessary re-renders in hot paths.

**Important:** Only memoize where profiling shows actual issues. Over-memoization adds complexity without benefit.

---

## Task 7.1: Memoize AdminHub getSortedProjects

### Step 1: Read the file
```
READ: src/pages/AdminHub.tsx
```

Locate the `getSortedProjects` function (around line 223-229).

### Step 2: Replace with useMemo

**Before:**
```typescript
const getSortedProjects = () => {
  const sorted = [...projects];
  if (sortBy === 'score') {
    return sorted.sort((a, b) => (b.latest_score || 0) - (a.latest_score || 0));
  }
  return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

// Later in render:
const sortedProjects = getSortedProjects();
```

**After:**
```typescript
const sortedProjects = useMemo(() => {
  const sorted = [...projects];
  if (sortBy === 'score') {
    return sorted.sort((a, b) => (b.latest_score || 0) - (a.latest_score || 0));
  }
  return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}, [projects, sortBy]);
```

Add `useMemo` to imports if not already present:
```typescript
import { useEffect, useState, useMemo } from "react";
```

---

## Task 7.2: Memoize NotificationContext Value

### Step 1: Read the file
```
READ: src/contexts/NotificationContext.tsx
```

### Step 2: Find the context value

Look for where the context value is created (usually in the return statement of the Provider).

### Step 3: Wrap with useMemo

**Before:**
```typescript
return (
  <NotificationContext.Provider value={{
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  }}>
    {children}
  </NotificationContext.Provider>
);
```

**After:**
```typescript
const contextValue = useMemo(() => ({
  notifications,
  unreadCount,
  addNotification,
  markAsRead,
  markAllAsRead,
  clearNotifications,
}), [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications]);

return (
  <NotificationContext.Provider value={contextValue}>
    {children}
  </NotificationContext.Provider>
);
```

**Also ensure the callback functions are wrapped with useCallback:**

```typescript
const addNotification = useCallback((notification: Notification) => {
  dispatch({ type: "ADD_NOTIFICATION", payload: notification });
}, []);

const markAsRead = useCallback((id: string) => {
  dispatch({ type: "MARK_AS_READ", payload: id });
}, []);

const markAllAsRead = useCallback(() => {
  dispatch({ type: "MARK_ALL_AS_READ" });
}, []);

const clearNotifications = useCallback(() => {
  dispatch({ type: "CLEAR_ALL" });
}, []);
```

---

## Task 7.3: Fix Set Spread Anti-Pattern in Projects.tsx

### Step 1: Read the file
```
READ: src/pages/Projects.tsx
```

### Step 2: Find the Set spread pattern

Look for code like:
```typescript
setAppliedProjects(prev => new Set([...prev, projectId]));
```

### Step 3: Replace with direct Set manipulation

**Before:**
```typescript
setAppliedProjects(prev => new Set([...prev, projectId]));
```

**After:**
```typescript
setAppliedProjects(prev => {
  const next = new Set(prev);
  next.add(projectId);
  return next;
});
```

---

## Verification Steps

### V7.1: Build passes
```bash
npm run build
```

### V7.2: React DevTools Profiler
1. Install React DevTools browser extension
2. Open DevTools → Profiler tab
3. Record while interacting with AdminHub (change sort order)
4. Verify project cards don't re-render when only sort changes

### V7.3: Functional testing
- [ ] AdminHub sorting works correctly
- [ ] Notifications still work
- [ ] Project application tracking works

---

## Session 7 Completion Checklist

- [ ] Task 7.1 completed (AdminHub memoization)
- [ ] Task 7.2 completed (NotificationContext memoization)
- [ ] Task 7.3 completed (Set spread fix)
- [ ] V7.1 Build passes
- [ ] V7.2 Profiler shows reduced re-renders
- [ ] V7.3 Functional testing passed
- [ ] Changes committed with message: `perf: add React memoization for hot paths`

## Exit Conditions
- [ ] All verification steps pass
- [ ] Code committed to branch

## Handoff Notes for Session 8
```
Session 7 Status: [COMPLETE/INCOMPLETE]
Branch: [branch name]
Last Commit: [commit hash]
Notes: [any issues encountered]
```

---

# SESSION 8: Backend & Realtime Optimization

## Session Overview
| Attribute | Value |
|-----------|-------|
| **Estimated Duration** | 2 hours |
| **Files Modified** | 2 |
| **Risk Level** | Medium |
| **Rollback Complexity** | Moderate |

## Entry Conditions
- [ ] Sessions 1-7 completed
- [ ] On the correct branch
- [ ] `npm run build` passes

## Context for This Session

The Configure page uses polling (every 10 seconds) to check project generation status. We'll replace this with Supabase Realtime subscriptions for instant updates with zero unnecessary API calls.

---

## Task 8.1: Replace Polling with Realtime in Configure.tsx

### Step 1: Read the current file
```
READ: src/pages/Configure.tsx
```

Locate:
- The polling `useEffect` (around line 100-166)
- The `pollingInterval` ref
- The `checkProjectStatus` function

### Step 2: Replace polling with realtime subscription

Replace the polling effect with:

```typescript
// Realtime subscription for generation status
useEffect(() => {
  if (!polling || !generationRunId) return;

  // Subscribe to project status changes for this generation run
  const channel = supabase
    .channel(`generation-${generationRunId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'projects',
        filter: `generation_run_id=eq.${generationRunId}`
      },
      (payload) => {
        // Don't process if component unmounted
        if (!isMountedRef.current) return;

        const updated = payload.new as { id: string; status: string };
        console.log('Project status update:', updated.id, updated.status);

        // Recalculate completed count
        checkCompletionStatus();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to generation updates');
        // Do initial status check
        checkCompletionStatus();
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('Realtime subscription error, falling back to polling');
        // Fallback to polling if realtime fails
        startPollingFallback();
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [polling, generationRunId]);

// Function to check completion status
const checkCompletionStatus = async () => {
  if (!isMountedRef.current || !generationRunId) return;

  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, status')
      .eq('generation_run_id', generationRunId);

    if (error) {
      console.error('Status check error:', error);
      return;
    }

    if (!isMountedRef.current) return;

    const completed = projects?.filter(p =>
      p.status === 'ai_shell' || p.status === 'curated_live' || p.status === 'completed'
    ).length || 0;

    const total = projects?.length || 0;

    setProjectsCompleted(completed);
    setTotalProjects(total);

    // All projects are done
    if (total > 0 && completed === total) {
      setPolling(false);

      const successCount = projects?.filter(p =>
        p.status === 'ai_shell' || p.status === 'curated_live'
      ).length || 0;

      if (isMountedRef.current) {
        toast.success(`${successCount} of ${total} projects generated successfully!`);
        navigate(`/projects?courseId=${courseId}`);
      }
    }
  } catch (error) {
    console.error('Completion check error:', error);
  }
};

// Fallback polling if realtime fails
const startPollingFallback = () => {
  if (pollingInterval.current) return; // Already polling

  console.log('Starting polling fallback (10s interval)');
  pollingInterval.current = window.setInterval(checkCompletionStatus, 10000);
};
```

### Step 3: Update cleanup

Ensure the cleanup handles both realtime and polling fallback:

```typescript
// In the component body, ensure cleanup of polling interval on unmount
useEffect(() => {
  return () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };
}, []);
```

---

## Task 8.2: Consolidate useDemandSignals Queries

### Step 1: Read the file
```
READ: src/hooks/useDemandSignals.ts
```

### Step 2: Combine category and region queries

Replace separate `useDemandCategories` and `useDemandRegions` hooks with a single combined hook:

```typescript
// Combined hook for filter options - single query instead of two
export const useDemandFilterOptions = () => {
  return useQuery({
    queryKey: ["demandFilterOptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demand_signals")
        .select("project_category, geographic_region")
        .eq("is_active", true);

      if (error) throw error;

      const categories = [...new Set(
        (data ?? []).map(d => d.project_category)
      )].filter((c): c is string => c !== null).sort();

      const regions = [...new Set(
        (data ?? []).map(d => d.geographic_region)
      )].filter((r): r is string => r !== null).sort();

      return { categories, regions };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - these change infrequently
  });
};

// Backward-compatible individual hooks
export const useDemandCategories = () => {
  const { data, ...rest } = useDemandFilterOptions();
  return { data: data?.categories ?? [], ...rest };
};

export const useDemandRegions = () => {
  const { data, ...rest } = useDemandFilterOptions();
  return { data: data?.regions ?? [], ...rest };
};
```

---

## Verification Steps

### V8.1: Build passes
```bash
npm run build
```

### V8.2: Realtime subscription test
1. Start a project generation
2. Open DevTools → Network tab
3. Verify WebSocket connection is established
4. Verify progress updates without HTTP polling requests

### V8.3: Fallback test
1. Temporarily disable Supabase Realtime (or trigger error)
2. Verify polling fallback activates
3. Verify generation completes successfully

### V8.4: DemandBoard test
1. Navigate to DemandBoard
2. Verify filter dropdowns populate
3. Check Network tab - should see ONE query for filter options (not two)

---

## Session 8 Completion Checklist

- [ ] Task 8.1 completed (Realtime subscription)
- [ ] Task 8.2 completed (Consolidated demand queries)
- [ ] V8.1 Build passes
- [ ] V8.2 Realtime works
- [ ] V8.3 Fallback works
- [ ] V8.4 DemandBoard works
- [ ] Changes committed with message: `perf: replace polling with realtime, consolidate demand signal queries`

## Exit Conditions
- [ ] All verification steps pass
- [ ] Code committed to branch
- [ ] All 8 sessions complete

---

# FINAL COMPLETION CHECKLIST

## All Sessions Complete

- [ ] Session 1: Search Debouncing
- [ ] Session 2: Dashboard Parallelization
- [ ] Session 3: AdminHub O(N×M) Fix
- [ ] Session 4: N+1 Query Fixes (Faculty)
- [ ] Session 5: N+1 Query Fixes (Employer)
- [ ] Session 6: Waterfall Consolidation
- [ ] Session 7: React Optimization
- [ ] Session 8: Backend & Realtime

## Performance Metrics Achieved

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| MyOpportunities search API calls | ~N per char | | 1-2 | |
| StudentDashboard load time | ~2000ms | | <600ms | |
| AdminHub signal mapping | O(N×M) | | O(N+M) | |
| Notification ownership queries | N per event | | 0 | |
| EmployerDashboard load time | ~1200ms | | <500ms | |
| Configure polling calls | 6/min | | 0 | |

## Final Steps

1. **Create Pull Request** with all changes
2. **Document in PR description:**
   - All performance improvements
   - Before/after metrics
   - Any known limitations
3. **Request review** from team lead
4. **Deploy to staging** and verify in production-like environment
5. **Monitor** for 24-48 hours after production deploy

---

## Appendix A: Rollback Procedures

### Quick Rollback (Individual Session)
```bash
git revert <commit-hash>
git push origin <branch>
```

### Full Rollback (All Changes)
```bash
git log --oneline  # Find commit before first perf change
git reset --hard <pre-perf-commit>
git push origin <branch> --force  # Requires confirmation
```

### Partial Rollback (Keep Some Changes)
1. Identify problematic commit(s)
2. Use `git revert` for specific commits
3. Resolve any merge conflicts
4. Test thoroughly before pushing

---

## Appendix B: Monitoring After Deployment

### Key Metrics to Watch

1. **API Response Times** (via Supabase Dashboard)
   - `project_applications` queries
   - `job_matches` queries
   - Dashboard aggregations

2. **Realtime Connection Count** (Supabase Dashboard)
   - Watch for connection exhaustion
   - Free tier limit: 200 concurrent

3. **Client-Side Performance** (Browser DevTools)
   - Largest Contentful Paint (LCP)
   - Time to Interactive (TTI)

4. **Error Rates** (Console/Sentry)
   - Watch for new error patterns
   - Especially in realtime subscriptions

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Dashboard load time | >800ms | >1500ms |
| Realtime connections | >150 | >190 |
| API error rate | >1% | >5% |
| React re-renders (hot path) | >3 | >10 |

---

*Document generated: 2026-01-04*
*For questions or issues, contact the development team.*
