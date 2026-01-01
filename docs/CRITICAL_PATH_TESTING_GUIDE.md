# Critical Path Testing Guide - Module 5

*Last Updated: 2026-01-01*

This guide documents the critical path testing procedures for validating core application functionality.

---

## Overview

Module 5 implements runtime validation utilities that test critical application flows:
- **5.1.1** - Authentication Flow Testing
- **5.1.2** - Project Generation Testing  
- **5.1.3** - Company Discovery Testing

---

## Running Tests

### From Browser Console

```javascript
// Import validators
import { runAllCriticalPathTests, formatTestResults } from '@/lib/testing/critical-path-validators';

// Run all tests
const results = await runAllCriticalPathTests();
console.log(formatTestResults(results));
```

### Individual Test Suites

```javascript
import { 
  runAuthFlowTests,
  runProjectGenerationTests,
  runCompanyDiscoveryTests 
} from '@/lib/testing/critical-path-validators';

// Run specific suite
const authResults = await runAuthFlowTests();
const genResults = await runProjectGenerationTests();
const discoveryResults = await runCompanyDiscoveryTests();
```

---

## Test Categories

### 5.1.1 Auth Flow Tests

| Test | Description | Pass Criteria |
|------|-------------|---------------|
| Auth State Listener | Validates session can be retrieved | Session API responds without error |
| RLS Enforcement | Validates unauthenticated access blocked | No data returned without auth |
| Role Fetching | Validates user roles are retrievable | Roles array returned for logged-in user |

### 5.1.2 Project Generation Tests

| Test | Description | Pass Criteria |
|------|-------------|---------------|
| Generation Runs Access | Validates generation_runs table query | Query succeeds with RLS |
| Project Queue Access | Validates project_generation_queue query | Query succeeds with RLS |
| Projects Access | Validates projects table query | Query succeeds with RLS |

### 5.1.3 Company Discovery Tests

| Test | Description | Pass Criteria |
|------|-------------|---------------|
| Company Profiles Access | Validates company_profiles table query | Query succeeds with RLS |
| Course Profiles Access | Validates course_profiles table query | Query succeeds with RLS |

---

## Manual Testing Checklist

### Authentication Flow

- [ ] Navigate to /auth page
- [ ] Sign up with new email (auto-confirm enabled)
- [ ] Verify redirect to dashboard after signup
- [ ] Log out and verify redirect to landing
- [ ] Log in with existing credentials
- [ ] Verify role-based route protection works

### Project Generation Flow

- [ ] Upload a syllabus file
- [ ] Configure project parameters (location, teams)
- [ ] Trigger project generation
- [ ] Verify generation status updates in real-time
- [ ] View generated projects list
- [ ] Open project detail page

### Company Discovery Flow

- [ ] Navigate to projects page with generated projects
- [ ] Verify company data displays correctly
- [ ] Check company profile enrichment data
- [ ] Verify signal scores appear

---

## Edge Function Health Checks

### Generate Projects Function

```bash
# Check function logs
# Look for: "Authenticated user:" log line
# Look for: No auth errors
```

### Discover Companies Function

```bash
# Check function logs
# Look for: Apollo API responses
# Look for: Company filtering results
```

---

## Expected Test Output

```
=== CRITICAL PATH TEST RESULTS ===

✅ PASSED Auth Flow (5.1.1) (3/3)
  ✓ Auth State Listener (45.2ms)
  ✓ RLS Enforcement (32.1ms)
  ✓ Role Fetching (28.5ms)

✅ PASSED Project Generation (5.1.2) (3/3)
  ✓ Generation Runs Access (22.3ms)
  ✓ Project Queue Access (18.9ms)
  ✓ Projects Access (25.1ms)

✅ PASSED Company Discovery (5.1.3) (2/2)
  ✓ Company Profiles Access (31.2ms)
  ✓ Course Profiles Access (19.8ms)

=== SUMMARY: 8/8 passed (223.1ms) ===
```

---

## Troubleshooting

### Auth Tests Failing

1. Check Supabase auth configuration
2. Verify auto-confirm is enabled for testing
3. Check redirect URLs in auth settings

### RLS Tests Failing

1. Review RLS policies on affected tables
2. Check user has required roles
3. Verify policy conditions are correct

### Query Tests Failing

1. Check table exists in database
2. Verify RLS allows access for user's role
3. Check for database errors in Supabase logs

---

## Integration with CI/CD

These validators can be integrated with deployment pipelines:

1. Run tests after each deployment
2. Block deployment if critical tests fail
3. Log results for monitoring

---

## Module 5 Completion Criteria

- [x] Test utilities implemented (`critical-path-validators.ts`)
- [x] Test documentation created
- [ ] All manual tests executed and passed
- [ ] No critical bugs found during testing
