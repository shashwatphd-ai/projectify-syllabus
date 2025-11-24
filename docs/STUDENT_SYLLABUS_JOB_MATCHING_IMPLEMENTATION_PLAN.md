# Student Syllabus Upload & Location-Based Job Matching
## Implementation Plan

**Version:** 1.0  
**Date:** 2025-11-24  
**Status:** Planning Phase

---

## 🎯 Feature Overview

Enable students to upload completed course syllabi to:
1. Extract verified skills/competencies from coursework
2. Build a competency profile automatically
3. Match students to local internships/entry-level positions
4. Display opportunities on their personalized dashboard

This creates a **parallel pathway** to the existing faculty project generation flow.

---

## 📊 System Architecture

### Current Faculty Flow (Existing)
```
Syllabus Upload → Parse → Company Discovery → Project Generation → Faculty Review
```

### New Student Flow (To Build)
```
Syllabus Upload(s) → Skill Extraction → Location Detection → Job Search (Apollo) → Match Display
```

### Key Differences
- **Faculty:** Generate projects for teaching → match companies to learning outcomes
- **Students:** Extract completed skills → match to real job postings in local market

---

## 🗄️ Database Schema Analysis

### Tables We'll Use (No New Tables Needed!)

#### 1. `verified_competencies` (Existing)
Stores student skills extracted from syllabi.

**Current Schema:**
```sql
- id (uuid)
- student_id (uuid) -- Links to auth user
- skill_name (text) -- e.g., "Python", "Data Analysis"
- verification_source (text) -- We'll use "syllabus_upload"
- project_id (uuid, nullable) -- Can be NULL for syllabus-based skills
- portfolio_evidence_url (text, nullable)
- employer_rating (int, nullable)
- created_at (timestamp)
```

**Usage:**
- Store each extracted skill as a separate row
- Set `verification_source = 'syllabus_upload'`
- Link to student via `student_id`

#### 2. `job_matches` (Existing)
Stores matched job postings for students.

**Current Schema:**
```sql
- id (uuid)
- student_id (uuid)
- apollo_job_id (text) -- Unique job identifier from Apollo
- apollo_job_title (text)
- apollo_job_url (text)
- apollo_company_name (text)
- apollo_job_payload (jsonb) -- Full job data
- competency_id (uuid, nullable) -- Link to specific skill
- status (text) -- 'pending_notification', 'notified', 'viewed', 'applied'
- created_at (timestamp)
```

**Usage:**
- Insert matched jobs from Apollo API
- Link to student and optionally to specific competency that matched

#### 3. `course_profiles` (Existing)
Currently used by faculty. We'll create student syllabus records here too.

**Proposed Usage:**
- Store uploaded syllabi for students
- Reuse existing `parse-syllabus` logic
- Differentiate via `owner_id` (students vs faculty)

#### 4. `profiles` (Existing)
Basic user profile table.

**Potential Enhancement:**
```sql
ALTER TABLE profiles ADD COLUMN preferred_search_radius_miles INT DEFAULT 50;
ALTER TABLE profiles ADD COLUMN preferred_job_types TEXT[] DEFAULT ARRAY['internship', 'entry_level'];
```

---

## 🔧 Backend Implementation

### Phase 1: Core Edge Functions

#### A. `student-syllabus-processor` (NEW)
**Purpose:** Process uploaded syllabi for students, extract skills, trigger job matching.

**Location:** `supabase/functions/student-syllabus-processor/index.ts`

**Input:**
```typescript
{
  student_id: string;
  syllabus_file: File; // PDF upload
  location: {
    city: string;
    state: string;
    zip: string;
    formatted: string;
  };
  search_radius_miles?: number; // Default: 50
}
```

**Process Flow:**
```
1. Authenticate student
2. Upload PDF to Supabase Storage (reuse existing bucket)
3. Call parse-syllabus logic to extract:
   - Course title
   - Learning outcomes
   - Skills/technologies covered
4. Store in course_profiles with student as owner
5. Extract skills → create verified_competencies entries
6. Trigger student-job-matcher with location filter
7. Return summary to frontend
```

**Key Code Structure:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  // 1. Auth check (student role)
  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(/* ... */);
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  
  // 2. Parse multipart form data
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const locationData = JSON.parse(formData.get('location') as string);
  
  // 3. Upload to storage
  const filePath = `syllabi/${user.id}/${Date.now()}_${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('syllabi')
    .upload(filePath, file);
  
  // 4. Extract text from PDF (reuse parse-syllabus logic)
  const pdfBuffer = await file.arrayBuffer();
  const pdfText = await extractTextFromPDF(pdfBuffer);
  
  // 5. Extract skills using AI
  const extractedSkills = await extractSkillsWithAI(pdfText);
  
  // 6. Store skills in verified_competencies
  for (const skill of extractedSkills) {
    await supabase.from('verified_competencies').insert({
      student_id: user.id,
      skill_name: skill.name,
      verification_source: 'syllabus_upload',
      portfolio_evidence_url: filePath
    });
  }
  
  // 7. Trigger job matching
  await supabase.functions.invoke('student-job-matcher', {
    body: {
      student_id: user.id,
      skills: extractedSkills.map(s => s.name),
      location: locationData,
      search_radius_miles: 50
    }
  });
  
  return new Response(JSON.stringify({ success: true, skills_extracted: extractedSkills.length }));
});
```

**Dependencies:**
- `pdfjs-serverless` (already in project)
- Lovable AI API for skill extraction (already configured)

---

#### B. `student-job-matcher` (NEW)
**Purpose:** Search Apollo for location-based jobs matching student skills.

**Location:** `supabase/functions/student-job-matcher/index.ts`

**Input:**
```typescript
{
  student_id: string;
  skills: string[]; // e.g., ["Python", "SQL", "React"]
  location: {
    city: string;
    state: string;
    zip: string;
  };
  search_radius_miles: number; // Default: 50
}
```

**Apollo API Integration:**
**Endpoint:** `POST https://api.apollo.io/v1/job_postings/search`

**Request Body:**
```json
{
  "api_key": "APOLLO_API_KEY",
  "q_keywords": "Python OR SQL OR React", // Skills as OR query
  "page": 1,
  "per_page": 25,
  "job_posting_location": {
    "city": "Kansas City",
    "state": "MO",
    "radius_miles": 50
  },
  "employment_type": ["internship", "full_time"],
  "seniority": ["entry", "intern"]
}
```

**Process Flow:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { student_id, skills, location, search_radius_miles } = await req.json();
  
  // 1. Build skills query (OR logic)
  const skillsQuery = skills.join(' OR ');
  
  // 2. Call Apollo job search API
  const apolloResponse = await fetch('https://api.apollo.io/v1/job_postings/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': Deno.env.get('APOLLO_API_KEY')
    },
    body: JSON.stringify({
      q_keywords: skillsQuery,
      job_posting_location: {
        city: location.city,
        state: location.state,
        radius_miles: search_radius_miles
      },
      employment_type: ['internship', 'full_time'],
      seniority: ['entry', 'intern'],
      per_page: 25
    })
  });
  
  const { job_postings } = await apolloResponse.json();
  
  // 3. Filter and score jobs by skill match
  const scoredJobs = job_postings.map(job => {
    const matchedSkills = skills.filter(skill => 
      job.title.toLowerCase().includes(skill.toLowerCase()) ||
      job.description?.toLowerCase().includes(skill.toLowerCase())
    );
    return { ...job, match_score: matchedSkills.length, matched_skills: matchedSkills };
  }).filter(job => job.match_score > 0);
  
  // 4. Sort by match score (best matches first)
  scoredJobs.sort((a, b) => b.match_score - a.match_score);
  
  // 5. Store in job_matches table (deduplicate by apollo_job_id)
  const supabase = createClient(/* ... */);
  
  for (const job of scoredJobs.slice(0, 10)) { // Top 10 matches
    const { error } = await supabase.from('job_matches').upsert({
      student_id,
      apollo_job_id: job.id,
      apollo_job_title: job.title,
      apollo_job_url: job.url,
      apollo_company_name: job.organization_name,
      apollo_job_payload: job,
      status: 'pending_notification'
    }, {
      onConflict: 'student_id,apollo_job_id' // Prevent duplicates
    });
  }
  
  return new Response(JSON.stringify({ 
    jobs_found: scoredJobs.length, 
    jobs_stored: Math.min(10, scoredJobs.length) 
  }));
});
```

**Note:** We need to add a unique constraint to `job_matches`:
```sql
ALTER TABLE job_matches ADD CONSTRAINT unique_student_job 
  UNIQUE (student_id, apollo_job_id);
```

---

### Phase 2: Modify Existing Functions

#### C. Enhance `job-matcher` (MODIFY)
**Current:** Triggered after project completion, matches student to company's Apollo jobs.
**Enhancement:** Add location filtering capability.

**Changes Needed:**
```typescript
// In supabase/functions/job-matcher/index.ts

interface JobMatchRequest {
  student_id: string;
  skills: string[];
  competency_ids?: string[];
  project_id?: string;
  location?: { // NEW
    city: string;
    state: string;
    zip: string;
    radius_miles?: number;
  };
}

// Then in Apollo API call section:
const jobSearchParams: any = {
  organization_id: apolloOrgId,
  q_keywords: skillsQuery,
  per_page: 25
};

// Add location filter if provided
if (location) {
  jobSearchParams.job_posting_location = {
    city: location.city,
    state: location.state,
    radius_miles: location.radius_miles || 50
  };
}

const apolloResponse = await fetch('https://api.apollo.io/v1/job_postings/search', {
  method: 'POST',
  body: JSON.stringify(jobSearchParams),
  // ... rest of config
});
```

---

## 🎨 Frontend Implementation

### Phase 3: New Components

#### D. `StudentSyllabusUpload` Component (NEW)
**Location:** `src/pages/StudentSyllabusUpload.tsx`

**Purpose:** Upload interface for students to submit completed syllabi.

**Features:**
- Multi-file upload (drag-and-drop)
- Automatic location detection (reuse existing `detect-location`)
- Manual location override
- Upload progress tracking
- Success state with skill preview

**Component Structure:**
```tsx
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, MapPin, CheckCircle } from 'lucide-react';

export default function StudentSyllabusUpload() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [location, setLocation] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);

  useEffect(() => {
    if (user?.email) {
      detectLocation();
    }
  }, [user]);

  const detectLocation = async () => {
    const { data, error } = await supabase.functions.invoke('detect-location', {
      body: { email: user.email }
    });
    if (data?.location) {
      setLocation(data.location);
    }
  };

  const handleUpload = async () => {
    if (!files.length || !location) return;
    
    setUploading(true);
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('location', JSON.stringify(location));
      formData.append('search_radius_miles', '50');
      
      const { data, error } = await supabase.functions.invoke('student-syllabus-processor', {
        body: formData
      });
      
      if (error) {
        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      } else {
        setExtractedSkills(prev => [...prev, ...data.skills]);
      }
    }
    
    setUploading(false);
    toast({ 
      title: 'Syllabi processed!', 
      description: `Found ${extractedSkills.length} skills. Searching for job matches...` 
    });
    
    // Redirect to opportunities page after 2 seconds
    setTimeout(() => navigate('/my-opportunities'), 2000);
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload Completed Course Syllabi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Location Display */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Searching within 50 miles of {location?.formatted || 'your location'}</span>
          </div>
          
          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <Input 
              type="file" 
              multiple 
              accept=".pdf"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="max-w-md mx-auto"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Upload PDF syllabi from courses you've completed
            </p>
          </div>
          
          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Selected Files:</h3>
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{file.name}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Submit Button */}
          <Button 
            onClick={handleUpload} 
            disabled={!files.length || uploading}
            className="w-full"
          >
            {uploading ? 'Processing...' : `Upload ${files.length} Syllab${files.length === 1 ? 'us' : 'i'}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

#### E. Enhance `MyOpportunities` Component (MODIFY)
**Location:** `src/pages/MyOpportunities.tsx`

**Current State:** Displays job matches from completed projects.
**Enhancement:** Show jobs from both project completion AND syllabus uploads.

**Changes:**
```tsx
// Add filter/tab system
const [sourceFilter, setSourceFilter] = useState<'all' | 'project' | 'syllabus'>('all');

// Modify query to include competency_id check
const { data: jobMatches } = useQuery({
  queryKey: ['job-matches', user?.id, sourceFilter],
  queryFn: async () => {
    let query = supabase
      .from('job_matches')
      .select(`
        *,
        verified_competencies!left(
          skill_name,
          verification_source
        )
      `)
      .eq('student_id', user.id);
    
    if (sourceFilter === 'project') {
      query = query.not('competency_id', 'is', null);
    } else if (sourceFilter === 'syllabus') {
      query = query.is('competency_id', null); // Syllabus-based matches have no specific competency
    }
    
    const { data } = await query;
    return data;
  }
});

// Add tabs UI
<Tabs value={sourceFilter} onValueChange={setSourceFilter}>
  <TabsList>
    <TabsTrigger value="all">All Opportunities</TabsTrigger>
    <TabsTrigger value="project">From Projects</TabsTrigger>
    <TabsTrigger value="syllabus">From Syllabi</TabsTrigger>
  </TabsList>
</Tabs>
```

---

### Phase 4: Routing & Navigation

#### F. Update App Routing (MODIFY)
**Location:** `src/App.tsx`

**Add new route:**
```tsx
import StudentSyllabusUpload from "@/pages/StudentSyllabusUpload";

// In Routes component:
<Route path="/student-upload" element={<StudentSyllabusUpload />} />
```

#### G. Add Navigation Link (MODIFY)
**Location:** `src/components/Header.tsx`

**Add conditional link for students:**
```tsx
{userRole === 'student' && (
  <Link to="/student-upload" className="nav-link">
    Upload Syllabi
  </Link>
)}
```

---

## 📋 Step-by-Step Implementation Sequence

### Week 1: Backend Foundation
**Day 1-2: Database & Core Function**
- [ ] Add unique constraint to `job_matches` table
- [ ] Create `student-syllabus-processor` edge function
- [ ] Test PDF upload and skill extraction

**Day 3-4: Job Matching Logic**
- [ ] Create `student-job-matcher` edge function
- [ ] Test Apollo API integration with location filters
- [ ] Verify job storage in database

**Day 5: Testing & Refinement**
- [ ] End-to-end backend testing
- [ ] Error handling and logging
- [ ] Rate limiting checks

### Week 2: Frontend & Integration
**Day 1-2: Upload UI**
- [ ] Create `StudentSyllabusUpload` component
- [ ] Implement file upload with progress
- [ ] Add location detection/override

**Day 3-4: Opportunities Display**
- [ ] Enhance `MyOpportunities` with tabs
- [ ] Add source filtering (project vs syllabus)
- [ ] Improve job card display

**Day 5: Polish & Deploy**
- [ ] Add routing and navigation
- [ ] User testing with sample syllabi
- [ ] Bug fixes and UX improvements

---

## 🧪 Testing Strategy

### Backend Testing
1. **Skill Extraction Accuracy:**
   - Upload 5 diverse syllabi (CS, Business, Engineering, etc.)
   - Verify extracted skills match course content
   - Check for false positives/negatives

2. **Location-Based Job Search:**
   - Test various locations (urban, rural, different states)
   - Verify radius filtering works correctly
   - Check API rate limits

3. **Deduplication:**
   - Upload same syllabus twice
   - Verify no duplicate job matches created
   - Check unique constraint enforcement

### Frontend Testing
1. **Upload Flow:**
   - Test single and multiple file uploads
   - Verify error handling for invalid files
   - Check progress indicators

2. **Role-Based Access:**
   - Verify students can access upload page
   - Verify faculty cannot access upload page
   - Test navigation visibility

3. **Opportunities Display:**
   - Verify jobs from both sources display correctly
   - Test filtering/tabbing functionality
   - Check job card data accuracy

---

## 🚀 Rollout Plan

### Phase 1: Alpha (Internal Testing)
- Deploy to staging environment
- Test with 5-10 internal students
- Collect feedback on UX and accuracy

### Phase 2: Beta (Limited Pilot)
- Select 25-50 students from 1-2 universities
- Monitor Apollo API usage and costs
- Iterate based on feedback

### Phase 3: Production Launch
- Announce feature to all students
- Monitor performance and error rates
- Set up analytics tracking

---

## 💰 Cost Analysis

### Apollo API Credits
- **Job Search Endpoint:** 1 credit per search
- **Expected Usage:** ~10 searches per student per month
- **Estimated Monthly Cost:** $0.10/student (at scale)

### Storage Costs
- **Supabase Storage:** $0.021/GB/month
- **Average Syllabus:** 2MB
- **10,000 Students × 3 Syllabi:** ~60GB = $1.26/month

### Total Estimated Cost
- **Per Student:** ~$0.15/month
- **1,000 Students:** $150/month
- **10,000 Students:** $1,500/month

---

## 📊 Success Metrics

### Quantitative
- Number of syllabi uploaded
- Skills extracted per syllabus (avg)
- Job matches created per student
- Application conversion rate
- Time to first match (from upload)

### Qualitative
- Student satisfaction with matches
- Perceived relevance of opportunities
- Feature adoption rate

---

## 🔒 Security Considerations

1. **File Upload Validation:**
   - Enforce PDF-only uploads
   - Max file size: 10MB
   - Virus scanning (future enhancement)

2. **RLS Policies:**
   - Students can only see their own syllabi
   - Students can only see their own job matches
   - No cross-user data exposure

3. **API Key Security:**
   - Apollo API key stored in Supabase secrets
   - Never exposed to frontend
   - Rate limiting to prevent abuse

---

## 🛠️ Future Enhancements (Post-MVP)

1. **Skill Gap Analysis:**
   - Compare student skills to desired job requirements
   - Suggest courses to fill gaps

2. **Resume Generation:**
   - Auto-generate resume from syllabi and projects
   - Export as PDF

3. **Application Tracking:**
   - Track which jobs students apply to
   - Follow-up reminders

4. **Employer Notifications:**
   - Alert employers when qualified students are available
   - Match score transparency

5. **Advanced Matching:**
   - ML-based skill similarity (not just keyword matching)
   - Consider student preferences (remote, salary, etc.)

---

## 📞 Next Steps

**To begin implementation:**
1. Review and approve this plan
2. Answer configuration questions:
   - Default search radius: 25, 50, or 100 miles?
   - Max syllabi per student: 5, 10, unlimited?
   - Job types: Internships only or include entry-level?
3. Set up staging environment for testing
4. Begin Week 1 backend development

**Questions? Let's discuss before starting!**
