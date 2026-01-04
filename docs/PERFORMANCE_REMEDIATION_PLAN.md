# Performance Remediation Implementation Plan

## Executive Summary

This document provides a detailed, actionable implementation plan for fixing all performance anti-patterns, N+1 queries, and inefficient algorithms identified in the codebase analysis.

### Codebase Metrics
| Metric | Count |
|--------|-------|
| Total Files | 401 |
| Total Lines of Code | 108,444 |
| TypeScript/TSX Files | 224 |
| Issues Identified | 27 |
| Critical Issues | 4 |
| High Severity Issues | 8 |
| Medium Severity Issues | 11 |
| Low Severity Issues | 4 |

### Estimated Effort & Impact
| Phase | Duration | Impact Level |
|-------|----------|--------------|
| Phase 1: Quick Wins | Day 1 | High |
| Phase 2: N+1 Query Elimination | Day 2 | Critical |
| Phase 3: Waterfall Consolidation | Day 2-3 | High |
| Phase 4: React Optimization | Day 3-4 | Medium |
| Phase 5: Architecture Improvements | Day 4-5 | High |
| Phase 6: Backend Optimization | Day 5-7 | High |

---

## Phase 1: Quick Wins (Day 1)

### Task 1.1: Debounce Search in MyOpportunities

**File:** `src/pages/MyOpportunities.tsx`
**Severity:** High
**Effort:** 15 minutes
**Impact:** 75% reduction in API calls during search

#### Current Code (Lines 31-64)
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [statusFilter, setStatusFilter] = useState<string>("all");

useEffect(() => {
  if (user) {
    fetchJobMatches();
  }
}, [user, searchQuery, statusFilter]); // Triggers on EVERY keystroke!
```

#### Problem
Typing "software" triggers 8 separate API calls (one per character), causing:
- Excessive database load
- UI flicker from rapid loading states
- Race conditions where results arrive out of order

#### Refactored Code
```typescript
import { useState, useEffect, useMemo } from "react";

const [searchQuery, setSearchQuery] = useState("");
const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
const [statusFilter, setStatusFilter] = useState<string>("all");

// Debounce search query with 300ms delay
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchQuery(searchQuery);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

// Only fetch when debounced value changes
useEffect(() => {
  if (user) {
    fetchJobMatches();
  }
}, [user, debouncedSearchQuery, statusFilter]); // Uses debounced value
```

#### Files to Modify
- `src/pages/MyOpportunities.tsx`

#### Testing Steps
1. Open MyOpportunities page
2. Open browser DevTools Network tab
3. Type "software engineer" in search
4. Verify only 1-2 API calls are made (not 17)
5. Verify results update after typing stops

#### Rollback Plan
Revert to original `useEffect` dependencies if issues arise.

---

### Task 1.2: Parallelize StudentDashboard Queries

**File:** `src/pages/StudentDashboard.tsx`
**Severity:** High
**Effort:** 20 minutes
**Impact:** 4x faster dashboard load (2000ms → 500ms)

#### Current Code (Lines 52-79)
```typescript
const fetchDashboardData = async () => {
  setLoading(true);
  try {
    // Sequential queries - each blocks the next
    const { data: applications } = await supabase
      .from("project_applications")
      .select("*, projects(title, company_name)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const { count: jobCount } = await supabase
      .from("job_matches")
      .select("*", { count: "exact", head: true })
      .eq("student_id", user.id);

    const { count: compCount } = await supabase
      .from("verified_competencies")
      .select("*", { count: "exact", head: true })
      .eq("student_id", user.id);

    const { count: projectCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("status", "curated_live");

    // Set state...
  }
};
```

#### Problem
Four sequential `await` statements. If each query takes 500ms, total load time is ~2000ms.

#### Refactored Code
```typescript
const fetchDashboardData = async () => {
  setLoading(true);
  try {
    // Parallel queries - all execute simultaneously
    const [
      applicationsResult,
      jobCountResult,
      compCountResult,
      projectCountResult
    ] = await Promise.all([
      supabase
        .from("project_applications")
        .select("*, projects(title, company_name)")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("job_matches")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id),
      supabase
        .from("verified_competencies")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id),
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "curated_live")
    ]);

    // Destructure results
    const applications = applicationsResult.data;
    const jobCount = jobCountResult.count ?? 0;
    const compCount = compCountResult.count ?? 0;
    const projectCount = projectCountResult.count ?? 0;

    // Handle errors from any query
    const errors = [
      applicationsResult.error,
      jobCountResult.error,
      compCountResult.error,
      projectCountResult.error
    ].filter(Boolean);
    
    if (errors.length > 0) {
      console.error("Dashboard query errors:", errors);
    }

    setMetrics({
      applicationsCount: applications?.length ?? 0,
      jobMatchesCount: jobCount,
      verifiedCompetenciesCount: compCount,
      availableProjectsCount: projectCount
    });
    setRecentApplications(applications ?? []);
  } finally {
    setLoading(false);
  }
};
```

#### Files to Modify
- `src/pages/StudentDashboard.tsx`

#### Testing Steps
1. Add `console.time('dashboard-load')` before Promise.all
2. Add `console.timeEnd('dashboard-load')` after
3. Verify load time is ~500ms instead of ~2000ms
4. Verify all data displays correctly

#### Rollback Plan
Revert to sequential awaits if any query errors cause issues with subsequent logic.

---

### Task 1.3: Fix O(N×M) Filtering in AdminHub

**File:** `src/pages/AdminHub.tsx`
**Severity:** High
**Effort:** 20 minutes
**Impact:** 80x faster filtering (50,000 ops → 600 ops for 100 projects × 500 signals)

#### Current Code (Lines 140-146)
```typescript
const projectsWithSignals = (projectData || []).map(project => {
  const companySignals = (signalData || [])
    .filter(signal => signal.company_id === project.company_profile_id);
  return {
    ...project,
    signals: companySignals
  };
});
```

#### Problem
For each project, iterates through ALL signals. With 100 projects and 500 signals = 50,000 filter operations.

#### Refactored Code
```typescript
// Build signal lookup map first - O(signals)
const signalMap = new Map<string, typeof signalData>();
(signalData || []).forEach(signal => {
  if (!signal.company_id) return;
  const existing = signalMap.get(signal.company_id) || [];
  existing.push(signal);
  signalMap.set(signal.company_id, existing);
});

// Map projects with O(1) signal lookup
const projectsWithSignals = (projectData || []).map(project => {
  const companySignals = project.company_profile_id 
    ? signalMap.get(project.company_profile_id) || []
    : [];
  return {
    ...project,
    signals: companySignals
  };
});
```

#### Complexity Analysis
| Approach | Time Complexity | For 100 projects × 500 signals |
|----------|----------------|-------------------------------|
| Original | O(N × M) | 50,000 operations |
| Optimized | O(N + M) | 600 operations |

#### Files to Modify
- `src/pages/AdminHub.tsx`

#### Testing Steps
1. Add `console.time('signal-mapping')` before and after the mapping code
2. Test with production-like data volumes
3. Verify signals are correctly associated with projects

#### Rollback Plan
Simple refactor with no behavior change; revert if type issues arise.

---

### Task 1.4: Fix Set Spread Anti-Pattern

**File:** `src/pages/Projects.tsx`
**Severity:** Low
**Effort:** 5 minutes
**Impact:** Minor memory/performance improvement

#### Current Code (Line 186)
```typescript
setAppliedProjects(prev => new Set([...prev, projectId]));
```

#### Problem
Spreads entire Set into array, creates new array with added element, then creates new Set from array.

#### Refactored Code
```typescript
setAppliedProjects(prev => {
  const next = new Set(prev);
  next.add(projectId);
  return next;
});
```

#### Files to Modify
- `src/pages/Projects.tsx`

#### Testing Steps
1. Apply to a project
2. Verify UI updates correctly
3. Verify no console errors

---

## Phase 2: N+1 Query Elimination (Day 2)

### Task 2.1: Pre-fetch Faculty Courses for Ownership Checks

**File:** `src/hooks/useRealtimeNotifications.ts`
**Severity:** Critical
**Effort:** 45 minutes
**Impact:** Eliminates per-event database queries for faculty

#### Current Code (Lines 93-115)
```typescript
.on("postgres_changes", {
  event: "UPDATE",
  schema: "public",
  table: "projects",
}, async (payload) => {
  const updated = payload.new as any;
  
  // N+1 QUERY: Called for EVERY project update event
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

#### Problem
Every project update in the system triggers a database query to check if this faculty member owns the course. With 50 faculty and 100 daily project updates = 5,000 unnecessary queries.

#### Refactored Code
```typescript
// At component mount, pre-fetch all course IDs owned by this faculty
const [ownedCourseIds, setOwnedCourseIds] = useState<Set<string>>(new Set());

useEffect(() => {
  if (!user || !roles.includes('faculty')) return;
  
  const fetchOwnedCourses = async () => {
    const { data } = await supabase
      .from("course_profiles")
      .select("id")
      .eq("owner_id", user.id);
    
    setOwnedCourseIds(new Set(data?.map(c => c.id) || []));
  };
  
  fetchOwnedCourses();
}, [user, roles]);

// In realtime subscription - NO database query needed
.on("postgres_changes", {
  event: "UPDATE",
  schema: "public",
  table: "projects",
}, (payload) => {
  const updated = payload.new as any;
  
  // O(1) client-side check using pre-fetched data
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

#### Files to Modify
- `src/hooks/useRealtimeNotifications.ts`

#### Testing Steps
1. Log in as faculty
2. Open Network tab
3. Trigger project updates via admin
4. Verify NO new queries for ownership checks
5. Verify notifications still appear for owned projects

#### Rollback Plan
Revert to per-event query if pre-fetched data causes stale ownership issues.

---

### Task 2.2: Use Subscription Filters for Employer Projects

**File:** `src/hooks/useRealtimeNotifications.ts`
**Severity:** Critical
**Effort:** 45 minutes
**Impact:** Eliminates per-application ownership queries

#### Current Code (Lines 147-170)
```typescript
.on("postgres_changes", {
  event: "INSERT",
  schema: "public",
  table: "project_applications",
}, async (payload) => {
  const newApp = payload.new as any;
  
  // N+1 QUERY: Called for EVERY application insert
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

#### Refactored Code
```typescript
// Pre-fetch project IDs linked to employer's company
const [ownedProjectIds, setOwnedProjectIds] = useState<Set<string>>(new Set());
const [projectTitles, setProjectTitles] = useState<Map<string, string>>(new Map());

useEffect(() => {
  if (!user || !roles.includes('employer')) return;
  
  const fetchOwnedProjects = async () => {
    const { data: companyProfile } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();
    
    if (companyProfile) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, title")
        .eq("company_profile_id", companyProfile.id);
      
      setOwnedProjectIds(new Set(projects?.map(p => p.id) || []));
      setProjectTitles(new Map(projects?.map(p => [p.id, p.title]) || []));
    }
  };
  
  fetchOwnedProjects();
}, [user, roles]);

// In realtime subscription
.on("postgres_changes", {
  event: "INSERT",
  schema: "public",
  table: "project_applications",
}, (payload) => {
  const newApp = payload.new as any;
  
  // O(1) client-side check
  if (ownedProjectIds.has(newApp.project_id)) {
    const projectTitle = projectTitles.get(newApp.project_id) || "a project";
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: crypto.randomUUID(),
        type: "new_application",
        title: "New Application",
        message: `New application received for "${projectTitle}"`,
        read: false,
        created_at: new Date().toISOString(),
        data: { applicationId: newApp.id, projectId: newApp.project_id }
      }
    });
  }
})
```

#### Files to Modify
- `src/hooks/useRealtimeNotifications.ts`

#### Testing Steps
1. Log in as employer
2. Have another user apply to employer's project
3. Verify notification appears
4. Verify NO database query on each application

---

### Task 2.3: Server-Side Skill Filtering in useDemandSignals

**File:** `src/hooks/useDemandSignals.ts`
**Severity:** High
**Effort:** 30 minutes
**Impact:** Reduces client data transfer and processing

#### Current Code (Lines 30-76)
```typescript
export const useDemandSignals = (filters?: DemandSignalFilters) => {
  return useQuery({
    queryKey: ["demandSignals", filters],
    queryFn: async () => {
      let query = supabase
        .from("demand_signals")
        .select("*")
        .eq("is_active", true);

      // Server-side filters for simple equality
      if (filters?.category) {
        query = query.eq("project_category", filters.category);
      }
      if (filters?.region) {
        query = query.eq("geographic_region", filters.region);
      }
      if (filters?.minStudents) {
        query = query.gte("student_count", filters.minStudents);
      }

      const { data, error } = await query;
      if (error) throw error;

      // CLIENT-SIDE filtering for skills - inefficient!
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

      return results;
    },
  });
};
```

#### Refactored Code
```typescript
export const useDemandSignals = (filters?: DemandSignalFilters) => {
  return useQuery({
    queryKey: ["demandSignals", filters],
    queryFn: async () => {
      let query = supabase
        .from("demand_signals")
        .select("*")
        .eq("is_active", true);

      if (filters?.category) {
        query = query.eq("project_category", filters.category);
      }
      if (filters?.region) {
        query = query.eq("geographic_region", filters.region);
      }
      if (filters?.minStudents) {
        query = query.gte("student_count", filters.minStudents);
      }

      // SERVER-SIDE skill filtering using PostgreSQL array overlap
      if (filters?.skills && filters.skills.length > 0) {
        // Use case-insensitive search via ilike pattern
        // For each skill, check if any required_skill contains it
        const skillPatterns = filters.skills.map(s => `%${s.toLowerCase()}%`);
        
        // Use RPC call for complex array filtering
        // Alternative: Use filter with 'cs' (contains) operator
        query = query.or(
          filters.skills
            .map(skill => `required_skills.cs.{${skill}}`)
            .join(',')
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []) as DemandSignal[];
    },
  });
};
```

**Note:** If the array contains operator doesn't work with case-insensitive matching, create a database function:

```sql
-- Migration to add server-side skill matching
CREATE OR REPLACE FUNCTION public.demand_signals_match_skills(
  signal_skills text[],
  search_skills text[]
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM unnest(signal_skills) AS s
    WHERE EXISTS (
      SELECT 1
      FROM unnest(search_skills) AS search
      WHERE lower(s) LIKE '%' || lower(search) || '%'
    )
  );
$$;
```

#### Files to Modify
- `src/hooks/useDemandSignals.ts`
- (Optional) Create migration for database function

#### Testing Steps
1. Open DemandBoard page
2. Apply skill filter
3. Verify results are correct
4. Verify Network tab shows smaller response payload

---

### Task 2.4: Consolidate Category/Region Queries

**File:** `src/hooks/useDemandSignals.ts`
**Severity:** Medium
**Effort:** 20 minutes
**Impact:** Reduces duplicate queries

#### Current Code (Lines 79-114)
```typescript
export const useDemandCategories = () => {
  return useQuery({
    queryKey: ["demandCategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demand_signals")
        .select("project_category")
        .eq("is_active", true);

      if (error) throw error;
      const categories = [...new Set((data ?? []).map((d) => d.project_category))];
      return categories.sort();
    },
  });
};

export const useDemandRegions = () => {
  return useQuery({
    queryKey: ["demandRegions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demand_signals")
        .select("geographic_region")
        .eq("is_active", true);

      if (error) throw error;
      const regions = [...new Set((data ?? [])
        .map((d) => d.geographic_region)
        .filter((r): r is string => r !== null))];
      return regions.sort();
    },
  });
};
```

#### Refactored Code
```typescript
// Combined hook for filter options - single query
export const useDemandFilterOptions = () => {
  return useQuery({
    queryKey: ["demandFilterOptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demand_signals")
        .select("project_category, geographic_region")
        .eq("is_active", true);

      if (error) throw error;

      const categories = [...new Set((data ?? []).map((d) => d.project_category))].sort();
      const regions = [...new Set((data ?? [])
        .map((d) => d.geographic_region)
        .filter((r): r is string => r !== null))].sort();

      return { categories, regions };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - these change infrequently
  });
};

// Keep individual hooks for backward compatibility (if needed)
export const useDemandCategories = () => {
  const { data, ...rest } = useDemandFilterOptions();
  return { data: data?.categories, ...rest };
};

export const useDemandRegions = () => {
  const { data, ...rest } = useDemandFilterOptions();
  return { data: data?.regions, ...rest };
};
```

#### Files to Modify
- `src/hooks/useDemandSignals.ts`

#### Testing Steps
1. Open DemandBoard
2. Verify category and region dropdowns populate correctly
3. Verify only ONE query in Network tab (not two)

---

## Phase 3: Waterfall Query Consolidation (Day 2-3)

### Task 3.1: Consolidate EmployerDashboard Queries

**File:** `src/pages/EmployerDashboard.tsx`
**Severity:** Critical
**Effort:** 1 hour
**Impact:** 4x faster load (800-1200ms → 200-400ms)

#### Current Code (Lines 81-198)
```typescript
// Waterfall 1: Fetch company profile
useEffect(() => {
  if (user && isEmployer) {
    fetchCompanyProfile();
  }
}, [user, isEmployer]);

// Waterfall 2: Only after company profile loads
useEffect(() => {
  if (companyProfile) {
    fetchProjects();
    fetchApplications();
  }
}, [companyProfile]);

// fetchApplications has nested waterfall:
const fetchApplications = async () => {
  // Query 1: Get applications
  const { data: applicationsData } = await supabase.from("project_applications")...
  
  // Query 2: Get student profiles (sequential!)
  const { data: profilesData } = await supabase.from("profiles").in("id", studentIds);
};
```

#### Refactored Code

**Create new hook:** `src/hooks/useEmployerDashboardData.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EmployerDashboardData {
  companyProfile: any;
  projects: any[];
  applications: any[];
  studentProfiles: Map<string, any>;
}

export function useEmployerDashboardData(userId: string | undefined, isEmployer: boolean) {
  return useQuery({
    queryKey: ["employerDashboard", userId],
    queryFn: async (): Promise<EmployerDashboardData> => {
      if (!userId) throw new Error("No user ID");

      // Step 1: Get company profile
      const { data: companyProfile, error: profileError } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("owner_user_id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!companyProfile) {
        return { companyProfile: null, projects: [], applications: [], studentProfiles: new Map() };
      }

      // Step 2: Parallel fetch projects and applications
      const [projectsResult, applicationsResult] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("company_profile_id", companyProfile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_applications")
          .select("*, projects!inner(id, title, company_profile_id)")
          .eq("projects.company_profile_id", companyProfile.id)
          .order("created_at", { ascending: false })
      ]);

      if (projectsResult.error) throw projectsResult.error;
      if (applicationsResult.error) throw applicationsResult.error;

      const applications = applicationsResult.data || [];
      const studentIds = [...new Set(applications.map(a => a.student_id))];

      // Step 3: Fetch student profiles (only if there are applications)
      let studentProfiles = new Map<string, any>();
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", studentIds);

        studentProfiles = new Map(profiles?.map(p => [p.id, p]) || []);
      }

      return {
        companyProfile,
        projects: projectsResult.data || [],
        applications: applications.map(app => ({
          ...app,
          student_email: studentProfiles.get(app.student_id)?.email || null
        })),
        studentProfiles
      };
    },
    enabled: !!userId && isEmployer,
    staleTime: 60 * 1000, // 1 minute
  });
}
```

**Update EmployerDashboard.tsx:**

```typescript
import { useEmployerDashboardData } from "@/hooks/useEmployerDashboardData";

const EmployerDashboard = () => {
  const { user, roles } = useAuth();
  const isEmployer = roles.includes("employer");
  
  const { 
    data, 
    isLoading, 
    error 
  } = useEmployerDashboardData(user?.id, isEmployer);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} />;

  const { companyProfile, projects, applications } = data || {};

  // ... rest of component using consolidated data
};
```

#### Files to Modify
- Create: `src/hooks/useEmployerDashboardData.ts`
- Update: `src/pages/EmployerDashboard.tsx`

#### Testing Steps
1. Log in as employer
2. Measure load time with Performance tab
3. Verify all data displays correctly
4. Verify 2-3 network requests instead of 4-5

---

### Task 3.2: Reduce job_postings Payload Size

**File:** `src/hooks/usePaginatedProjects.ts`
**Severity:** Medium
**Effort:** 30 minutes
**Impact:** 60-80% smaller payload per project

#### Current Code (Lines 70, 100, 128)
```typescript
.select("*, course_profiles(owner_id, title), company_profiles(job_postings)")
```

#### Problem
`job_postings` can contain arrays of full job objects (title, description, requirements, etc.). For project list views, only the count is typically displayed.

#### Refactored Code

**Option A: Select only needed fields**
```typescript
.select(`
  *,
  course_profiles(owner_id, title),
  company_profiles(
    id,
    name,
    organization_logo_url,
    job_postings
  )
`)
```

**Option B: Create a computed column (preferred)**

Create a migration:
```sql
-- Add computed column for job posting count
ALTER TABLE company_profiles 
ADD COLUMN job_postings_count integer 
GENERATED ALWAYS AS (
  COALESCE(jsonb_array_length(job_postings), 0)
) STORED;
```

Then update the query:
```typescript
.select(`
  *,
  course_profiles(owner_id, title),
  company_profiles(
    id,
    name, 
    organization_logo_url,
    job_postings_count
  )
`)
```

#### Files to Modify
- `src/hooks/usePaginatedProjects.ts`
- (Optional) Create migration for computed column

#### Testing Steps
1. Load projects page
2. Check Network tab for response size
3. Verify job count displays correctly on project cards

---

## Phase 4: React Optimization (Day 3-4)

### Task 4.1: Extract Inline Functions in Projects.tsx

**File:** `src/pages/Projects.tsx`
**Severity:** High
**Effort:** 45 minutes
**Impact:** Fewer re-renders, stable child component references

#### Current Code (Lines 327-471)
```typescript
{projects.map((project) => (
  <Card
    key={project.id}
    onClick={() => navigate(`/projects/${project.id}`, { state: { courseId: selectedCourseId } })}
  >
    <Button onClick={(e) => handleApplyToProject(project.id, e)}>Apply</Button>
    <Button onClick={(e) => handleRateProject(project, e)}>Rate</Button>
    {/* More inline handlers... */}
  </Card>
))}
```

#### Refactored Code
```typescript
// Extract handlers with useCallback
const handleNavigateToProject = useCallback((projectId: string) => {
  navigate(`/projects/${projectId}`, { state: { courseId: selectedCourseId } });
}, [navigate, selectedCourseId]);

const handleApply = useCallback((projectId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  handleApplyToProject(projectId, e);
}, [handleApplyToProject]);

const handleRate = useCallback((project: Project, e: React.MouseEvent) => {
  e.stopPropagation();
  handleRateProject(project, e);
}, [handleRateProject]);

// In render - pass stable references
{projects.map((project) => (
  <ProjectCard
    key={project.id}
    project={project}
    onNavigate={handleNavigateToProject}
    onApply={handleApply}
    onRate={handleRate}
    isApplied={appliedProjects.has(project.id)}
  />
))}
```

**Create memoized ProjectCard component:**
```typescript
// src/components/ProjectCard.tsx
import React from 'react';

interface ProjectCardProps {
  project: Project;
  onNavigate: (id: string) => void;
  onApply: (id: string, e: React.MouseEvent) => void;
  onRate: (project: Project, e: React.MouseEvent) => void;
  isApplied: boolean;
}

export const ProjectCard = React.memo(function ProjectCard({
  project,
  onNavigate,
  onApply,
  onRate,
  isApplied
}: ProjectCardProps) {
  return (
    <Card onClick={() => onNavigate(project.id)}>
      {/* ... card content ... */}
      <Button onClick={(e) => onApply(project.id, e)} disabled={isApplied}>
        {isApplied ? 'Applied' : 'Apply'}
      </Button>
      <Button onClick={(e) => onRate(project, e)}>Rate</Button>
    </Card>
  );
});
```

#### Files to Modify
- `src/pages/Projects.tsx`
- Create: `src/components/ProjectCard.tsx`

#### Testing Steps
1. Use React DevTools Profiler
2. Trigger re-renders (e.g., scroll, filter change)
3. Verify ProjectCard components don't re-render unless their props change

---

### Task 4.2: Add React.memo to High-Traffic Components

**Files:** Multiple
**Severity:** Medium
**Effort:** 1 hour
**Impact:** Reduced unnecessary re-renders

#### Components to Memoize

| Component | File | Reason |
|-----------|------|--------|
| Header | `src/components/Header.tsx` | Re-renders on every route change |
| OverviewTab | `src/components/project-detail/OverviewTab.tsx` | Pure display component |
| TimelineTab | `src/components/project-detail/TimelineTab.tsx` | Pure display component |
| ContactTab | `src/components/project-detail/ContactTab.tsx` | Pure display component |
| SignalScoreCard | `src/components/signals/SignalScoreCard.tsx` | Rendered in lists |
| DemandSignalCard | `src/components/demand-dashboard/DemandSignalCard.tsx` | Rendered in lists |

#### Pattern
```typescript
// Before
export const OverviewTab = ({ project, companyProfile }: OverviewTabProps) => {
  // ...
};

// After
export const OverviewTab = React.memo(function OverviewTab({ 
  project, 
  companyProfile 
}: OverviewTabProps) {
  // ...
});
```

#### Files to Modify
- `src/components/Header.tsx`
- `src/components/project-detail/OverviewTab.tsx`
- `src/components/project-detail/TimelineTab.tsx`
- `src/components/project-detail/ContactTab.tsx`
- `src/components/signals/SignalScoreCard.tsx`
- `src/components/demand-dashboard/DemandSignalCard.tsx`

---

### Task 4.3: Memoize NotificationContext Value

**File:** `src/contexts/NotificationContext.tsx`
**Severity:** Medium
**Effort:** 15 minutes
**Impact:** Fewer context consumer re-renders

#### Current Code (Lines 54-65)
```typescript
const unreadCount = notifications.filter((n) => !n.read).length;

return (
  <NotificationContext.Provider value={{
    notifications,
    unreadCount,
    dispatch,
    markAsRead,
    markAllAsRead,
    clearNotifications
  }}>
    {children}
  </NotificationContext.Provider>
);
```

#### Refactored Code
```typescript
const unreadCount = useMemo(
  () => notifications.filter((n) => !n.read).length,
  [notifications]
);

const contextValue = useMemo(
  () => ({
    notifications,
    unreadCount,
    dispatch,
    markAsRead,
    markAllAsRead,
    clearNotifications
  }),
  [notifications, unreadCount, dispatch, markAsRead, markAllAsRead, clearNotifications]
);

return (
  <NotificationContext.Provider value={contextValue}>
    {children}
  </NotificationContext.Provider>
);
```

#### Files to Modify
- `src/contexts/NotificationContext.tsx`

---

### Task 4.4: Consolidate AuthContext Session Check

**File:** `src/contexts/AuthContext.tsx`
**Severity:** Low
**Effort:** 30 minutes
**Impact:** Cleaner initialization, one less race condition

#### Current Code (Lines 65-101)
```typescript
// Auth state listener
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (_event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
    if (session?.user) {
      setTimeout(() => {
        fetchUserRoles(session.user.id);
      }, 0);
    } else {
      setRoles([]);
    }
    setIsLoading(false);
  }
);

// Also gets session separately (potential double fetch)
supabase.auth.getSession().then(({ data: { session } }) => {
  setSession(session);
  setUser(session?.user ?? null);
  if (session?.user) {
    fetchUserRoles(session.user.id);
  }
  setIsLoading(false);
});
```

#### Refactored Code
```typescript
useEffect(() => {
  let mounted = true;
  
  // Single initialization path
  const initializeAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!mounted) return;
    
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      await fetchUserRoles(session.user.id);
    }
    
    setIsLoading(false);
  };

  initializeAuth();

  // Listen for future auth changes (login/logout)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserRoles(session.user.id);
      } else {
        setRoles([]);
      }
    }
  );

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);
```

#### Files to Modify
- `src/contexts/AuthContext.tsx`

---

## Phase 5: Architecture Improvements (Day 4-5)

### Task 5.1: Replace Polling with Realtime Subscriptions

**File:** `src/pages/Configure.tsx`
**Severity:** High
**Effort:** 1 hour
**Impact:** Instant status updates, 6 fewer API calls per minute

#### Current Code (Lines 99-166)
```typescript
// Start polling every 10 seconds
pollingInterval.current = window.setInterval(checkProjectStatus, 10000);

const checkProjectStatus = async () => {
  const { data: projects, count } = await supabase
    .from('projects')
    .select('id, status', { count: 'exact' })
    .eq('generation_run_id', generationRunId);
  
  // Update progress based on count...
};
```

#### Refactored Code
```typescript
useEffect(() => {
  if (!generationRunId || !isGenerating) return;

  // Subscribe to generation_runs status changes
  const runChannel = supabase
    .channel(`generation-run-${generationRunId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'generation_runs',
        filter: `id=eq.${generationRunId}`
      },
      (payload) => {
        const updated = payload.new as any;
        
        if (updated.status === 'completed') {
          setIsGenerating(false);
          setProgress(100);
          toast.success('Project generation complete!');
        } else if (updated.status === 'error') {
          setIsGenerating(false);
          toast.error(updated.error_message || 'Generation failed');
        } else {
          // Update progress based on projects_generated / num_teams
          const progress = (updated.projects_generated / updated.num_teams) * 100;
          setProgress(Math.round(progress));
        }
      }
    )
    .subscribe();

  // Also subscribe to projects table for granular progress
  const projectChannel = supabase
    .channel(`generation-projects-${generationRunId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'projects',
        filter: `generation_run_id=eq.${generationRunId}`
      },
      (payload) => {
        setProjectsGenerated(prev => prev + 1);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(runChannel);
    supabase.removeChannel(projectChannel);
  };
}, [generationRunId, isGenerating]);
```

#### Files to Modify
- `src/pages/Configure.tsx`

#### Testing Steps
1. Start project generation
2. Verify NO polling requests in Network tab
3. Verify progress updates immediately when projects are created
4. Verify completion notification appears instantly

---

### Task 5.2: Debounce Analytics Writes

**File:** `src/hooks/useProjectAnalytics.ts`
**Severity:** Medium
**Effort:** 30 minutes
**Impact:** Reduced main thread blocking

#### Current Code (Lines 51-76)
```typescript
useEffect(() => {
  // Runs on EVERY project view, synchronously
  const recentViews = JSON.parse(localStorage.getItem('recentProjectViews') || '[]');
  recentViews.unshift(analyticsData);
  localStorage.setItem('recentProjectViews', JSON.stringify(recentViews));

  // Also calculates aggregates synchronously
  const enrichmentLevels = recentViews.reduce((acc, view) => {...}, {});
  const avgCompleteness = recentViews.reduce(...);
}, [projectId]);
```

#### Refactored Code
```typescript
// Debounce localStorage writes
const debouncedAnalyticsWrite = useMemo(
  () => debounce((data: AnalyticsData) => {
    try {
      const recentViews = JSON.parse(localStorage.getItem('recentProjectViews') || '[]');
      
      // Keep only last 50 views
      recentViews.unshift(data);
      if (recentViews.length > 50) {
        recentViews.pop();
      }
      
      localStorage.setItem('recentProjectViews', JSON.stringify(recentViews));
    } catch (e) {
      console.warn('Failed to write analytics:', e);
    }
  }, 1000),
  []
);

useEffect(() => {
  if (analyticsData) {
    debouncedAnalyticsWrite(analyticsData);
  }
  
  return () => {
    debouncedAnalyticsWrite.cancel?.();
  };
}, [analyticsData, debouncedAnalyticsWrite]);
```

#### Files to Modify
- `src/hooks/useProjectAnalytics.ts`

---

### Task 5.3: Investigate setTimeout in AuthContext

**File:** `src/contexts/AuthContext.tsx`
**Severity:** Low
**Effort:** 30 minutes
**Impact:** Cleaner code, potential race condition fix

#### Current Code (Lines 77-79)
```typescript
setTimeout(() => {
  fetchUserRoles(session.user.id);
}, 0);
```

The comment says this is to "avoid Supabase auth deadlock" but the actual reason is unclear.

#### Investigation Steps
1. Remove the `setTimeout` wrapper
2. Test login flow thoroughly
3. If deadlock occurs, document the specific scenario
4. If no issues, keep the simpler code

#### Files to Modify
- `src/contexts/AuthContext.tsx` (potentially)

---

## Phase 6: Backend Optimization (Day 5-7)

### Task 6.1: Parallelize O*NET API Calls

**File:** `supabase/functions/discover-companies/index.ts`
**Severity:** High
**Effort:** 30 minutes
**Impact:** 2-3x faster discovery phase

#### Current Code (Lines 448-507)
```typescript
for (const socMapping of socMappings.slice(0, 3)) {
  try {
    const occDetails = await onetProvider.getOccupationDetails(socMapping.socCode);
    // Process details...
  } catch (error) {
    // Handle error...
  }
}
```

#### Refactored Code
```typescript
const onetPromises = socMappings.slice(0, 3).map(async (socMapping) => {
  try {
    const occDetails = await onetProvider.getOccupationDetails(socMapping.socCode);
    return { socCode: socMapping.socCode, details: occDetails, error: null };
  } catch (error) {
    console.warn(`O*NET fetch failed for ${socMapping.socCode}:`, error);
    return { socCode: socMapping.socCode, details: null, error };
  }
});

const onetResults = await Promise.all(onetPromises);

// Process successful results
const successfulResults = onetResults.filter(r => r.details !== null);
for (const result of successfulResults) {
  // Process occupation details...
}
```

#### Files to Modify
- `supabase/functions/discover-companies/index.ts`

---

### Task 6.2: Parallelize Firecrawl Calls

**File:** `supabase/functions/discover-companies/index.ts`
**Severity:** High
**Effort:** 30 minutes
**Impact:** 3x faster career page validation

#### Current Code (Lines 1294-1348)
```typescript
for (const company of topCompaniesToValidate) {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {...});
  // Process response...
}
```

#### Refactored Code
```typescript
const scrapePromises = topCompaniesToValidate.map(async (company) => {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: company.careersPageUrl,
        formats: ['markdown'],
        timeout: 30000
      })
    });
    
    const data = await response.json();
    return { companyId: company.id, data, error: null };
  } catch (error) {
    return { companyId: company.id, data: null, error };
  }
});

const scrapeResults = await Promise.allSettled(scrapePromises);

// Process results
for (const result of scrapeResults) {
  if (result.status === 'fulfilled' && result.value.data) {
    // Update company with scraped data...
  }
}
```

#### Files to Modify
- `supabase/functions/discover-companies/index.ts`

---

### Task 6.3: Create Postgres VIEW for AdminHub Data

**Severity:** Medium
**Effort:** 1 hour
**Impact:** Eliminate client-side JOIN, faster queries

#### Migration SQL
```sql
CREATE OR REPLACE VIEW admin_projects_with_signals AS
SELECT 
  p.id,
  p.title,
  p.company_name,
  p.status,
  p.final_score,
  p.created_at,
  p.course_id,
  p.company_profile_id,
  cp.title as course_title,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', cs.id,
        'signal_type', cs.signal_type,
        'project_score', cs.project_score,
        'created_at', cs.created_at
      )
    ) FILTER (WHERE cs.id IS NOT NULL),
    '[]'::jsonb
  ) as signals
FROM projects p
LEFT JOIN course_profiles cp ON p.course_id = cp.id
LEFT JOIN company_signals cs ON cs.company_id = p.company_profile_id
GROUP BY p.id, cp.title;

-- Add RLS policy
ALTER VIEW admin_projects_with_signals SET (security_invoker = on);
```

#### Updated Query in AdminHub
```typescript
const { data: projectsWithSignals } = await supabase
  .from('admin_projects_with_signals')
  .select('*')
  .order('created_at', { ascending: false });

// No more client-side mapping needed!
setProjects(projectsWithSignals);
```

#### Files to Modify
- Create migration
- Update `src/pages/AdminHub.tsx`

---

### Task 6.4: Add Circuit Breaker to generate-projects

**File:** `supabase/functions/generate-projects/index.ts`
**Severity:** Medium
**Effort:** 1 hour
**Impact:** Graceful degradation during outages

#### Implementation
```typescript
// Circuit breaker state (would be in shared module)
interface CircuitBreaker {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

function checkCircuitBreaker(breaker: CircuitBreaker): boolean {
  const now = Date.now();
  
  if (breaker.state === 'open') {
    if (now - breaker.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
      breaker.state = 'half-open';
      return true; // Allow one request through
    }
    return false; // Circuit is open, reject request
  }
  
  return true;
}

function recordFailure(breaker: CircuitBreaker): void {
  breaker.failures++;
  breaker.lastFailure = Date.now();
  
  if (breaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    breaker.state = 'open';
    console.warn('Circuit breaker opened due to repeated failures');
  }
}

function recordSuccess(breaker: CircuitBreaker): void {
  breaker.failures = 0;
  breaker.state = 'closed';
}
```

#### Files to Modify
- Create: `supabase/functions/_shared/circuit-breaker.ts`
- Update: `supabase/functions/generate-projects/index.ts`

---

## Testing Strategy

### Unit Testing
- Each optimized hook should have unit tests verifying:
  - Correct data fetching
  - Proper error handling
  - Memoization working as expected

### Integration Testing
- E2E tests for critical flows:
  - Student dashboard load time
  - Employer dashboard load time
  - Project generation flow

### Performance Testing
- Lighthouse scores before/after
- React DevTools Profiler recordings
- Network waterfall analysis

### Metrics to Track
| Metric | Tool | Baseline | Target |
|--------|------|----------|--------|
| Dashboard LCP | Lighthouse | ~3s | <1.5s |
| Total Blocking Time | Lighthouse | ~800ms | <200ms |
| API calls per page | DevTools Network | Varies | -50% |
| React renders | React Profiler | Varies | -60% |

---

## Success Metrics

| Optimization | Current | Target | Measurement |
|-------------|---------|--------|-------------|
| MyOpportunities search | 8 calls for "software" | 1-2 calls | Network tab count |
| StudentDashboard load | ~2000ms | ~500ms | Performance.now() |
| EmployerDashboard load | 800-1200ms | 200-400ms | Performance.now() |
| AdminHub with 100 projects | 50,000 filter ops | ~600 ops | Console.time() |
| Configure polling | 6 calls/min | 0 calls | Network tab |
| Realtime ownership checks | N queries/event | 0 queries/event | Network tab |

---

## Risk Assessment

| Phase | Risk Level | Potential Issues | Mitigation |
|-------|------------|------------------|------------|
| Phase 1 | Very Low | None expected | Simple refactors, no behavior change |
| Phase 2 | Low | Stale cached data | Add cache invalidation on updates |
| Phase 3 | Low | New hooks may have edge cases | Thorough testing |
| Phase 4 | Very Low | Over-memoization | Profile to verify improvements |
| Phase 5 | Medium | Realtime connection issues | Fallback to polling if needed |
| Phase 6 | Medium | Backend function changes | Deploy to staging first |

---

## Rollback Plan

Each phase should be:
1. **Feature-flagged** where possible
2. **Deployed incrementally** (one file at a time)
3. **Monitored** for errors and performance regressions
4. **Easily revertible** via git revert

### Git Strategy
```bash
# Create feature branch for each phase
git checkout -b perf/phase-1-quick-wins

# Small, focused commits
git commit -m "perf(MyOpportunities): add search debouncing"
git commit -m "perf(StudentDashboard): parallelize queries"

# Create PR per phase for easy rollback
```

---

## Dependencies & Prerequisites

### Required for Phase 5.1 (Realtime)
```sql
-- Enable realtime on generation_runs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_runs;
```

### Required for Task 6.3 (Postgres VIEW)
- Database migration permissions
- Types regeneration after migration

---

## Implementation Order

```
Week 1:
├── Day 1: Phase 1 (Quick Wins) - 4 tasks
├── Day 2: Phase 2 (N+1 Queries) - 4 tasks
└── Day 3: Phase 3 (Waterfall Consolidation) - 2 tasks

Week 2:
├── Day 4: Phase 4 (React Optimization) - 4 tasks
├── Day 5: Phase 5 (Architecture) - 3 tasks
├── Day 6-7: Phase 6 (Backend) - 4 tasks
└── Testing & Documentation
```

---

*Document Version: 1.0*
*Created: 2026-01-04*
*Total Tasks: 21*
*Estimated Duration: 5-7 days*
