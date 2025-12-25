# Agent Management Protocol: Bug Resolution Framework

**Version:** 1.0.0  
**Created:** 2025-12-25  
**Reference:** [SYSTEM_BUG_REPORT.md](./SYSTEM_BUG_REPORT.md)  
**Status:** Active

---

## Table of Contents

1. [Protocol Overview](#protocol-overview)
2. [Execution Framework](#execution-framework)
3. [Module Definitions](#module-definitions)
4. [Handover/Takeover Procedures](#handovertakeover-procedures)
5. [Progress Tracking](#progress-tracking)
6. [Quality Gates](#quality-gates)
7. [Rollback Procedures](#rollback-procedures)

---

## Protocol Overview

### Purpose
This protocol provides a structured approach for AI agents to systematically resolve bugs identified in the System Bug Report, ensuring continuity across sessions and maintaining code quality.

### Principles
1. **Atomic Changes**: Each fix should be self-contained and independently deployable
2. **Priority-Driven**: Critical issues first, then High, Medium, Low
3. **Module Isolation**: Work in focused modules to prevent scope creep
4. **Documentation First**: Update documentation before and after changes
5. **Verification Required**: Each fix must be verified before marking complete

### Priority Execution Order
```
CRITICAL (P0) → HIGH (P1) → MEDIUM (P2) → LOW (P3)
```

---

## Execution Framework

### Session Structure

Each agent session should follow this structure:

```
┌─────────────────────────────────────────────────────────────┐
│                     SESSION START                            │
├─────────────────────────────────────────────────────────────┤
│ 1. Read AGENT_MANAGEMENT_PROTOCOL.md                        │
│ 2. Read AGENT_SESSION_STATE.md (current state)              │
│ 3. Read SYSTEM_BUG_REPORT.md (bug reference)                │
│ 4. Identify current module and task                         │
├─────────────────────────────────────────────────────────────┤
│                     EXECUTION                                │
├─────────────────────────────────────────────────────────────┤
│ 5. Execute assigned bit(s) within current module            │
│ 6. Write tests/verification for changes                     │
│ 7. Update session state after each bit                      │
├─────────────────────────────────────────────────────────────┤
│                     SESSION END                              │
├─────────────────────────────────────────────────────────────┤
│ 8. Complete handover documentation                          │
│ 9. Update AGENT_SESSION_STATE.md                            │
│ 10. Summarize changes and next steps                        │
└─────────────────────────────────────────────────────────────┘
```

### Bit Size Guidelines

| Complexity | Max Files | Max Lines Changed | Estimated Time |
|------------|-----------|-------------------|----------------|
| Small      | 1-2       | < 50              | 5 min          |
| Medium     | 2-4       | 50-150            | 15 min         |
| Large      | 4-6       | 150-300           | 30 min         |

**Rule**: If a bit exceeds "Large", split it into smaller bits.

---

## Module Definitions

### Module 1: Critical Security Fixes (P0)
**Priority**: CRITICAL  
**Estimated Bits**: 8  
**Dependencies**: None

#### Bit 1.1: Edge Function Authentication - Part 1
**Files**: 
- `supabase/functions/career-pathway-mapper/index.ts`
- `supabase/functions/skill-gap-analyzer/index.ts`

**Task**: Add JWT verification and user authentication checks

**Implementation Pattern**:
```typescript
// Add at start of handler
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Invalid token' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

**Verification**:
- [ ] Function rejects requests without Authorization header
- [ ] Function rejects invalid tokens
- [ ] Function proceeds with valid tokens
- [ ] Edge function logs show authentication checks

**Handover Notes**: Document any edge cases discovered

---

#### Bit 1.2: Edge Function Authentication - Part 2
**Files**: 
- `supabase/functions/salary-roi-calculator/index.ts`
- `supabase/functions/discover-companies/index.ts`

**Task**: Add JWT verification (same pattern as Bit 1.1)

**Verification**:
- [ ] Same checks as Bit 1.1

---

#### Bit 1.3: Protect Public Routes
**Files**: 
- `src/App.tsx`
- `src/pages/DemandBoard.tsx`

**Task**: 
1. Wrap `/demand-board` route with ProtectedRoute
2. Add role-based access (employer role required)

**Implementation**:
```tsx
// In App.tsx routes
<Route 
  path="/demand-board" 
  element={
    <ProtectedRoute requiredRole="employer">
      <DemandBoard />
    </ProtectedRoute>
  } 
/>
```

**Verification**:
- [ ] Unauthenticated users redirected to login
- [ ] Non-employer users cannot access
- [ ] Employer users can access normally

---

#### Bit 1.4: CORS Hardening
**Files**: 
- `supabase/functions/_shared/cors.ts`

**Task**: Replace wildcard CORS with environment-based origins

**Implementation**:
```typescript
const allowedOrigins = [
  Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:5173',
  'https://your-production-domain.com'
];

export const getCorsHeaders = (origin: string) => {
  const isAllowed = allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
};
```

**Verification**:
- [ ] Requests from allowed origins succeed
- [ ] Requests from other origins use default origin

---

#### Bit 1.5: JSON Parsing Safety - Part 1
**Files**: 
- `supabase/functions/parse-syllabus/index.ts`
- `supabase/functions/generate-projects/index.ts`

**Task**: Add try-catch around all JSON parsing operations

**Implementation Pattern**:
```typescript
let requestBody;
try {
  requestBody = await req.json();
} catch (parseError) {
  console.error('Invalid JSON in request body:', parseError);
  return new Response(JSON.stringify({ 
    error: 'Invalid JSON in request body' 
  }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

**Verification**:
- [ ] Malformed JSON returns 400 with helpful message
- [ ] Valid JSON proceeds normally
- [ ] Error is logged for debugging

---

#### Bit 1.6: JSON Parsing Safety - Part 2
**Files**: 
- `supabase/functions/analyze-project-value/index.ts`
- `supabase/functions/data-enrichment-pipeline/index.ts`

**Task**: Same pattern as Bit 1.5

---

#### Bit 1.7: JSON Parsing Safety - Part 3
**Files**: 
- `supabase/functions/competency-extractor/index.ts`
- `supabase/functions/apollo-webhook-listener/index.ts`

**Task**: Same pattern as Bit 1.5

---

#### Bit 1.8: Module 1 Verification & Documentation
**Files**: 
- `docs/AGENT_SESSION_STATE.md`
- `docs/SYSTEM_BUG_REPORT.md`

**Task**: 
1. Run comprehensive security verification
2. Update bug report status
3. Document any new issues discovered
4. Prepare Module 2 handover

---

### Module 2: High Priority Reliability Fixes (P1)
**Priority**: HIGH  
**Estimated Bits**: 10  
**Dependencies**: Module 1 complete

#### Bit 2.1: Fire-and-Forget Pattern Fix
**Files**: 
- `supabase/functions/admin-regenerate-projects/index.ts`

**Task**: Convert fire-and-forget to proper async handling with status tracking

**Implementation Approach**:
1. Create generation job record in database
2. Return job ID immediately
3. Process asynchronously with status updates
4. Client polls for completion

---

#### Bit 2.2: Atomic Deletion Pattern
**Files**: 
- `src/components/syllabus/SyllabusManagement.tsx`

**Task**: Wrap multi-table deletion in transaction

**Implementation**:
```typescript
const deleteCourse = async (courseId: string) => {
  const { error } = await supabase.rpc('delete_course_atomic', {
    p_course_id: courseId
  });
  if (error) throw error;
};
```

**Database Migration Required**:
```sql
CREATE OR REPLACE FUNCTION delete_course_atomic(p_course_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM projects WHERE course_id = p_course_id;
  DELETE FROM generation_runs WHERE course_id = p_course_id;
  DELETE FROM course_profiles WHERE id = p_course_id;
END;
$$ LANGUAGE plpgsql;
```

---

#### Bit 2.3: Race Condition in AuthContext
**Files**: 
- `src/contexts/AuthContext.tsx`

**Task**: Add loading state management and proper sequencing

**Implementation**:
1. Add `isRolesLoading` state
2. Ensure role fetching completes before render
3. Add retry logic for transient failures

---

#### Bit 2.4: Pagination Implementation - Part 1
**Files**: 
- `src/pages/Projects.tsx`
- `src/hooks/usePagination.ts` (create)

**Task**: Add pagination hook and implement in Projects page

---

#### Bit 2.5: Pagination Implementation - Part 2
**Files**: 
- `src/pages/InstructorDashboard.tsx`
- `src/components/syllabus/SyllabusManagement.tsx`

**Task**: Apply pagination to remaining high-volume queries

---

#### Bit 2.6: Duplicate Discovery Prevention
**Files**: 
- `supabase/functions/discover-companies/index.ts`

**Task**: Add deduplication logic before insert

**Implementation**:
```typescript
// Check for existing company by domain
const { data: existing } = await supabase
  .from('company_profiles')
  .select('id')
  .eq('website', company.domain)
  .maybeSingle();

if (existing) {
  // Update instead of insert
  await supabase.from('company_profiles')
    .update(companyData)
    .eq('id', existing.id);
} else {
  await supabase.from('company_profiles').insert(companyData);
}
```

---

#### Bit 2.7: Error Boundaries
**Files**: 
- `src/components/ErrorBoundary.tsx` (create)
- `src/App.tsx`

**Task**: Create and implement error boundaries

---

#### Bit 2.8: Retry Logic for External APIs
**Files**: 
- `supabase/functions/_shared/api-client.ts` (create)

**Task**: Create reusable API client with retry logic

**Implementation**:
```typescript
export async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3
): Promise<Response> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status < 500) throw new Error(`Client error: ${response.status}`);
    } catch (error) {
      lastError = error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw lastError;
}
```

---

#### Bit 2.9: Apply Retry Logic to Apollo Provider
**Files**: 
- `supabase/functions/discover-companies/providers/apollo-provider.ts`

**Task**: Integrate retry logic from Bit 2.8

---

#### Bit 2.10: Module 2 Verification & Documentation
**Files**: 
- `docs/AGENT_SESSION_STATE.md`
- `docs/SYSTEM_BUG_REPORT.md`

**Task**: Comprehensive verification and documentation update

---

### Module 3: Medium Priority Code Quality (P2)
**Priority**: MEDIUM  
**Estimated Bits**: 8  
**Dependencies**: Module 2 complete

#### Bit 3.1: TypeScript Strict Null Checks - Part 1
**Files**: 
- `src/pages/ProjectDetail.tsx`
- `src/components/project-detail/OverviewTab.tsx`

**Task**: Add proper null checks and type guards

---

#### Bit 3.2: TypeScript Strict Null Checks - Part 2
**Files**: 
- `src/components/project-detail/EnrichmentPanel.tsx`
- `src/components/signals/EvidenceBasedSignalCard.tsx`

**Task**: Continue null check improvements

---

#### Bit 3.3: Cleanup Orphaned Data
**Files**: 
- `supabase/functions/cleanup-orphaned-data/index.ts` (create)

**Task**: Create scheduled cleanup function

---

#### Bit 3.4: Loading State Improvements - Part 1
**Files**: 
- `src/pages/ProjectDetail.tsx`
- `src/pages/Dashboard.tsx`

**Task**: Add proper skeleton loaders and error states

---

#### Bit 3.5: Loading State Improvements - Part 2
**Files**: 
- `src/pages/StudentDashboard.tsx`
- `src/pages/EmployerDashboard.tsx`

**Task**: Continue loading state improvements

---

#### Bit 3.6: Toast Message Consistency
**Files**: 
- Create `src/lib/toast-messages.ts`
- Apply to 3-4 key components

**Task**: Centralize toast messages

---

#### Bit 3.7: Environment Variable Validation
**Files**: 
- `supabase/functions/_shared/env-validator.ts` (create)

**Task**: Create and apply environment validation

---

#### Bit 3.8: Module 3 Verification & Documentation
**Files**: 
- Documentation files

**Task**: Module verification and handover

---

### Module 4: Low Priority Enhancements (P3)
**Priority**: LOW  
**Estimated Bits**: 6  
**Dependencies**: Module 3 complete

#### Bit 4.1: Console.log Cleanup
**Files**: Multiple

**Task**: Replace console.log with structured logging

---

#### Bit 4.2: Dead Code Removal
**Files**: Multiple

**Task**: Identify and remove unused code

---

#### Bit 4.3: Code Comments Enhancement
**Files**: Complex functions

**Task**: Add JSDoc comments to complex functions

---

#### Bit 4.4: Performance Optimization - Queries
**Files**: High-traffic components

**Task**: Add query optimization (select specific fields)

---

#### Bit 4.5: Accessibility Improvements
**Files**: Key UI components

**Task**: Add ARIA labels and keyboard navigation

---

#### Bit 4.6: Final Verification & Protocol Completion
**Files**: All documentation

**Task**: Final verification and protocol closure

---

## Handover/Takeover Procedures

### Handover Checklist (End of Session)

```markdown
## Session Handover Report

### Session ID: [YYYY-MM-DD-HH:MM]
### Agent Session: [Number]

### Completed This Session:
- [ ] Module: ___
- [ ] Bits Completed: ___
- [ ] Files Modified: ___

### Current State:
- [ ] Current Module: ___
- [ ] Current Bit: ___
- [ ] Bit Status: [Not Started | In Progress | Blocked | Complete]

### Blockers/Issues:
- [ ] None
- [ ] Issue 1: ___
- [ ] Issue 2: ___

### Next Agent Should:
1. ___
2. ___
3. ___

### Files Changed This Session:
| File | Change Type | Verified |
|------|-------------|----------|
| ___ | Added/Modified/Deleted | Yes/No |

### Tests Added/Updated:
- [ ] ___

### Rollback Information:
If issues arise, revert commits: ___
```

### Takeover Checklist (Start of Session)

```markdown
## Session Takeover Checklist

1. [ ] Read AGENT_MANAGEMENT_PROTOCOL.md
2. [ ] Read AGENT_SESSION_STATE.md
3. [ ] Review last session's handover notes
4. [ ] Verify current module and bit assignment
5. [ ] Check for any blockers from previous session
6. [ ] Confirm understanding of next task
7. [ ] Begin work

### Verification:
- Last completed bit: ___
- Current bit to work on: ___
- Any blockers: ___
```

---

## Progress Tracking

### Status File: AGENT_SESSION_STATE.md

This file must be updated after each session:

```markdown
# Agent Session State

## Current Progress
- **Active Module**: [1-4]
- **Active Bit**: [X.Y]
- **Overall Progress**: [X/32 bits complete]

## Module Status
| Module | Status | Bits Complete | Bits Total |
|--------|--------|---------------|------------|
| 1 | In Progress | 3 | 8 |
| 2 | Not Started | 0 | 10 |
| 3 | Not Started | 0 | 8 |
| 4 | Not Started | 0 | 6 |

## Bit-Level Tracking

### Module 1: Critical Security Fixes
- [x] 1.1: Edge Function Auth Part 1
- [x] 1.2: Edge Function Auth Part 2
- [x] 1.3: Protect Public Routes
- [ ] 1.4: CORS Hardening ← CURRENT
- [ ] 1.5: JSON Parsing Safety Part 1
- [ ] 1.6: JSON Parsing Safety Part 2
- [ ] 1.7: JSON Parsing Safety Part 3
- [ ] 1.8: Module Verification

### Module 2: High Priority Reliability
[All items listed with status]

### Module 3: Medium Priority Code Quality
[All items listed with status]

### Module 4: Low Priority Enhancements
[All items listed with status]

## Session History
| Session | Date | Agent | Bits Completed | Notes |
|---------|------|-------|----------------|-------|
| 1 | 2025-12-25 | Agent-001 | 1.1, 1.2 | Initial security fixes |
| 2 | 2025-12-25 | Agent-002 | 1.3 | Route protection |

## Known Blockers
- None currently

## Notes for Next Agent
- [Any important context]
```

---

## Quality Gates

### Per-Bit Quality Gate
Before marking a bit complete:
- [ ] Code compiles without errors
- [ ] No new TypeScript errors introduced
- [ ] Changes follow existing code patterns
- [ ] Edge function deploys successfully (if applicable)
- [ ] Manual verification completed per bit spec

### Per-Module Quality Gate
Before moving to next module:
- [ ] All bits in module marked complete
- [ ] All verification checklists passed
- [ ] Bug report updated with fix status
- [ ] No regressions in existing functionality
- [ ] Documentation updated

### Protocol Completion Gate
Before closing protocol:
- [ ] All 4 modules complete
- [ ] All bugs in report marked resolved
- [ ] Comprehensive testing completed
- [ ] Final documentation review
- [ ] Stakeholder signoff

---

## Rollback Procedures

### Bit-Level Rollback
If a bit introduces issues:
1. Identify affected files
2. Revert specific changes
3. Document reason for rollback
4. Re-attempt with different approach

### Module-Level Rollback
If module causes systemic issues:
1. Identify module start point
2. Revert all module changes
3. Conduct root cause analysis
4. Create remediation plan
5. Re-execute module with fixes

### Emergency Rollback
If critical production issue:
1. Immediately notify stakeholders
2. Revert to last known good state
3. Document incident
4. Conduct post-mortem
5. Update protocol with learnings

---

## Appendix A: Quick Reference Commands

### Starting a Session
```
1. User: "Continue bug fix protocol"
2. Agent reads: AGENT_MANAGEMENT_PROTOCOL.md, AGENT_SESSION_STATE.md
3. Agent identifies current bit
4. Agent executes bit
5. Agent updates state and hands over
```

### Checking Progress
```
User: "What's the current bug fix progress?"
Agent: Reads AGENT_SESSION_STATE.md and reports
```

### Handling Blockers
```
User: "The current bit is blocked because X"
Agent: 
1. Document blocker in session state
2. Skip to next bit if possible
3. Or escalate if critical path blocked
```

---

## Appendix B: File Reference

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `docs/AGENT_MANAGEMENT_PROTOCOL.md` | This protocol | Rarely (process changes only) |
| `docs/AGENT_SESSION_STATE.md` | Current progress | Every session |
| `docs/SYSTEM_BUG_REPORT.md` | Bug reference | When bugs fixed |
| `CHECKPOINT.md` | Project milestones | Major completions |

---

**Protocol Version History**
| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-25 | Initial protocol creation |
