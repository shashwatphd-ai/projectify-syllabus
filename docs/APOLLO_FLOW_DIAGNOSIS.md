# Apollo Flow Diagnosis & Fix Plan

## Current Implementation Analysis

### ✅ What's Working

**discover-companies function** (Correctly Implemented):
1. Uses modular provider system
2. Apollo provider properly:
   - Generates AI-powered search filters from course outcomes
   - Searches Apollo.io organizations API
   - Enriches organizations with contact details (People API)
   - Fetches job postings for market intelligence
   - Calculates buying intent signals
   - Stores ALL data in `company_profiles` table
   - Links to `generation_run_id`

**Evidence from logs:**
```
✅ Discovery Complete:
   Discovered: 12
   Enriched: 4
   Time: 8.55s
   Provider: apollo
```

### ❌ What's Broken

**generate-projects function** (Incorrectly Implemented):
1. **IGNORES** Apollo-enriched companies in database
2. Runs its own Google Search fallback
3. Generates projects with placeholder contact data
4. Sets `company_profile_id: null` (breaking the foreign key relationship)

**Evidence from logs:**
```
✓ Discovered 4 companies via Google Search
```

**Evidence from network response:**
```json
{
  "company_name": "Cyderes",
  "company_profile_id": null,  // ❌ SHOULD link to Apollo-enriched profile
  "form2": {
    "contact_name": "TBD",     // ❌ Apollo has real contact
    "contact_email": "",        // ❌ Apollo has real email
    "contact_phone": ""         // ❌ Apollo has real phone
  }
}
```

## The Broken Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Discovery (Working ✓)                              │
├─────────────────────────────────────────────────────────────┤
│ discover-companies                                           │
│   ↓ Uses Apollo Provider                                    │
│   ↓ Finds 12 orgs, enriches 4                              │
│   ↓ Stores in company_profiles with generation_run_id      │
│   ✓ DATA IN DATABASE                                        │
└─────────────────────────────────────────────────────────────┘
                    ↓
                    ↓ (BREAK IN FLOW)
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Project Generation (Broken ✗)                      │
├─────────────────────────────────────────────────────────────┤
│ generate-projects                                            │
│   ✗ Does NOT query by generation_run_id                    │
│   ✗ Queries by location (doesn't match Apollo data)        │
│   ✗ Falls back to Google Search                            │
│   ✗ Generates projects without company links               │
│   ✗ Contact data = "TBD"                                    │
└─────────────────────────────────────────────────────────────┘
```

## The Correct Flow (How It Should Work)

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Discovery                                           │
├─────────────────────────────────────────────────────────────┤
│ 1. User uploads syllabus                                     │
│ 2. configure page: User clicks "Generate Projects"          │
│ 3. Frontend calls TWO functions sequentially:                │
│    a) POST /discover-companies                              │
│    b) POST /generate-projects                               │
│                                                              │
│ discover-companies:                                          │
│   → Creates generation_run record (status: in_progress)     │
│   → Runs Apollo provider discovery                          │
│   → Stores enriched companies with generation_run_id        │
│   → Returns: { generation_run_id, companies[] }            │
└─────────────────────────────────────────────────────────────┘
                    ↓
                    ↓ generation_run_id
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Project Generation (SHOULD USE Apollo data)        │
├─────────────────────────────────────────────────────────────┤
│ generate-projects:                                           │
│   ✓ Receives generation_run_id from discover-companies     │
│   ✓ Queries: company_profiles WHERE generation_run_id = X  │
│   ✓ Uses Apollo contact data (email, phone, name, title)   │
│   ✓ Uses Apollo market intelligence (job postings, tech)    │
│   ✓ Links project to company via company_profile_id        │
│   ✓ No placeholders - all real data                        │
└─────────────────────────────────────────────────────────────┘
```

## Required Fix

### File: `supabase/functions/generate-projects/index.ts`

**CHANGE 1: Accept generation_run_id parameter**
```typescript
// Line ~38
const { courseId, industries = [], companies = [], numTeams, generation_run_id } = await req.json();
```

**CHANGE 2: Query Apollo-enriched companies by generation_run_id**
```typescript
async function getCompaniesFromGenerationRun(
  supabaseClient: any,
  generationRunId: string | null,
  courseId: string,
  cityZip: string,
  industries: string[],
  count: number,
  outcomes: string[],
  level: string
): Promise<CompanyInfo[]> {
  
  // PRIORITY 1: Use Apollo-enriched companies from generation run
  if (generationRunId) {
    console.log(`📊 Fetching Apollo-enriched companies from generation run: ${generationRunId}`);
    
    const { data, error } = await supabaseClient
      .from('company_profiles')
      .select('*')
      .eq('generation_run_id', generationRunId)
      .order('data_completeness_score', { ascending: false })
      .limit(count);
    
    if (!error && data && data.length > 0) {
      console.log(`✓ Found ${data.length} Apollo-enriched companies`);
      return data.map(company => ({
        id: company.id,
        name: company.name,
        sector: company.sector,
        size: company.size,
        needs: company.inferred_needs || [],
        description: company.recent_news || 'No description',
        website: company.website,
        
        // CRITICAL: Include Apollo contact data
        contact_email: company.contact_email,
        contact_phone: company.contact_phone,
        contact_person: company.contact_person,
        contact_title: company.contact_title,
        full_address: company.full_address,
        linkedin_profile: company.organization_linkedin_url,
        
        // CRITICAL: Include market intelligence
        job_postings: company.job_postings,
        technologies_used: company.technologies_used,
        funding_stage: company.funding_stage
      }));
    }
  }
  
  // FALLBACK: Use existing logic if no generation_run_id
  return getCompaniesFromDB(supabaseClient, cityZip, industries, count, outcomes, level, courseId);
}
```

**CHANGE 3: Link projects to company_profiles**
```typescript
// In project insertion (around line 1500+)
const { data: project, error: projectError } = await supabaseClient
  .from('projects')
  .insert({
    course_id: courseId,
    generation_run_id: generationRunId, // ✓ Link to generation run
    company_profile_id: company.id,     // ✓ Link to Apollo profile
    // ... rest of fields
  })
```

**CHANGE 4: Use Apollo contact data in form2**
```typescript
form2: {
  company: company.name,
  website: company.website || 'http://example.com',
  sector: company.sector,
  description: companyDescription,
  
  // ✓ Use REAL Apollo contact data (not "TBD")
  contact_name: company.contact_person || 'TBD',
  contact_email: company.contact_email || '',
  contact_phone: company.contact_phone || '',
  contact_title: company.contact_title || '',
  preferred_communication: company.contact_email ? 'Email' : 'TBD'
}
```

## Testing the Fix

### Before Fix (Current State):
```json
{
  "company_name": "Cyderes",
  "company_profile_id": null,
  "form2": {
    "contact_name": "TBD",
    "contact_email": "",
    "contact_phone": ""
  }
}
```

### After Fix (Expected):
```json
{
  "company_name": "Cyderes", 
  "company_profile_id": "abc-123-def",
  "form2": {
    "contact_name": "John Smith",
    "contact_email": "john.smith@cyderes.com",
    "contact_phone": "+1-555-123-4567",
    "contact_title": "VP of Partnerships"
  }
}
```

## Verification Steps

1. ✓ Check `discover-companies` logs show Apollo enrichment
2. ✓ Verify `company_profiles` table has enriched data
3. ✓ Confirm `generation_run_id` is passed to `generate-projects`
4. ✓ Verify projects link to `company_profiles` via foreign key
5. ✓ Confirm contact data flows through to project forms
6. ✓ Check no "TBD" placeholders in generated projects
