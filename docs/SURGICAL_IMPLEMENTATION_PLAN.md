# 🏥 Surgical Implementation Plan for Live Production
**Status:** Active Production Environment
**Risk Level:** High (live users, active interactions)
**Approach:** Incremental, tested, reversible changes
**Timeline:** 6 weeks (2-week phases)
**Created:** 2025-11-10

---

## ⚠️ Production Environment Constraints

**CRITICAL CONSIDERATIONS:**
- ✅ Website is **already published** with active users
- ✅ Changes must be **backward compatible**
- ✅ All fixes must be **feature-flagged** for instant rollback
- ✅ Zero downtime deployments required
- ✅ Monitor error rates during each deployment
- ✅ Have rollback plan for every change

---

## 🎯 Strategic Approach

### **Phase-Based Implementation:**
1. **Phase 1 (Week 1-2):** Testing Infrastructure + Monitoring
2. **Phase 2 (Week 3-4):** P0 Critical Fixes (Type Safety + Core Bugs)
3. **Phase 3 (Week 5-6):** P1 Quality Improvements + Validation

### **Safety Mechanisms:**
- **Feature Flags:** Use environment variables or Supabase config table
- **Gradual Rollout:** Test with 10% → 50% → 100% of users
- **Error Monitoring:** Track error rates before/after each change
- **Automated Rollback:** Revert if error rate increases >5%

---

## 📋 PHASE 1: Testing Infrastructure (Week 1-2)
**Goal:** Add safety net BEFORE making any production changes
**Risk:** Low (no production changes yet)

### **1.1 Set Up Testing Framework**
```bash
# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
npm install -D @vitest/ui @testing-library/jest-dom
```

**Files to Create:**
- `vitest.config.ts` - Test configuration
- `src/test/setup.ts` - Test environment setup
- `src/test/mocks/supabase.ts` - Supabase client mock

**Acceptance Criteria:**
- ✅ `npm run test` executes successfully
- ✅ Can run tests in watch mode
- ✅ Mock Supabase client works

---

### **1.2 Add Critical Path Tests (Before Any Fixes)**

**Priority: Write tests for code we're about to change**

#### **Test Suite 1: Location Detection (Upload.tsx:373)**
```typescript
// src/pages/__tests__/Upload.location.test.tsx
describe('Location Detection', () => {
  it('should detect location from university email domain', async () => {
    // Test current behavior BEFORE we fix it
    // This establishes baseline
  });

  it('should handle missing domain gracefully', async () => {
    // Test error case
  });

  it('should fallback to manual location if detection fails', async () => {
    // Test fallback behavior
  });
});
```

#### **Test Suite 2: Auto-Generate (Configure.tsx:383)**
```typescript
// src/pages/__tests__/Configure.autoGenerate.test.tsx
describe('Auto-Generate Projects', () => {
  it('should generate projects when auto-generate is enabled', async () => {
    // Test current happy path
  });

  it('should handle generation failures gracefully', async () => {
    // Test error recovery
  });

  it('should show progress during generation', async () => {
    // Test UI feedback
  });
});
```

#### **Test Suite 3: Student Applications (Projects.tsx:433)**
```typescript
// src/pages/__tests__/Projects.studentApp.test.tsx
describe('Student Project Applications', () => {
  it('should allow student to apply to project', async () => {
    // Test application flow
  });

  it('should prevent duplicate applications', async () => {
    // Test constraint
  });

  it('should show application status correctly', async () => {
    // Test status display
  });
});
```

**Deliverable:** 15-20 tests covering existing behavior (baseline)

---

### **1.3 Set Up Error Monitoring**

**Option A: Sentry (Recommended)**
```bash
npm install @sentry/react
```

**Files to Modify:**
- `src/main.tsx` - Initialize Sentry
- `src/lib/errorTracking.ts` - Error tracking utilities

**Configuration:**
```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1, // 10% performance monitoring
  beforeSend(event) {
    // Don't send errors in development
    if (import.meta.env.DEV) return null;
    return event;
  },
});
```

**Acceptance Criteria:**
- ✅ Errors are logged to Sentry in production
- ✅ Can filter errors by release version
- ✅ Error rate baseline established

---

### **1.4 Create Feature Flag System**

**Database Migration:**
```sql
-- supabase/migrations/20251110000001_feature_flags.sql
CREATE TABLE IF NOT EXISTS feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0, -- 0-100
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial flags for P0 fixes
INSERT INTO feature_flags (flag_name, enabled, rollout_percentage, description) VALUES
  ('type_safe_location_detection', FALSE, 0, 'Use new TypeScript-safe location detection'),
  ('improved_error_recovery', FALSE, 0, 'Enhanced error recovery in auto-generate'),
  ('deduplicate_applications', FALSE, 0, 'Prevent duplicate student applications'),
  ('strict_provider_validation', FALSE, 0, 'Validate discovery provider responses')
ON CONFLICT (flag_name) DO NOTHING;
```

**Utility File:**
```typescript
// src/lib/featureFlags.ts
import { supabase } from './supabase';

export async function isFeatureEnabled(
  flagName: string,
  userId?: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('enabled, rollout_percentage')
    .eq('flag_name', flagName)
    .single();

  if (error || !data) return false;

  // If fully enabled, return true
  if (data.enabled && data.rollout_percentage === 100) return true;

  // If disabled, return false
  if (!data.enabled) return false;

  // Gradual rollout: hash userId to determine eligibility
  if (userId && data.rollout_percentage > 0) {
    const hash = simpleHash(userId);
    return (hash % 100) < data.rollout_percentage;
  }

  return false;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
```

**Acceptance Criteria:**
- ✅ Can toggle features via database
- ✅ Supports gradual rollout (10%, 50%, 100%)
- ✅ Can disable feature instantly (rollback)

---

## 📋 PHASE 2: P0 Critical Fixes (Week 3-4)
**Goal:** Fix critical bugs without breaking production
**Risk:** Medium (changes core functionality)

---

### **2.1 Fix P0-1: Type-Safe Location Detection**
**Issue:** `Upload.tsx:373` - Location detection uses `any` types and fails silently
**Impact:** Critical - Affects all university onboarding
**Files:** `src/pages/Upload.tsx`, `supabase/functions/detect-location/index.ts`

#### **Current Problematic Code (Upload.tsx:196-220):**
```typescript
// ❌ CURRENT: Uses 'any', fails silently
const handleDetectLocation = async () => {
  try {
    setDetecting(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) { /* ... */ }

    const { data, error }: any = await supabase.functions.invoke('detect-location', {
      body: { email: user.email }
    });

    if (error) throw error;

    // No validation of data structure
    if (data?.location) {
      setFormData(prev => ({ ...prev, location: data.location }));
    }
  } catch (error: any) {
    console.error('Location detection failed:', error);
    // ❌ Silent failure - user doesn't know it failed
  } finally {
    setDetecting(false);
  }
};
```

#### **Fixed Code (Type-Safe):**
```typescript
// ✅ FIXED: Type-safe with proper error handling

// 1. Define response type
interface DetectLocationResponse {
  location: string;
  university: string | null;
  country: string | null;
  confidence: 'high' | 'medium' | 'low';
}

// 2. Add validation helper
function isValidLocationResponse(data: unknown): data is DetectLocationResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'location' in data &&
    typeof (data as any).location === 'string' &&
    (data as any).location.length > 0
  );
}

// 3. Rewrite handler with feature flag
const handleDetectLocation = async () => {
  try {
    setDetecting(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      toast.error('Please log in to detect location');
      return;
    }

    // Feature flag check
    const useNewDetection = await isFeatureEnabled(
      'type_safe_location_detection',
      user.id
    );

    if (!useNewDetection) {
      // Fall back to old behavior
      return handleDetectLocationOld();
    }

    const { data, error } = await supabase.functions.invoke<DetectLocationResponse>(
      'detect-location',
      { body: { email: user.email } }
    );

    if (error) {
      throw new Error(`Location detection failed: ${error.message}`);
    }

    // ✅ Validate response structure
    if (!isValidLocationResponse(data)) {
      throw new Error('Invalid location data received');
    }

    // ✅ Inform user of detection quality
    if (data.confidence === 'low') {
      toast.warning(`Location detected: ${data.location} (please verify)`);
    } else {
      toast.success(`Location detected: ${data.location}`);
    }

    setFormData(prev => ({
      ...prev,
      location: data.location,
      // Store additional metadata for verification
      _detectionConfidence: data.confidence,
      _detectedUniversity: data.university
    }));

  } catch (error) {
    // ✅ User-facing error message
    const message = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Could not detect location: ${message}`);

    // ✅ Log to Sentry for monitoring
    Sentry.captureException(error, {
      tags: { feature: 'location_detection' },
      extra: { userEmail: user?.email }
    });

    // ✅ Provide manual fallback
    setShowManualLocationInput(true);
  } finally {
    setDetecting(false);
  }
};

// Keep old function for gradual rollout
const handleDetectLocationOld = async () => {
  // ... existing code unchanged
};
```

#### **Edge Function Update (detect-location/index.ts):**
```typescript
// ✅ Add response type validation

interface DetectLocationResponse {
  location: string;
  university: string | null;
  country: string | null;
  confidence: 'high' | 'medium' | 'low';
}

Deno.serve(async (req) => {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid email required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Query university_domains table
    const { data: domainData, error: dbError } = await supabaseClient
      .from('university_domains')
      .select('university_name, country, verified')
      .eq('domain', domain)
      .maybeSingle(); // ✅ Use maybeSingle() instead of single()

    if (dbError) {
      throw dbError;
    }

    let response: DetectLocationResponse;

    if (domainData && domainData.verified) {
      // ✅ High confidence: verified university domain
      response = {
        location: `${domainData.university_name}, ${domainData.country}`,
        university: domainData.university_name,
        country: domainData.country,
        confidence: 'high'
      };
    } else if (domainData) {
      // ✅ Medium confidence: unverified university domain
      response = {
        location: `${domainData.university_name}, ${domainData.country}`,
        university: domainData.university_name,
        country: domainData.country,
        confidence: 'medium'
      };
    } else {
      // ✅ Low confidence: unknown domain, use generic location
      response = {
        location: 'United States', // Default fallback
        university: null,
        country: 'United States',
        confidence: 'low'
      };
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Location detection error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

#### **Deployment Plan:**
1. **Day 1:** Deploy edge function update (backward compatible)
2. **Day 2:** Deploy frontend code with feature flag OFF
3. **Day 3:** Enable feature flag for 10% of users, monitor errors for 24h
4. **Day 5:** If error rate stable, increase to 50%
5. **Day 7:** If still stable, increase to 100%

**Rollback Plan:** Set `feature_flags.enabled = FALSE` for instant revert

---

### **2.2 Fix P0-2: Auto-Generate Error Recovery**
**Issue:** `Configure.tsx:383` - Auto-generate fails without user feedback
**Impact:** High - Affects project creation workflow
**Files:** `src/pages/Configure.tsx`, `src/hooks/useAutoGenerate.ts` (new)

#### **Current Problematic Code (Configure.tsx:145-180):**
```typescript
// ❌ CURRENT: No error recovery, no user feedback
useEffect(() => {
  const generateProjects = async () => {
    if (!project?.id || !autoGenerate) return;

    try {
      const { data, error }: any = await supabase.functions.invoke(
        'generate-projects',
        { body: { projectId: project.id } }
      );

      if (error) throw error;

      // ❌ No loading state, no progress feedback
      // ❌ If it fails, user doesn't know why

    } catch (error: any) {
      console.error('Generation failed:', error);
      // ❌ Silent failure
    }
  };

  generateProjects();
}, [project?.id, autoGenerate]);
```

#### **Fixed Code (Custom Hook with Retry):**
```typescript
// ✅ NEW FILE: src/hooks/useAutoGenerate.ts

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import * as Sentry from '@sentry/react';

interface UseAutoGenerateOptions {
  projectId: string | undefined;
  enabled: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface GenerationStatus {
  status: 'idle' | 'generating' | 'success' | 'error';
  progress: number; // 0-100
  error: string | null;
  retryCount: number;
}

export function useAutoGenerate({
  projectId,
  enabled,
  onSuccess,
  onError
}: UseAutoGenerateOptions) {
  const [status, setStatus] = useState<GenerationStatus>({
    status: 'idle',
    progress: 0,
    error: null,
    retryCount: 0
  });

  useEffect(() => {
    if (!projectId || !enabled) return;

    let cancelled = false;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    const generateWithRetry = async (attempt: number = 0): Promise<void> => {
      if (cancelled) return;

      try {
        setStatus(prev => ({
          ...prev,
          status: 'generating',
          progress: 10,
          retryCount: attempt
        }));

        // Check feature flag
        const { data: { user } } = await supabase.auth.getUser();
        const useImprovedRecovery = await isFeatureEnabled(
          'improved_error_recovery',
          user?.id
        );

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setStatus(prev => ({
            ...prev,
            progress: Math.min(prev.progress + 10, 90)
          }));
        }, 500);

        const { data, error } = await supabase.functions.invoke<{
          success: boolean;
          projectsGenerated: number;
          errors?: string[];
        }>('generate-projects', {
          body: { projectId }
        });

        clearInterval(progressInterval);

        if (error) {
          throw new Error(error.message || 'Generation failed');
        }

        if (!data?.success) {
          throw new Error(data?.errors?.[0] || 'Generation returned unsuccessful');
        }

        // ✅ Success
        setStatus({
          status: 'success',
          progress: 100,
          error: null,
          retryCount: attempt
        });

        toast.success(`Generated ${data.projectsGenerated} projects successfully`);
        onSuccess?.();

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // ✅ Retry logic
        if (attempt < maxRetries && !cancelled) {
          toast.warning(`Generation failed, retrying... (${attempt + 1}/${maxRetries})`);

          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          return generateWithRetry(attempt + 1);
        }

        // ✅ Final failure after retries
        setStatus({
          status: 'error',
          progress: 0,
          error: errorMessage,
          retryCount: attempt
        });

        toast.error(`Project generation failed: ${errorMessage}`);

        Sentry.captureException(error, {
          tags: { feature: 'auto_generate' },
          extra: { projectId, attempts: attempt + 1 }
        });

        onError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    };

    generateWithRetry();

    return () => {
      cancelled = true;
    };
  }, [projectId, enabled, onSuccess, onError]);

  const retry = () => {
    setStatus({
      status: 'idle',
      progress: 0,
      error: null,
      retryCount: 0
    });
  };

  return { status, retry };
}
```

#### **Updated Configure.tsx:**
```typescript
// ✅ Use custom hook in Configure.tsx

import { useAutoGenerate } from '@/hooks/useAutoGenerate';

export default function Configure() {
  const { project, autoGenerate } = useProject();

  const { status, retry } = useAutoGenerate({
    projectId: project?.id,
    enabled: autoGenerate,
    onSuccess: () => {
      // Refresh project data
      queryClient.invalidateQueries(['project', project?.id]);
    },
    onError: (error) => {
      // Could trigger fallback to manual generation
      console.error('Auto-generate failed:', error);
    }
  });

  return (
    <div>
      {/* ✅ Show generation status to user */}
      {status.status === 'generating' && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              Generating projects...
            </span>
            <span className="text-sm text-blue-700">{status.progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.progress}%` }}
            />
          </div>
          {status.retryCount > 0 && (
            <p className="text-xs text-blue-600 mt-2">
              Retry attempt {status.retryCount}/3
            </p>
          )}
        </div>
      )}

      {/* ✅ Show error with retry option */}
      {status.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">Generation Failed</p>
              <p className="text-xs text-red-700 mt-1">{status.error}</p>
            </div>
            <button
              onClick={retry}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Rest of Configure UI */}
    </div>
  );
}
```

#### **Deployment Plan:**
1. **Day 1:** Deploy custom hook with feature flag OFF
2. **Day 2:** Enable flag for 10%, monitor error/retry rates
3. **Day 4:** If retry success rate >70%, increase to 50%
4. **Day 6:** If stable, increase to 100%

**Success Metrics:**
- ✅ Retry success rate >70%
- ✅ User error reports decrease by >50%
- ✅ Auto-generate completion rate increases

---

### **2.3 Fix P0-3: Prevent Duplicate Student Applications**
**Issue:** `Projects.tsx:433` + `ProjectDetail.tsx:632` - Students can apply multiple times
**Impact:** High - Data integrity issue
**Files:** `src/pages/Projects.tsx`, Database constraint

#### **Database Fix (Primary Solution):**
```sql
-- supabase/migrations/20251110000002_prevent_duplicate_applications.sql

-- ✅ Add unique constraint to prevent duplicates at DB level
ALTER TABLE project_applications
ADD CONSTRAINT unique_student_project_application
UNIQUE (student_id, project_id);

-- ✅ Add index for performance
CREATE INDEX IF NOT EXISTS idx_project_applications_student_project
ON project_applications(student_id, project_id);

-- ✅ Handle existing duplicates before adding constraint
WITH duplicates AS (
  SELECT
    student_id,
    project_id,
    MIN(id) as keep_id
  FROM project_applications
  GROUP BY student_id, project_id
  HAVING COUNT(*) > 1
)
DELETE FROM project_applications
WHERE id IN (
  SELECT pa.id
  FROM project_applications pa
  JOIN duplicates d ON pa.student_id = d.student_id AND pa.project_id = d.project_id
  WHERE pa.id != d.keep_id
);
```

#### **Frontend Fix (Projects.tsx):**
```typescript
// ✅ Check for existing application before showing button

const { data: existingApplication } = useQuery({
  queryKey: ['application', projectId, userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('project_applications')
      .select('id, status, created_at')
      .eq('student_id', userId)
      .eq('project_id', projectId)
      .maybeSingle(); // ✅ Use maybeSingle() - returns null if not found

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return data;
  },
  enabled: !!userId && !!projectId && role === 'student'
});

// ✅ UI logic
const handleApply = async () => {
  if (existingApplication) {
    toast.info('You have already applied to this project');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('project_applications')
      .insert({
        student_id: userId,
        project_id: projectId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      // ✅ Handle unique constraint violation gracefully
      if (error.code === '23505') { // PostgreSQL unique violation
        toast.info('You have already applied to this project');
        // Refresh to get the existing application
        queryClient.invalidateQueries(['application', projectId, userId]);
        return;
      }
      throw error;
    }

    toast.success('Application submitted successfully');
    queryClient.invalidateQueries(['application', projectId, userId]);

  } catch (error) {
    toast.error('Failed to submit application');
    Sentry.captureException(error);
  }
};

// ✅ Render button based on application status
{existingApplication ? (
  <div className="bg-green-50 border border-green-200 rounded p-3">
    <p className="text-sm text-green-800 font-medium">
      ✓ Application submitted
    </p>
    <p className="text-xs text-green-600 mt-1">
      Status: {existingApplication.status}
    </p>
  </div>
) : (
  <button
    onClick={handleApply}
    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    Apply to Project
  </button>
)}
```

#### **Deployment Plan:**
1. **Day 1:** Run migration to add constraint (removes existing duplicates)
2. **Day 2:** Deploy frontend code with duplicate check
3. **Day 3:** Monitor for unique constraint violation errors (should be 0)

**Rollback Plan:** Drop constraint if it causes issues
```sql
ALTER TABLE project_applications DROP CONSTRAINT unique_student_project_application;
```

---

### **2.4 Fix P0-4: Strict Provider Validation**
**Issue:** `discover-companies/index.ts` - No validation of Apollo API responses
**Impact:** Medium-High - Can cause data quality issues
**Files:** `supabase/functions/discover-companies/index.ts`

#### **Add Response Validation:**
```typescript
// ✅ Add Zod for runtime type validation
import { z } from 'zod';

// Define expected Apollo response schema
const ApolloCompanySchema = z.object({
  name: z.string().min(1),
  domain: z.string().url().optional().nullable(),
  industry: z.string().optional().nullable(),
  employee_count: z.number().int().nonnegative().optional().nullable(),
  location: z.object({
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    country: z.string().optional().nullable()
  }).optional().nullable(),
  linkedin_url: z.string().url().optional().nullable()
});

const ApolloResponseSchema = z.object({
  organizations: z.array(ApolloCompanySchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    per_page: z.number()
  }).optional()
});

// ✅ Validate and sanitize response
async function fetchAndValidateCompanies(
  location: string,
  industry: string,
  limit: number
): Promise<Company[]> {
  try {
    // Fetch from Apollo
    const response = await fetch('https://api.apollo.io/v1/organizations/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': Deno.env.get('APOLLO_API_KEY') || ''
      },
      body: JSON.stringify({
        q_organization_keyword_tags: [industry],
        organization_locations: [location],
        page: 1,
        per_page: limit
      })
    });

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // ✅ Validate response structure
    const validationResult = ApolloResponseSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.error('Apollo response validation failed:', validationResult.error);
      throw new Error('Invalid response format from Apollo API');
    }

    // ✅ Transform and sanitize data
    const companies = validationResult.data.organizations
      .filter(org => org.name && org.name.trim().length > 0) // Remove invalid entries
      .map(org => ({
        name: org.name.trim(),
        domain: org.domain || null,
        industry: org.industry || 'Unknown',
        employee_count: org.employee_count || null,
        city: org.location?.city || null,
        state: org.location?.state || null,
        country: org.location?.country || null,
        linkedin_url: org.linkedin_url || null,
        source: 'apollo' as const,
        confidence_score: calculateConfidenceScore(org) // ✅ Add confidence scoring
      }));

    return companies;

  } catch (error) {
    console.error('fetchAndValidateCompanies error:', error);
    throw error;
  }
}

// ✅ Calculate confidence score based on data completeness
function calculateConfidenceScore(org: z.infer<typeof ApolloCompanySchema>): number {
  let score = 0;
  if (org.name) score += 20;
  if (org.domain) score += 20;
  if (org.industry) score += 15;
  if (org.employee_count !== null && org.employee_count !== undefined) score += 15;
  if (org.location?.city) score += 10;
  if (org.location?.state) score += 10;
  if (org.linkedin_url) score += 10;
  return score; // 0-100
}
```

#### **Deployment Plan:**
1. **Day 1:** Deploy validation code with feature flag
2. **Day 2:** Enable for 10%, monitor validation failure rate
3. **Day 3:** If validation failures <5%, increase to 50%
4. **Day 5:** If stable, increase to 100%

**Success Metrics:**
- ✅ Validation failure rate <5%
- ✅ Average confidence score >70
- ✅ Invalid company records decrease by >80%

---

## 📋 PHASE 3: P1 Quality Improvements (Week 5-6)
**Goal:** Improve code quality and user experience
**Risk:** Low (quality improvements, not critical fixes)

### **3.1 Add TypeScript Strict Mode**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true, // Enable all strict checks
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

**Approach:** Fix files incrementally (5-10 files per day)

---

### **3.2 Improve Error Messages**
Replace generic errors with user-friendly messages:

```typescript
// ❌ Before
catch (error: any) {
  console.error(error);
}

// ✅ After
catch (error) {
  const userMessage = getUserFriendlyErrorMessage(error);
  toast.error(userMessage);
  Sentry.captureException(error, { tags: { userFacing: true } });
}

function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Map technical errors to user-friendly messages
    if (error.message.includes('JWT')) {
      return 'Your session has expired. Please log in again.';
    }
    if (error.message.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (error.message.includes('permission')) {
      return 'You do not have permission to perform this action.';
    }
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
```

---

### **3.3 Add Loading States**
Ensure all async operations show loading feedback:

```typescript
// ✅ Standard loading pattern
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await performAction();
    toast.success('Action completed');
  } catch (error) {
    toast.error(getUserFriendlyErrorMessage(error));
  } finally {
    setLoading(false);
  }
};

return (
  <button disabled={loading} onClick={handleAction}>
    {loading ? 'Processing...' : 'Perform Action'}
  </button>
);
```

---

### **3.4 Add Test Coverage to 50%**
**Priority files to test:**
1. `src/lib/supabase.ts` - Core client
2. `src/hooks/*.ts` - All custom hooks
3. `src/pages/Upload.tsx` - Onboarding flow
4. `src/pages/Projects.tsx` - Core student journey
5. `src/pages/ProjectDetail.tsx` - Project details

**Target:** 50% coverage by end of Phase 3

---

## 📊 Success Metrics & Monitoring

### **Key Metrics to Track:**

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Type Safety (% files without `any`) | 0% | 80% | TypeScript compilation |
| Test Coverage | 0% | 50% | Vitest coverage report |
| Error Rate (Sentry) | Unknown | <1% | Sentry dashboard |
| Location Detection Success Rate | Unknown | >90% | Feature flag analytics |
| Auto-Generate Success Rate | Unknown | >85% | Feature flag analytics |
| Duplicate Applications | Unknown | 0 | Database queries |
| Provider Validation Failures | Unknown | <5% | Edge function logs |
| User-Reported Bugs | Unknown | <2/week | Support tickets |

### **Monitoring Dashboard:**
```sql
-- Create metrics view for monitoring
CREATE OR REPLACE VIEW system_health_metrics AS
SELECT
  (SELECT COUNT(*) FROM project_applications
   WHERE created_at > NOW() - INTERVAL '7 days') as weekly_applications,

  (SELECT COUNT(DISTINCT student_id) FROM project_applications
   WHERE created_at > NOW() - INTERVAL '7 days') as weekly_active_students,

  (SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))
   FROM project_generation_queue
   WHERE status = 'completed' AND updated_at > NOW() - INTERVAL '7 days') as avg_generation_time_seconds,

  (SELECT COUNT(*) FROM project_generation_queue
   WHERE status = 'failed' AND updated_at > NOW() - INTERVAL '7 days') as weekly_generation_failures;
```

---

## 🚨 Rollback Procedures

### **Instant Rollback (Feature Flags):**
```sql
-- Disable any feature immediately
UPDATE feature_flags
SET enabled = FALSE, rollout_percentage = 0
WHERE flag_name = 'feature_to_disable';
```

### **Database Rollback:**
```bash
# Rollback last migration
supabase db reset --db-url $DATABASE_URL --version <previous_version>
```

### **Code Rollback:**
```bash
# Revert to previous commit
git revert <commit-hash>
git push origin main

# Or rollback deployment (if using Vercel/Netlify)
vercel rollback
```

---

## ✅ Definition of Done

### **Phase 1 Complete When:**
- ✅ 15+ tests passing
- ✅ Sentry integrated and receiving errors
- ✅ Feature flag system operational
- ✅ Error rate baseline established

### **Phase 2 Complete When:**
- ✅ All 4 P0 fixes deployed at 100% rollout
- ✅ Error rate has not increased >5%
- ✅ User-reported bugs decreased by >30%
- ✅ All fixes have rollback procedures tested

### **Phase 3 Complete When:**
- ✅ Test coverage ≥50%
- ✅ TypeScript strict mode enabled for 80% of files
- ✅ All user-facing errors have friendly messages
- ✅ Loading states on all async operations

---

## 📞 Communication Plan

### **Stakeholder Updates:**
- **Daily:** Slack updates on progress
- **Weekly:** Email report with metrics
- **Bi-weekly:** Demo of new features

### **User Communication:**
- **Before Phase 2:** Email announcement of improvements coming
- **During Rollouts:** In-app notification "We're improving X feature"
- **After Completion:** Blog post highlighting fixes

---

## 🎯 Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking change in production | Medium | High | Feature flags + gradual rollout |
| Database migration failure | Low | High | Test in staging, have rollback SQL ready |
| Increased error rate | Medium | Medium | Monitor Sentry, auto-rollback if >5% increase |
| User confusion with changes | Low | Low | Clear in-app messaging, support docs |
| Performance degradation | Low | Medium | Load testing before 100% rollout |

---

## 📚 Additional Resources

- **Sentry Dashboard:** [https://sentry.io/your-org/projectify](https://sentry.io/)
- **Feature Flags Admin:** Supabase SQL Editor → `SELECT * FROM feature_flags`
- **Test Coverage Report:** `npm run test:coverage`
- **Migration Status:** `supabase migration list`

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Owner:** Engineering Team
**Reviewers:** Product, DevOps
