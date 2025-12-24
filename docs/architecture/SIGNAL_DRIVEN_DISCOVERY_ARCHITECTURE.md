# Signal-Driven Company Discovery Architecture

**Document Version:** 1.1  
**Last Updated:** 24th December 2025  
**Status:** Implemented & Verified  
**Compliance:** Full compliance with Implementation Plan (23 Dec 2025)

---

## Overview

The Signal-Driven Company Discovery system evaluates companies using 4 independent signals, each contributing **25%** to a composite score. This architecture enables intelligent matching between course syllabi and potential industry partners.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SIGNAL-DRIVEN DISCOVERY FLOW                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│    Syllabus     │
│   (Course)      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PHASE 1: INTELLIGENT EXTRACTION                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Skills    │  │Technologies │  │   Domain    │  │  Learning   │        │
│  │ Extraction  │  │ Detection   │  │  Inference  │  │  Outcomes   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: APOLLO API CALLS                              │
│                                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐                        │
│  │ SIGNAL 1            │    │ SIGNAL 2            │                        │
│  │ Job Postings API    │    │ News Articles API   │                        │
│  │ GET /organizations/ │    │ POST /news_articles │                        │
│  │ {id}/job_postings   │    │ /search             │                        │
│  └─────────────────────┘    └─────────────────────┘                        │
│                                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐                        │
│  │ SIGNAL 3            │    │ SIGNAL 4            │                        │
│  │ Complete Org Info   │    │ People Search API   │                        │
│  │ GET /organizations/ │    │ POST /mixed_people/ │                        │
│  │ {id}                │    │ search              │                        │
│  └─────────────────────┘    └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PHASE 3: MULTI-SCORING                                │
│                                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │
│  │ Skill Match   │ │ Market Signal │ │ Department    │ │ Contact       │   │
│  │ Score (0-100) │ │ Score (0-100) │ │ Fit (0-100)   │ │ Quality(0-100)│   │
│  │    25%        │ │    25%        │ │    25%        │ │    25%        │   │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘   │
│                              │                                              │
│                              ▼                                              │
│                   ┌─────────────────────┐                                   │
│                   │  COMPOSITE SCORE    │                                   │
│                   │  (Weighted Sum)     │                                   │
│                   │     0-100           │                                   │
│                   └─────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PHASE 4: SMART GENERATION                             │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐             │
│  │    Rank     │ -> │  Generate   │ -> │  Graceful Fallback  │             │
│  │  Companies  │    │  Projects   │    │  (Lower threshold)  │             │
│  └─────────────┘    └─────────────┘    └─────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE STORAGE                                    │
│                      company_profiles table                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Signal Definitions

### Signal 1: Job-Skills Match (25%)

**Purpose:** Semantic similarity between company job postings and syllabus skills.

**Apollo API:** `GET /api/v1/organizations/{organization_id}/job_postings`

**Implementation File:** `supabase/functions/_shared/signals/job-skills-signal.ts`

**Job Postings Flow:**
```
1. discover-companies stores job_postings in CompanyForSignal
2. signal-orchestrator.ts extracts via extractJobPostings()
3. JobSkillsSignal receives jobPostings in SignalContext
4. getJobPostings() prioritizes context.jobPostings over company.job_postings
```

**Scoring Algorithm:**
- **Primary:** Gemini `text-embedding-004` model for semantic embeddings
- **Fallback:** Keyword-based matching when embeddings unavailable

**Thresholds (Updated 24 Dec 2025):**

| Method | Threshold | Rationale |
|--------|-----------|-----------|
| Semantic Match | **0.45** | Lowered from 0.65 to capture cross-domain matches |
| Keyword Fallback | **0.15** | Lowered from 0.30 for broader keyword matching |

**Score Calculation (Semantic):**
```
Final Score = (Average Similarity × 50) + (Skill Coverage × 30) + (Job Coverage × 20)
```

**Score Calculation (Keyword Fallback):**
```
Base Score = (Average Overlap × 40) + (Skill Coverage × 40)
Match Bonus = min(20, matches × 5)  # Bonus for having any matches
Final Score = min(Base + Bonus, 70)  # Capped at 70 for keyword method
```

| Component | Weight | Description |
|-----------|--------|-------------|
| Average Similarity | 50% | Mean cosine similarity of all matches |
| Skill Coverage | 30% | % of syllabus skills with matching jobs |
| Job Coverage | 20% | % of jobs relevant to syllabus |

**Circuit Breaker:** Gemini API has a 3-failure circuit breaker with 60s reset time.

**Verified Results (24 Dec 2025):**
- Cerris Systems: 62/100 skill match (9 job postings)
- 1898 & Co.: 47/100 skill match (14 job postings)
- Companies without job postings: 0/100 (expected)

---

### Signal 2: Market Intelligence (25%)

**Purpose:** Detect growth signals indicating active, growing companies.

**Apollo API:** `POST /api/v1/news_articles/search`

**Implementation File:** `supabase/functions/_shared/signals/market-intel-signal.ts`

**Request Parameters:**
```json
{
  "organization_ids": ["org_id_1", "org_id_2"],
  "categories": ["hires", "investment", "contract"],
  "published_at": { "min": "90 days ago", "max": "today" },
  "per_page": 50
}
```

**Scoring Algorithm:**

| Category | Points | Description |
|----------|--------|-------------|
| Funding News | 0.25 | Investment/funding announcements |
| Hiring News | 0.20 | Active hiring announcements |
| Contract News | 0.15 | Partnership/contract wins |
| Volume | 0.20 | Up to 5 articles = max points |
| Recency | 0.20 | More recent = higher score |

**Baseline:** 10/100 for companies with no news (not penalized).

---

### Signal 3: Department Fit (25%)

**Purpose:** Assess buying intent and relevant department growth.

**Apollo API:** `GET /api/v1/organizations/{id}` (Complete Org Info)

**Implementation File:** `supabase/functions/_shared/signals/department-fit-signal.ts`

**Data Extracted:**
- `intent_signal_account` - Overall buying intent (high/medium/low)
- `employee_metrics` - Department-level growth/churn rates
- `current_technologies` - Technology stack

**Scoring Algorithm:**

| Component | Weight | Calculation |
|-----------|--------|-------------|
| Buying Intent | 40% | High=1.0, Medium=0.6, Low=0.3 |
| Department Growth | 40% | (New hires / Retained) × 0.7 + (1 - Churn rate) × 0.3 |
| Technology Match | 20% | Overlap between tech stack and syllabus skills |

**Domain-Department Mapping:**
```typescript
{
  finance: 'finance',
  engineering: 'engineering',
  marketing: 'marketing',
  operations: 'operations',
  sales: 'sales',
  hr: 'human_resources'
}
```

---

### Signal 4: Contact Quality (25%)

**Purpose:** Evaluate decision-maker availability for partnership outreach.

**Apollo API:** `POST /api/v1/mixed_people/search`

**Implementation File:** `supabase/functions/_shared/signals/contact-quality-signal.ts`

**Request Parameters:**
```json
{
  "organization_ids": ["org_id"],
  "person_seniorities": ["c_suite", "vp", "director", "owner", "founder", "partner"],
  "person_departments": ["engineering", "hr", "operations"],
  "per_page": 25
}
```

**Scoring Algorithm:**

| Criteria | Max Points | Breakdown |
|----------|------------|-----------|
| Has Contacts | 10 | Base points for any contacts |
| Decision Makers | 40 | 1=15pts, 2=25pts, 3+=40pts |
| Dept Relevance | 25 | % of contacts in relevant departments |
| Verified Emails | 15 | % with valid email addresses |
| Champion Titles | 10 | VP, Director, Head of, etc. |

**Fallback:** Company size-based estimation when no Apollo org ID (30-50 points, 0.2 confidence).

---

## Database Schema

### company_profiles Table - Signal Columns

| Column | Type | Description |
|--------|------|-------------|
| `skill_match_score` | numeric | Signal 1 score (0-100) |
| `market_signal_score` | numeric | Signal 2 score (0-100) |
| `department_fit_score` | numeric | Signal 3 score (0-100) |
| `contact_quality_score` | numeric | Signal 4 score (0-100) |
| `composite_signal_score` | numeric | Weighted average (0-100) |
| `signal_confidence` | text | 'high' / 'medium' / 'low' |
| `signal_data` | jsonb | Full breakdown with rawData |

### Signal Data JSONB Structure

```json
{
  "overall": 75,
  "confidence": "high",
  "components": {
    "jobSkillsMatch": 80,
    "marketIntelligence": 70,
    "departmentFit": 75,
    "contactQuality": 75
  },
  "signalsDetected": {
    "hasActiveJobPostings": true,
    "hasFundingNews": true,
    "hasHiringNews": false,
    "hasDepartmentGrowth": true,
    "hasTechnologyMatch": true,
    "hasDecisionMakers": true
  },
  "breakdown": "Strong match: 80% skill match, recent funding, growing engineering dept",
  "errors": []
}
```

---

## Signal Weights Configuration

**Location:** `supabase/functions/_shared/signal-types.ts`

```typescript
export const SIGNAL_WEIGHTS: Record<SignalName, number> = {
  job_skills_match: 0.25,      // 25%
  market_intelligence: 0.25,   // 25%
  department_fit: 0.25,        // 25%
  contact_quality: 0.25        // 25%
} as const;
```

**Rationale:** Equal weighting ensures no single signal dominates. The plan specifies 25% each for balanced evaluation.

---

## Orchestration

**Location:** `supabase/functions/_shared/signals/signal-orchestrator.ts`

### Key Functions

| Function | Purpose |
|----------|---------|
| `calculateBatchSignals()` | Process multiple companies in parallel |
| `calculateCompositeScore()` | Combine 4 signals with weights |
| `filterBySignals()` | Apply threshold filtering with fallback |
| `toStorableSignalData()` | Convert to database-ready format |
| `extractJobPostings()` | Parse job_postings from company data (Added 24 Dec) |

### Job Postings Extraction (Added 24 Dec 2025)

The orchestrator now includes `extractJobPostings()` helper to properly pass job postings to signals:

```typescript
function extractJobPostings(jobPostings: unknown): JobPosting[] {
  if (!jobPostings) return [];
  
  const parsed = typeof jobPostings === 'string' 
    ? JSON.parse(jobPostings)
    : jobPostings;
  
  return parsed.map((j: Record<string, unknown>) => ({
    id: String(j.id || ''),
    title: String(j.title || 'Unknown Role'),
    url: j.url ? String(j.url) : undefined,
    description: j.description ? String(j.description) : undefined
  }));
}
```

### Execution Flow

1. **Parallel Execution:** All 4 signals run concurrently with 30s timeout
2. **Error Isolation:** Failed signals return 0 score, don't block others
3. **Weighted Aggregation:** `Σ(signal_score × 0.25)` for each of 4 signals
4. **Confidence Calculation:** Based on data availability across signals
5. **Threshold Filtering:** Default 50, fallback to 30 if too few results

---

## Integration Point

**Location:** `supabase/functions/discover-companies/index.ts`

**Step 6.5:** After company discovery and before project generation:

```typescript
// Calculate signal scores for all companies
const signalResults = await calculateBatchSignals(
  companiesForSignal,
  syllabusSkills,
  syllabusDomain,
  apolloApiKey,
  geminiApiKey
);

// Update company_profiles with scores
await supabase.from('company_profiles')
  .update({
    skill_match_score,
    market_signal_score,
    department_fit_score,
    contact_quality_score,
    composite_signal_score,
    signal_confidence,
    signal_data
  })
  .eq('id', companyId);
```

---

## Fallback Configuration

**Location:** `supabase/functions/_shared/signal-types.ts`

```typescript
export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  minScoreThreshold: 50,      // Primary threshold
  fallbackThreshold: 30,      // Lowered if too few results
  minCompaniesToReturn: 3,    // Minimum companies to return
  maxCompaniesToReturn: 15    // Maximum companies to return
};
```

---

## File Structure

```
supabase/functions/_shared/
├── signal-types.ts              # Type definitions, weights, interfaces
├── signals/
│   ├── index.ts                 # Exports all signals
│   ├── signal-orchestrator.ts   # Batch processing, weighted scoring
│   ├── job-skills-signal.ts     # Signal 1: Semantic matching
│   ├── market-intel-signal.ts   # Signal 2: News analysis
│   ├── department-fit-signal.ts # Signal 3: Org intelligence
│   └── contact-quality-signal.ts# Signal 4: People search
└── embedding-service.ts         # Gemini embeddings for Signal 1
```

---

## Apollo API Endpoints Used

| Endpoint | Signal | Method | Purpose |
|----------|--------|--------|---------|
| `/organizations/{id}/job_postings` | 1 | GET | Fetch active job listings |
| `/news_articles/search` | 2 | POST | Find recent company news |
| `/organizations/{id}` | 3 | GET | Complete org info with intent |
| `/mixed_people/search` | 4 | POST | Find decision-makers |

---

## Changelog

### v1.1 (24 Dec 2025)
- **Fixed:** Job postings now properly passed to JobSkillsSignal via `extractJobPostings()` helper
- **Changed:** Semantic match threshold lowered from 0.65 → 0.45
- **Changed:** Keyword fallback threshold lowered from 0.30 → 0.15
- **Added:** Match bonus scoring in keyword fallback (+5 points per match, max 20)
- **Verified:** Pipeline tested with ME 111 Fluid Mechanics course - Cerris Systems scored 62/100

### v1.0 (24 Dec 2025)
- Initial architecture documentation
- All 4 signals implemented and integrated

---

## Related Documentation

- [Implementation Plan (23 Dec 2025)](../IMPLEMENTATION_PLAN_23_DEC_2025.md)
- [Apollo API Reference](../APOLLO_API_REFERENCE.md)
- [Signal-Driven Discovery Flow Diagram](../diagrams/signal-driven-discovery-flow.png)
- [Apollo API Audit Diagram](../diagrams/apollo-api-audit.png)
