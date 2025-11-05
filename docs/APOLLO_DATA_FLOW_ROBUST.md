# Apollo Data Flow - Robust Implementation

## Problem Identified
Projects were being created with `company_profile_id = NULL` despite Apollo-enriched companies existing in the database with full contact data. This happened because:
1. The `generate-projects` function wasn't fetching Apollo companies
2. Projects weren't being linked to company profiles
3. Contact data from Apollo wasn't flowing to project forms

## Sustainable Solution Implemented

### 1. Apollo-First Data Fetching
```typescript
// STEP 1: ALWAYS TRY APOLLO FIRST
if (generation_run_id && typeof generation_run_id === 'string' && generation_run_id.length > 0) {
  const apolloCompanies = await getApolloEnrichedCompanies(serviceRoleClient, generation_run_id, numTeams);
  if (apolloCompanies && apolloCompanies.length > 0) {
    companiesFound = apolloCompanies;
    apolloFetchSuccess = true;
  }
}
```

### 2. Mandatory Company Profile Linking
```typescript
// CRITICAL: Always link projects to company_profiles
if (company.id) {
  projectInsert.company_profile_id = company.id;
} else if (apolloFetchSuccess && generationRunId) {
  // Fallback: Match by name in same generation run
  const { data: matchedProfile } = await serviceRoleClient
    .from('company_profiles')
    .select('id')
    .eq('generation_run_id', generationRunId)
    .ilike('name', company.name)
    .maybeSingle();
  
  if (matchedProfile) {
    projectInsert.company_profile_id = matchedProfile.id;
  }
}
```

### 3. Fallback Strategy
```typescript
// STEP 2: Only use Google Search if Apollo completely failed
if (companiesFound.length === 0 && !apolloFetchSuccess) {
  // Run discover-companies as fallback
} else if (apolloFetchSuccess) {
  // Skip fallback - using Apollo data
}
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Uploads Syllabus                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Configure.tsx - Generate Projects                   │
│  1. Call discover-companies (Apollo enrichment)                  │
│  2. Capture generation_run_id                                    │
│  3. Pass generation_run_id to generate-projects                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           generate-projects: STEP 1 (PRIORITY)                   │
│  ✓ Validate generation_run_id exists and is string              │
│  ✓ Call getApolloEnrichedCompanies()                            │
│  ✓ Load companies with full Apollo contact data                 │
│  ✓ Set apolloFetchSuccess = true                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           generate-projects: STEP 2 (FALLBACK)                   │
│  IF apolloFetchSuccess = false:                                  │
│    → Run discover-companies (Google Search)                      │
│  ELSE:                                                           │
│    → Skip - using Apollo data                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         generate-projects: Project Creation Loop                 │
│  For each company:                                               │
│  1. Generate proposal with AI                                    │
│  2. Calculate Apollo-enriched pricing                            │
│  3. Calculate Apollo-enriched ROI                                │
│  4. Create forms with Apollo contact data                        │
│  5. INSERT project with company_profile_id (MANDATORY)           │
│     - Try direct company.id first                                │
│     - Fallback to name matching if needed                        │
│  6. Link to generation_run_id                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Result: Linked Projects                         │
│  ✓ project.company_profile_id → company_profiles.id             │
│  ✓ project.generation_run_id → generation_runs.id               │
│  ✓ Contact tab shows real Apollo contact data                   │
│  ✓ ROI uses Apollo market intelligence                          │
└─────────────────────────────────────────────────────────────────┘
```

## Key Improvements

### 1. Robust Validation
- Validates `generation_run_id` is non-empty string before use
- Checks if Apollo fetch actually returned companies
- Tracks `apolloFetchSuccess` flag to control fallback behavior

### 2. Comprehensive Logging
- Each step logs what it's doing and why
- Apollo fetch logs company IDs and sample contact data
- Project insertion logs linking status
- Easy to debug in edge function logs

### 3. Mandatory Linking
- Projects MUST link to company_profiles when available
- Fallback to name matching if direct ID missing
- Warns when linking fails (should never happen with Apollo data)

### 4. Contact Data Flow
- `getApolloEnrichedCompanies()` returns all contact fields
- Contact data flows to `CompanyInfo` interface
- `createForms()` uses real Apollo contact data in form2
- `ContactTab` component displays Apollo data via company_profile

## Testing Checklist

1. **Upload syllabus** → Parse successful
2. **Generate projects** → Check logs show:
   - ✅ STEP 1: Fetching Apollo-enriched companies
   - ✅ SUCCESS: Loaded N Apollo companies
   - Company IDs and contact sample logged
3. **Check database**:
   ```sql
   SELECT p.id, p.company_name, p.company_profile_id, 
          cp.contact_first_name, cp.contact_email
   FROM projects p
   JOIN company_profiles cp ON p.company_profile_id = cp.id
   ORDER BY p.created_at DESC LIMIT 5;
   ```
   - Verify `company_profile_id` is NOT NULL
   - Verify contact data exists
4. **View project in UI** → Contact tab shows:
   - Real contact person name (not "TBD")
   - Real email and phone
   - Contact title
   - Apollo enrichment badge

## Why This Is Sustainable

1. **Single Source of Truth**: Apollo data in `company_profiles` table
2. **Explicit Linking**: Projects always link to company_profiles
3. **Clear Priority**: Apollo first, fallbacks only when needed
4. **Fail-Safe Mechanisms**: Name matching when direct ID unavailable
5. **Observable**: Comprehensive logging for debugging
6. **Maintainable**: Clear data flow, single responsibility per step

## Expected Behavior

- **With generation_run_id**: 
  - Fetch Apollo companies → Link directly → Show real contact data
- **Without generation_run_id**: 
  - Use Google Search fallback → Link by name → Show available data
- **Fallback fails**: 
  - Query DB by location → Link by name → Show available data
  
## Next Steps

1. Test complete flow by uploading new syllabus
2. Verify logs show Apollo fetch success
3. Confirm contact data appears in UI
4. Monitor for any name-matching edge cases
