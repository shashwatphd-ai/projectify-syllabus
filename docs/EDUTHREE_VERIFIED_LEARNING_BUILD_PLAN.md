# EduThree Verified Learning Platform - Complete Build Plan

**Version 1.0 | December 2025**

---

## Executive Summary

This document provides the definitive development and product plan for extending EduThree with three major features: **Intelligent Content Curation**, **Verified Consumption Tracking**, and **AI-Resistant Assessment**. These features will be built as an **additional parallel track** for faculty users, completely preserving the existing project generation workflow.

---

## Part 1: Current System Architecture

### 1.1 Existing Database Schema (Relevant Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `course_profiles` | Stores parsed syllabi | `id`, `owner_id`, `title`, `level`, `weeks`, `hrs_per_week`, `outcomes` (JSON array), `artifacts`, `schedule`, `location_*` fields |
| `projects` | AI-generated company project proposals | `course_id`, `company_profile_id`, `title`, `description`, `tasks`, `deliverables`, `skills`, `status` |
| `company_profiles` | Discovered company data from Apollo | `name`, `industries`, `technologies`, `contact_*` fields, `job_postings` |
| `generation_runs` | Tracks project generation batches | `course_id`, `status`, `companies_discovered`, `projects_generated` |
| `profiles` | User identity | `id`, `email` |
| `user_roles` | Role management | `user_id`, `role` (faculty, student, employer, admin) |

### 1.2 Existing Edge Functions (Untouched)

| Function | Purpose | Status |
|----------|---------|--------|
| `parse-syllabus` | Extract outcomes from uploaded PDF | **SHARED** - Reused by new features |
| `discover-companies` | Find companies via Apollo API | Untouched |
| `generate-projects` | Create project proposals using AI | Untouched |
| `process-generation-queue` | Handle async project generation | Untouched |
| `job-matcher` | Match students to jobs | Untouched |
| `competency-extractor` | Extract student skills | Untouched |

### 1.3 Existing Frontend Pages (Faculty-Relevant)

| Page | Purpose | Status |
|------|---------|--------|
| `/upload` | Syllabus upload form | **SHARED** - Entry point for both flows |
| `/review-syllabus` | Review parsed outcomes | **SHARED** - Decision point for flow selection |
| `/configure` | Set project generation params | Untouched (existing flow only) |
| `/projects` | View generated projects | Untouched (existing flow only) |
| `/instructor-dashboard` | Faculty home | **EXTENDED** - Add new flow entry |

### 1.4 Data Flow: Existing Project Generation

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌────────────┐
│   Upload    │ ──▶ │ parse-syllabus│ ──▶ │ ReviewSyllabus│ ──▶ │ Configure  │
│  Syllabus   │     │ (edge func)   │     │   (edit LOs)  │     │ (# teams)  │
└─────────────┘     └──────────────┘     └───────────────┘     └────────────┘
                                                                      │
                                                                      ▼
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌────────────┐
│   Projects  │ ◀── │  generate-   │ ◀── │   discover-   │ ◀── │ Trigger    │
│   Page      │     │  projects    │     │   companies   │     │ Generation │
└─────────────┘     └──────────────┘     └───────────────┘     └────────────┘
```

---

## Part 2: New System Architecture

### 2.1 Integration Point: Shared Foundation

The new Verified Learning flow **branches after syllabus parsing**. Both flows share:
- `course_profiles` table (stores outcomes)
- `parse-syllabus` edge function
- `/upload` and `/review-syllabus` pages

### 2.2 Architecture Diagram: Dual-Flow System

```
                              ┌─────────────────────────────────────┐
                              │         SYLLABUS UPLOAD             │
                              │         (shared entry)              │
                              └─────────────────────────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────────────┐
                              │      PARSE-SYLLABUS FUNCTION        │
                              │   Extracts: title, level, weeks,    │
                              │   outcomes[], artifacts[]           │
                              └─────────────────────────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────────────┐
                              │        REVIEW SYLLABUS PAGE         │
                              │      (edit extracted outcomes)      │
                              └─────────────────────────────────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     ▼                                                 ▼
    ┌────────────────────────────────┐           ┌────────────────────────────────┐
    │     EXISTING FLOW              │           │     NEW VERIFIED LEARNING      │
    │     (Project Generation)       │           │     (Content Curation +        │
    │                                │           │      Assessment)               │
    │ ┌──────────────────────────┐   │           │ ┌──────────────────────────┐   │
    │ │ Configure Page           │   │           │ │ Content Curation Page    │   │
    │ │ (# teams, location)      │   │           │ │ (YouTube matching)       │   │
    │ └──────────────────────────┘   │           │ └──────────────────────────┘   │
    │              │                 │           │              │                 │
    │              ▼                 │           │              ▼                 │
    │ ┌──────────────────────────┐   │           │ ┌──────────────────────────┐   │
    │ │ discover-companies       │   │           │ │ search-youtube-content   │   │
    │ │ (Apollo API)             │   │           │ │ (YouTube Data API)       │   │
    │ └──────────────────────────┘   │           │ └──────────────────────────┘   │
    │              │                 │           │              │                 │
    │              ▼                 │           │              ▼                 │
    │ ┌──────────────────────────┐   │           │ ┌──────────────────────────┐   │
    │ │ generate-projects        │   │           │ │ match-content-to-lo      │   │
    │ │ (AI proposals)           │   │           │ │ (semantic scoring)       │   │
    │ └──────────────────────────┘   │           │ └──────────────────────────┘   │
    │              │                 │           │              │                 │
    │              ▼                 │           │              ▼                 │
    │ ┌──────────────────────────┐   │           │ ┌──────────────────────────┐   │
    │ │ Projects Page            │   │           │ │ Content Review Page      │   │
    │ │ (view proposals)         │   │           │ │ (approve/reject matches) │   │
    │ └──────────────────────────┘   │           │ └──────────────────────────┘   │
    │                                │           │              │                 │
    │                                │           │              ▼                 │
    │                                │           │ ┌──────────────────────────┐   │
    │                                │           │ │ Question Bank Setup      │   │
    │                                │           │ │ (manual creation MVP)    │   │
    │                                │           │ └──────────────────────────┘   │
    │                                │           │              │                 │
    │                                │           │              ▼                 │
    │                                │           │ ┌──────────────────────────┐   │
    │                                │           │ │ Student Learning Portal  │   │
    │                                │           │ │ (video + assessment)     │   │
    │                                │           │ └──────────────────────────┘   │
    └────────────────────────────────┘           └────────────────────────────────┘
```

---

## Part 3: New Database Schema

### 3.1 New Tables (Complete Definitions)

#### Table: `learning_objective_extended`
Extends learning outcomes with semantic data for content matching.

```sql
CREATE TABLE public.learning_objective_extended (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course_profiles(id) ON DELETE CASCADE,
  outcome_index INTEGER NOT NULL, -- Position in course_profiles.outcomes array
  outcome_text TEXT NOT NULL,
  
  -- AI-extracted attributes
  core_concept TEXT,
  action_verb TEXT,
  bloom_level TEXT CHECK (bloom_level IN ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create')),
  domain TEXT CHECK (domain IN ('business', 'science', 'humanities', 'technical', 'arts')),
  specificity TEXT CHECK (specificity IN ('introductory', 'intermediate', 'advanced')),
  search_keywords TEXT[], -- For YouTube search
  expected_duration_minutes INTEGER,
  
  -- Semantic data
  embedding VECTOR(1536), -- ada-002 embedding for semantic matching
  
  -- State machine
  verification_state TEXT DEFAULT 'unstarted' CHECK (verification_state IN (
    'unstarted', 'in_progress', 'verified', 'assessment_unlocked', 'passed', 'remediation_required'
  )),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(course_id, outcome_index)
);
```

#### Table: `content_sources`
Stores curated content matched to learning objectives.

```sql
CREATE TABLE public.content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_objective_id UUID NOT NULL REFERENCES learning_objective_extended(id) ON DELETE CASCADE,
  
  -- Content identification
  source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'upload', 'url')),
  source_url TEXT NOT NULL,
  youtube_video_id TEXT, -- For YouTube content
  
  -- Content metadata
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  channel_name TEXT,
  channel_id TEXT,
  
  -- Scoring (from matching algorithm)
  match_score NUMERIC(3,2), -- 0.00-1.00
  duration_fit_score NUMERIC(3,2),
  semantic_similarity_score NUMERIC(3,2),
  engagement_quality_score NUMERIC(3,2),
  channel_authority_score NUMERIC(3,2),
  recency_score NUMERIC(3,2),
  
  -- Instructor decision
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'unavailable')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Availability tracking
  last_availability_check TIMESTAMPTZ,
  is_available BOOLEAN DEFAULT true,
  unavailable_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Table: `micro_checks`
Comprehension questions for video verification.

```sql
CREATE TABLE public.micro_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_source_id UUID NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  
  -- Timing
  trigger_time_seconds INTEGER NOT NULL, -- When to show during video
  review_point_seconds INTEGER NOT NULL, -- Where to rewind on wrong answer
  
  -- Question data
  question_text TEXT NOT NULL CHECK (char_length(question_text) <= 150),
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'true_false')),
  options JSONB, -- For MCQ: [{"label": "A", "text": "Option text", "correct": true}]
  correct_answer TEXT NOT NULL,
  
  -- Configuration
  time_limit_seconds INTEGER DEFAULT 10,
  created_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Table: `consumption_records`
Tracks student engagement with content.

```sql
CREATE TABLE public.consumption_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  content_source_id UUID NOT NULL REFERENCES content_sources(id),
  learning_objective_id UUID NOT NULL REFERENCES learning_objective_extended(id),
  
  -- Watch tracking
  watched_segments JSONB DEFAULT '[]', -- Array of [start, end] pairs
  watch_percentage NUMERIC(5,2) DEFAULT 0,
  total_watch_time_seconds INTEGER DEFAULT 0,
  
  -- Micro-check results
  micro_check_results JSONB DEFAULT '[]', -- Array of {checkpoint_id, answer, correct, first_attempt, time_taken}
  
  -- Interaction signals
  tab_focus_losses JSONB DEFAULT '[]', -- Array of {time, timestamp}
  rewind_events JSONB DEFAULT '[]', -- Array of {from, to, timestamp}
  playback_speed_violations INTEGER DEFAULT 0,
  
  -- Engagement score breakdown (40/40/20 weighting)
  time_component_score NUMERIC(5,2), -- 40% weight
  microcheck_component_score NUMERIC(5,2), -- 40% weight
  interaction_component_score NUMERIC(5,2), -- 20% weight
  total_engagement_score NUMERIC(5,2),
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'verified', 'partial', 'not_verified')),
  verified_at TIMESTAMPTZ,
  
  -- Session tracking
  started_at TIMESTAMPTZ DEFAULT now(),
  last_position_seconds INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(student_id, content_source_id)
);
```

#### Table: `question_banks`
Assessment questions for learning objectives.

```sql
CREATE TABLE public.question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_objective_id UUID NOT NULL REFERENCES learning_objective_extended(id) ON DELETE CASCADE,
  
  -- Question content
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'short_answer')),
  options JSONB, -- For MCQ: [{"label": "A", "text": "...", "correct": true}]
  correct_answers JSONB NOT NULL, -- Array of accepted answers (for short answer: keywords, semantic matches)
  
  -- Categorization
  bloom_level TEXT NOT NULL CHECK (bloom_level IN ('remember', 'apply', 'analyze')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  has_scenario BOOLEAN DEFAULT false,
  scenario_context TEXT,
  
  -- Time limits (seconds)
  time_limit_seconds INTEGER NOT NULL,
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  
  -- Management
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Table: `assessment_sessions`
Tracks assessment attempts.

```sql
CREATE TABLE public.assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  learning_objective_id UUID NOT NULL REFERENCES learning_objective_extended(id),
  
  -- Session configuration
  questions_selected JSONB NOT NULL, -- Array of question IDs in order
  question_order JSONB NOT NULL, -- Randomized order
  
  -- Progress
  current_question_index INTEGER DEFAULT 0,
  answers_submitted JSONB DEFAULT '[]', -- Array of {question_id, answer, time_taken, correct, timed_out}
  
  -- Timing
  session_started_at TIMESTAMPTZ DEFAULT now(),
  session_expires_at TIMESTAMPTZ NOT NULL, -- Hard timeout (10 min)
  current_question_started_at TIMESTAMPTZ,
  
  -- Results
  score NUMERIC(5,2),
  passed BOOLEAN,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'expired', 'abandoned')),
  completed_at TIMESTAMPTZ,
  
  -- Weakness analysis (for failures)
  weakness_patterns JSONB, -- {bloom_level: "analyze", topic: "financial metrics", timeout_rate: 0.4}
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Table: `student_lo_progress`
Tracks student progress through learning objectives.

```sql
CREATE TABLE public.student_lo_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  learning_objective_id UUID NOT NULL REFERENCES learning_objective_extended(id),
  course_id UUID NOT NULL REFERENCES course_profiles(id),
  
  -- State machine
  state TEXT DEFAULT 'unstarted' CHECK (state IN (
    'unstarted', 'in_progress', 'verified', 'assessment_unlocked', 'passed', 'remediation_required'
  )),
  
  -- Progress tracking
  content_engagement_score NUMERIC(5,2),
  assessment_attempts INTEGER DEFAULT 0,
  best_assessment_score NUMERIC(5,2),
  
  -- Timestamps
  content_started_at TIMESTAMPTZ,
  content_verified_at TIMESTAMPTZ,
  assessment_unlocked_at TIMESTAMPTZ,
  passed_at TIMESTAMPTZ,
  
  -- Remediation
  remediation_required_at TIMESTAMPTZ,
  remediation_content_ids JSONB, -- Targeted content sections
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(student_id, learning_objective_id)
);
```

### 3.2 Entity Relationship Diagram

```
┌─────────────────────────┐
│    course_profiles      │
│ (EXISTING - SHARED)     │
├─────────────────────────┤
│ id                      │───────────────────────────────┐
│ owner_id                │                               │
│ title                   │                               │
│ outcomes (JSON array)   │                               │
│ ...                     │                               │
└─────────────────────────┘                               │
                                                          │
                                                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         NEW VERIFIED LEARNING TABLES                          │
└──────────────────────────────────────────────────────────────────────────────┘
                                                          │
          ┌───────────────────────────────────────────────┤
          │                                               │
          ▼                                               ▼
┌─────────────────────────┐                 ┌─────────────────────────┐
│ learning_objective_     │                 │ student_lo_progress     │
│        extended         │                 │                         │
├─────────────────────────┤                 ├─────────────────────────┤
│ id                      │◀───────────────▶│ learning_objective_id   │
│ course_id (FK)          │                 │ student_id              │
│ outcome_index           │                 │ state                   │
│ core_concept            │                 │ assessment_attempts     │
│ bloom_level             │                 │ ...                     │
│ embedding               │                 └─────────────────────────┘
│ verification_state      │
└─────────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────┐
│    content_sources      │
├─────────────────────────┤
│ id                      │◀─────────────────┐
│ learning_objective_id   │                  │
│ source_type             │                  │
│ youtube_video_id        │                  │
│ match_score             │                  │
│ status                  │                  │
└─────────────────────────┘                  │
          │                                  │
          │ 1:N                              │
          ▼                                  │
┌─────────────────────────┐     ┌────────────┴────────────┐
│     micro_checks        │     │   consumption_records   │
├─────────────────────────┤     ├─────────────────────────┤
│ id                      │     │ id                      │
│ content_source_id       │     │ content_source_id (FK)  │
│ trigger_time_seconds    │     │ student_id              │
│ question_text           │     │ watched_segments        │
│ correct_answer          │     │ total_engagement_score  │
└─────────────────────────┘     │ status                  │
                                └─────────────────────────┘

┌─────────────────────────┐     ┌─────────────────────────┐
│    question_banks       │     │  assessment_sessions    │
├─────────────────────────┤     ├─────────────────────────┤
│ id                      │◀───▶│ questions_selected      │
│ learning_objective_id   │     │ student_id              │
│ question_type           │     │ learning_objective_id   │
│ bloom_level             │     │ answers_submitted       │
│ difficulty              │     │ score                   │
│ time_limit_seconds      │     │ passed                  │
└─────────────────────────┘     └─────────────────────────┘
```

---

## Part 4: New Edge Functions

### 4.1 Function Specifications

| Function Name | Purpose | Inputs | Outputs | External APIs |
|---------------|---------|--------|---------|---------------|
| `parse-learning-objectives` | Extract semantic attributes from outcomes | `course_id`, `outcomes[]` | `learning_objective_extended[]` | Lovable AI (Gemini) |
| `search-youtube-content` | Find YouTube videos for an LO | `learning_objective_id`, `search_keywords` | `youtube_results[]` | YouTube Data API v3 |
| `score-content-match` | Calculate 5-factor match score | `video_data`, `lo_data` | `match_scores` | Lovable AI (embeddings) |
| `track-consumption-event` | Log video playback events | `session_id`, `event_type`, `event_data` | `consumption_record` | None |
| `evaluate-micro-check` | Validate micro-check answers | `micro_check_id`, `student_answer` | `{correct, rewind_to}` | None |
| `calculate-engagement-score` | Compute 40/40/20 engagement score | `consumption_record_id` | `engagement_score` | None |
| `start-assessment-session` | Initialize timed assessment | `student_id`, `learning_objective_id` | `assessment_session` | None |
| `submit-assessment-answer` | Validate answer with timing | `session_id`, `answer`, `client_timestamp` | `{correct, next_question}` | Lovable AI (for short answer) |
| `complete-assessment` | Calculate final score, update state | `session_id` | `{score, passed, weakness_patterns}` | None |
| `check-content-availability` | Verify YouTube videos still accessible | `content_source_ids[]` | `availability_status[]` | YouTube Data API v3 |

### 4.2 API Endpoint Mapping

| Endpoint | Method | Edge Function | Auth Required |
|----------|--------|---------------|---------------|
| `/api/lo/parse` | POST | `parse-learning-objectives` | Yes (Faculty) |
| `/api/content/search` | POST | `search-youtube-content` | Yes (Faculty) |
| `/api/content/score` | POST | `score-content-match` | Yes (Faculty) |
| `/api/content/approve` | PUT | Direct DB update | Yes (Faculty) |
| `/api/consumption/track` | POST | `track-consumption-event` | Yes (Student) |
| `/api/consumption/microcheck` | POST | `evaluate-micro-check` | Yes (Student) |
| `/api/consumption/score` | GET | `calculate-engagement-score` | Yes (Student) |
| `/api/assessment/start` | POST | `start-assessment-session` | Yes (Student) |
| `/api/assessment/submit` | POST | `submit-assessment-answer` | Yes (Student) |
| `/api/assessment/complete` | POST | `complete-assessment` | Yes (Student) |
| `/api/content/availability` | POST | `check-content-availability` | Yes (System) |

---

## Part 5: New Frontend Components

### 5.1 Page Structure

| Page Route | Purpose | Parent | Key Components |
|------------|---------|--------|----------------|
| `/instructor/content-curation/:courseId` | Match content to LOs | InstructorDashboard | ContentCurationWorkflow, ContentMatchCard, LOParsingStatus |
| `/instructor/question-bank/:loId` | Create assessment questions | ContentCuration | QuestionEditor, QuestionList, ImportQuestions |
| `/instructor/analytics/:courseId` | View student progress | InstructorDashboard | StudentProgressTable, EngagementChart, FlaggedStudents |
| `/learn/:courseId` | Student learning portal | StudentDashboard | ModuleList, LOCard, ProgressIndicator |
| `/learn/:courseId/:loId` | Content consumption | StudentPortal | VideoPlayer, MicroCheckModal, ProgressBar |
| `/assess/:sessionId` | Timed assessment | StudentPortal | AssessmentQuestion, Timer, ProgressBar |

### 5.2 Component Hierarchy

```
InstructorDashboard (EXISTING - EXTENDED)
├── SyllabusManagement (EXISTING)
│   └── CourseCard
│       ├── "Generate Projects" button (EXISTING FLOW)
│       └── "Curate Content" button (NEW FLOW) ◀── NEW
│
├── ContentCurationPage (NEW)
│   ├── LOParsingProgress
│   │   └── LOExtractedCard (bloom level, keywords)
│   ├── ContentSearchPanel
│   │   ├── YouTubeResultCard
│   │   │   ├── VideoPreview
│   │   │   ├── MatchScoreBreakdown
│   │   │   └── ApproveRejectButtons
│   │   └── UploadContentButton
│   └── ContentApprovalStatus
│
├── QuestionBankPage (NEW)
│   ├── QuestionEditor
│   │   ├── MCQBuilder
│   │   ├── ShortAnswerBuilder
│   │   └── TimeLimitSelector
│   └── QuestionList
│       └── QuestionCard
│
└── VerifiedLearningAnalytics (NEW)
    ├── StudentProgressTable
    ├── LOCompletionChart
    └── FlaggedBehaviorPanel

StudentDashboard (EXISTING - EXTENDED)
├── CourseList (EXISTING)
│   └── CourseCard
│       └── "Start Learning" button (NEW FLOW) ◀── NEW
│
├── LearningPortal (NEW)
│   ├── ModuleSidebar
│   │   └── LOProgressCard
│   ├── ContentPlayer
│   │   ├── CustomVideoPlayer (YouTube embed wrapper)
│   │   │   ├── ProgressTracker
│   │   │   ├── SpeedLimiter
│   │   │   └── TabFocusMonitor
│   │   └── MicroCheckModal
│   │       ├── QuestionDisplay
│   │       ├── AnswerInput
│   │       └── RewindNotification
│   └── VerificationStatus
│       └── EngagementScoreBreakdown
│
└── AssessmentView (NEW)
    ├── AssessmentHeader (timer, progress)
    ├── QuestionDisplay
    │   ├── MCQOptions
    │   └── ShortAnswerInput
    ├── SubmitButton
    └── ResultsView
        ├── ScoreDisplay
        └── RemediationPath
```

### 5.3 UI Wireframes (Figma-Style Descriptions)

#### 5.3.1 Content Curation Page
```
┌────────────────────────────────────────────────────────────────────────────┐
│ ◀ Back to Dashboard                            Course: Marketing 301      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  CONTENT CURATION                                         [Publish Module] │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Learning Objective 1                                    ✓ Complete   │  │
│  │ "Analyze market segmentation strategies"                             │  │
│  │ Bloom: Analyze | Domain: Business | Duration: 22 min                 │  │
│  │ ────────────────────────────────────────────────────────────────── │  │
│  │ MATCHED CONTENT:                                                     │  │
│  │ ┌───────────┬─────────────────────────────────────────────────────┐  │  │
│  │ │ ▶ 🖼️     │ Market Segmentation Explained                       │  │  │
│  │ │ Thumbnail │ HarvardX Business • 18:24 • 245K views              │  │  │
│  │ │           │ ████████████████░░ 82% match                        │  │  │
│  │ │           │ [✓ Approve]  [✗ Reject]  [▶ Preview]                │  │  │
│  │ └───────────┴─────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Learning Objective 2                                    ○ Pending    │  │
│  │ "Apply financial modeling techniques"                                │  │
│  │ Bloom: Apply | Domain: Business | Duration: 25 min                   │  │
│  │ ────────────────────────────────────────────────────────────────── │  │
│  │ SEARCHING...  ●●●                                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 5.3.2 Student Video Player
```
┌────────────────────────────────────────────────────────────────────────────┐
│ Marketing 301 > Module 2 > LO: Market Segmentation            ⏱ 12:45 left │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │                                                                      │  │
│  │                        [YouTube Video Embed]                         │  │
│  │                         (18:24 total)                                │  │
│  │                                                                      │  │
│  │                                                                      │  │
│  │  ▶ ═══════════●════════════════════════════════════════  7:42       │  │
│  │     ⚑ Checkpoint 1 (4:41)  ⚑ Checkpoint 2 (9:23)  ⚑ Checkpoint 3    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Progress: ████████████░░░░░░░░░░░ 58% verified                           │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │                     MICRO-CHECK (appears at checkpoint)            │    │
│  │  ┌─────────────────────────────────────────────────────────────┐  │    │
│  │  │ What did the speaker identify as the primary benefit        │  │    │
│  │  │ of demographic segmentation?                                 │  │    │
│  │  │                                                              │  │    │
│  │  │  ○ A) Lower marketing costs                                  │  │    │
│  │  │  ○ B) Targeted messaging                                     │  │    │
│  │  │  ○ C) Faster product development                             │  │    │
│  │  │  ○ D) Reduced competition                                    │  │    │
│  │  │                                              [Submit] ⏱ 8s   │  │    │
│  │  └─────────────────────────────────────────────────────────────┘  │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 5.3.3 Assessment View
```
┌────────────────────────────────────────────────────────────────────────────┐
│ ASSESSMENT: Market Segmentation                        ⏱ 6:42 remaining   │
│ Question 3 of 5                                        ████░░░░░░ 60%     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  A mid-sized retail company wants to expand into a new region.       │  │
│  │  Based on the segmentation principles covered, which approach        │  │
│  │  would be MOST effective for initial market entry?                   │  │
│  │                                                                      │  │
│  │  ○ A) Target the broadest possible demographic                       │  │
│  │  ● B) Focus on a single, well-defined segment first                  │  │
│  │  ○ C) Copy competitor targeting strategies                           │  │
│  │  ○ D) Avoid segmentation until brand is established                  │  │
│  │                                                                      │  │
│  │                                                      ⏱ 28s for Q     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│                              [Submit Answer]                               │
│                                                                            │
│  ⚠️ You cannot go back to previous questions                              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 6: Implementation Phases (Jira-Style Breakdown)

### Phase 1: Content Curation Engine (Weeks 1-3)

| Epic | Story | Tasks | Estimate | Priority |
|------|-------|-------|----------|----------|
| **P1-E1: LO Parsing** | As a faculty member, I want my learning outcomes parsed into searchable attributes | T1: Create `learning_objective_extended` table | 2h | P0 |
| | | T2: Build `parse-learning-objectives` edge function | 4h | P0 |
| | | T3: Create LO extraction prompt for Gemini | 2h | P0 |
| | | T4: Add embedding generation for semantic matching | 3h | P0 |
| **P1-E2: YouTube Search** | As a faculty member, I want YouTube videos matched to my LOs | T1: Add YOUTUBE_API_KEY secret | 0.5h | P0 |
| | | T2: Create `search-youtube-content` edge function | 6h | P0 |
| | | T3: Implement 3-query search strategy | 3h | P0 |
| | | T4: Create `content_sources` table | 2h | P0 |
| **P1-E3: Scoring Algorithm** | As a system, I calculate 5-factor match scores | T1: Build `score-content-match` edge function | 6h | P0 |
| | | T2: Implement duration fit calculation | 2h | P0 |
| | | T3: Implement semantic similarity scoring | 3h | P0 |
| | | T4: Implement engagement/authority/recency scores | 3h | P0 |
| **P1-E4: Instructor UI** | As a faculty member, I want to review and approve content matches | T1: Create ContentCurationPage component | 8h | P0 |
| | | T2: Build ContentMatchCard with score breakdown | 4h | P0 |
| | | T3: Add approve/reject functionality | 3h | P0 |
| | | T4: Implement manual upload option | 4h | P1 |
| | | T5: Add "Curate Content" button to InstructorDashboard | 2h | P0 |

**Phase 1 Total: ~57 hours (2.4 weeks at 24h/week)**

### Phase 2: Verified Consumption Tracking (Weeks 4-6)

| Epic | Story | Tasks | Estimate | Priority |
|------|-------|-------|----------|----------|
| **P2-E1: Video Player** | As a student, I watch videos in a custom player | T1: Create CustomVideoPlayer component | 8h | P0 |
| | | T2: Implement YouTube iframe API integration | 4h | P0 |
| | | T3: Add playback speed limiter (max 2x) | 2h | P0 |
| | | T4: Implement tab focus detection | 3h | P0 |
| **P2-E2: Event Tracking** | As a system, I track detailed consumption events | T1: Create `consumption_records` table | 2h | P0 |
| | | T2: Build `track-consumption-event` edge function | 6h | P0 |
| | | T3: Implement segment tracking and merging | 4h | P0 |
| | | T4: Implement real-time progress updates | 3h | P0 |
| **P2-E3: Micro-Checks** | As a student, I answer comprehension checks during videos | T1: Create `micro_checks` table | 2h | P0 |
| | | T2: Build MicroCheckModal component | 6h | P0 |
| | | T3: Build `evaluate-micro-check` edge function | 4h | P0 |
| | | T4: Implement rewind on wrong answer | 3h | P0 |
| | | T5: Build micro-check editor for instructors | 6h | P1 |
| **P2-E4: Engagement Scoring** | As a system, I calculate engagement scores | T1: Build `calculate-engagement-score` edge function | 6h | P0 |
| | | T2: Implement 40/40/20 weighting formula | 3h | P0 |
| | | T3: Create EngagementScoreBreakdown component | 4h | P0 |
| | | T4: Implement verification threshold logic | 3h | P0 |
| **P2-E5: Student Portal** | As a student, I access my learning content | T1: Create LearningPortal page | 8h | P0 |
| | | T2: Build ModuleSidebar with LO progress | 4h | P0 |
| | | T3: Create `student_lo_progress` table | 2h | P0 |
| | | T4: Implement state machine transitions | 4h | P0 |

**Phase 2 Total: ~87 hours (3.6 weeks at 24h/week)**

### Phase 3: AI-Resistant Assessment (Weeks 7-9)

| Epic | Story | Tasks | Estimate | Priority |
|------|-------|-------|----------|----------|
| **P3-E1: Question Bank** | As a faculty member, I create assessment questions | T1: Create `question_banks` table | 2h | P0 |
| | | T2: Build QuestionBankPage component | 8h | P0 |
| | | T3: Build MCQBuilder component | 4h | P0 |
| | | T4: Build ShortAnswerBuilder component | 4h | P0 |
| | | T5: Implement time limit configuration | 2h | P0 |
| **P3-E2: Assessment Engine** | As a system, I run timed assessments | T1: Create `assessment_sessions` table | 2h | P0 |
| | | T2: Build `start-assessment-session` edge function | 6h | P0 |
| | | T3: Implement question selection algorithm | 4h | P0 |
| | | T4: Implement randomization (question + option order) | 3h | P0 |
| **P3-E3: Timed Questions** | As a student, I answer questions under time pressure | T1: Build AssessmentView page | 8h | P0 |
| | | T2: Create QuestionDisplay component | 4h | P0 |
| | | T3: Implement countdown timer | 3h | P0 |
| | | T4: Build `submit-assessment-answer` edge function | 6h | P0 |
| | | T5: Implement server-side timing validation | 4h | P0 |
| **P3-E4: Scoring & Results** | As a system, I score assessments and trigger remediation | T1: Build `complete-assessment` edge function | 6h | P0 |
| | | T2: Implement MCQ scoring | 2h | P0 |
| | | T3: Implement short answer evaluation (4-method cascade) | 8h | P1 |
| | | T4: Build ResultsView component | 4h | P0 |
| | | T5: Implement weakness pattern analysis | 4h | P1 |
| **P3-E5: Remediation Flow** | As a student, I get targeted help after failing | T1: Implement 30-minute cooldown | 2h | P0 |
| | | T2: Build RemediationPath component | 4h | P0 |
| | | T3: Implement instructor notification on 2nd failure | 3h | P0 |
| | | T4: Update state machine for remediation state | 2h | P0 |

**Phase 3 Total: ~99 hours (4.1 weeks at 24h/week)**

---

## Part 7: Integration Mechanics

### 7.1 How New Features Connect to Existing Code

| Integration Point | Existing Code | New Code | Connection Method |
|-------------------|---------------|----------|-------------------|
| **Syllabus Parsing** | `parse-syllabus/index.ts` | `parse-learning-objectives` | Chained: New function reads from `course_profiles.outcomes` |
| **Course Data** | `course_profiles` table | `learning_objective_extended` table | FK: `course_id` references `course_profiles.id` |
| **User Auth** | `useAuth` hook, `AuthContext` | All new pages | Direct import: Same auth patterns |
| **Role Checking** | `isFaculty`, `isStudent` checks | New pages | Direct import: Same role guards |
| **UI Components** | shadcn/ui components | New components | Direct import: Same design system |
| **Supabase Client** | `@/integrations/supabase/client` | New queries | Direct import: Same client |
| **Instructor Dashboard** | `InstructorDashboard.tsx` | New buttons/routes | Extension: Add new CTA buttons |
| **Student Dashboard** | `StudentDashboard.tsx` | New buttons/routes | Extension: Add new CTA buttons |

### 7.2 Zero-Impact Guarantee

The following existing components will **NOT** be modified except for adding new navigation options:

| Component | Modification |
|-----------|--------------|
| `parse-syllabus` | None |
| `discover-companies` | None |
| `generate-projects` | None |
| `process-generation-queue` | None |
| `Configure.tsx` | None |
| `Projects.tsx` | None |
| `ProjectDetail.tsx` | None |
| `company_profiles` table | None |
| `projects` table | None |
| `generation_runs` table | None |

### 7.3 Shared Components (Used by Both Flows)

| Component/Table | Used By |
|-----------------|---------|
| `course_profiles` table | Both (source of outcomes) |
| `profiles` table | Both (user identity) |
| `user_roles` table | Both (role checks) |
| `Header.tsx` | Both |
| `useAuth` hook | Both |
| `ProtectedRoute.tsx` | Both |

---

## Part 8: External API Dependencies

### 8.1 Required API Keys

| API | Purpose | Rate Limits | Estimated Usage | Cost |
|-----|---------|-------------|-----------------|------|
| **YouTube Data API v3** | Video search, metadata retrieval | 10,000 units/day | ~100 searches/day initially | Free (within quota) |
| **Lovable AI (Gemini)** | LO parsing, embeddings, short answer grading | Workspace limits | ~500 calls/day | Included in Lovable plan |

### 8.2 API Integration Details

#### YouTube Data API v3
```
Endpoints Used:
- search.list (100 units per call)
  - Part: snippet
  - Type: video
  - videoDuration: medium
  - videoEmbeddable: true
  - maxResults: 10

- videos.list (1 unit per video)
  - Part: statistics, contentDetails
  - Used for: like count, view count, duration

Quota Consumption per LO:
- 3 searches × 100 units = 300 units
- 10 videos × 1 unit = 10 units
- Total per LO: ~310 units
- Max LOs per day: ~32 (at 10k limit)
```

#### Lovable AI (Gemini 2.5 Flash)
```
Use Cases:
1. LO Parsing: Extract attributes from outcome text
   - Input: ~100 tokens per LO
   - Output: ~200 tokens (structured JSON)
   
2. Embedding Generation: For semantic matching
   - 1536-dimensional vectors
   - ~10 tokens per LO text
   
3. Short Answer Grading: Method 4 of cascade
   - Input: ~200 tokens (question + answer + rubric)
   - Output: ~50 tokens (score + feedback)
```

---

## Part 9: Security & RLS Policies

### 9.1 Row Level Security Policies

```sql
-- learning_objective_extended: Faculty can CRUD for their courses
CREATE POLICY "Faculty can manage LOs for their courses"
ON learning_objective_extended
FOR ALL
USING (
  course_id IN (
    SELECT id FROM course_profiles WHERE owner_id = auth.uid()
  )
);

-- content_sources: Faculty can manage, students can view approved
CREATE POLICY "Faculty can manage content for their courses"
ON content_sources
FOR ALL
USING (
  learning_objective_id IN (
    SELECT lo.id FROM learning_objective_extended lo
    JOIN course_profiles cp ON lo.course_id = cp.id
    WHERE cp.owner_id = auth.uid()
  )
);

CREATE POLICY "Students can view approved content"
ON content_sources
FOR SELECT
USING (
  status = 'approved'
);

-- consumption_records: Students own their own records
CREATE POLICY "Students manage own consumption"
ON consumption_records
FOR ALL
USING (student_id = auth.uid());

-- assessment_sessions: Students own their own sessions
CREATE POLICY "Students manage own assessments"
ON assessment_sessions
FOR ALL
USING (student_id = auth.uid());

-- question_banks: Faculty can CRUD, students cannot view directly
CREATE POLICY "Faculty can manage questions"
ON question_banks
FOR ALL
USING (
  learning_objective_id IN (
    SELECT lo.id FROM learning_objective_extended lo
    JOIN course_profiles cp ON lo.course_id = cp.id
    WHERE cp.owner_id = auth.uid()
  )
);

-- student_lo_progress: Students own, faculty can view for their courses
CREATE POLICY "Students manage own progress"
ON student_lo_progress
FOR ALL
USING (student_id = auth.uid());

CREATE POLICY "Faculty can view progress for their courses"
ON student_lo_progress
FOR SELECT
USING (
  course_id IN (
    SELECT id FROM course_profiles WHERE owner_id = auth.uid()
  )
);
```

---

## Part 10: Success Metrics & Validation

### 10.1 MVP Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Content match approval rate | >80% | `approved / (approved + rejected)` |
| Verified consumption rate | >90% | `verified / started` |
| First-attempt pass rate | 70-85% | `first_attempt_passes / total_students` |
| Assessment completion <5min from content | >95% | Timestamp delta |
| Learning Integrity Index | >65% | First-attempt passes without remediation |

### 10.2 Test Plan

| Test Type | Scope | Method |
|-----------|-------|--------|
| Unit Tests | Edge functions | Deno test framework |
| Integration Tests | Full flow: parse → curate → consume → assess | Manual QA |
| Load Testing | Concurrent video tracking | Simulated student load |
| Security Testing | RLS policies, timing validation | Penetration testing |

---

## Part 11: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| YouTube API quota exhaustion | Medium | High | Implement caching, batch requests |
| Video unavailability | Medium | Medium | Daily availability checks, instructor notification |
| Timing manipulation | Low | High | Server-side validation, grace period, flagging |
| Student frustration with micro-checks | Medium | Medium | 10-second limit, simple recall only |
| Instructor workload for question creation | High | Medium | Phase 4: AI-assisted question generation |

---

## Part 12: Dependencies & Prerequisites

### 12.1 Before Starting Phase 1

- [ ] YouTube Data API key obtained and added to Lovable secrets
- [ ] Vector extension enabled in Supabase for embeddings
- [ ] Design system tokens reviewed for new components

### 12.2 Before Starting Phase 2

- [ ] Phase 1 content curation complete and tested
- [ ] YouTube iframe API tested in Lovable preview

### 12.3 Before Starting Phase 3

- [ ] Phase 2 consumption tracking complete and tested
- [ ] Instructor has created sample micro-checks
- [ ] Assessment state machine logic reviewed

---

## Appendix A: Complete File Structure (New Files)

```
src/
├── pages/
│   ├── ContentCuration.tsx        # Faculty: match content to LOs
│   ├── QuestionBank.tsx           # Faculty: create assessment questions
│   ├── VerifiedLearningAnalytics.tsx # Faculty: view student progress
│   ├── LearningPortal.tsx         # Student: access learning content
│   └── Assessment.tsx             # Student: timed assessment
│
├── components/
│   ├── content-curation/
│   │   ├── ContentMatchCard.tsx
│   │   ├── LOParsingStatus.tsx
│   │   ├── ScoreBreakdown.tsx
│   │   ├── UploadContentDialog.tsx
│   │   └── ContentCurationWorkflow.tsx
│   │
│   ├── question-bank/
│   │   ├── QuestionEditor.tsx
│   │   ├── MCQBuilder.tsx
│   │   ├── ShortAnswerBuilder.tsx
│   │   ├── QuestionList.tsx
│   │   └── QuestionCard.tsx
│   │
│   ├── video-player/
│   │   ├── CustomVideoPlayer.tsx
│   │   ├── ProgressTracker.tsx
│   │   ├── SpeedLimiter.tsx
│   │   ├── TabFocusMonitor.tsx
│   │   └── MicroCheckModal.tsx
│   │
│   ├── assessment/
│   │   ├── AssessmentQuestion.tsx
│   │   ├── Timer.tsx
│   │   ├── MCQOptions.tsx
│   │   ├── ShortAnswerInput.tsx
│   │   ├── ResultsView.tsx
│   │   └── RemediationPath.tsx
│   │
│   └── verified-learning/
│       ├── ModuleSidebar.tsx
│       ├── LOProgressCard.tsx
│       ├── EngagementScoreBreakdown.tsx
│       ├── StudentProgressTable.tsx
│       └── FlaggedBehaviorPanel.tsx
│
├── hooks/
│   ├── useContentCuration.ts
│   ├── useVideoTracking.ts
│   ├── useAssessmentSession.ts
│   └── useLearningProgress.ts

supabase/
├── functions/
│   ├── parse-learning-objectives/
│   │   └── index.ts
│   ├── search-youtube-content/
│   │   └── index.ts
│   ├── score-content-match/
│   │   └── index.ts
│   ├── track-consumption-event/
│   │   └── index.ts
│   ├── evaluate-micro-check/
│   │   └── index.ts
│   ├── calculate-engagement-score/
│   │   └── index.ts
│   ├── start-assessment-session/
│   │   └── index.ts
│   ├── submit-assessment-answer/
│   │   └── index.ts
│   ├── complete-assessment/
│   │   └── index.ts
│   └── check-content-availability/
│       └── index.ts
```

---

## Appendix B: State Machine Diagram

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │              LEARNING OBJECTIVE STATE MACHINE                │
                    └──────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
                                      ┌───────────────────┐
                                      │     UNSTARTED     │
                                      └───────────────────┘
                                                  │
                                                  │ start_content()
                                                  ▼
                                      ┌───────────────────┐
                    ┌────────────────▶│   IN_PROGRESS     │◀──────────────────────┐
                    │                 └───────────────────┘                       │
                    │                           │                                 │
                    │                           │ verify_consumption()            │
                    │                           │ [if score ≥ threshold]          │
                    │                           ▼                                 │
                    │                 ┌───────────────────┐                       │
                    │                 │     VERIFIED      │                       │
                    │                 └───────────────────┘                       │
                    │                           │                                 │
                    │                           │ unlock_assessment()             │
                    │                           │ [auto-triggered]                │
                    │                           ▼                                 │
                    │                 ┌───────────────────┐                       │
                    │       ┌────────▶│ ASSESSMENT_       │◀───────────┐          │
                    │       │         │    UNLOCKED       │            │          │
                    │       │         └───────────────────┘            │          │
                    │       │                   │                      │          │
                    │       │ retry_assessment()│                      │          │
                    │       │ [if attempts < 2] │        fail_assessment()        │
                    │       │                   │        [if attempts ≥ 2]        │
                    │       │         ┌─────────┴─────────┐            │          │
                    │       │         │                   │            │          │
                    │       │         ▼                   ▼            │          │
                    │       │ ┌───────────────┐   ┌───────────────────┐│          │
                    │       │ │    PASSED     │   │   REMEDIATION_    ││          │
                    │       │ │               │   │     REQUIRED      ││          │
                    │       │ └───────────────┘   └───────────────────┘│          │
                    │       │         │                   │            │          │
                    │       │         │                   │ start_remediation()   │
                    │       └─────────┘                   │ [instructor-triggered]│
                    │                                     │            │          │
                    └─────────────────────────────────────┴────────────┘          │
                                                                                  │
                              ◀─── (cooldown path) ───────────────────────────────┘
```

---

**Document Status: COMPLETE - Ready for Implementation Approval**

*Last Updated: December 2025*
*Author: Lovable AI*
*Version: 1.0*
