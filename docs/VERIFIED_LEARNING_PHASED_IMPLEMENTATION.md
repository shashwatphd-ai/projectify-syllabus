# Verified Learning Platform - Phased Implementation Plan

> **Document Version**: 1.0  
> **Last Updated**: 2025-01-22  
> **Status**: Ready for Implementation  
> **Branch Strategy**: `feature/verified-learning` (create after enabling Labs → GitHub Branch Switching)

---

## Executive Summary

This document provides a **granular, testable, modular implementation plan** for the Verified Learning Platform features. Each phase is designed to be:
- ✅ **Independently testable** before proceeding
- ✅ **Rollback-safe** if issues arise
- ✅ **Isolated from existing functionality** (project generation remains untouched)

---

## Pre-Implementation Checklist

### Step 0.1: Enable Branch Support
```
1. Go to Account Settings → Labs
2. Enable "GitHub Branch Switching"
3. Push current state to GitHub (if not already)
4. Create branch: feature/verified-learning
5. Switch to that branch in Lovable
```

### Step 0.2: Add Required Secret
```
Secret Name: YOUTUBE_API_KEY
Purpose: YouTube Data API v3 for content search
Get from: https://console.cloud.google.com/apis/credentials
```

### Step 0.3: Verify Existing Dependencies
| Dependency | Status | Notes |
|------------|--------|-------|
| `course_profiles` table | ✅ Exists | Will be referenced by new tables |
| `embedding-service.ts` | ✅ Exists | Uses 768-dim Gemini embeddings |
| `parse-syllabus` function | ✅ Exists | Will be extended, not modified |
| Lovable AI (Gemini) | ✅ Available | For question generation |

---

## Phase 1: Database Foundation (Days 1-2)

### Module 1.1: Course Enrollments Table
**Purpose**: Enable student-to-course relationship for the new flow

**Migration SQL**:
```sql
-- Migration: 001_course_enrollments.sql
-- Test: Can enroll students, RLS works correctly

CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.course_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enrollment_method TEXT NOT NULL DEFAULT 'manual',
  invite_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(course_id, student_id)
);

CREATE INDEX idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX idx_course_enrollments_student ON public.course_enrollments(student_id);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Faculty can view enrollments for their courses
CREATE POLICY "Faculty view course enrollments"
  ON public.course_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_profiles cp
      WHERE cp.id = course_id AND cp.owner_id = auth.uid()
    )
  );

-- Faculty can enroll students in their courses
CREATE POLICY "Faculty enroll students"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_profiles cp
      WHERE cp.id = course_id AND cp.owner_id = auth.uid()
    )
  );

-- Faculty can update enrollments
CREATE POLICY "Faculty update enrollments"
  ON public.course_enrollments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.course_profiles cp
      WHERE cp.id = course_id AND cp.owner_id = auth.uid()
    )
  );

-- Students can view their own enrollments
CREATE POLICY "Students view own enrollments"
  ON public.course_enrollments FOR SELECT
  USING (student_id = auth.uid());
```

**Test Criteria**:
```
□ Table created successfully
□ Faculty can insert enrollment for their course
□ Faculty cannot insert enrollment for other faculty's course
□ Student can view their own enrollments
□ Student cannot view other students' enrollments
□ Index performance verified
```

---

### Module 1.2: Learning Objectives Extended Table
**Purpose**: Store parsed LOs with embeddings for semantic matching

**Migration SQL**:
```sql
-- Migration: 002_learning_objective_extended.sql
-- Test: Can store LOs with embeddings, semantic search works

-- Enable pgvector extension (required for embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.learning_objective_extended (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.course_profiles(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  parsed_verb TEXT,
  parsed_subject TEXT,
  bloom_level TEXT,
  embedding VECTOR(768),
  content_keywords TEXT[],
  estimated_hours NUMERIC(4,1),
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loe_course ON public.learning_objective_extended(course_id);
CREATE INDEX idx_loe_bloom ON public.learning_objective_extended(bloom_level);
CREATE INDEX idx_loe_embedding ON public.learning_objective_extended 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.learning_objective_extended ENABLE ROW LEVEL SECURITY;

-- Faculty can manage LOs for their courses
CREATE POLICY "Faculty manage own course LOs"
  ON public.learning_objective_extended FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.course_profiles cp
      WHERE cp.id = course_id AND cp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_profiles cp
      WHERE cp.id = course_id AND cp.owner_id = auth.uid()
    )
  );

-- Enrolled students can view LOs
CREATE POLICY "Enrolled students view LOs"
  ON public.learning_objective_extended FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.course_id = learning_objective_extended.course_id
        AND ce.student_id = auth.uid()
        AND ce.status = 'active'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_loe_updated_at
  BEFORE UPDATE ON public.learning_objective_extended
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

**Test Criteria**:
```
□ pgvector extension enabled
□ Table created with VECTOR(768) column
□ Can insert LO with 768-dim embedding
□ Semantic similarity search works (cosine distance)
□ Faculty CRUD operations work
□ Enrolled student can SELECT
□ Non-enrolled student cannot SELECT
```

---

### Module 1.3: Content Sources Table
**Purpose**: Store curated YouTube/web content linked to LOs

**Migration SQL**:
```sql
-- Migration: 003_content_sources.sql
-- Test: Can store content, links to LOs correctly

CREATE TABLE public.content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lo_id UUID NOT NULL REFERENCES public.learning_objective_extended(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'article', 'document')),
  external_id TEXT,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  channel_name TEXT,
  view_count BIGINT,
  relevance_score NUMERIC(3,2),
  faculty_approved BOOLEAN NOT NULL DEFAULT false,
  faculty_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cs_lo ON public.content_sources(lo_id);
CREATE INDEX idx_cs_approved ON public.content_sources(faculty_approved);
CREATE INDEX idx_cs_type ON public.content_sources(source_type);

ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;

-- Faculty can manage content for their course LOs
CREATE POLICY "Faculty manage content"
  ON public.content_sources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_objective_extended loe
      JOIN public.course_profiles cp ON cp.id = loe.course_id
      WHERE loe.id = lo_id AND cp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_objective_extended loe
      JOIN public.course_profiles cp ON cp.id = loe.course_id
      WHERE loe.id = lo_id AND cp.owner_id = auth.uid()
    )
  );

-- Enrolled students can view approved content
CREATE POLICY "Students view approved content"
  ON public.content_sources FOR SELECT
  USING (
    faculty_approved = true
    AND EXISTS (
      SELECT 1 FROM public.learning_objective_extended loe
      JOIN public.course_enrollments ce ON ce.course_id = loe.course_id
      WHERE loe.id = lo_id 
        AND ce.student_id = auth.uid()
        AND ce.status = 'active'
    )
  );

CREATE TRIGGER update_cs_updated_at
  BEFORE UPDATE ON public.content_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

**Test Criteria**:
```
□ Table created with proper constraints
□ Faculty can CRUD content for their LOs
□ Faculty cannot modify content for other faculty's LOs
□ Student can only see approved content
□ Student cannot see unapproved content
□ Check constraint on source_type works
```

---

## Phase 1 Integration Test

**Run after all Module 1.x migrations**:
```sql
-- Test Script: phase1_integration_test.sql

-- 1. Create test course (as faculty user)
-- 2. Enroll test student
-- 3. Create LO with embedding
-- 4. Add content to LO
-- 5. Approve content
-- 6. Verify student can see approved content only
-- 7. Verify semantic search on embeddings
```

**Rollback Plan**:
```sql
-- If Phase 1 fails, rollback:
DROP TABLE IF EXISTS public.content_sources CASCADE;
DROP TABLE IF EXISTS public.learning_objective_extended CASCADE;
DROP TABLE IF EXISTS public.course_enrollments CASCADE;
DROP EXTENSION IF EXISTS vector;
```

---

## Phase 2: Core Edge Functions (Days 3-5)

### Module 2.1: Parse Learning Objectives Function
**File**: `supabase/functions/parse-learning-objectives/index.ts`

**Purpose**: Extract and enrich LOs from course syllabus

**Input/Output Contract**:
```typescript
// Request
interface ParseLORequest {
  course_id: string;
}

// Response
interface ParseLOResponse {
  success: boolean;
  learning_objectives: Array<{
    id: string;
    original_text: string;
    parsed_verb: string;
    parsed_subject: string;
    bloom_level: string;
    content_keywords: string[];
    estimated_hours: number;
    sequence_order: number;
  }>;
  error?: string;
}
```

**Implementation Steps**:
```
1. Fetch course_profiles.outcomes for course_id
2. Use Lovable AI (Gemini) to parse each LO:
   - Extract action verb
   - Extract subject/topic
   - Classify Bloom's level
   - Generate content keywords
   - Estimate learning hours
3. Generate 768-dim embedding using embedding-service.ts
4. Insert into learning_objective_extended
5. Return parsed LOs
```

**Test Criteria**:
```
□ Parses existing course outcomes correctly
□ Bloom's taxonomy classification accurate
□ Embeddings are 768 dimensions
□ Keywords generated are relevant
□ Handles empty outcomes gracefully
□ Handles malformed outcomes gracefully
```

---

### Module 2.2: Search YouTube Content Function
**File**: `supabase/functions/search-youtube-content/index.ts`

**Purpose**: Find relevant YouTube videos for each LO

**Dependencies**: 
- YOUTUBE_API_KEY secret

**Input/Output Contract**:
```typescript
// Request
interface SearchYouTubeRequest {
  lo_id: string;
  max_results?: number; // default 5
}

// Response
interface SearchYouTubeResponse {
  success: boolean;
  videos: Array<{
    external_id: string;
    url: string;
    title: string;
    description: string;
    thumbnail_url: string;
    duration_seconds: number;
    channel_name: string;
    view_count: number;
    relevance_score: number;
  }>;
  error?: string;
}
```

**Implementation Steps**:
```
1. Fetch LO details (keywords, subject)
2. Build YouTube API search query
3. Call YouTube Data API v3 /search endpoint
4. For each result, get video details (duration, views)
5. Calculate relevance score using:
   - Keyword match density
   - Video quality signals (views, likes ratio)
   - Duration appropriateness
6. Insert into content_sources (faculty_approved = false)
7. Return video list
```

**Test Criteria**:
```
□ API key is correctly retrieved from secrets
□ Search returns relevant videos
□ Duration is correctly parsed (ISO 8601)
□ Relevance scoring is consistent
□ Rate limiting handled (quota: 10,000 units/day)
□ Error handling for invalid LO
```

---

### Module 2.3: Curate Content Batch Function
**File**: `supabase/functions/curate-content-batch/index.ts`

**Purpose**: Orchestrate content curation for entire course

**Input/Output Contract**:
```typescript
// Request
interface CurateBatchRequest {
  course_id: string;
  videos_per_lo?: number; // default 5
}

// Response
interface CurateBatchResponse {
  success: boolean;
  summary: {
    total_los: number;
    los_processed: number;
    videos_found: number;
    errors: string[];
  };
}
```

**Implementation Steps**:
```
1. Call parse-learning-objectives for course
2. For each LO (sequentially to respect rate limits):
   - Call search-youtube-content
   - Wait 100ms between calls (rate limiting)
3. Return summary with statistics
```

**Test Criteria**:
```
□ Orchestrates parse and search correctly
□ Handles partial failures gracefully
□ Respects YouTube API rate limits
□ Returns accurate summary statistics
□ Can be resumed if interrupted
```

---

## Phase 2 Integration Test

**Test Flow**:
```
1. Create test course with 3 LOs in outcomes
2. Call curate-content-batch
3. Verify:
   - 3 LOs created in learning_objective_extended
   - Each has embedding (768 dims)
   - Each has 5 content_sources entries
   - All content_sources have faculty_approved = false
4. Faculty approves 2 videos per LO
5. Verify student sees only approved content
```

**Rollback Plan**:
```
1. Delete edge function files
2. Data can remain (no schema changes in Phase 2)
```

---

## Phase 3: Consumption Tracking (Days 6-8)

### Module 3.1: Consumption Records Table
**Migration SQL**:
```sql
-- Migration: 004_consumption_records.sql

CREATE TABLE public.consumption_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  content_source_id UUID NOT NULL REFERENCES public.content_sources(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_watch_seconds INTEGER NOT NULL DEFAULT 0,
  completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  engagement_score NUMERIC(3,2),
  pause_count INTEGER DEFAULT 0,
  seek_count INTEGER DEFAULT 0,
  playback_speed NUMERIC(3,2) DEFAULT 1.0,
  device_type TEXT,
  UNIQUE(student_id, content_source_id)
);

CREATE INDEX idx_cr_student ON public.consumption_records(student_id);
CREATE INDEX idx_cr_content ON public.consumption_records(content_source_id);
CREATE INDEX idx_cr_completed ON public.consumption_records(completed_at) WHERE completed_at IS NOT NULL;

ALTER TABLE public.consumption_records ENABLE ROW LEVEL SECURITY;

-- Students can manage their own consumption records
CREATE POLICY "Students manage own consumption"
  ON public.consumption_records FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Faculty can view consumption for their course content
CREATE POLICY "Faculty view course consumption"
  ON public.consumption_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content_sources cs
      JOIN public.learning_objective_extended loe ON loe.id = cs.lo_id
      JOIN public.course_profiles cp ON cp.id = loe.course_id
      WHERE cs.id = content_source_id AND cp.owner_id = auth.uid()
    )
  );
```

**Test Criteria**:
```
□ Student can create/update own records
□ Student cannot see other students' records
□ Faculty can view all consumption for their courses
□ Unique constraint prevents duplicates
□ Indexes improve query performance
```

---

### Module 3.2: Track Consumption Event Function
**File**: `supabase/functions/track-consumption-event/index.ts`

**Purpose**: Record and validate video watching events

**Input/Output Contract**:
```typescript
// Request
interface TrackEventRequest {
  content_source_id: string;
  event_type: 'start' | 'heartbeat' | 'pause' | 'seek' | 'complete';
  current_position_seconds: number;
  playback_speed?: number;
  device_type?: string;
}

// Response
interface TrackEventResponse {
  success: boolean;
  record: {
    id: string;
    total_watch_seconds: number;
    completion_percentage: number;
    engagement_score: number;
  };
  error?: string;
}
```

**Engagement Score Algorithm**:
```
engagement_score = 
  (completion_percentage * 0.4) +
  (watch_continuity * 0.3) +      // penalize excessive seeking
  (speed_normalized * 0.2) +       // penalize 2x+ speed
  (session_consistency * 0.1)      // reward regular heartbeats
```

**Test Criteria**:
```
□ Start event creates new record
□ Heartbeat updates watch time correctly
□ Seek events increment seek_count
□ Complete event sets completed_at
□ Engagement score calculated correctly
□ Prevents time manipulation (server-side validation)
```

---

### Module 3.3: Micro-Checks Table
**Migration SQL**:
```sql
-- Migration: 005_micro_checks.sql

CREATE TABLE public.micro_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_source_id UUID NOT NULL REFERENCES public.content_sources(id) ON DELETE CASCADE,
  trigger_at_percentage NUMERIC(5,2) NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mc_content ON public.micro_checks(content_source_id);
CREATE INDEX idx_mc_trigger ON public.micro_checks(trigger_at_percentage);

ALTER TABLE public.micro_checks ENABLE ROW LEVEL SECURITY;

-- Faculty can manage micro-checks for their content
CREATE POLICY "Faculty manage micro-checks"
  ON public.micro_checks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.content_sources cs
      JOIN public.learning_objective_extended loe ON loe.id = cs.lo_id
      JOIN public.course_profiles cp ON cp.id = loe.course_id
      WHERE cs.id = content_source_id AND cp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.content_sources cs
      JOIN public.learning_objective_extended loe ON loe.id = cs.lo_id
      JOIN public.course_profiles cp ON cp.id = loe.course_id
      WHERE cs.id = content_source_id AND cp.owner_id = auth.uid()
    )
  );

-- Enrolled students can view micro-checks
CREATE POLICY "Students view micro-checks"
  ON public.micro_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content_sources cs
      JOIN public.learning_objective_extended loe ON loe.id = cs.lo_id
      JOIN public.course_enrollments ce ON ce.course_id = loe.course_id
      WHERE cs.id = content_source_id 
        AND ce.student_id = auth.uid()
        AND ce.status = 'active'
    )
  );
```

---

### Module 3.4: Generate Micro-Checks Function
**File**: `supabase/functions/generate-micro-checks/index.ts`

**Purpose**: Auto-generate comprehension questions for videos

**Input/Output Contract**:
```typescript
// Request
interface GenerateMicroChecksRequest {
  content_source_id: string;
  num_questions?: number; // default 3
}

// Response
interface GenerateMicroChecksResponse {
  success: boolean;
  questions: Array<{
    id: string;
    trigger_at_percentage: number;
    question_text: string;
    question_type: string;
    options?: string[];
    correct_answer: string;
  }>;
  error?: string;
}
```

**Implementation Steps**:
```
1. Fetch content source (title, description)
2. Fetch linked LO (original_text, bloom_level)
3. Call Lovable AI (Gemini) with prompt:
   "Generate {num_questions} comprehension questions for this video:
    Video: {title} - {description}
    Learning Objective: {original_text}
    Bloom Level: {bloom_level}
    
    For each question provide:
    - Question text
    - Type (multiple_choice preferred)
    - 4 options (if multiple choice)
    - Correct answer
    - Brief explanation"
4. Parse AI response
5. Calculate trigger percentages (evenly distributed)
6. Insert into micro_checks
```

**Test Criteria**:
```
□ Generates relevant questions
□ Questions match video content
□ Trigger percentages are distributed correctly
□ Multiple choice options are distinct
□ Explanations are helpful
□ Handles AI errors gracefully
```

---

## Phase 3 Integration Test

**Test Flow**:
```
1. Student starts watching approved video
2. Verify consumption record created
3. Simulate 30% watched (heartbeats)
4. Micro-check triggered at 33%
5. Student answers correctly
6. Continue to 100%
7. Verify:
   - completion_percentage = 100
   - engagement_score calculated
   - completed_at set
```

---

## Phase 4: Assessment System (Days 9-12)

### Module 4.1: Question Banks Table
**Migration SQL**:
```sql
-- Migration: 006_question_banks.sql

CREATE TABLE public.question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lo_id UUID NOT NULL REFERENCES public.learning_objective_extended(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
  options JSONB,
  correct_answer TEXT,
  rubric JSONB,
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  bloom_level TEXT,
  time_limit_seconds INTEGER,
  points INTEGER NOT NULL DEFAULT 1,
  ai_generated BOOLEAN NOT NULL DEFAULT true,
  faculty_reviewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_lo ON public.question_banks(lo_id);
CREATE INDEX idx_qb_difficulty ON public.question_banks(difficulty_level);
CREATE INDEX idx_qb_reviewed ON public.question_banks(faculty_reviewed);

ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;

-- Faculty can manage question banks for their LOs
CREATE POLICY "Faculty manage question banks"
  ON public.question_banks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_objective_extended loe
      JOIN public.course_profiles cp ON cp.id = loe.course_id
      WHERE loe.id = lo_id AND cp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_objective_extended loe
      JOIN public.course_profiles cp ON cp.id = loe.course_id
      WHERE loe.id = lo_id AND cp.owner_id = auth.uid()
    )
  );
```

---

### Module 4.2: Assessment Sessions Table
**Migration SQL**:
```sql
-- Migration: 007_assessment_sessions.sql

CREATE TABLE public.assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  lo_id UUID NOT NULL REFERENCES public.learning_objective_extended(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  time_limit_seconds INTEGER,
  questions_presented JSONB NOT NULL,
  answers_submitted JSONB,
  score NUMERIC(5,2),
  passed BOOLEAN,
  proctoring_flags JSONB,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  browser_fingerprint TEXT,
  ip_address INET
);

CREATE INDEX idx_as_student ON public.assessment_sessions(student_id);
CREATE INDEX idx_as_lo ON public.assessment_sessions(lo_id);
CREATE INDEX idx_as_passed ON public.assessment_sessions(passed);

ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;

-- Students can manage their own sessions
CREATE POLICY "Students manage own sessions"
  ON public.assessment_sessions FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Faculty can view sessions for their courses
CREATE POLICY "Faculty view course sessions"
  ON public.assessment_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_objective_extended loe
      JOIN public.course_profiles cp ON cp.id = loe.course_id
      WHERE loe.id = lo_id AND cp.owner_id = auth.uid()
    )
  );
```

---

### Module 4.3: Student LO Progress Table
**Migration SQL**:
```sql
-- Migration: 008_student_lo_progress.sql

CREATE TABLE public.student_lo_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  lo_id UUID NOT NULL REFERENCES public.learning_objective_extended(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' 
    CHECK (status IN ('not_started', 'content_in_progress', 'content_complete', 'assessment_ready', 'assessment_in_progress', 'verified', 'needs_review')),
  content_completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  assessment_score NUMERIC(5,2),
  assessment_attempts INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  verification_method TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, lo_id)
);

CREATE INDEX idx_slp_student ON public.student_lo_progress(student_id);
CREATE INDEX idx_slp_lo ON public.student_lo_progress(lo_id);
CREATE INDEX idx_slp_status ON public.student_lo_progress(status);

ALTER TABLE public.student_lo_progress ENABLE ROW LEVEL SECURITY;

-- Students can view/update their own progress
CREATE POLICY "Students manage own progress"
  ON public.student_lo_progress FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Faculty can view progress for their courses
CREATE POLICY "Faculty view course progress"
  ON public.student_lo_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_objective_extended loe
      JOIN public.course_profiles cp ON cp.id = loe.course_id
      WHERE loe.id = lo_id AND cp.owner_id = auth.uid()
    )
  );

CREATE TRIGGER update_slp_updated_at
  BEFORE UPDATE ON public.student_lo_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

---

### Module 4.4: Generate Assessment Questions Function
**File**: `supabase/functions/generate-assessment-questions/index.ts`

**Purpose**: Create AI-resistant, LO-aligned assessment questions

**Implementation**: Uses Lovable AI (Gemini) with sophisticated prompts to generate unique questions each time

---

### Module 4.5: Start Assessment Session Function
**File**: `supabase/functions/start-assessment-session/index.ts`

**Purpose**: Initialize timed assessment with randomly selected questions

---

### Module 4.6: Grade Assessment Function
**File**: `supabase/functions/grade-assessment/index.ts`

**Purpose**: Evaluate answers, calculate score, update progress

---

## Phase 4 Integration Test

**Test Flow**:
```
1. Student completes all content for LO (Phase 3)
2. Status changes to 'assessment_ready'
3. Student starts assessment
4. 5 questions presented (randomized from bank)
5. Timer running (10 min)
6. Student submits answers
7. Verify:
   - Score calculated correctly
   - passed = true if score >= 80%
   - Status updates to 'verified' if passed
   - verified_at timestamp set
```

---

## Phase 5: Frontend Implementation (Days 13-18)

### Module 5.1: Content Curation Page (Faculty)
**File**: `src/pages/ContentCuration.tsx`

**Components**:
```
ContentCurationPage
├── CourseSelector (dropdown of owned courses)
├── LOParsingPanel
│   ├── ParseButton
│   └── LOList (parsed objectives)
├── ContentSearchPanel
│   ├── SearchAllButton
│   └── LOContentCards
│       ├── VideoThumbnail
│       ├── RelevanceScore
│       └── ApproveButton
└── MicroCheckEditor
    ├── QuestionList
    ├── GenerateButton
    └── EditQuestionModal
```

**Test Criteria**:
```
□ Course selector shows only owned courses
□ Parse button triggers edge function
□ LOs display with Bloom level badges
□ Video search returns results
□ Approve/reject toggles work
□ Micro-check editor saves correctly
```

---

### Module 5.2: Learning Portal Page (Student)
**File**: `src/pages/LearningPortal.tsx`

**Components**:
```
LearningPortalPage
├── CourseSelector (enrolled courses)
├── LOProgressList
│   ├── LOProgressCard
│   │   ├── ProgressBar
│   │   ├── StatusBadge
│   │   └── StartButton
└── ContentViewerModal
    ├── YouTubeEmbed (with tracking)
    ├── MicroCheckPopup
    └── CompletionConfirmation
```

**Test Criteria**:
```
□ Only enrolled courses shown
□ Progress accurately reflects database
□ Video tracking works (heartbeats sent)
□ Micro-checks trigger at correct percentages
□ Completion updates progress
```

---

### Module 5.3: Assessment View (Student)
**File**: `src/pages/AssessmentView.tsx`

**Components**:
```
AssessmentViewPage
├── AssessmentIntro
│   ├── LOInfo
│   ├── TimeLimit
│   └── StartButton
├── QuestionPresenter
│   ├── Timer
│   ├── QuestionCard
│   │   ├── QuestionText
│   │   ├── AnswerOptions
│   │   └── ConfidenceSlider
│   └── NavigationButtons
└── ResultsPanel
    ├── ScoreDisplay
    ├── PassFailBadge
    └── RetryButton (if failed)
```

**Test Criteria**:
```
□ Timer counts down correctly
□ Tab switch detection works
□ Answers save on navigation
□ Submission works at timeout
□ Results display immediately
□ Retry allowed if failed
```

---

### Module 5.4: Faculty Analytics Dashboard
**File**: `src/pages/VerifiedLearningAnalytics.tsx`

**Components**:
```
AnalyticsDashboardPage
├── CourseSelector
├── OverviewCards
│   ├── TotalStudents
│   ├── AverageProgress
│   ├── VerificationRate
│   └── EngagementScore
├── LOBreakdownTable
│   ├── LOTitle
│   ├── CompletionRate
│   ├── AvgAssessmentScore
│   └── VerifiedCount
└── StudentProgressList
    ├── StudentRow
    │   ├── Name
    │   ├── OverallProgress
    │   └── DetailButton
    └── StudentDetailModal
```

---

### Module 5.5: Route Integration
**File**: `src/App.tsx` (additions only)

```typescript
// Add these routes
<Route path="/content-curation" element={<ProtectedRoute allowedRoles={['faculty']}><ContentCurationPage /></ProtectedRoute>} />
<Route path="/learning-portal" element={<ProtectedRoute allowedRoles={['student']}><LearningPortalPage /></ProtectedRoute>} />
<Route path="/assessment/:loId" element={<ProtectedRoute allowedRoles={['student']}><AssessmentViewPage /></ProtectedRoute>} />
<Route path="/verified-learning-analytics" element={<ProtectedRoute allowedRoles={['faculty']}><VerifiedLearningAnalyticsPage /></ProtectedRoute>} />
<Route path="/course-enrollment/:courseId" element={<ProtectedRoute><CourseEnrollmentPage /></ProtectedRoute>} />
```

---

### Module 5.6: Navigation Updates

**InstructorDashboard.tsx**:
```typescript
// Add button to existing dashboard
<Button onClick={() => navigate('/content-curation')}>
  Curate Learning Content
</Button>
```

**StudentDashboard.tsx**:
```typescript
// Add button to existing dashboard
<Button onClick={() => navigate('/learning-portal')}>
  My Learning Portal
</Button>
```

---

## Phase 5 Integration Test

**End-to-End Test**:
```
1. Faculty logs in
2. Navigates to Content Curation
3. Selects course, parses LOs
4. Searches and approves content
5. Generates micro-checks
6. 
7. Student logs in
8. Enrolls in course (via invite code)
9. Opens Learning Portal
10. Watches video, answers micro-checks
11. Completes content, unlocks assessment
12. Takes assessment, passes
13. Status shows "Verified"
14.
15. Faculty views Analytics
16. Sees student progress and verification
```

---

## Testing Matrix

| Phase | Module | Unit Test | Integration Test | E2E Test |
|-------|--------|-----------|------------------|----------|
| 1.1 | course_enrollments | ✅ RLS | ✅ Enrollment flow | - |
| 1.2 | learning_objective_extended | ✅ RLS, Embeddings | ✅ Parse + Store | - |
| 1.3 | content_sources | ✅ RLS | ✅ Link to LOs | - |
| 2.1 | parse-learning-objectives | ✅ AI parsing | ✅ With embedding | - |
| 2.2 | search-youtube-content | ✅ API calls | ✅ Store results | - |
| 2.3 | curate-content-batch | - | ✅ Full orchestration | - |
| 3.1 | consumption_records | ✅ RLS | ✅ Tracking flow | - |
| 3.2 | track-consumption-event | ✅ Event handling | ✅ Score calculation | - |
| 3.3 | micro_checks | ✅ RLS | ✅ Trigger timing | - |
| 3.4 | generate-micro-checks | ✅ AI generation | ✅ Insert correctly | - |
| 4.1-4.3 | Assessment tables | ✅ RLS | ✅ Session flow | - |
| 4.4-4.6 | Assessment functions | ✅ Grading | ✅ Full assessment | - |
| 5.x | Frontend pages | - | ✅ Component tests | ✅ Full flow |

---

## Rollback Procedures

### Full Rollback (Nuclear Option)
```sql
-- WARNING: Destroys all Verified Learning data

DROP TABLE IF EXISTS public.student_lo_progress CASCADE;
DROP TABLE IF EXISTS public.assessment_sessions CASCADE;
DROP TABLE IF EXISTS public.question_banks CASCADE;
DROP TABLE IF EXISTS public.micro_checks CASCADE;
DROP TABLE IF EXISTS public.consumption_records CASCADE;
DROP TABLE IF EXISTS public.content_sources CASCADE;
DROP TABLE IF EXISTS public.learning_objective_extended CASCADE;
DROP TABLE IF EXISTS public.course_enrollments CASCADE;
DROP EXTENSION IF EXISTS vector;
```

### Phase-Specific Rollbacks
Each phase can be rolled back independently by dropping only that phase's tables/functions.

---

## Success Criteria (MVP)

| Metric | Target |
|--------|--------|
| Faculty can curate content for 1 course | ✅ Working |
| Student can complete 1 LO with verification | ✅ Working |
| Assessment prevents cheating (basic) | ✅ Timer + proctoring flags |
| Engagement score calculated | ✅ Accurate |
| Progress persists across sessions | ✅ Working |

---

## Post-MVP Roadmap

1. **Advanced Proctoring**: Camera monitoring, keystroke analysis
2. **LMS Integration**: Canvas, Blackboard SSO
3. **Content Diversity**: Articles, podcasts, interactive simulations
4. **AI Tutoring**: Chatbot for stuck students
5. **Peer Learning**: Study groups, discussion forums
6. **Credential Issuance**: Blockchain-verified badges

---

## Appendix: File Structure (Complete)

```
src/
├── pages/
│   ├── ContentCuration.tsx          # NEW - Phase 5.1
│   ├── LearningPortal.tsx           # NEW - Phase 5.2
│   ├── AssessmentView.tsx           # NEW - Phase 5.3
│   ├── VerifiedLearningAnalytics.tsx # NEW - Phase 5.4
│   └── CourseEnrollment.tsx         # NEW - Phase 5.6
├── components/
│   ├── content-curation/
│   │   ├── LOParsingPanel.tsx
│   │   ├── ContentSearchPanel.tsx
│   │   ├── VideoCard.tsx
│   │   └── MicroCheckEditor.tsx
│   ├── learning-portal/
│   │   ├── LOProgressCard.tsx
│   │   ├── ContentViewer.tsx
│   │   ├── YouTubePlayer.tsx
│   │   └── MicroCheckPopup.tsx
│   └── assessment/
│       ├── AssessmentTimer.tsx
│       ├── QuestionCard.tsx
│       ├── AnswerInput.tsx
│       └── ResultsPanel.tsx
├── hooks/
│   ├── useContentCuration.ts
│   ├── useConsumptionTracking.ts
│   ├── useAssessment.ts
│   └── useLOProgress.ts

supabase/functions/
├── parse-learning-objectives/index.ts   # Phase 2.1
├── search-youtube-content/index.ts      # Phase 2.2
├── curate-content-batch/index.ts        # Phase 2.3
├── track-consumption-event/index.ts     # Phase 3.2
├── generate-micro-checks/index.ts       # Phase 3.4
├── generate-assessment-questions/index.ts # Phase 4.4
├── start-assessment-session/index.ts    # Phase 4.5
└── grade-assessment/index.ts            # Phase 4.6
```

---

**Document Status**: ✅ COMPLETE - Ready for Implementation Approval

**Next Steps**:
1. Enable GitHub Branch Switching in Labs
2. Create `feature/verified-learning` branch
3. Add YOUTUBE_API_KEY secret
4. Begin Phase 1 database migrations
