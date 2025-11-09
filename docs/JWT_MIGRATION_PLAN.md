# JWT Authentication Migration Plan

## Status: Ready to Execute

Your frontend is **already sending authentication tokens correctly!** This migration will be simpler than expected.

## Current State ✅

Your codebase already implements proper authentication:

1. **Most API calls use `supabase.functions.invoke()`** which automatically includes JWT tokens when users are authenticated
2. **File upload uses direct `fetch()`** but already manually adds the `Authorization: Bearer ${token}` header
3. **No frontend code changes needed!**

## Migration Steps

### Step 1: Frontend Audit (Optional - for verification only)

Your frontend already sends tokens correctly, but you can verify:

```typescript
// Pattern already implemented throughout your app:
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* data */ }
});
// ✅ This automatically includes auth headers
```

```typescript
// Pattern already implemented in Upload.tsx:
const { data: { session } } = await supabase.auth.getSession();
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`, // ✅ Already there!
  }
});
```

### Step 2: Update Backend Configuration

This is the **only change needed**. Edit `supabase/config.toml`:

```toml
project_id = "wnxjeldvzjubfgzvvzov"

# ============================================
# AUTHENTICATED FUNCTIONS (Remove verify_jwt = false)
# ============================================

# Admin functions - MUST authenticate
[functions.admin-regenerate-projects]
# verify_jwt = false  ← REMOVE THIS LINE

# Resource-intensive AI functions
[functions.generate-projects]
# verify_jwt = false  ← REMOVE THIS LINE

[functions.analyze-project-value]
# verify_jwt = false  ← REMOVE THIS LINE

[functions.run-single-project-generation]
# verify_jwt = false  ← REMOVE THIS LINE

# Data processing functions
[functions.competency-extractor]
# verify_jwt = false  ← REMOVE THIS LINE

[functions.job-matcher]
# verify_jwt = false  ← REMOVE THIS LINE

[functions.get-project-detail]
# verify_jwt = false  ← REMOVE THIS LINE

[functions.parse-syllabus]
# verify_jwt = false  ← REMOVE THIS LINE

[functions.portfolio-export]
# verify_jwt = false  ← REMOVE THIS LINE

# Company discovery and enrichment
[functions.discover-companies]
# verify_jwt = false  ← REMOVE THIS LINE

[functions.data-enrichment-pipeline]
# verify_jwt = false  ← REMOVE THIS LINE

[functions.get-apollo-org-id]
# verify_jwt = false  ← REMOVE THIS LINE

# Aggregation and scoring
[functions.aggregate-demand-signals]
# verify_jwt = false  ← REMOVE THIS LINE

[functions.project-suitability-scorer]
# verify_jwt = false  ← REMOVE THIS LINE

[functions.migrate-technology-format]
# verify_jwt = false  ← REMOVE THIS LINE

# Admin sync function (has auth checks in code)
[functions.sync-project-match]
# verify_jwt = false  ← REMOVE THIS LINE

# Investigation functions
[functions.investigate-apollo-jobs]
# verify_jwt = false  ← REMOVE THIS LINE

# Test functions
[functions.TEST-talent-alert]
# verify_jwt = false  ← REMOVE THIS LINE

[functions.TEST-real-email]
# verify_jwt = false  ← REMOVE THIS LINE

# ============================================
# PUBLIC FUNCTIONS (Keep verify_jwt = false)
# ============================================

[functions.submit-employer-interest]
verify_jwt = false  # ✅ KEEP - Public form submission

[functions.apollo-webhook-listener]
verify_jwt = false  # ✅ KEEP - Webhook receiver (needs signature verification instead)
```

### Step 3: Deploy and Test

1. **Save the `supabase/config.toml` file** with the changes above
2. **Deploy your changes** - Edge functions will redeploy automatically
3. **Test authenticated features:**
   - Upload a syllabus (parse-syllabus)
   - Generate projects (generate-projects)
   - View project details (get-project-detail)
   - Export portfolio (portfolio-export)

4. **Verify public endpoints still work:**
   - Submit employer interest form (should work without auth)

## Expected Results

- ✅ All authenticated features continue working normally
- ✅ Public forms continue to work without authentication
- ✅ Unauthorized users receive proper 401 errors
- ✅ **18 critical security vulnerabilities closed**

## Rollback Plan

If any issues occur, you can immediately revert by re-adding `verify_jwt = false` to the specific function causing problems.

## Additional Security Measures

After this migration, consider:

1. **Add role checks** in admin functions:
   ```typescript
   // In functions like admin-regenerate-projects
   const { data: isAdmin } = await supabase.rpc('has_role', {
     _user_id: session.user.id,
     _role: 'admin'
   });
   
   if (!isAdmin) {
     return new Response(
       JSON.stringify({ error: 'Unauthorized: Admin access required' }),
       { status: 403, headers: corsHeaders }
     );
   }
   ```

2. **Implement rate limiting** in resource-intensive functions
3. **Add request logging** for audit trails

## Timeline

- **Preparation:** 10 minutes (review the config changes)
- **Implementation:** 5 minutes (edit config.toml)
- **Testing:** 15 minutes (verify all features work)
- **Total:** ~30 minutes

## Next Phase

After completing this migration, the remaining security improvements to address are:

1. ⚠️ Implement webhook signature verification (apollo-webhook-listener)
2. 💡 Consider migrating to Lovable AI Gateway (optional optimization)

These are lower priority and won't break functionality.
