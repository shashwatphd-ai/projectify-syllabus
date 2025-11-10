# Generate Projects: Atomic Transaction Update

## Changes Required in `generate-projects/index.ts`

Replace lines **681-768** (the three separate inserts) with the atomic RPC call below:

### BEFORE (Lines 681-768 - THREE SEPARATE TRANSACTIONS):
```typescript
// Insert project with ai_shell status
console.log('  → Inserting project...');
const { data: insertedProject, error: projectError } = await serviceRoleClient
  .from('projects')
  .insert({...})
  .select()
  .single();

if (projectError) {
  console.error(`  ❌ Failed to insert project:`, projectError);
  generationErrors.push({ company: company.name, error: projectError.message });
  continue;
}

projectIds.push(insertedProject.id);

// Insert forms (single row with all forms)
console.log('  → Inserting forms...');
const { error: formsError } = await serviceRoleClient
  .from('project_forms')
  .insert({...});

if (formsError) {
  console.error(`  ⚠️ Failed to insert forms:`, formsError);
  // ❌ ISSUE: Continues anyway, project is orphaned!
}

// Insert metadata
console.log('  → Inserting metadata...');
const { error: metadataError } = await serviceRoleClient
  .from('project_metadata')
  .insert({...});

if (metadataError) {
  console.error(`  ⚠️ Failed to insert metadata:`, metadataError);
  // ❌ ISSUE: Continues anyway, project has no metadata!
}

console.log(`  ✅ Project created successfully: ${insertedProject.id}`);
```

### AFTER (SINGLE ATOMIC TRANSACTION):
```typescript
// Prepare data for atomic insert
console.log('  → Creating project atomically...');

const projectData = {
  course_id: courseId,
  generation_run_id: generationRunId,
  company_profile_id: filteredCompany.id,
  company_name: filteredCompany.name,
  company_logo_url: null,
  status: 'ai_shell',
  title: cleanedProposal.title,
  description: cleanedProposal.description,
  tasks: cleanedProposal.tasks,
  deliverables: cleanedProposal.deliverables,
  tier: cleanedProposal.tier,
  sector: filteredCompany.sector,
  company_size: filteredCompany.size,
  company_needs: filteredCompany.inferred_needs || [],
  lo_alignment: cleanedProposal.lo_alignment,
  lo_score: scores.lo_score,
  feasibility_score: scores.feasibility_score,
  mutual_benefit_score: scores.mutual_benefit_score,
  final_score: scores.final_score,
  skills: cleanedProposal.skills || [],
  majors: cleanedProposal.majors || [],
  website: cleanedProposal.website || filteredCompany.website,
  faculty_feedback: issues.length > 0 ? `Validation issues: ${issues.join(', ')}` : null,
  needs_review: issues.length > 0,
  duration_weeks: course.weeks,
  team_size: 3,
  pricing_usd: pricingResult.budget
};

const formsData = {
  form1: forms.form1 || {},
  form2: forms.form2 || {},
  form3: forms.form3 || {},
  form4: forms.form4 || {},
  form5: forms.form5 || {},
  form6: forms.form6 || {},
  milestones: milestones
};

const metadataData = {
  market_alignment_score: marketAlignment,
  estimated_roi: {
    roi: roiCalculation.roi,
    studentValueScore: roiCalculation.studentValueScore,
    employerValueScore: roiCalculation.employerValueScore,
    universityValueScore: roiCalculation.universityValueScore
  },
  stakeholder_insights: roiCalculation.stakeholderInsights,
  lo_alignment_detail: loAlignmentDetail,
  pricing_breakdown: roiCalculation.pricingBreakdown,
  algorithm_version: 'v2.0',
  ai_model_version: 'gemini-2.0-flash-exp'
};

// ✅ Single atomic transaction - all 3 inserts succeed or all rollback
const { data: atomicResult, error: atomicError } = await serviceRoleClient
  .rpc('create_project_atomic', {
    p_project_data: projectData,
    p_forms_data: formsData,
    p_metadata_data: metadataData
  });

if (atomicError || !atomicResult || atomicResult.length === 0) {
  const errorMsg = atomicError?.message || atomicResult?.[0]?.error_message || 'Unknown error';
  console.error(`  ❌ Atomic project creation failed:`, errorMsg);
  generationErrors.push({
    company: company.name,
    error: `Atomic insert failed: ${errorMsg}`
  });
  continue; // Skip to next company - NO orphaned project created
}

const insertedProjectId = atomicResult[0].project_id;

if (!atomicResult[0].success || !insertedProjectId) {
  console.error(`  ❌ Atomic creation unsuccessful:`, atomicResult[0].error_message);
  generationErrors.push({
    company: company.name,
    error: atomicResult[0].error_message
  });
  continue;
}

projectIds.push(insertedProjectId);
console.log(`  ✅ Project created atomically: ${insertedProjectId}`);
```

## Benefits of Atomic Transaction

### Before:
- 3 separate database calls
- If forms insert fails → orphaned project with no forms
- If metadata insert fails → orphaned project with no metadata
- No way to rollback partial inserts
- Database inconsistency possible

### After:
- 1 atomic RPC call
- All 3 inserts in single transaction
- If ANY insert fails → entire transaction rolls back
- No orphaned projects possible
- Database always consistent
- Single point of error handling

## Testing the Fix

### 1. Test Orphan Detection (Before Fix):
```sql
-- Run in Supabase SQL Editor
SELECT * FROM find_orphaned_projects();
```

Expected: Shows any existing orphaned projects

### 2. Clean Up Existing Orphans:
```sql
-- WARNING: This permanently deletes orphaned projects
-- Review the list first with find_orphaned_projects()
SELECT * FROM cleanup_orphaned_projects();
```

### 3. Test Atomic Creation (After Fix):
```typescript
// Trigger a project generation
// Intentionally cause metadata insert to fail by passing invalid data
// Verify that NO project record exists in database
```

Expected: If any insert fails, no project record should exist

### 4. Verify No Orphans After Fix:
```sql
-- Should return 0 rows after using atomic function
SELECT * FROM find_orphaned_projects();
```

## Deployment Steps

1. ✅ Run migration: `20251110000001_atomic_project_creation.sql`
2. ✅ Update `generate-projects/index.ts` with atomic RPC call
3. ✅ Deploy edge function
4. ✅ Test generation flow end-to-end
5. ✅ Monitor for orphaned projects: `SELECT * FROM find_orphaned_projects();`

## Monitoring Query

Add to admin dashboard or run periodically:

```sql
-- Check for any orphaned projects
SELECT
  COUNT(*) as orphan_count,
  ARRAY_AGG(title) as orphaned_projects
FROM (
  SELECT p.id, p.title
  FROM projects p
  LEFT JOIN project_forms pf ON p.id = pf.project_id
  LEFT JOIN project_metadata pm ON p.id = pm.project_id
  WHERE pf.project_id IS NULL OR pm.project_id IS NULL
) orphans;
```

Expected after fix: `orphan_count = 0`
