# EduThree System Bug Report

**Date:** December 25, 2025  
**Auditor:** AI System Bug Finder  
**Domain Expertise:** Business & Technical  
**Scope:** Full-stack analysis including frontend, backend (Edge Functions), database, and security

---

## Executive Summary

This report documents potential bugs, security vulnerabilities, and architectural concerns discovered during a comprehensive codebase audit. Issues are categorized by severity and domain.

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 4 | Security vulnerabilities requiring immediate attention |
| 🟠 High | 7 | Functional bugs that could cause data loss or system failures |
| 🟡 Medium | 9 | Issues affecting reliability or user experience |
| 🔵 Low | 5 | Code quality and optimization opportunities |

---

## 🔴 CRITICAL: Security Vulnerabilities

### SEC-001: Missing Authentication in Edge Functions

**Location:** Multiple edge functions  
**Impact:** Unauthorized access to sensitive data and operations

Several edge functions use the `SUPABASE_SERVICE_ROLE_KEY` without verifying the caller's identity or permissions:

| Function | File | Issue |
|----------|------|-------|
| `career-pathway-mapper` | `supabase/functions/career-pathway-mapper/index.ts:32-47` | No JWT verification |
| `skill-gap-analyzer` | `supabase/functions/skill-gap-analyzer/index.ts:100-115` | No user authentication |
| `salary-roi-calculator` | `supabase/functions/salary-roi-calculator/index.ts:335-350` | No caller validation |
| `discover-companies` | `supabase/functions/discover-companies/index.ts:197-213` | Service role used without auth |

**Risk:** Any caller with the function URL can trigger operations for any `projectId`, potentially accessing or manipulating data they shouldn't.

**Contrast with secure patterns:**
- ✅ `rate-student-performance/index.ts:22-49` - Correctly implements JWT + role verification
- ✅ `student-project-matcher/index.ts:29-53` - Properly uses user's own JWT

---

### SEC-002: Public Demand Board Exposes Apollo Data

**Location:** `src/App.tsx:73`  
**Documentation Conflict:** `docs/APOLLO_DATA_DISPLAY_COMPLIANCE.md:67-73`

```typescript
// App.tsx line 73
<Route path="/demand-board" element={<DemandBoard />} />  // ❌ Public route
```

The `/demand-board` route is explicitly public, but Apollo data compliance documentation states:
> "All Apollo data only visible to logged-in users"

**Risk:** Potential violation of Apollo API Terms of Service.

---

### SEC-003: CORS Wildcard in Production

**Location:** All edge functions  
**Example:** `supabase/functions/discover-companies/index.ts:15-18`

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ❌ Allows any origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Risk:** While common for development, this should be restricted to specific domains in production to prevent CSRF-like attacks.

---

### SEC-004: Unvalidated JSON Parsing

**Location:** Multiple edge functions  
**Example:** `career-pathway-mapper/index.ts:33`

```typescript
const { projectId } = await req.json();  // ❌ No try-catch for invalid JSON
```

**Risk:** Sending malformed JSON causes unhandled exceptions that may leak internal error messages.

---

## 🟠 HIGH: Functional Bugs

### FUNC-001: Fire-and-Forget Pattern in Admin Regeneration

**Location:** `supabase/functions/admin-regenerate-projects/index.ts:150-172`

```typescript
// Launch all workers asynchronously (no await - fire and forget)
projects.forEach((project) => {
  fetch(functionUrl, { ... })
    .then(() => { queuedCount++; })
    .catch((error) => { failedCount++; });
});
```

**Issue:** The parent function returns success before these fetch calls complete. Total failures are untrackable.

---

### FUNC-002: Non-Atomic Deletion in Syllabus Management

**Location:** `src/components/syllabus/SyllabusManagement.tsx:120-144`

```typescript
// First delete related projects
const { error: projectsError } = await supabase.from('projects').delete()...
// Then delete the course
const { error: courseError } = await supabase.from('course_profiles').delete()...
```

**Issue:** If project deletion succeeds but course deletion fails, system is left in a partially deleted state with orphaned projects pointing to non-existent course IDs.

---

### FUNC-003: Race Condition in Role Loading

**Location:** `src/contexts/AuthContext.tsx:74-79`

```typescript
if (session?.user) {
  setRolesLoading(true);
  // ❌ setTimeout creates race condition
  setTimeout(() => {
    fetchUserRoles(session.user.id);
  }, 0);
}
```

**Issue:** UI may render "Not Authorized" before roles are populated, causing flickering redirects for authorized users.

---

### FUNC-004: Realtime Subscription Re-subscription Loop

**Location:** `src/pages/ProjectDetail.tsx:60-94`  
**Documented:** `docs/USER_JOURNEY_ISSUE_MAPPING.md:805-827`

```typescript
useEffect(() => {
  if (!data?.generation_status || ...) return;
  // ...subscription setup
}, [data?.generation_status, id]);  // ❌ Dependency causes re-subscription
```

**Issue:** The `useEffect` depends on `data?.generation_status`, which updates when the subscription receives a payload, potentially triggering teardown/re-setup cycles during active generation.

---

### FUNC-005: Missing Pagination - Will Break at Scale

**Location:** `src/pages/Projects.tsx:86-90`  
**Documented:** `docs/CODEBASE_REVIEW_REPORT.md:516-521`

```typescript
const { data } = await supabase.from('course_profiles').select('id, title');
// ❌ No .limit() or .range() - Supabase default limit is 1000
```

**Issue:** Faculty with >1000 courses will silently lose data. This applies to multiple queries across the codebase.

---

### FUNC-006: Orphaned Data Risk in Generation Pipeline

**Location:** Historical issue - atomic inserts now implemented  
**Status:** Partially mitigated via `create_project_atomic` RPC

While `generate-projects/index.ts` now uses atomic transactions, other flows may still create orphans:
- `sync-project-match/index.ts:145-161` - Multi-step updates without transaction

---

### FUNC-007: Error Response Leaks Internal Details

**Location:** Multiple edge functions

```typescript
return new Response(
  JSON.stringify({ error: 'Failed to link submission to project', details: submissionError.message }),
  // ❌ submissionError.message may contain schema details
);
```

**Risk:** Database schema or internal logic exposure in error responses.

---

## 🟡 MEDIUM: Reliability Issues

### REL-001: Silent Hook Failures

**Location:** `src/hooks/useNewJobMatchCount.ts:19-22`

```typescript
if (error) {
  console.error("Error fetching job match count:", error);
  return 0;  // ❌ Silent failure - user sees 0 instead of error state
}
```

**Issue:** Users may not realize data failed to load.

---

### REL-002: Unhandled Promise in MyOpportunities

**Location:** `src/pages/MyOpportunities.tsx:32-39`

```typescript
useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => {
    // ❌ No .catch() - unhandled promise rejection
  });
});
```

---

### REL-003: Missing Error Boundary in Dashboard Components

**Location:** `StudentDashboard.tsx`, `EmployerDashboard.tsx`

If any child component throws during render, entire dashboard crashes. No error boundary implemented.

---

### REL-004: Unsafe Type Casting in Edge Functions

**Location:** Multiple functions

```typescript
const { data: course } = await supabase.from('course_profiles').select('*')...
const outcomes = course.outcomes || [];  // ❌ No type assertion
```

**Risk:** Schema changes could cause runtime crashes without TypeScript warnings.

---

### REL-005: Duplicate Authorization Logic

**Location:** `Projects.tsx:61-65`, `EmployerDashboard.tsx:71-77`

Manual redirection logic duplicates `ProtectedRoute` functionality, which can lead to inconsistent behavior if global protection logic is updated.

---

### REL-006: Missing Null Check in SyllabusManagement

**Location:** `src/components/syllabus/SyllabusManagement.tsx:94-110`

```typescript
.eq('id', editingCourse.id)  // ❌ Assumes editingCourse.id is valid
```

---

### REL-007: Unstable `addNotification` Reference

**Location:** `src/hooks/useRealtimeNotifications.ts`

The `useEffect` dependencies include `addNotification`, which could cause re-subscription loops if the `NotificationContext` doesn't stable-wrap that function in `useCallback`.

---

### REL-008: Job Status Filter Inconsistency

**Location:** `src/hooks/useNewJobMatchCount.ts:17` vs `StudentDashboard.tsx:67`

```typescript
// useNewJobMatchCount.ts
.eq("status", "pending_notification");

// StudentDashboard.tsx  
.eq("status", "new");
```

These query different statuses for ostensibly the same "new job matches" count.

---

### REL-009: RecommendedProjects Props Unused

**Location:** `src/components/student/RecommendedProjects.tsx:23-25`

```typescript
interface RecommendedProjectsProps {
  onApply?: (projectId: string) => void;
  appliedProjects?: Set<string>;  // ❌ Props defined but never used
}
```

---

## 🔵 LOW: Code Quality & Optimization

### OPT-001: Console.debug in Production

**Location:** `src/integrations/supabase/client.ts:13-16`

```typescript
console.debug('Supabase env presence (with safe fallbacks):', { ... });
```

Should be removed or wrapped in development-only check.

---

### OPT-002: Hardcoded Color Classes

**Location:** Multiple components including `StudentDashboard.tsx:155-162`

```typescript
case "approved": return "bg-green-500/10 text-green-500 border-green-500/20";
// ❌ Should use semantic tokens from design system
```

---

### OPT-003: Missing `staleTime` in Some Queries

**Location:** Various `useQuery` hooks

Some queries like `useNewJobMatchCount` use `refetchInterval` without `staleTime`, causing unnecessary background refetches.

---

### OPT-004: Inefficient Skill Filtering

**Location:** `src/hooks/useDemandSignals.ts:60-70`

```typescript
// Client-side skill filtering (since skills is an array)
results = results.filter((signal) =>
  filters.skills!.some((skill) => ...)
);
```

This filters client-side after fetching all records. For large datasets, should use Postgres array operators.

---

### OPT-005: Unused Imports/Variables

Multiple files have unused imports that should be cleaned up for bundle optimization.

---

## Database & RLS Analysis

### RLS Linter Results: ✅ No Issues Found

The Supabase linter reports no RLS issues, indicating:
- All tables have RLS enabled
- Policies are defined for necessary operations

**However**, automated linting cannot verify:
- Policy logic correctness (e.g., whether conditions are too permissive)
- Missing policies for specific edge cases
- Proper handling of service-role bypass scenarios

### Manual Review Recommendations

1. **Audit `company_profiles.owner_user_id`** - Ensure employers can only modify their own companies
2. **Verify `project_applications` policies** - Students should only see their own applications
3. **Check `verified_competencies` access** - Rating data should be properly isolated

---

## Recommendations by Priority

### Immediate (This Sprint)
1. Add JWT verification to `career-pathway-mapper`, `skill-gap-analyzer`, `salary-roi-calculator`
2. Protect `/demand-board` route with authentication
3. Wrap JSON parsing in try-catch across all edge functions

### Short-term (Next 2 Sprints)
1. Implement error boundaries in dashboard components
2. Fix role loading race condition with proper async handling
3. Add pagination to all list queries
4. Restrict CORS to specific domains

### Medium-term (Next Quarter)
1. Create atomic database operations for all multi-step mutations
2. Implement comprehensive error tracking (Sentry integration)
3. Add integration tests for edge function authorization
4. Standardize error response format across all functions

---

## Testing Recommendations

### Unit Tests Needed
- [ ] Edge function authorization middleware
- [ ] Role-based access control logic
- [ ] Atomic database operations

### Integration Tests Needed
- [ ] Complete auth flow with role assignment
- [ ] Project generation pipeline end-to-end
- [ ] Student application lifecycle

### Security Tests Needed
- [ ] Penetration testing on edge functions
- [ ] RLS policy verification
- [ ] Input validation fuzzing

---

## Appendix: Files Audited

### Frontend
- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/pages/StudentDashboard.tsx`
- `src/pages/EmployerDashboard.tsx`
- `src/pages/Projects.tsx`
- `src/pages/ProjectDetail.tsx`
- `src/pages/MyOpportunities.tsx`
- `src/components/syllabus/SyllabusManagement.tsx`
- `src/components/student/RecommendedProjects.tsx`
- `src/hooks/useRealtimeNotifications.ts`
- `src/hooks/useNewJobMatchCount.ts`
- `src/hooks/useDemandSignals.ts`

### Backend (Edge Functions)
- `supabase/functions/career-pathway-mapper/index.ts`
- `supabase/functions/skill-gap-analyzer/index.ts`
- `supabase/functions/salary-roi-calculator/index.ts`
- `supabase/functions/discover-companies/index.ts`
- `supabase/functions/rate-student-performance/index.ts`
- `supabase/functions/student-project-matcher/index.ts`
- `supabase/functions/admin-regenerate-projects/index.ts`
- `supabase/functions/sync-project-match/index.ts`
- `supabase/functions/generate-projects/index.ts`

### Configuration
- `src/App.tsx` (routing)
- `src/integrations/supabase/client.ts`

---

*Report generated by AI System Bug Finder. All issues should be verified manually before remediation.*
