# EduThree Resource Orchestration System State

**Document Type:** Executive Multi-Perspective Strategic Analysis  
**Version:** 2.0  
**Date:** December 25, 2025  
**Classification:** Internal Strategic Document  
**Review Cadence:** Weekly or after major milestones

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Process Manager Perspective](#2-business-process-manager-perspective)
3. [Systems Architect Perspective](#3-systems-architect-perspective)
4. [Product & UX Architect Perspective](#4-product--ux-architect-perspective)
5. [VP Synthesis: Strategic Resource Orchestration](#5-vp-synthesis-strategic-resource-orchestration)
6. [Appendices](#6-appendices)

---

## 1. Executive Summary

### Platform Identity

**EduThree** is a triple-sided marketplace that transforms academic coursework into industry-sponsored projects, connecting universities, students, and employers through AI-powered matching and verification systems.

### Live System Metrics (as of 2025-12-25)

| Metric                    | Count | Notes                        |
| ------------------------- | ----- | ---------------------------- |
| **Total Projects**        | 372   | Generated project proposals  |
| **AI Shell Projects**     | 370   | Awaiting faculty curation    |
| **Curated Live Projects** | 0     | Available to students        |
| **Total Courses**         | 238   | Uploaded syllabi             |
| **Company Profiles**      | 320   | Discovered via Apollo        |
| **Generation Runs**       | 292   | Total AI generation attempts |
| **Completed Generations** | 221   | 75.7% success rate           |
| **Verified Competencies** | 34    | Student skills verified      |
| **Job Matches**           | 24    | Apollo job placements        |
| **Employer Submissions**  | 1     | Interest form submissions    |
| **Partnership Proposals** | 2     | Active proposals             |

### User Role Distribution

| Role                | Count | % of Users |
| ------------------- | ----- | ---------- |
| **Student**         | 25    | 55.6%      |
| **Faculty**         | 11    | 24.4%      |
| **Pending Faculty** | 8     | 17.8%      |
| **Admin**           | 1     | 2.2%       |
| **Employer**        | 0     | 0%         |

### Current State Assessment

| Dimension          | Status            | Maturity Level | Evidence                 |
| ------------------ | ----------------- | -------------- | ------------------------ |
| **Security**       | Module 1 Complete | 5/5 Hardened   | All 8 bits complete      |
| **Technology**     | Production-Ready  | 4/5 Scalable   | 36 edge functions        |
| **Product**        | Phase 3           | 4/5 Growth     | 21 pages, 15+ components |
| **Business Model** | B2B2C Marketplace | 2/5 Early      | Low employer traction    |

---

## 2. Business Process Manager Perspective

### 2.1 Core Value Streams

<presentation-mermaid>
flowchart LR
    subgraph VS1["VALUE STREAM 1: SYLLABUS → PROJECTS"]
        A1[Syllabus Upload] --> A2[AI Parse]
        A2 --> A3[Company Discovery]
        A3 --> A4[Project Generation]
        A4 --> A5[Faculty Curation]
    end
    
    subgraph VS2["VALUE STREAM 2: PROJECTS → PORTFOLIO"]
        B1[View Projects] --> B2[Apply]
        B2 --> B3[Complete Work]
        B3 --> B4[Verify Skills]
        B4 --> B5[Export Portfolio]
    end
    
    subgraph VS3["VALUE STREAM 3: DEMAND → TALENT"]
        C1[Demand Board] --> C2[Express Interest]
        C2 --> C3[Review Proposals]
        C3 --> C4[Sponsor Project]
        C4 --> C5[Hire Talent]
    end
    
    A5 --> B1
    B4 --> C1
</presentation-mermaid>

### 2.2 Process Inventory

| Process ID | Process Name          | Automation Level | Current State       | Owner   |
| ---------- | --------------------- | ---------------- | ------------------- | ------- |
| P-001      | Syllabus Parsing      | 100% Automated   | ✅ Working          | Faculty |
| P-002      | Company Discovery     | 95% Automated    | ✅ Working          | System  |
| P-003      | Project Generation    | 90% Automated    | ⚠️ 75.7% success    | System  |
| P-004      | Project Curation      | 0% Automated     | ❌ 0 curated        | Faculty |
| P-005      | Student Application   | 100% Automated   | ⏸️ No live projects | Student |
| P-006      | Competency Extraction | 100% Automated   | ✅ 34 verified      | System  |
| P-007      | Job Matching          | 100% Automated   | ✅ 24 matches       | System  |
| P-008      | Demand Aggregation    | 100% Automated   | ✅ Working          | System  |
| P-009      | Employer Onboarding   | 50% Automated    | ❌ 0 employers      | Admin   |
| P-010      | Portfolio Export      | 100% Automated   | ✅ Available        | Student |

### 2.3 Critical Path Analysis

```
┌────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE BOTTLENECK ANALYSIS                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   238 Courses ──→ 292 Gen Runs ──→ 372 Projects ──→ 0 Curated         │
│         ↓              ↓              ↓              ↓                 │
│       100%           75.7%          100%           0%  ← BOTTLENECK    │
│                                                                        │
│   DIAGNOSIS: Faculty curation is the primary bottleneck                │
│   - 370 projects awaiting review                                       │
│   - 0 projects made available to students                              │
│   - Students cannot apply until faculty curates                        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Business Rules Engine

| Rule ID | Business Rule                             | Enforcement Point              | Status    |
| ------- | ----------------------------------------- | ------------------------------ | --------- |
| BR-001  | Faculty requires .edu email domain        | `handle_new_user()` trigger    | ✅ Active |
| BR-002  | Employers cannot use .edu email           | `handle_new_user()` trigger    | ✅ Active |
| BR-003  | Only employers can rate students          | `rate-student-performance` RLS | ✅ Active |
| BR-004  | Students only see curated_live projects   | RLS + Query filter             | ✅ Active |
| BR-005  | Faculty can only modify own courses       | RLS on `course_profiles`       | ✅ Active |
| BR-006  | Projects require LO alignment score > 0.5 | `generate-projects` logic      | ✅ Active |
| BR-007  | Company data cached for 7 days            | `company_filter_cache` TTL     | ✅ Active |
| BR-008  | Max 3 generation attempts per queue item  | `project_generation_queue`     | ✅ Active |

### 2.5 Process Health Dashboard

| KPI                                | Target | Actual         | Status | Trend           |
| ---------------------------------- | ------ | -------------- | ------ | --------------- |
| Parse Success Rate                 | >95%   | ~98%           | ✅     | Stable          |
| Discovery Yield (companies/course) | >10    | ~1.3 (320/238) | ⚠️     | Low             |
| Generation Success Rate            | >90%   | 75.7%          | ❌     | Needs attention |
| Curation Completion Rate           | >50%   | 0%             | ❌     | Critical        |
| Job Match Rate                     | >50%   | 70.6% (24/34)  | ✅     | Strong          |

### 2.6 Process Improvement Recommendations

1. **Immediate:** Create faculty notification when projects are ready for curation
2. **Short-term:** Add one-click "curate all" functionality for batch approval
3. **Medium-term:** Implement auto-curation based on threshold scores
4. **Long-term:** ML-based curation recommendations

---

## 3. Systems Architect Perspective

### 3.1 System Architecture Overview

<presentation-mermaid>
graph TB
    subgraph Frontend["PRESENTATION LAYER"]
        React[React 18 + TypeScript]
        Vite[Vite Build]
        Tailwind[TailwindCSS + shadcn/ui]
        Pages["21 Pages | ~100 Components | 8 Hooks"]
    end
    
    subgraph Backend["APPLICATION LAYER"]
        Edge["Supabase Edge Functions"]
        Shared["15 Shared Services"]
        Signals["4-Signal Scoring System"]
        Functions["36 Functions | Avg <3s execution"]
    end
    
    subgraph Data["DATA LAYER"]
        Postgres[(PostgreSQL 15)]
        Realtime["Supabase Realtime"]
        Storage["Supabase Storage"]
        Schema["19 Tables | 12 Functions | ~50 RLS Policies"]
    end
    
    subgraph External["INTEGRATION LAYER"]
        Apollo[Apollo.io]
        Gemini[Google Gemini 2.5]
        ONET[O*NET]
        Resend[Resend Email]
        Places[Google Places]
    end
    
    Frontend --> Backend
    Backend --> Data
    Backend --> External
</presentation-mermaid>

### 3.2 Edge Function Catalog

#### Core Workflow Functions (7)

| Function                        | Purpose                      | Avg Time | Auth    | Rate Limit         |
| ------------------------------- | ---------------------------- | -------- | ------- | ------------------ |
| `parse-syllabus`                | Extract course data from PDF | 30s      | JWT     | Standard           |
| `discover-companies`            | Find relevant companies      | 120s     | JWT     | Resource-Intensive |
| `generate-projects`             | Create project proposals     | 180s     | JWT     | Resource-Intensive |
| `run-single-project-generation` | Regenerate single project    | 60s      | JWT     | Standard           |
| `process-generation-queue`      | Async queue processor        | 5s       | Service | Standard           |
| `get-project-detail`            | Fetch complete project       | 200ms    | JWT     | Public-High        |
| `detect-location`               | Parse/geocode location       | 500ms    | Public  | Standard           |

#### Enrichment Functions (4)

| Function                     | Purpose                   | Trigger    | Status     |
| ---------------------------- | ------------------------- | ---------- | ---------- |
| `data-enrichment-pipeline`   | Deep Apollo enrichment    | Manual     | ✅ Secured |
| `apollo-webhook-listener`    | Real-time signal capture  | Webhook    | Active     |
| `project-suitability-scorer` | Score signals to projects | DB trigger | Active     |
| `migrate-technology-format`  | Data migration utility    | One-time   | Deprecated |

#### Intelligence Functions (5)

| Function                   | Purpose                         | Output           | Dependencies |
| -------------------------- | ------------------------------- | ---------------- | ------------ |
| `analyze-project-value`    | Calculate ROI/stakeholder value | project_metadata | Gemini       |
| `skill-gap-analyzer`       | Compare skills vs jobs          | Gap analysis     | O\*NET       |
| `career-pathway-mapper`    | O\*NET career trajectories      | Career paths     | O\*NET       |
| `salary-roi-calculator`    | Financial impact analysis       | ROI metrics      | BLS data     |
| `aggregate-demand-signals` | Aggregate marketplace data      | demand_signals   | Database     |

#### Student Functions (4)

| Function                  | Purpose                     | Trigger            | Success Metrics |
| ------------------------- | --------------------------- | ------------------ | --------------- |
| `competency-extractor`    | Extract verified skills     | Project completion | 34 verified     |
| `job-matcher`             | Match skills to Apollo jobs | Competency insert  | 24 matches      |
| `student-project-matcher` | Recommend projects          | Manual             | Active          |
| `portfolio-export`        | Generate PDF portfolio      | Manual             | Available       |

### 3.3 Shared Services Architecture

```
supabase/functions/_shared/
├── Security (Module 1 - COMPLETE)
│   ├── auth-middleware.ts      # JWT verification (Bits 1.1-1.4)
│   ├── cors.ts                 # Security headers (Bit 1.5)
│   ├── json-parser.ts          # Safe parsing (Bit 1.6)
│   ├── input-validation.ts     # UUID/string validation (Bit 1.7)
│   └── rate-limit-headers.ts   # Rate limiting (Bit 1.8)
│
├── AI/ML Services
│   ├── generation-service.ts   # AI generation orchestration
│   ├── skill-extraction-service.ts
│   ├── embedding-service.ts    # Semantic embeddings
│   └── semantic-matching-service.ts
│
├── External APIs
│   ├── onet-service.ts         # O*NET API client
│   ├── esco-provider.ts        # ESCO skills taxonomy
│   ├── lightcast-service.ts    # (Deprecated)
│   └── occupation-coordinator.ts
│
├── Business Logic
│   ├── alignment-service.ts    # LO alignment scoring
│   ├── pricing-service.ts      # Budget/ROI calculations
│   ├── company-validation-service.ts
│   └── context-aware-industry-filter.ts
│
├── Signal System
│   └── signals/
│       ├── signal-orchestrator.ts
│       ├── job-skills-signal.ts      # Signal 1
│       ├── market-intel-signal.ts    # Signal 2
│       ├── department-fit-signal.ts  # Signal 3
│       └── contact-quality-signal.ts # Signal 4
│
└── Utilities
    ├── geo-distance.ts
    ├── error-handler.ts
    ├── types.ts
    └── course-soc-mapping.ts
```

### 3.4 Database Schema (Entity Relationships)

<presentation-mermaid>
erDiagram
    profiles ||--o{ user_roles : has
    profiles ||--o{ course_profiles : owns
    
    course_profiles ||--o{ generation_runs : triggers
    course_profiles ||--o{ projects : contains
    course_profiles ||--o{ company_filter_cache : caches
    
    projects ||--|| project_forms : has
    projects ||--|| project_metadata : has
    projects ||--o{ project_applications : receives
    projects ||--o{ evaluations : receives
    projects ||--o{ partnership_proposals : has
    projects }o--|| company_profiles : from
    
    company_profiles ||--o{ company_signals : receives
    
    project_applications }o--|| profiles : by_student
    
    verified_competencies }o--|| profiles : belongs_to
    verified_competencies }o--|| projects : from
    verified_competencies ||--o{ job_matches : generates
    
    demand_signals ||--o{ employer_interest_submissions : receives
    demand_signals ||--o{ dashboard_analytics : tracks
</presentation-mermaid>

### 3.5 Security Architecture (Module 1 Complete)

| Layer                | Implementation            | Status | Bit     |
| -------------------- | ------------------------- | ------ | ------- |
| **Authentication**   | Supabase Auth (JWT)       | ✅     | -       |
| **Authorization**    | RLS + has_role() function | ✅     | -       |
| **Edge Auth**        | auth-middleware.ts        | ✅     | 1.1-1.4 |
| **CORS/Headers**     | Hardened cors.ts          | ✅     | 1.5     |
| **JSON Safety**      | json-parser.ts            | ✅     | 1.6     |
| **Input Validation** | input-validation.ts       | ✅     | 1.7     |
| **Rate Limiting**    | rate-limit-headers.ts     | ✅     | 1.8     |
| **RLS Policies**     | ~50 policies active       | ✅     | -       |
| **Linter Status**    | No issues found           | ✅     | -       |

### 3.6 Technical Debt Inventory

| ID     | Area        | Description                       | Priority | Effort | Impact   |
| ------ | ----------- | --------------------------------- | -------- | ------ | -------- |
| TD-001 | Generation  | 24.3% generation failure rate     | P0       | Medium | Critical |
| TD-002 | Reliability | No atomic deletion pattern        | P1       | Medium | High     |
| TD-003 | Reliability | No retry logic for external APIs  | P1       | Medium | High     |
| TD-004 | Type Safety | ~30 `any` types in edge functions | P2       | Medium | Medium   |
| TD-005 | Testing     | No automated test suite           | P1       | High   | Critical |
| TD-006 | Caching     | Cache invalidation incomplete     | P2       | Low    | Medium   |
| TD-007 | Logging     | Debug logs in production          | P3       | Low    | Low      |
| TD-008 | Dead Code   | Deprecated Lightcast services     | P3       | Low    | Low      |

---

## 4. Product & UX Architect Perspective

### 4.1 User Role Matrix

| Role         | Primary Goal               | Entry Point     | Key Actions               | Current Friction          |
| ------------ | -------------------------- | --------------- | ------------------------- | ------------------------- |
| **Student**  | Build verified portfolio   | `/projects`     | Apply, Complete, Export   | No live projects to apply |
| **Faculty**  | Generate industry projects | `/upload`       | Upload, Configure, Curate | Curation backlog          |
| **Employer** | Access talent pipeline     | `/demand-board` | Express interest, Rate    | No onboarding flow        |
| **Admin**    | Manage platform            | `/admin-hub`    | Approve roles, Analytics  | Manual processes          |

### 4.2 Page Inventory (21 Routes)

| Route                            | Component               | Access   | Purpose                | Health     |
| -------------------------------- | ----------------------- | -------- | ---------------------- | ---------- |
| `/`                              | Landing                 | Public   | Marketing              | ✅         |
| `/auth`                          | Auth                    | Public   | Login/Signup           | ✅         |
| `/demand-board`                  | DemandBoard             | Public   | Employer marketplace   | ✅         |
| `/upload`                        | Upload                  | Faculty  | Syllabus upload        | ✅         |
| `/review-syllabus`               | ReviewSyllabus          | Faculty  | Review parsed data     | ✅         |
| `/configure`                     | Configure               | Faculty  | Generation settings    | ✅         |
| `/projects`                      | Projects                | Auth     | Browse projects        | ✅         |
| `/projects/:id`                  | ProjectDetail           | Auth     | Detailed view (9 tabs) | ⚠️ Complex |
| `/dashboard`                     | Dashboard               | Auth     | Role-based redirect    | ✅         |
| `/instructor/dashboard`          | InstructorDashboard     | Faculty  | Faculty overview       | ✅         |
| `/student/dashboard`             | StudentDashboard        | Student  | Student overview       | ⏸️         |
| `/my-opportunities`              | MyOpportunities         | Student  | Job matches            | ✅         |
| `/my-competencies`               | MyCompetencies          | Student  | Skills portfolio       | ✅         |
| `/employer/dashboard`            | EmployerDashboard       | Employer | Company view           | ⏸️         |
| `/admin-hub`                     | AdminHub                | Admin    | Admin controls         | ✅         |
| `/admin-hub/metrics`             | AdminMetrics            | Admin    | Analytics              | ✅         |
| `/admin-hub/roles`               | RoleManagement          | Admin    | User roles             | ✅         |
| `/admin-hub/import-universities` | AdminImportUniversities | Admin    | Data import            | ✅         |
| `/admin-hub/provider-test`       | AdminProviderTest       | Admin    | API testing            | ✅         |

### 4.3 User Journey Maps

#### Faculty Journey (Primary Persona - 11 Users)

<presentation-mermaid>
journey
    title Faculty User Journey
    section Onboarding
      Sign up with .edu email: 5: Faculty
      Wait for admin approval: 2: Faculty
      Get faculty role: 4: Faculty
    section Core Workflow
      Upload syllabus (PDF): 5: Faculty
      Review parsed course data: 4: Faculty
      Configure generation settings: 4: Faculty
      Wait for AI generation (~3 min): 3: Faculty
      Review generated projects: 4: Faculty
      Curate projects for students: 3: Faculty
    section Ongoing
      Monitor student applications: 3: Faculty
      Track project completions: 3: Faculty
</presentation-mermaid>

**Pain Points:**

- 8 pending faculty awaiting approval (72% of active faculty)
- 370 projects awaiting curation (0% curated)
- No notification when projects ready for review

#### Student Journey (25 Users)

<presentation-mermaid>
journey
    title Student User Journey
    section Onboarding
      Sign up (any email): 5: Student
      Auto-assigned student role: 5: Student
    section Discovery
      Browse curated projects: 1: Student
      Filter by sector/skills: 1: Student
    section Engagement
      Apply to projects: 1: Student
      Complete assigned work: 1: Student
      Get skills verified: 4: Student
    section Career
      View job matches: 4: Student
      Export portfolio PDF: 4: Student
</presentation-mermaid>

**Pain Points:**

- 0 curated projects available to browse/apply
- Students blocked on faculty curation bottleneck
- Journey effectively stalled at "Discovery" stage

### 4.4 UX Quality Assessment

| Journey Stage    | Quality    | Issues                            | Priority |
| ---------------- | ---------- | --------------------------------- | -------- |
| Signup           | ⭐⭐⭐⭐   | Pending role delays               | Medium   |
| Upload           | ⭐⭐⭐⭐⭐ | None                              | -        |
| Configure        | ⭐⭐⭐     | Long wait times, unclear progress | High     |
| Projects List    | ⭐⭐⭐⭐   | Filter complexity                 | Low      |
| Project Detail   | ⭐⭐⭐     | 9 tabs overwhelming               | Medium   |
| Student Matching | ⭐⭐       | No live projects                  | Critical |
| Employer Portal  | ⭐⭐       | Limited features, 0 users         | High     |

### 4.5 Feature Completeness Matrix

| Feature                 | Status         | Evidence                 |
| ----------------------- | -------------- | ------------------------ |
| Syllabus Parsing        | ✅ Complete    | 238 courses parsed       |
| Company Discovery       | ✅ Complete    | 320 companies found      |
| Project Generation      | ✅ Complete    | 372 projects created     |
| 4-Signal Scoring        | ✅ Complete    | Active on all projects   |
| Student Applications    | ⏸️ Blocked     | 0 curated projects       |
| Competency Verification | ✅ Complete    | 34 competencies verified |
| Job Matching            | ✅ Complete    | 24 matches created       |
| Portfolio Export        | ✅ Complete    | PDF available            |
| Employer Rating         | ✅ Complete    | Endpoint active          |
| Email Notifications     | 🟡 Partial     | Framework only           |
| Faculty Analytics       | ❌ Not Started | No dashboard             |
| In-App Messaging        | ❌ Not Started | -                        |
| Multi-University        | ❌ Not Started | -                        |

---

## 5. VP Synthesis: Strategic Resource Orchestration

### 5.1 Platform Positioning

**EduThree occupies a unique market position** at the intersection of:

- **EdTech** (curriculum-to-industry alignment)
- **HR Tech** (talent pipeline automation)
- **Marketplace** (triple-sided matching)

**Competitive Moats:**

1. **Data Network Effect**: More syllabi → better matching → more employers → more syllabi
2. **Intelligence Layer**: Proprietary 4-signal scoring system
3. **Verified Competencies**: Employer-validated skills (not self-reported)
4. **Time Compression**: 95% reduction in partnership development time

### 5.2 Current State Reality Check

| Dimension                  | Goal                | Reality                 | Gap Analysis             |
| -------------------------- | ------------------- | ----------------------- | ------------------------ |
| **Faculty Adoption**       | Growing             | 11 active, 8 pending    | Need approval automation |
| **Student Engagement**     | Active applications | 0 applications possible | Blocked by curation      |
| **Employer Participation** | Pipeline building   | 0 employers             | No onboarding path       |
| **Project Flow**           | Continuous          | Stalled at curation     | Manual bottleneck        |

### 5.3 The Critical Bottleneck

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PLATFORM HEALTH DIAGNOSIS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   INPUT: 238 courses → OUTPUT: 0 curated projects → IMPACT: 0 hires    │
│                                                                         │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐              │
│   │   HEALTHY   │     │  CRITICAL   │     │   BLOCKED   │              │
│   │  Generation │ ──→ │  Curation   │ ──→ │  Student    │              │
│   │  372 proj   │     │  0 curated  │     │  Engagement │              │
│   └─────────────┘     └─────────────┘     └─────────────┘              │
│                              ↑                                          │
│                              │                                          │
│                       ROOT CAUSE:                                       │
│                       - No curation UX                                  │
│                       - No notifications                                │
│                       - High cognitive load                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Strategic Recommendations

#### Immediate (0-7 days) - Unblock the Pipeline

| Priority | Action                                     | Owner       | Impact              |
| -------- | ------------------------------------------ | ----------- | ------------------- |
| P0       | Add "Quick Curate" button on project cards | Engineering | Unblocks students   |
| P0       | Send email to faculty when projects ready  | Engineering | Awareness           |
| P0       | Approve pending 8 faculty                  | Admin       | +72% active faculty |
| P1       | Complete Module 2 reliability fixes        | Engineering | 95%+ gen rate       |

#### Short-Term (7-30 days) - Enable Growth

| Priority | Action                             | Owner       | Impact      |
| -------- | ---------------------------------- | ----------- | ----------- |
| P1       | Faculty analytics dashboard        | Engineering | Retention   |
| P1       | Batch curation interface           | Engineering | Efficiency  |
| P1       | Employer self-signup flow          | Engineering | New segment |
| P2       | Simplify Project Detail (9→5 tabs) | Engineering | UX quality  |

#### Medium-Term (30-90 days) - Scale

| Priority | Action                                 | Owner       | Impact            |
| -------- | -------------------------------------- | ----------- | ----------------- |
| P1       | Automated test suite                   | Engineering | Reliability       |
| P2       | Auto-curation based on score threshold | Engineering | Reduce bottleneck |
| P2       | In-app messaging                       | Engineering | Engagement        |
| P2       | Mobile-responsive optimization         | Engineering | Accessibility     |

### 5.5 Resource Allocation Matrix

| Resource Type                   | Current State    | Optimization Opportunity        |
| ------------------------------- | ---------------- | ------------------------------- |
| **Compute (36 Edge Functions)** | Well-distributed | Consolidate admin utilities     |
| **AI Credits (Gemini)**         | Per-generation   | Cache SOC mappings aggressively |
| **API Credits (Apollo)**        | ~$0.10/company   | 7-day cache working             |
| **Storage**                     | Syllabi + cache  | Implement cleanup cron          |
| **Human (Admin)**               | Manual approvals | Add auto-approve rules          |

### 5.6 Risk Assessment

| Risk                         | Probability | Impact   | Mitigation                  | Status       |
| ---------------------------- | ----------- | -------- | --------------------------- | ------------ |
| Curation bottleneck persists | High        | Critical | Add batch curation UX       | ❌ Open      |
| Generation failures increase | Medium      | High     | Module 2 reliability        | 🟡 Planned   |
| Apollo API changes           | Low         | High     | Provider abstraction exists | ✅ Mitigated |
| AI cost escalation           | Medium      | Medium   | Aggressive caching          | 🟡 Partial   |
| Security breach              | Low         | Critical | Module 1 complete           | ✅ Mitigated |
| Faculty churn                | Medium      | High     | Analytics + notifications   | ❌ Open      |

### 5.7 Key Performance Indicators

#### Business KPIs (Need Instrumentation)

| KPI                      | Target   | Current                      | Action Required           |
| ------------------------ | -------- | ---------------------------- | ------------------------- |
| Faculty Activation Rate  | >70%     | Unknown                      | Add tracking              |
| Projects Curated/Week    | >50      | 0                            | Unblock curation          |
| Student Application Rate | >30%     | 0%                           | Requires curated projects |
| Employer Conversion      | >10%     | N/A                          | 0 employers               |
| Time-to-First-Job-Match  | <90 days | 34 competencies → 24 matches | On track                  |

#### Technical KPIs

| KPI                     | Target | Current       | Status               |
| ----------------------- | ------ | ------------- | -------------------- |
| Generation Success Rate | >95%   | 75.7%         | ❌ Needs improvement |
| API Response Time (p95) | <3s    | ~2.5s         | ✅                   |
| Security Compliance     | 100%   | Module 1 done | ✅                   |
| Error Rate              | <1%    | ~2%           | ⚠️                   |
| Uptime                  | 99.9%  | ~99.5%        | ⚠️                   |

---

## 6. Appendices

### A. Technology Stack

| Layer      | Technology     | Version |
| ---------- | -------------- | ------- |
| Frontend   | React          | 18.3.1  |
| Build      | Vite           | Latest  |
| Styling    | Tailwind CSS   | 3.x     |
| Components | shadcn/ui      | Latest  |
| State      | TanStack Query | 5.83.0  |
| Routing    | React Router   | 6.30.1  |
| Backend    | Supabase Cloud | Latest  |
| Runtime    | Deno Edge      | Latest  |
| Database   | PostgreSQL     | 15      |
| AI         | Google Gemini  | 2.5     |

### B. External Dependencies

| Service       | Purpose         | Criticality | Fallback     |
| ------------- | --------------- | ----------- | ------------ |
| Supabase      | Platform        | Critical    | None         |
| Google Gemini | AI Generation   | Critical    | None         |
| Apollo.io     | Company/Contact | High        | Cached data  |
| O\*NET        | Occupation data | Medium      | SOC mappings |
| Resend        | Email           | Medium      | Queue/retry  |
| Google Places | Location        | Low         | Manual entry |

### C. Documentation Index

| Document                                                    | Purpose            |
| ----------------------------------------------------------- | ------------------ |
| `docs/COMPLETE_ARCHITECTURE_DOCUMENTATION.md`               | System design      |
| `docs/architecture/SIGNAL_DRIVEN_DISCOVERY_ARCHITECTURE.md` | Discovery logic    |
| `docs/AGENT_MANAGEMENT_PROTOCOL.md`                         | Bug fix procedures |
| `docs/AGENT_SESSION_STATE.md`                               | Current work state |
| `docs/USER_JOURNEY_FLOWCHARTS.md`                           | UX flows           |
| `CHECKPOINT.md`                                             | Phase tracking     |

### D. Security Module Status

| Module                          | Bits | Status      |
| ------------------------------- | ---- | ----------- |
| **Module 1: Critical Security** | 8/8  | ✅ COMPLETE |
| Module 2: Reliability           | 0/8  | ⬜ Next     |
| Module 3: Code Quality          | 0/8  | ⬜ Pending  |
| Module 4: Enhancements          | 0/8  | ⬜ Pending  |

### E. Quick Action Items for Next Session

1. **Unblock Students:** Add quick curation UI
2. **Notify Faculty:** Implement email when projects ready
3. **Approve Pending:** Clear 8 pending faculty approvals
4. **Fix Generation:** Module 2 to improve 75.7% → 95%
5. **Track Metrics:** Instrument business KPIs

---

**Document Prepared By:** Multi-Perspective AI Analysis  
**Perspectives Synthesized:** Business Process, Systems Architecture, Product/UX, VP Strategy  
**Review Status:** Ready for stakeholder action  
**Next Update:** After curation bottleneck resolution
