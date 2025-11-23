# Development Best Practices - Projectify Syllabus

## Lessons Learned from Apollo Discovery Crisis

### What Went Wrong

1. **Assumed system was broken** without testing current state
2. **Changed multiple things at once** (7 different changes)
3. **No incremental testing** between changes
4. **No rollback plan** in place
5. **Didn't verify dependencies** before modifying code
6. **No feature flags** for experimental changes

**Result:** Broke a working system while trying to "fix" it

---

## Core Principles

### 1. Make It Work, Then Make It Better

```
❌ DON'T: "This code could be better, let me refactor it"
✅ DO:    "Is this code working? Let me verify first"

ALWAYS:
1. Test current behavior
2. Document what works
3. Identify actual problem (not assumed problem)
4. Make minimal change to fix
5. Test again
6. Only then optimize
```

### 2. Change One Thing at a Time

```
Example: Discovery returning 0 companies

❌ BAD APPROACH:
1. Change location format
2. Add technology filtering
3. Add distance filter
4. Increase request size
5. Modify fallback logic
6. Update database
7. Change validation
→ Test → Everything breaks → No idea which change caused it

✅ GOOD APPROACH:
1. Test current state → Document results
2. Change location format → Test → Commit
3. Add technology filtering → Test → Commit or Revert
4. Add distance filter → Test → Commit or Revert
5. Each change is isolated and testable
```

### 3. Test Before "Fixing"

```typescript
// BEFORE making any changes:

console.log("=== CURRENT STATE TEST ===");
console.log("Running discovery with ZERO changes...");

// Run test
// Document results:
// - How many companies returned?
// - What errors occurred?
// - Which features work?
// - Which features don't work?

// ONLY THEN decide what needs fixing
```

---

## Standard Operating Procedures

### SOP 1: Making Any Code Change

```
STEP 1: Document Current State
- Run the feature end-to-end
- Note what works and what doesn't
- Capture logs and errors
- Save current commit: git log --oneline -1

STEP 2: Identify Root Cause
- What is ACTUALLY broken? (not what you think is broken)
- Verify with logs, tests, user reports
- Confirm the problem exists

STEP 3: Plan Minimal Change
- What is the SMALLEST change that fixes the problem?
- Can it be done with a config change instead of code?
- Can it be feature-flagged?

STEP 4: Implement ONE Change
- Make the change
- Document what you changed and why
- Add logging to verify it works

STEP 5: Test Thoroughly
- Run the same tests from Step 1
- Compare before/after results
- Check for side effects

STEP 6: Commit or Revert
- If it works: Commit with clear message
- If it breaks something else: Revert immediately
- If unclear: Ask for review

STEP 7: Monitor
- Watch for issues in production
- Check error logs
- Verify metrics
```

### SOP 2: Debugging Production Issues

```
STEP 1: DON'T PANIC
- System was working before, it can work again
- Hasty fixes often make it worse

STEP 2: Gather Data
- What changed recently? (git log)
- What errors are occurring? (logs)
- What's the user impact? (how many affected?)
- Can we rollback? (identify last good commit)

STEP 3: Isolate the Issue
- Is it code, data, config, or infrastructure?
- When did it start? (correlate with deployments)
- Can we reproduce locally?

STEP 4: Quick Fix vs Proper Fix
- Quick fix: Rollback to last known good state
- Proper fix: Identify root cause, implement correctly
- Choose based on severity

STEP 5: Root Cause Analysis
- Why did the issue occur?
- Why didn't tests catch it?
- How do we prevent it in the future?

STEP 6: Document
- What broke?
- What fixed it?
- What safeguards were added?
```

### SOP 3: Adding New Features

```
STEP 1: Research
- Does this feature already exist?
- How do similar systems handle this?
- What are the edge cases?

STEP 2: Design
- How will it integrate with existing code?
- What modules does it depend on?
- What modules will depend on it?
- Can it be isolated (feature flag)?

STEP 3: Implement with Feature Flag
const USE_NEW_FEATURE = Deno.env.get('FEATURE_XYZ') === 'true';

if (USE_NEW_FEATURE) {
  // New behavior
} else {
  // Existing working behavior
}

STEP 4: Test in Isolation
- Test with feature enabled
- Test with feature disabled
- Test the toggle itself

STEP 5: Gradual Rollout
- Deploy with feature disabled
- Enable for test data
- Enable for 10% of users
- Monitor and adjust
- Enable for 100%

STEP 6: Remove Feature Flag
- Once stable, remove the flag
- Clean up old code path
- Update documentation
```

---

## Code Review Checklist

### Before Submitting PR

- [ ] Did I test current behavior BEFORE making changes?
- [ ] Did I change ONE thing, or multiple things?
- [ ] Did I test after EACH change?
- [ ] Do I have a rollback plan?
- [ ] Did I update relevant documentation?
- [ ] Did I check what depends on this code?
- [ ] Did I add appropriate logging?
- [ ] Can this change be feature-flagged?

### Reviewing Others' PRs

- [ ] Can I understand what changed and why?
- [ ] Is this a minimal change or too ambitious?
- [ ] Are there tests to verify it works?
- [ ] What breaks if this change is wrong?
- [ ] Is there a rollback plan?
- [ ] Are dependencies documented?
- [ ] Is logging sufficient for debugging?

---

## Git Workflow

### Branching Strategy

```
main (production)
  ↓
staging (integration testing)
  ↓
feature/specific-fix (development)
```

### Commit Messages

```
✅ GOOD:
fix: Disable technology filtering temporarily (crisis recovery)

Apollo was returning 0 companies after adding technology filtering.
This disables the feature while we investigate the correct format
for technology UIDs with Apollo API.

Related to: Issue #123
Rollback plan: git revert <hash>

❌ BAD:
fix: various fixes
```

### When to Commit

```
✅ COMMIT:
- After each working change
- Before making next change
- At end of day (even if unfinished, use WIP)

❌ DON'T COMMIT:
- Broken code (unless WIP and clearly marked)
- Multiple unrelated changes in one commit
- Code you haven't tested
```

---

## Testing Standards

### Manual Testing Checklist

For any discovery-related change:

- [ ] Test with Kansas City Industrial Engineering (known case)
- [ ] Verify companies returned (not 0)
- [ ] Check company locations (local vs distant)
- [ ] Verify pipeline completes (all phases)
- [ ] Check database for stored companies
- [ ] Review logs for errors
- [ ] Test with different courses/locations

### Automated Testing

```typescript
// Add tests for critical paths
describe('Apollo Discovery', () => {
  it('should return companies for Kansas City', async () => {
    const result = await discoverCompanies({
      location: 'Kansas City, Missouri',
      course: 'Industrial Engineering'
    });

    expect(result.companies.length).toBeGreaterThan(0);
    expect(result.companies[0].city).toContain('Kansas City');
  });

  it('should handle API errors gracefully', async () => {
    // Mock API failure
    const result = await discoverCompanies({...});

    expect(result.error).toBeDefined();
    expect(result.fallback).toBe('adzuna'); // Should try fallback
  });
});
```

---

## Monitoring and Alerts

### What to Monitor

1. **Discovery Success Rate**
   - % of discoveries that return companies
   - Alert if < 80%

2. **Average Companies Returned**
   - Typical range: 10-20
   - Alert if < 5

3. **API Response Times**
   - Apollo: < 5 seconds
   - Alert if > 10 seconds

4. **Error Rates**
   - 401/403: API key issues
   - 429: Rate limits
   - 500: Server errors

### Logging Best Practices

```typescript
// ✅ GOOD: Structured logging
console.log('🔍 [Apollo] Starting discovery', {
  location: context.location,
  filters: filters,
  timestamp: new Date().toISOString()
});

// ❌ BAD: Vague logging
console.log('Starting...');

// ✅ GOOD: Error context
console.error('❌ [Apollo] Discovery failed', {
  error: error.message,
  location: context.location,
  apiKey: apiKey ? 'present' : 'missing',
  retryCount: retries
});

// ❌ BAD: No context
console.error(error);
```

---

## Feature Flags

### How to Use Feature Flags

```typescript
// Define feature flags in environment
const FEATURE_FLAGS = {
  USE_TECHNOLOGY_FILTERING: Deno.env.get('FF_TECH_FILTER') === 'true',
  USE_DISTANCE_FILTER: Deno.env.get('FF_DISTANCE_FILTER') === 'true',
  ENABLE_ADZUNA_FALLBACK: Deno.env.get('FF_ADZUNA_FALLBACK') === 'true',
};

// Use throughout code
if (FEATURE_FLAGS.USE_TECHNOLOGY_FILTERING) {
  filters.currently_using_any_of_technology_uids = techUIDs;
}

// Log feature states
console.log('Feature flags:', FEATURE_FLAGS);
```

### When to Use Feature Flags

- ✅ New experimental features
- ✅ Major algorithm changes
- ✅ Third-party API integrations
- ✅ Performance optimizations
- ✅ Anything that might break existing functionality

### When to Remove Feature Flags

- After feature is stable for 2+ weeks
- After 100% rollout completed
- When old code path is no longer needed
- Document in commit message why flag was removed

---

## Documentation Requirements

### Code Comments

```typescript
// ✅ GOOD: Explains WHY
// Technology filtering disabled temporarily (crisis recovery)
// Apollo API may not support string-based UIDs - needs investigation
// TODO: Re-enable after confirming correct format with Apollo docs
const useTechFilter = false;

// ❌ BAD: Explains WHAT (obvious from code)
// Set useTechFilter to false
const useTechFilter = false;
```

### README Updates

Update README when:
- Adding new feature
- Changing configuration
- Modifying API integrations
- Changing deployment process

### Migration Guides

Create migration guide when:
- Changing database schema
- Modifying API interfaces
- Updating environment variables
- Breaking backward compatibility

---

## Crisis Management Protocol

### When Something Breaks in Production

**IMMEDIATE (0-15 minutes)**
1. Assess severity (how many users affected?)
2. Check if rollback is possible
3. Communicate status to team
4. If critical: Rollback immediately
5. If minor: Continue investigation

**SHORT TERM (15-60 minutes)**
1. Identify root cause
2. Implement quick fix or permanent fix
3. Test fix thoroughly
4. Deploy fix
5. Monitor results

**LONG TERM (post-incident)**
1. Write postmortem
2. Identify preventive measures
3. Update tests to catch this issue
4. Update documentation
5. Share lessons learned

---

## Summary

### Golden Rules

1. **Test before changing** - Verify current state first
2. **One change at a time** - Makes debugging possible
3. **Feature flags** - Allow safe experimentation
4. **Commit frequently** - Easy rollback points
5. **Document why** - Future you will thank you
6. **Monitor everything** - Catch issues early
7. **Have rollback plan** - Always know your escape route

### Remember

> "Make it work, then make it better. Never make it worse trying to make it better."

---

**Last Updated:** 2025-11-23 (after Apollo discovery crisis)
**Next Review:** After next major incident or quarterly
