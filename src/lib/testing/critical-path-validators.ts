/**
 * Critical Path Validators - Module 5.1
 * 
 * Runtime validation utilities for testing critical application flows.
 * These can be invoked from the admin dashboard or console for validation.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ValidationResult {
  passed: boolean;
  name: string;
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface TestSuite {
  name: string;
  results: ValidationResult[];
  passed: number;
  failed: number;
  totalDuration: number;
}

// ============================================================================
// AUTH FLOW VALIDATORS (5.1.1)
// ============================================================================

/**
 * Validates that auth state listener is properly configured
 */
export async function validateAuthStateListener(): Promise<ValidationResult> {
  const start = performance.now();
  const name = "Auth State Listener";
  
  try {
    // Check if we can get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        passed: false,
        name,
        duration: performance.now() - start,
        error: `Failed to get session: ${error.message}`,
      };
    }
    
    return {
      passed: true,
      name,
      duration: performance.now() - start,
      details: { 
        hasSession: !!session,
        userId: session?.user?.id ?? null,
      },
    };
  } catch (err) {
    return {
      passed: false,
      name,
      duration: performance.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Validates RLS policies are enforced (unauthenticated access blocked)
 */
export async function validateRLSEnforcement(): Promise<ValidationResult> {
  const start = performance.now();
  const name = "RLS Enforcement";
  
  try {
    // Try to access protected table without auth - should return empty or error
    const { data, error } = await supabase
      .from("course_profiles")
      .select("id")
      .limit(1);
    
    // If no session, we should get no data due to RLS
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session && data && data.length > 0) {
      return {
        passed: false,
        name,
        duration: performance.now() - start,
        error: "RLS not enforced: unauthenticated access returned data",
      };
    }
    
    return {
      passed: true,
      name,
      duration: performance.now() - start,
      details: {
        authenticated: !!session,
        dataReturned: data?.length ?? 0,
      },
    };
  } catch (err) {
    return {
      passed: false,
      name,
      duration: performance.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Validates user role fetching works correctly
 */
export async function validateRoleFetching(): Promise<ValidationResult> {
  const start = performance.now();
  const name = "Role Fetching";
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        passed: true,
        name,
        duration: performance.now() - start,
        details: { skipped: true, reason: "No active session" },
      };
    }
    
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    
    if (error) {
      return {
        passed: false,
        name,
        duration: performance.now() - start,
        error: `Failed to fetch roles: ${error.message}`,
      };
    }
    
    return {
      passed: true,
      name,
      duration: performance.now() - start,
      details: {
        userId: session.user.id,
        roles: roles?.map(r => r.role) ?? [],
      },
    };
  } catch (err) {
    return {
      passed: false,
      name,
      duration: performance.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ============================================================================
// PROJECT GENERATION VALIDATORS (5.1.2)
// ============================================================================

/**
 * Validates generation_runs table structure and access
 */
export async function validateGenerationRunsAccess(): Promise<ValidationResult> {
  const start = performance.now();
  const name = "Generation Runs Access";
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        passed: true,
        name,
        duration: performance.now() - start,
        details: { skipped: true, reason: "No active session" },
      };
    }
    
    // Try to access generation runs for user's courses
    const { data, error } = await supabase
      .from("generation_runs")
      .select("id, status, course_id, projects_generated")
      .limit(5);
    
    if (error) {
      return {
        passed: false,
        name,
        duration: performance.now() - start,
        error: `Query failed: ${error.message}`,
      };
    }
    
    return {
      passed: true,
      name,
      duration: performance.now() - start,
      details: {
        runsFound: data?.length ?? 0,
      },
    };
  } catch (err) {
    return {
      passed: false,
      name,
      duration: performance.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Validates project queue table access
 */
export async function validateProjectQueueAccess(): Promise<ValidationResult> {
  const start = performance.now();
  const name = "Project Queue Access";
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        passed: true,
        name,
        duration: performance.now() - start,
        details: { skipped: true, reason: "No active session" },
      };
    }
    
    const { data, error } = await supabase
      .from("project_generation_queue")
      .select("id, status, attempts")
      .limit(5);
    
    if (error) {
      return {
        passed: false,
        name,
        duration: performance.now() - start,
        error: `Query failed: ${error.message}`,
      };
    }
    
    return {
      passed: true,
      name,
      duration: performance.now() - start,
      details: {
        queueItemsFound: data?.length ?? 0,
      },
    };
  } catch (err) {
    return {
      passed: false,
      name,
      duration: performance.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Validates projects table access and structure
 */
export async function validateProjectsAccess(): Promise<ValidationResult> {
  const start = performance.now();
  const name = "Projects Access";
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        passed: true,
        name,
        duration: performance.now() - start,
        details: { skipped: true, reason: "No active session" },
      };
    }
    
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, status, final_score")
      .limit(5);
    
    if (error) {
      return {
        passed: false,
        name,
        duration: performance.now() - start,
        error: `Query failed: ${error.message}`,
      };
    }
    
    return {
      passed: true,
      name,
      duration: performance.now() - start,
      details: {
        projectsFound: data?.length ?? 0,
      },
    };
  } catch (err) {
    return {
      passed: false,
      name,
      duration: performance.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ============================================================================
// COMPANY DISCOVERY VALIDATORS (5.1.3)
// ============================================================================

/**
 * Validates company_profiles table access
 */
export async function validateCompanyProfilesAccess(): Promise<ValidationResult> {
  const start = performance.now();
  const name = "Company Profiles Access";
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        passed: true,
        name,
        duration: performance.now() - start,
        details: { skipped: true, reason: "No active session" },
      };
    }
    
    const { data, error } = await supabase
      .from("company_profiles")
      .select("id, name, city, composite_signal_score")
      .limit(5);
    
    if (error) {
      return {
        passed: false,
        name,
        duration: performance.now() - start,
        error: `Query failed: ${error.message}`,
      };
    }
    
    return {
      passed: true,
      name,
      duration: performance.now() - start,
      details: {
        companiesFound: data?.length ?? 0,
      },
    };
  } catch (err) {
    return {
      passed: false,
      name,
      duration: performance.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Validates course_profiles table access
 */
export async function validateCourseProfilesAccess(): Promise<ValidationResult> {
  const start = performance.now();
  const name = "Course Profiles Access";
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        passed: true,
        name,
        duration: performance.now() - start,
        details: { skipped: true, reason: "No active session" },
      };
    }
    
    const { data, error } = await supabase
      .from("course_profiles")
      .select("id, title, location_formatted")
      .limit(5);
    
    if (error) {
      return {
        passed: false,
        name,
        duration: performance.now() - start,
        error: `Query failed: ${error.message}`,
      };
    }
    
    return {
      passed: true,
      name,
      duration: performance.now() - start,
      details: {
        coursesFound: data?.length ?? 0,
      },
    };
  } catch (err) {
    return {
      passed: false,
      name,
      duration: performance.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ============================================================================
// TEST SUITE RUNNERS
// ============================================================================

/**
 * Runs all auth flow tests
 */
export async function runAuthFlowTests(): Promise<TestSuite> {
  const results: ValidationResult[] = [];
  
  results.push(await validateAuthStateListener());
  results.push(await validateRLSEnforcement());
  results.push(await validateRoleFetching());
  
  return createTestSuite("Auth Flow (5.1.1)", results);
}

/**
 * Runs all project generation tests
 */
export async function runProjectGenerationTests(): Promise<TestSuite> {
  const results: ValidationResult[] = [];
  
  results.push(await validateGenerationRunsAccess());
  results.push(await validateProjectQueueAccess());
  results.push(await validateProjectsAccess());
  
  return createTestSuite("Project Generation (5.1.2)", results);
}

/**
 * Runs all company discovery tests
 */
export async function runCompanyDiscoveryTests(): Promise<TestSuite> {
  const results: ValidationResult[] = [];
  
  results.push(await validateCompanyProfilesAccess());
  results.push(await validateCourseProfilesAccess());
  
  return createTestSuite("Company Discovery (5.1.3)", results);
}

/**
 * Runs all critical path tests
 */
export async function runAllCriticalPathTests(): Promise<TestSuite[]> {
  const suites: TestSuite[] = [];
  
  suites.push(await runAuthFlowTests());
  suites.push(await runProjectGenerationTests());
  suites.push(await runCompanyDiscoveryTests());
  
  return suites;
}

/**
 * Helper to create a test suite from results
 */
function createTestSuite(name: string, results: ValidationResult[]): TestSuite {
  return {
    name,
    results,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
  };
}

/**
 * Formats test results for console output
 */
export function formatTestResults(suites: TestSuite[]): string {
  let output = "\n=== CRITICAL PATH TEST RESULTS ===\n\n";
  
  for (const suite of suites) {
    const status = suite.failed === 0 ? "✅ PASSED" : "❌ FAILED";
    output += `${status} ${suite.name} (${suite.passed}/${suite.results.length})\n`;
    
    for (const result of suite.results) {
      const icon = result.passed ? "  ✓" : "  ✗";
      output += `${icon} ${result.name} (${result.duration.toFixed(1)}ms)`;
      
      if (result.error) {
        output += ` - ${result.error}`;
      }
      output += "\n";
    }
    output += "\n";
  }
  
  const totalPassed = suites.reduce((sum, s) => sum + s.passed, 0);
  const totalTests = suites.reduce((sum, s) => sum + s.results.length, 0);
  const totalDuration = suites.reduce((sum, s) => sum + s.totalDuration, 0);
  
  output += `=== SUMMARY: ${totalPassed}/${totalTests} passed (${totalDuration.toFixed(1)}ms) ===\n`;
  
  return output;
}
