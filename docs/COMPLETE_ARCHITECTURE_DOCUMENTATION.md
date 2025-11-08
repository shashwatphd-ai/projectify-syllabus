# EduThree Complete Architecture Documentation

## Executive Summary

EduThree is an intelligent three-sided marketplace platform that bridges academia and industry by:
1. Transforming academic coursework into industry-sponsored projects
2. Matching student capabilities with verified company needs
3. Facilitating partnerships between universities and employers

**Technology Stack:** React + TypeScript + Vite (Frontend) | Supabase (Backend) | AI/ML (Intelligence Layer)

---

## Part 1: Business Architecture

### 1.1 The Three-Sided Marketplace

#### Stakeholder 1: Universities/Instructors
**Value Proposition:** Transform syllabus into industry partnerships automatically
- **Input:** Course syllabus (PDF upload)
- **Process:** AI-powered company discovery, project generation, partnership facilitation
- **Output:** Ready-to-use industry-sponsored projects matching learning outcomes
- **Time Savings:** 95% reduction in partnership sourcing time

#### Stakeholder 2: Students
**Value Proposition:** Real-world experience with verified skill development
- **Input:** Complete assigned projects
- **Process:** Work on industry-relevant challenges, build portfolio
- **Output:** Verified competencies, job matching, portfolio evidence
- **Career Impact:** 10x career advancement potential

#### Stakeholder 3: Companies/Employers
**Value Proposition:** Cost-effective talent pipeline and project delivery
- **Input:** Express interest in student talent pools
- **Process:** Receive project proposals, review student work, identify talent
- **Output:** Completed projects at 90% cost reduction vs. consultants
- **Hiring Pipeline:** Direct access to pre-vetted talent

### 1.2 Core Business Workflows

#### Workflow A: Syllabus → Projects (Instructor Journey)
```
1. Upload syllabus → 2. AI parses course → 3. Discover companies →
4. Generate projects → 5. Review/curate → 6. Assign to students →
7. Monitor progress → 8. Facilitate partnerships
```

#### Workflow B: Projects → Portfolio (Student Journey)
```
1. View opportunities → 2. Apply to projects → 3. Complete work →
4. Submit deliverables → 5. Get verified competencies →
6. Receive job matches → 7. Build portfolio
```

#### Workflow C: Demand → Talent (Employer Journey)
```
1. View demand board → 2. Express interest → 3. Review proposals →
4. Sponsor projects → 5. Review student work → 6. Hire talent
```

### 1.3 Intelligence Layers (The "Moat")

#### Layer 1: Syllabus Intelligence
- **Function:** Extract learning outcomes, skills, course constraints
- **Technology:** NLP, structured data extraction
- **Output:** Machine-readable course profile

#### Layer 2: Market Intelligence
- **Function:** Identify companies with proven needs
- **Data Sources:** Apollo.io (jobs, funding, tech stack), enrichment APIs
- **Output:** Scored, verified company profiles

#### Layer 3: Project Intelligence
- **Function:** Generate relevant, feasible project scopes
- **Matching Logic:** Learning outcomes + company needs + feasibility
- **Output:** Scored, curated projects

---

## Part 2: Technical Architecture

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  React + TypeScript + Vite + TailwindCSS + Shadcn/ui       │
│                                                              │
│  /landing → /auth → /upload → /configure → /projects       │
│  /instructor-dashboard → /my-opportunities                  │
│  /demand-board (public) → /employer-dashboard               │
│  /admin-hub → /admin-metrics                                │
└─────────────────────────────────────────────────────────────┘
                            ↓↑
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│              Supabase Edge Functions (Deno)                  │
│                                                              │
│  • parse-syllabus          • generate-projects               │
│  • discover-companies      • data-enrichment-pipeline        │
│  • aggregate-demand-signals • job-matcher                    │
│  • competency-extractor    • analyze-project-value           │
│  • apollo-webhook-listener • project-suitability-scorer      │
│  • submit-employer-interest • portfolio-export               │
└─────────────────────────────────────────────────────────────┘
                            ↓↑
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│              Supabase PostgreSQL + Storage                   │
│                                                              │
│  Tables: profiles, user_roles, course_profiles, projects,   │
│  company_profiles, demand_signals, job_matches,             │
│  verified_competencies, partnership_proposals, evaluations  │
│                                                              │
│  Storage: syllabi bucket (private)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓↑
┌─────────────────────────────────────────────────────────────┐
│                   INTEGRATION LAYER                          │
│              External APIs & Services                        │
│                                                              │
│  • Apollo.io (company data, jobs)                           │
│  • Google Gemini (AI/NLP)                                   │
│  • Resend (transactional email)                             │
│  • Google Places (location enrichment)                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Database Schema

#### Core Tables & Relationships

**Authentication & Users**
- `profiles` - User basic info (1:1 with auth.users)
- `user_roles` - Multi-role support (1:N with profiles)
  - Roles: student, instructor, employer, admin

**Academic Domain**
- `course_profiles` - Parsed syllabus data
  - Fields: title, level, outcomes, schedule, artifacts, owner_id
  - Owner: instructor (profiles.id)
- `projects` - Generated project opportunities
  - Fields: title, description, tasks, deliverables, scoring, status
  - Relationships: course_id → course_profiles, company_profile_id → company_profiles

**Company Domain**
- `company_profiles` - Permanent company data store
  - Fields: name, sector, contact info, technologies, job_postings, apollo_organization_id
  - Enrichment: Apollo data, funding, tech stack, open roles
- `company_signals` - Real-time market signals (Apollo webhooks)
  - Triggers: project-suitability-scorer on insert

**Marketplace Domain**
- `demand_signals` - Aggregated student demand by skill/region
  - Derived from: projects table (via aggregate-demand-signals)
  - Public read access (powers /demand-board)
- `employer_interest_submissions` - Employer lead capture
  - Relationships: demand_signal_id → demand_signals

**Student Domain**
- `verified_competencies` - Skill verification from completed projects
  - Fields: student_id, skill_name, project_id, portfolio_evidence_url
  - Trigger: Created when project.status = 'completed'
- `job_matches` - AI-matched job opportunities
  - Fields: student_id, competency_id, apollo_job_id, status
  - Relationships: Links students to Apollo job postings

**Collaboration Domain**
- `partnership_proposals` - Instructor → Company outreach
- `project_applications` - Student → Project applications
- `evaluations` - Feedback on projects (students, instructors, employers)

**System Domain**
- `generation_runs` - Audit trail for project generation workflow
  - Tracks: companies discovered, enriched, projects generated, AI tokens used
- `company_filter_cache` - Performance optimization (7-day TTL)
- `dashboard_analytics` - User behavior tracking

#### RLS (Row-Level Security) Policies

**Key Security Rules:**
- Students: Can only view/modify their own data
- Instructors: Can only view/modify courses they own + related projects
- Employers: Can only view/modify their company profile
- Admins: Full read access to all data
- Service Role: Full access (edge functions only)

### 2.3 Edge Functions Architecture

#### Function Categories

**1. Core Workflow Functions**

**`parse-syllabus`**
- **Trigger:** Manual (Upload page)
- **Input:** Syllabus file from storage
- **Process:** AI extraction of course metadata, outcomes, schedule
- **Output:** course_profiles record
- **AI Model:** Google Gemini

**`discover-companies`**
- **Trigger:** Manual (Configure page)
- **Input:** Course profile, filter criteria (location, industries)
- **Process:** Query Apollo.io API, score companies, store profiles
- **Output:** company_profiles records, updated generation_run
- **Provider Pattern:** Pluggable (Apollo, Google Places, future: Clearbit)

**`generate-projects`**
- **Trigger:** Manual (Configure page, after discover-companies)
- **Input:** Course profile, discovered companies, team count
- **Process:** AI project generation, LO alignment scoring, feasibility scoring
- **Output:** projects + project_metadata + project_forms records
- **AI Model:** Google Gemini
- **Scoring:** Uses alignment-service, pricing-service

**2. Enrichment Functions**

**`data-enrichment-pipeline`**
- **Trigger:** Manual (can be scheduled)
- **Input:** company_profiles with apollo_organization_id
- **Process:** Fetch detailed Apollo data (contacts, tech stack, funding)
- **Output:** Enriched company_profiles (contact_*, organization_*, technologies_used)

**`apollo-webhook-listener`**
- **Trigger:** Webhook from Apollo.io
- **Input:** Real-time company signals (funding, hiring, tech changes)
- **Process:** Create company_signals record
- **Output:** Triggers project-suitability-scorer via DB trigger

**`project-suitability-scorer`**
- **Trigger:** Automatic (DB trigger on company_signals insert)
- **Input:** company_signal with apollo_webhook_payload
- **Process:** Score signal against existing projects
- **Output:** Updated company_signals.project_score

**3. Aggregation Functions**

**`aggregate-demand-signals`**
- **Trigger:** Manual (Admin or scheduled)
- **Input:** All projects with status 'ai_shell' or 'curated_live'
- **Process:** Group by sector + region, extract skills, count students
- **Output:** demand_signals records (public marketplace data)
- **Business Logic:** Powers /demand-board

**4. Student Functions**

**`competency-extractor`**
- **Trigger:** Automatic (DB trigger when project.status = 'completed')
- **Input:** Completed project data
- **Process:** AI extraction of demonstrated skills
- **Output:** verified_competencies records

**`job-matcher`**
- **Trigger:** Manual or scheduled
- **Input:** Student competencies, Apollo job postings
- **Process:** AI matching of skills to job requirements
- **Output:** job_matches records

**5. Value Analysis Functions**

**`analyze-project-value`**
- **Trigger:** Manual (Project detail page)
- **Input:** Project ID
- **Process:** Calculate stakeholder value, ROI, pricing
- **Output:** Updated project_metadata (value_analysis, stakeholder_insights, pricing_breakdown)
- **Shared Services:** pricing-service ($/hr calculations, ROI models)

**6. User-Facing Functions**

**`submit-employer-interest`**
- **Trigger:** Public (Demand board form)
- **Input:** Employer contact, demand_signal_id, project details
- **Process:** Create lead, send notification
- **Output:** employer_interest_submissions record

**`portfolio-export`**
- **Trigger:** Manual (Student dashboard)
- **Input:** Student ID
- **Process:** Generate PDF portfolio with verified competencies
- **Output:** PDF download

**7. Admin Functions**

**`admin-regenerate-projects`**
- **Trigger:** Manual (Admin hub)
- **Input:** None (processes all 'ai_shell' projects)
- **Process:** Calls run-single-project-generation for each project
- **Output:** Updated projects with new AI-generated content

**`run-single-project-generation`**
- **Trigger:** Called by admin-regenerate-projects
- **Input:** Project ID
- **Process:** Re-generate project with latest AI prompt
- **Output:** Updated project record

**`get-project-detail`**
- **Trigger:** Frontend (Project detail page)
- **Input:** Project ID
- **Process:** Fetch project with all related data (forms, metadata, company)
- **Output:** Complete project object

**`get-apollo-org-id`**
- **Trigger:** Manual (debugging/admin)
- **Input:** Company domain
- **Process:** Query Apollo API for organization ID
- **Output:** Apollo organization ID

**`investigate-apollo-jobs`**
- **Trigger:** Manual (debugging/admin)
- **Input:** Search criteria
- **Process:** Query Apollo job postings API
- **Output:** Job listings data

**`migrate-technology-format`**
- **Trigger:** One-time migration
- **Input:** company_profiles records
- **Process:** Convert old technology format to new JSONB format
- **Output:** Updated company_profiles.technologies

**`detect-location`**
- **Trigger:** Internal (used by other functions)
- **Input:** City/zip string
- **Process:** Parse and geocode location
- **Output:** Structured location data

#### Shared Services (`_shared/`)

**`alignment-service.ts`**
- Learning outcome alignment scoring
- Deliverable → LO mapping
- Task → LO mapping

**`pricing-service.ts`**
- Project pricing calculations ($/hour × duration)
- ROI models (student value, company savings, university impact)
- Pricing tier logic

**`generation-service.ts`**
- AI prompt templates
- Project generation orchestration

**`types.ts`**
- Shared TypeScript interfaces
- Database type definitions (subset)

**`cors.ts`**
- CORS headers for edge functions

### 2.4 Frontend Architecture

#### Page Components (`src/pages/`)

**Public Pages**
- `Landing.tsx` - Marketing landing page
- `Auth.tsx` - Login/signup (no anonymous auth)
- `DemandBoard.tsx` - Public marketplace (employer-facing)

**Instructor Flow**
- `Upload.tsx` - Syllabus upload interface
- `ReviewSyllabus.tsx` - Review parsed syllabus
- `Configure.tsx` - Configure project generation (filters, team count)
- `Projects.tsx` - View generated projects list
- `ProjectDetail.tsx` - Detailed project view with tabs
- `InstructorDashboard.tsx` - Overview + analytics

**Student Flow**
- `MyOpportunities.tsx` - Browse and apply to projects
- `MyCompetencies.tsx` - View verified skills and job matches

**Employer Flow**
- `EmployerDashboard.tsx` - Company profile + analytics

**Admin Flow**
- `AdminHub.tsx` - Admin controls (regenerate, etc.)
- `AdminMetrics.tsx` - System metrics and monitoring

**Utility**
- `Index.tsx` - Role-based routing (redirects to appropriate dashboard)
- `NotFound.tsx` - 404 page

#### Component Architecture (`src/components/`)

**Project Detail Components (`project-detail/`)**
- `ProjectHeader.tsx` - Title, company, scoring display
- `OverviewTab.tsx` - Project description and overview
- `AcademicTab.tsx` - Learning outcomes, alignment
- `LogisticsTab.tsx` - Timeline, team size, milestones
- `ContactTab.tsx` - Company contact information
- `TimelineTab.tsx` - Project schedule and milestones
- `MarketInsightsTab.tsx` - Company market data (funding, tech stack)
- `AlgorithmTab.tsx` - Scoring rationale, companies considered
- `ValueAnalysisTab.tsx` - Stakeholder value, pricing, ROI
- `VerificationTab.tsx` - Data sources and quality scores
- `EnrichmentPanel.tsx` - Company enrichment UI
- `LearningOutcomeAlignment.tsx` - LO → deliverable mapping
- `StakeholderValueCard.tsx` - Value proposition cards
- `AnalyzeValueButton.tsx` - Trigger value analysis

**Demand Dashboard Components (`demand-dashboard/`)**
- `DemandBoardLayout.tsx` - Marketplace layout and filters
- `DemandSignalCard.tsx` - Individual demand signal card (Elemental Theme)
- `EmployerCTAModal.tsx` - Interest submission form

**Shared Components**
- `Header.tsx` - Navigation bar with role-based menus
- `SyllabusReview.tsx` - Syllabus review/edit interface
- `ProjectFeedback.tsx` - Project evaluation form
- `ProposePartnershipDialog.tsx` - Partnership proposal form

**UI Components (`ui/`)**
- Shadcn/ui components (button, card, dialog, form, table, etc.)
- Design system implementation

#### Custom Hooks (`src/hooks/`)

- `useAuth.tsx` - Authentication state and role management
- `useDemandSignals.ts` - Fetch demand signals for marketplace
- `useNewJobMatchCount.ts` - Real-time job match notifications
- `useProjectAnalytics.ts` - Project performance metrics
- `use-mobile.tsx` - Responsive breakpoint detection
- `use-toast.ts` - Toast notification system

#### Utilities (`src/lib/`)

- `supabase.ts` - Auth service wrapper
- `analytics.ts` - Event tracking utility
- `downloadPdf.ts` - PDF generation utility
- `utils.ts` - General utilities (cn, etc.)

#### Routing Structure

```
/ (Landing)
├── /auth (Login/Signup)
├── /demand-board (Public Marketplace) ← No auth required
│
├── /upload (Instructor: Start workflow)
├── /review-syllabus (Instructor: Review parsed data)
├── /configure (Instructor: Configure generation)
├── /projects (Instructor: View all projects)
├── /project/:id (Instructor: Project detail)
├── /instructor-dashboard (Instructor: Home)
│
├── /my-opportunities (Student: Browse projects)
├── /my-competencies (Student: Skills + job matches)
│
├── /employer-dashboard (Employer: Company profile)
│
├── /admin-hub (Admin: System controls)
└── /admin-metrics (Admin: Analytics)
```

### 2.5 State Management

**Authentication State**
- Managed by: `useAuth` hook + Supabase auth
- Stored in: localStorage (Supabase session)
- Access: `auth.uid()` in RLS policies

**Data Fetching**
- Library: `@tanstack/react-query`
- Pattern: Server state cached in React Query
- Realtime: Not currently implemented (future: Supabase Realtime)

**Form State**
- Library: `react-hook-form` + `zod` validation
- Pattern: Controlled forms with validation schemas

**UI State**
- Pattern: Local component state (useState)
- Global: Toast notifications (Sonner)

### 2.6 Design System ("EduThree Elemental Theme")

**Color System (HSL tokens)**
- `--primary` - Brand color (CTA buttons, links)
- `--secondary` - Secondary surfaces
- `--accent` - Highlights
- `--muted` - De-emphasized content
- `--foreground` - Primary text
- `--background` - Page background

**Typography Hierarchy**
- P0 (CTA): Full-width buttons, primary color
- P1 (Primary): `text-xl font-bold` (titles, key metrics)
- P2 (Secondary): `text-lg font-semibold` (important data)
- P3 (Tertiary): `text-sm text-muted-foreground` (ancillary data)

**Component Patterns**
- Cards: `flex flex-col` with CTA at bottom
- Grids: Responsive (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- Badges: `flex-wrap` for skill lists
- Full-width CTAs: `w-full variant="default"`

**Files**
- `src/index.css` - Design tokens and global styles
- `tailwind.config.ts` - Tailwind configuration
- `src/components/ui/` - Component implementations

---

## Part 3: Technology ↔ Business Mapping

### 3.1 How Technology Enables Each Business Value

#### Instructor Value: "95% Time Savings"

**Technology Stack:**
1. `parse-syllabus` (AI) - Eliminates manual course data entry
2. `discover-companies` (Apollo API + AI filtering) - Eliminates manual research
3. `generate-projects` (AI + alignment-service) - Eliminates manual project design
4. `aggregate-demand-signals` - Eliminates manual marketplace management

**Result:** Instructor spends 30 minutes (upload + review) vs. 10+ hours (manual)

#### Student Value: "10x Career Advancement"

**Technology Stack:**
1. `projects` table + RLS - Secure project assignment
2. `competency-extractor` (AI) - Automatic skill verification
3. `job-matcher` (AI + Apollo Jobs API) - Proactive job matching
4. `portfolio-export` - Professional portfolio generation

**Result:** Students have verified skills + job matches + portfolio evidence

#### Employer Value: "90% Cost Reduction"

**Technology Stack:**
1. `aggregate-demand-signals` - Transparent marketplace of available talent
2. `DemandBoard` (public page) - Zero-friction discovery
3. `submit-employer-interest` - Lead capture
4. `analyze-project-value` (pricing-service) - Clear ROI calculation

**Result:** Companies pay student rates ($20-40/hr) vs. consultant rates ($150-300/hr)

### 3.2 Intelligence → Competitive Advantage

**Moat #1: Permanent Company Database**
- **Tech:** `company_profiles` table with enrichment pipeline
- **Network Effect:** Each course adds companies → better matching over time
- **Defensibility:** Proprietary scoring + Apollo data costs

**Moat #2: LO Alignment Algorithm**
- **Tech:** `alignment-service` + project_metadata scoring
- **Quality:** Only platform matching projects to specific learning outcomes
- **Defensibility:** Training data from thousands of projects

**Moat #3: Market Signal Intelligence**
- **Tech:** Apollo webhooks + `project-suitability-scorer`
- **Timeliness:** Real-time alerts when companies show need signals
- **Defensibility:** Integration complexity + scoring model

### 3.3 Data Flow: End-to-End Example

**Example: "Business Analytics Course → Retail Marketing Projects"**

```
1. Instructor uploads syllabus (PDF)
   → Storage: syllabi/course_123.pdf
   → Edge Function: parse-syllabus
   → Database: course_profiles record
      - title: "Business Analytics"
      - outcomes: ["Apply statistical methods", "Create dashboards"]

2. Instructor configures filters (Kansas City, Retail)
   → Edge Function: discover-companies
   → External API: Apollo.io search
   → Database: 40 company_profiles records (Retail, KC)
      - scoring: data_completeness_score
      - filtering: has job_postings OR recent_funding

3. System generates projects (5 teams requested)
   → Edge Function: generate-projects
   → AI: Gemini analyzes course + companies
   → Shared Service: alignment-service scores LO match
   → Database: 5 projects records
      - Project A: "Customer Analytics Dashboard" (score: 92)
      - Project B: "Market Segmentation Study" (score: 88)

4. System aggregates marketplace data
   → Edge Function: aggregate-demand-signals
   → Process: Group projects by sector + region
   → Database: demand_signals record
      - project_category: "Retail"
      - geographic_region: "Kansas City, MO"
      - student_count: 25
      - required_skills: ["Tableau", "A/B Testing", "Market Segmentation"]

5. Employer discovers opportunity
   → Frontend: /demand-board (public, no auth)
   → UI: DemandSignalCard shows "25 students + Tableau skills"
   → Action: Clicks "Express Interest"
   → Edge Function: submit-employer-interest
   → Database: employer_interest_submissions record
   → Email: Notification to instructor (Resend API)

6. Student completes project
   → Database: project.status = 'completed'
   → DB Trigger: handle_project_completion()
   → Edge Function: competency-extractor
   → Database: verified_competencies records
      - skill: "Tableau", "A/B Testing", "Customer Analytics"

7. Student receives job matches
   → Edge Function: job-matcher (scheduled)
   → External API: Apollo.io jobs search
   → AI: Match competencies to job requirements
   → Database: job_matches records
   → UI: /my-competencies shows matches
```

---

## Part 4: File-by-File Documentation

### 4.1 Configuration Files

**`package.json`** - Dependencies and scripts (read-only, managed by Lovable)
**`vite.config.ts`** - Vite bundler configuration
**`tailwind.config.ts`** - Tailwind CSS + design tokens
**`tsconfig.json`** - TypeScript compiler configuration
**`supabase/config.toml`** - Supabase project configuration (edge function JWT settings)
**`.env`** - Environment variables (auto-generated, read-only)

### 4.2 Frontend Files

#### Root
- `src/main.tsx` - React app entry point
- `src/App.tsx` - Root component with routing
- `src/App.css` - Global CSS (minimal, most styles in index.css)
- `src/index.css` - Design system tokens, Tailwind imports
- `index.html` - HTML entry point

#### Pages (see Section 2.4 for detailed descriptions)
- `src/pages/Landing.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Upload.tsx`
- `src/pages/ReviewSyllabus.tsx`
- `src/pages/Configure.tsx`
- `src/pages/Projects.tsx`
- `src/pages/ProjectDetail.tsx`
- `src/pages/InstructorDashboard.tsx`
- `src/pages/MyOpportunities.tsx`
- `src/pages/MyCompetencies.tsx`
- `src/pages/EmployerDashboard.tsx`
- `src/pages/DemandBoard.tsx`
- `src/pages/AdminHub.tsx`
- `src/pages/AdminMetrics.tsx`
- `src/pages/Index.tsx`
- `src/pages/NotFound.tsx`

#### Components (see Section 2.4 for detailed descriptions)
- Project Detail: `src/components/project-detail/*.tsx` (14 files)
- Demand Dashboard: `src/components/demand-dashboard/*.tsx` (3 files)
- Shared: `src/components/*.tsx` (4 files)
- UI Library: `src/components/ui/*.tsx` (40+ Shadcn components)

#### Hooks
- `src/hooks/useAuth.tsx` - Auth + role management
- `src/hooks/useDemandSignals.ts` - Marketplace data
- `src/hooks/useNewJobMatchCount.ts` - Job match notifications
- `src/hooks/useProjectAnalytics.ts` - Project metrics
- `src/hooks/use-mobile.tsx` - Responsive utilities
- `src/hooks/use-toast.ts` - Toast system

#### Utilities
- `src/lib/supabase.ts` - Auth service wrapper
- `src/lib/analytics.ts` - Event tracking
- `src/lib/downloadPdf.ts` - PDF generation
- `src/lib/utils.ts` - General utilities

#### Integration
- `src/integrations/supabase/client.ts` - Supabase client (auto-generated)
- `src/integrations/supabase/types.ts` - Database types (auto-generated)

### 4.3 Backend Files (Edge Functions)

#### Core Workflow
- `supabase/functions/parse-syllabus/index.ts` - AI syllabus parsing
- `supabase/functions/discover-companies/index.ts` - Company discovery orchestration
  - `providers/types.ts` - Provider interface
  - `providers/apollo-provider.ts` - Apollo.io implementation
  - `providers/provider-factory.ts` - Provider instantiation
  - `providers/apollo-provider.test.ts` - Unit tests
  - `README.md` - Provider architecture docs
- `supabase/functions/generate-projects/index.ts` - AI project generation

#### Enrichment
- `supabase/functions/data-enrichment-pipeline/index.ts` - Apollo enrichment
- `supabase/functions/apollo-webhook-listener/index.ts` - Real-time signals
- `supabase/functions/project-suitability-scorer/index.ts` - Signal scoring

#### Aggregation
- `supabase/functions/aggregate-demand-signals/index.ts` - Marketplace aggregation

#### Student
- `supabase/functions/competency-extractor/index.ts` - AI skill extraction
- `supabase/functions/job-matcher/index.ts` - AI job matching

#### Value Analysis
- `supabase/functions/analyze-project-value/index.ts` - ROI calculation

#### User-Facing
- `supabase/functions/submit-employer-interest/index.ts` - Lead capture
- `supabase/functions/portfolio-export/index.ts` - PDF portfolio
- `supabase/functions/get-project-detail/index.ts` - Project data fetch

#### Admin
- `supabase/functions/admin-regenerate-projects/index.ts` - Bulk regeneration
- `supabase/functions/run-single-project-generation/index.ts` - Single project regen

#### Utilities
- `supabase/functions/get-apollo-org-id/index.ts` - Apollo org lookup
- `supabase/functions/investigate-apollo-jobs/index.ts` - Job API debugging
- `supabase/functions/migrate-technology-format/index.ts` - One-time migration
- `supabase/functions/detect-location/index.ts` - Location parsing

#### Test Functions
- `supabase/functions/TEST-real-email/index.ts` - Email testing
- `supabase/functions/TEST-talent-alert/index.ts` - Notification testing

#### Shared Services
- `supabase/functions/_shared/alignment-service.ts` - LO alignment logic
- `supabase/functions/_shared/cors.ts` - CORS headers
- `supabase/functions/_shared/generation-service.ts` - AI orchestration
- `supabase/functions/_shared/pricing-service.ts` - Pricing/ROI logic
- `supabase/functions/_shared/types.ts` - Shared types

### 4.4 Documentation Files

#### Strategic
- `docs/COMPREHENSIVE_STRATEGIC_PLAN.md` - Full business plan (auto-generated summary provided)
- `docs/IMPLEMENTATION_ROADMAP.md` - Development phases
- `IMPLEMENTATION_TRACKER.md` - Sprint tracking

#### Technical
- `docs/APOLLO_INTEGRATION_STRATEGIC_PLAN.md` - Apollo.io integration design
- `docs/APOLLO_ENRICHMENT.md` - Enrichment workflow
- `docs/APOLLO_DATA_FLOW_ROBUST.md` - Data flow architecture
- `docs/APOLLO_DATA_DISPLAY_COMPLIANCE.md` - Apollo ToS compliance
- `docs/APOLLO_FLOW_DIAGNOSIS.md` - Debugging guide
- `docs/APOLLO_FLOW_FIX_COMPLETE.md` - Fix documentation
- `docs/SYLLABUS_PROJECT_GENERATION_WORKFLOW.md` - Core workflow
- `README.md` - Project overview

#### Project Management
- `files/PROJECT-MANAGEMENT-COORDINATION.md` - PM protocols

### 4.5 Asset Files

- `src/assets/logo-eduthree.jpg` - Company logo
- `public/favicon.jpg` - Favicon
- `public/robots.txt` - SEO configuration

---

## Part 5: Key Workflows (Technical Implementation)

### 5.1 Syllabus → Projects (Complete Flow)

**Step 1: Upload**
- User action: `/upload` page, file picker
- Frontend: Uploads to `syllabi` bucket
- Storage: Supabase Storage (private bucket)

**Step 2: Parse**
- Frontend: Calls `supabase.functions.invoke('parse-syllabus')`
- Edge Function: Downloads file, calls Gemini API
- AI Prompt: Extracts title, level, outcomes, schedule, artifacts
- Output: Inserts `course_profiles` record
- Frontend: Redirects to `/review-syllabus/:id`

**Step 3: Review**
- UI: `ReviewSyllabus.tsx` + `SyllabusReview.tsx` component
- Data: Fetches course_profiles via React Query
- User: Can edit outcomes, schedule, etc.
- Frontend: Updates course_profiles via Supabase client
- Next: Redirects to `/configure/:id`

**Step 4: Configure**
- UI: `Configure.tsx` with filters form
- User Input: Location, industries, specific companies, team count
- Validation: react-hook-form + zod

**Step 5: Discover Companies**
- Frontend: Calls `supabase.functions.invoke('discover-companies')`
- Edge Function: 
  - Creates generation_runs record (status: 'in_progress')
  - Calls Apollo API via apollo-provider
  - Scores companies (data_completeness_score)
  - Inserts company_profiles records
  - Updates generation_runs (status: 'completed')
- Frontend: Polls generation_runs for completion
- UI: Shows progress (companies_discovered count)

**Step 6: Generate Projects**
- Frontend: Calls `supabase.functions.invoke('generate-projects')`
- Edge Function:
  - Fetches course + companies
  - For each team, calls generation-service
  - AI generates: title, description, tasks, deliverables
  - Calls alignment-service for LO scoring
  - Calls pricing-service for pricing calculation
  - Inserts: projects, project_metadata, project_forms
  - Updates generation_runs (projects_generated count)
- Frontend: Redirects to `/projects`

**Step 7: Review Projects**
- UI: `Projects.tsx` shows grid of project cards
- Data: Fetches projects where course_id = current course
- User: Can click project → `/project/:id`

**Step 8: Project Detail**
- UI: `ProjectDetail.tsx` with tabbed interface
- Tabs: Overview, Academic, Logistics, Contact, Market Insights, etc.
- Data: Calls `get-project-detail` edge function (single query for all related data)
- Actions: Feedback, partnership proposal, enrichment

### 5.2 Demand Aggregation → Marketplace

**Trigger:** Admin action or scheduled job

**Step 1: Aggregate**
- Edge Function: `aggregate-demand-signals`
- Query: `SELECT * FROM projects WHERE status IN ('ai_shell', 'curated_live')`
- JOIN: `course_profiles` for location data
- Logic:
  - Group by: `project.sector` + `geographic_region`
  - Count: Students (sum of team_size)
  - Extract: Skills from tasks/deliverables (AI regex + NLP)
  - Calculate: Duration, institutions
- Output: Upsert `demand_signals` records (unique on category + region)

**Step 2: Display**
- Page: `/demand-board` (public, no auth)
- Component: `DemandBoardLayout.tsx`
- Hook: `useDemandSignals()` → fetches from demand_signals table
- UI: Grid of `DemandSignalCard.tsx` components
- Card: Shows category, student count, skills (badges), CTA button

**Step 3: Employer Interest**
- User: Clicks "Express Interest" button
- Modal: `EmployerCTAModal.tsx` with form
- Form: Company name, contact email, project description
- Submit: Calls `submit-employer-interest` edge function
- Output: Creates `employer_interest_submissions` record
- Notification: Sends email to admin (Resend API)

### 5.3 Project Completion → Job Matching

**Trigger:** Student marks project as complete

**Step 1: Status Update**
- UI: Project status dropdown (or similar)
- Frontend: Updates `projects.status = 'completed'`
- Database: RLS allows update if user is assigned to project

**Step 2: Competency Extraction**
- DB Trigger: `handle_project_completion()` fires
- Trigger: Calls `competency-extractor` edge function (async via net.http_post)
- Edge Function:
  - Fetches project tasks, deliverables
  - AI extracts demonstrated skills (Gemini)
  - Inserts `verified_competencies` records (student_id + skill_name)

**Step 3: Job Matching**
- Trigger: Scheduled (e.g., daily cron) or manual
- Edge Function: `job-matcher`
- Process:
  - Fetch all students with new competencies
  - For each student, query Apollo Jobs API
  - AI matches competencies to job requirements
  - Inserts `job_matches` records (status: 'pending_notification')

**Step 4: Student Notification**
- UI: `/my-competencies` page
- Hook: `useNewJobMatchCount()` → counts job_matches where status = 'pending_notification'
- Badge: Shows count in header navigation
- UI: Displays job matches with "Apply" links

---

## Part 6: Security & Compliance

### 6.1 Authentication
- **Provider:** Supabase Auth
- **Method:** Email + password (no anonymous)
- **Config:** Auto-confirm email enabled (for non-prod)
- **Session:** Stored in localStorage, auto-refresh enabled

### 6.2 Authorization (RLS)
- **Enforcement:** Database-level (all tables have RLS enabled)
- **Roles:** Managed via `user_roles` table (multi-role support)
- **Helper:** `has_role(user_id, role)` function
- **Service Role:** Edge functions bypass RLS (use service role key)

### 6.3 Data Privacy
- **PII Storage:** Minimal (names, emails only)
- **Company Data:** Subject to Apollo ToS (no bulk export, API attribution required)
- **Student Data:** Students own their competency data
- **RLS Policies:** Students can only access their own data

### 6.4 API Security
- **Edge Functions:** JWT verification configurable per function
- **Public Functions:** `verify_jwt = false` in config.toml (parse-syllabus, submit-employer-interest, etc.)
- **CORS:** Enabled on all public functions
- **Secrets:** Stored in Supabase Vault (APOLLO_API_KEY, GEMINI_API_KEY, etc.)

### 6.5 Apollo.io Compliance
- **ToS Requirement:** Cannot bulk export or display raw Apollo data
- **Implementation:** Data stored in `company_profiles` is "our" data (enriched from multiple sources)
- **Attribution:** Apollo logo/link in UI where Apollo data is displayed
- **Webhook Listener:** Receives real-time updates (compliant usage)

---

## Part 7: Performance & Scalability

### 7.1 Caching Strategy
- **Frontend:** React Query (5-minute default stale time)
- **Backend:** `company_filter_cache` table (7-day TTL)
- **Cleanup:** `cleanup_expired_cache()` function (scheduled)

### 7.2 Database Optimization
- **Indexes:** (Not explicitly documented, should audit)
- **JSONB Queries:** Used for flexible schema (technologies, skills)
- **Triggers:** Async edge function calls (net.http_post) for non-blocking

### 7.3 AI/API Cost Management
- **Tracking:** generation_runs.ai_tokens_consumed, apollo_credits_used
- **Batching:** Projects generated in batches (not one-by-one)
- **Caching:** Filter cache reduces redundant Apollo queries

### 7.4 Scalability Bottlenecks
- **Apollo API Rate Limits:** Need monitoring
- **Gemini API Quotas:** Need monitoring
- **Edge Function Concurrency:** Supabase limits (to be tested)
- **Database Connections:** Supabase pooling (to be monitored)

---

## Part 8: Future Architecture Considerations

### 8.1 Planned Features (From Roadmap)
- **Student Portfolios:** Enhanced portfolio-export with templates
- **Real-time Collaboration:** Supabase Realtime for project updates
- **Advanced Matching:** ML model training on historical match success
- **Marketplace 2.0:** Employer bidding, project templates

### 8.2 Technical Debt
- **Risk-002:** Leaked production password (requires manual support ticket)
- **Risk-010:** Resend domain verification (requires manual DNS config)
- **UI Consistency:** Apply "Elemental Theme" to all pages systematically

### 8.3 Observability Gaps
- **Logging:** Edge functions have console.log (need centralized logging)
- **Monitoring:** No alerting on function failures
- **Analytics:** `dashboard_analytics` exists but not fully utilized
- **Error Tracking:** No Sentry or similar integration

---

## Conclusion

EduThree is a **full-stack, AI-powered marketplace** with:
- **3-sided value exchange** (universities, students, employers)
- **Intelligence-driven matching** (AI + market signals)
- **Modular, scalable architecture** (React + Supabase + pluggable providers)
- **Defensible moats** (LO alignment, company database, market signals)

**Key Success Factors:**
1. AI quality (project relevance, skill extraction accuracy)
2. Data completeness (Apollo enrichment, company verification)
3. User experience (fast, intuitive, "wow factor" obvious)
4. Network effects (more courses → better company data → better projects)

**Current State (as of Sprint 25):**
- ✅ Core engine complete (Sprints 1-23)
- 🚧 P0 bug fixes in progress (Sprint 25: Data synergy)
- ⏸️ Era 4 (stakeholder completion) paused pending fixes

This documentation represents the **complete technical and business architecture** as of the current codebase state.
