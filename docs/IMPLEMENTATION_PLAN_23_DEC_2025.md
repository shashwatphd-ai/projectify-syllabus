# Implementation Plan: Signal-Driven Company Discovery
**Date: 23rd December 2025**
**Status: Pre-Implementation - Awaiting Approval**

---

## Executive Summary

Transform EduThree's company discovery system from **keyword-based guessing** to **signal-driven intelligence** that works for ANY syllabus (finance, engineering, arts, medicine) without hardcoded mappings.

### Current Problem
The discovery pipeline returns irrelevant companies (e.g., staffing firms for a Portfolio Management course) because:
1. Apollo API capabilities are underutilized
2. Discovery uses keyword matching instead of market signals
3. Technology filtering is disabled ("crisis mode")
4. News/intent signals are checked AFTER discovery (post-hoc) instead of DURING discovery

### Proposed Solution
Multi-layer intelligence discovery that finds companies with **proven need** for syllabus skills:

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│   SYLLABUS      │───▶│  SKILL           │───▶│  MULTI-SIGNAL      │
│   (Any Subject) │    │  EXTRACTION      │    │  DISCOVERY         │
└─────────────────┘    └──────────────────┘    └────────────────────┘
                                                         │
                       ┌─────────────────────────────────┼─────────────────────────────────┐
                       ▼                                 ▼                                 ▼
              ┌────────────────┐               ┌────────────────┐               ┌────────────────┐
              │ JOB POSTINGS   │               │ MARKET SIGNALS │               │ COMPANY        │
              │ ANALYSIS       │               │ (News/Funding) │               │ INTELLIGENCE   │
              │                │               │                │               │                │
              │ • Match titles │               │ • Hiring news  │               │ • Intent score │
              │   to skills    │               │ • Investment   │               │ • Dept growth  │
              │ • Prove need   │               │ • Contracts    │               │ • Tech stack   │
              └───────┬────────┘               └───────┬────────┘               └───────┬────────┘
                      │                                │                                │
                      └────────────────────────────────┼────────────────────────────────┘
                                                       ▼
                                              ┌────────────────┐
                                              │ COMPOSITE      │
                                              │ SCORING        │
                                              │                │
                                              │ • 0-100 score  │
                                              │ • Confidence   │
                                              │ • Signal mix   │
                                              └───────┬────────┘
                                                      ▼
                                              ┌────────────────┐
                                              │ SMART PROJECT  │
                                              │ GENERATION     │
                                              │                │
                                              │ • Signal-aware │
                                              │ • Fallback OK  │
                                              └────────────────┘
```

---

## Part 1: Apollo API Audit

### Currently Used Endpoints

| Endpoint | Current Usage | Status |
|----------|---------------|--------|
| `POST /mixed_companies/search` | Search for companies by location + keywords | ✅ Used |
| `POST /organizations/enrich` | Get detailed company data | ✅ Used |
| `GET /organizations/{id}/job_postings` | Get job postings for a specific company | ✅ Used (limited) |
| `POST /mixed_people/api_search` | Find contacts at companies | ✅ Used |

### Underutilized/Missing Endpoints

| Endpoint | Capability | Impact |
|----------|------------|--------|
| `POST /news_articles/search` | Search for hiring, investment, contract news | 🔴 NOT USED - Critical for market signals |
| `GET /organizations/{id}` (Complete) | Full org data with `intent_signal_account`, `employee_metrics` | 🔴 NOT USED - Critical for buying intent |
| `POST /organizations/bulk_enrich` | Batch enrich 10 companies per call | 🔴 NOT USED - 50% rate limit savings |
| Technology UIDs in search | Filter by tech stack (Python, SAP, etc.) | 🟡 DISABLED - "crisis mode" |

### API Constraints

**Rate Limits:**
- Fixed-window strategy (X requests per minute based on plan)
- Bulk enrichment: 50% of individual rate limit
- Check limits: `GET /api_usage_stats`

**Display Limits:**
- Organization Search: 50,000 records max (100 per page, 500 pages)
- Solution: Add filters to narrow results

---

## Part 2: Apollo API Reference Documentation

### 2.1 News Articles Search
**Endpoint:** `POST /api/v1/news_articles/search`

**Purpose:** Find recent news about companies (hiring, investments, contracts)

**Request Parameters:**
```json
{
  "organization_ids": ["5e66b6381e05b4008c8331b8"],  // Required
  "categories": ["hires", "investment", "contract"], // Optional
  "published_at": {
    "min": "2024-09-23",  // YYYY-MM-DD format
    "max": "2024-12-23"
  },
  "page": 1,
  "per_page": 10
}
```

**Categories Available:**
- `hires` - Leadership changes, key hires
- `investment` - Funding rounds, acquisitions
- `contract` - New partnerships, deals

**Response Fields:**
```json
{
  "news_articles": [
    {
      "id": "string",
      "title": "Company raises $50M Series B",
      "snippet": "...funding will be used for expansion...",
      "url": "https://...",
      "published_at": "2024-12-20T10:00:00Z",
      "event_categories": ["investment"]
    }
  ]
}
```

**Use Case:** After discovering companies, batch-fetch news to calculate "market activity score"

---

### 2.2 Complete Organization Info
**Endpoint:** `GET /api/v1/organizations/{id}`

**Purpose:** Get full company intelligence including intent signals and growth metrics

**Key Response Fields:**

```json
{
  "organization": {
    // Basic info
    "id": "5e66b6381e05b4008c8331b8",
    "name": "Acme Corp",
    "website_url": "https://acme.com",
    
    // 🔥 BUYING INTENT SIGNALS (NEW)
    "intent_signal_account": {
      "overall_intent": "high",  // "high" | "medium" | "low"
      "total_visits": 150,
      "top_5_paths": ["/products/enterprise", "/pricing"]
    },
    
    // 🔥 DEPARTMENT GROWTH METRICS (NEW)
    "employee_metrics": {
      "engineering": {
        "new": 15,      // Hired in period
        "retained": 100,
        "churned": 3
      },
      "finance": {
        "new": 5,
        "retained": 30,
        "churned": 1
      },
      "sales": {
        "new": 10,
        "retained": 50,
        "churned": 5
      }
    },
    
    // 🔥 TECHNOLOGY STACK WITH UIDs (NEW)
    "current_technologies": [
      {
        "uid": "python",
        "name": "Python",
        "category": "Programming Languages"
      },
      {
        "uid": "salesforce",
        "name": "Salesforce",
        "category": "CRM"
      }
    ],
    
    // Funding history (existing)
    "funding_events": [
      {
        "funded_at": "2024-06-15",
        "amount": 50000000,
        "funding_type": "Series B",
        "investors": ["Sequoia", "a16z"]
      }
    ]
  }
}
```

**Use Case:** Calculate buying intent and department growth scores for each company

---

### 2.3 Bulk Organization Enrichment
**Endpoint:** `POST /api/v1/organizations/bulk_enrich`

**Purpose:** Enrich up to 10 companies in a single API call (50% rate limit savings)

**Request:**
```json
{
  "domains": [
    "acme.com",
    "globex.com",
    "initech.com"
  ]
}
```

**Response:**
```json
{
  "organizations": [
    { /* full organization object */ },
    { /* full organization object */ },
    { /* full organization object */ }
  ]
}
```

**Use Case:** Replace individual enrichment calls in `enrichOrganizations()` with batch calls

---

### 2.4 Organization Job Postings
**Endpoint:** `GET /api/v1/organizations/{id}/job_postings`

**Purpose:** Get active job listings for a specific company

**Request Parameters:**
```
?page=1&per_page=10
```

**Response Fields:**
```json
{
  "organization_job_postings": [
    {
      "id": "string",
      "title": "Senior Financial Analyst",
      "url": "https://company.com/jobs/123",
      "city": "New York",
      "state": "New York",
      "country": "United States",
      "posted_at": "2024-12-01T00:00:00Z",
      "last_seen_at": "2024-12-23T00:00:00Z"
    }
  ]
}
```

**Use Case:** Match job titles to syllabus skills to prove company NEEDS what students learn

---

### 2.5 People API Search
**Endpoint:** `POST /api/v1/mixed_people/api_search`

**Key Parameters:**
```json
{
  "organization_ids": ["5e66b6381e05b4008c8331b8"],
  "person_titles": ["Director of Finance", "CFO", "Controller"],
  "person_seniorities": ["director", "vp", "c_suite"],
  "per_page": 10
}
```

**Use Case:** Find the RIGHT contact based on syllabus domain (finance syllabus → Finance Director)

---

## Part 3: Implementation Phases

### Phase 1: API Documentation & Infrastructure (This Document)
**Status:** ✅ Complete
- Document all Apollo API capabilities
- Identify gaps in current implementation
- Create reference documentation for future agents

### Phase 2: News Articles Integration (Market Signals)
**Files to modify:**
- `supabase/functions/discover-companies/providers/apollo-provider.ts`

**Changes:**
1. Add new method `fetchMarketSignals(organizationIds: string[])`
2. Call `/news_articles/search` with organization IDs
3. Filter by categories: `hires`, `investment`, `contract`
4. Filter by `published_at` within last 90 days
5. Return signal score per company (0-1 based on article count and recency)

**Signal Scoring Logic:**
```typescript
function calculateMarketSignalScore(articles: NewsArticle[]): number {
  const recencyWeight = 0.4;  // Recent news weighted higher
  const categoryWeight = 0.6; // Hiring/investment weighted higher
  
  let score = 0;
  for (const article of articles) {
    const daysSincePublished = daysBetween(article.published_at, new Date());
    const recencyScore = Math.max(0, 1 - (daysSincePublished / 90));
    
    const categoryScore = 
      article.event_categories.includes('investment') ? 1.0 :
      article.event_categories.includes('hires') ? 0.8 :
      article.event_categories.includes('contract') ? 0.6 : 0.3;
    
    score += (recencyScore * recencyWeight) + (categoryScore * categoryWeight);
  }
  
  return Math.min(1, score / 5); // Normalize to 0-1
}
```

### Phase 3: Complete Organization Info (Intent & Growth)
**Files to modify:**
- `supabase/functions/discover-companies/providers/apollo-provider.ts`

**Changes:**
1. Add new method `fetchOrganizationIntelligence(orgId: string)`
2. Call `GET /organizations/{id}` for complete data
3. Extract `intent_signal_account` (buying intent)
4. Extract `employee_metrics` (department growth)
5. Extract `current_technologies` with UIDs
6. Return intelligence object

**Intelligence Scoring Logic:**
```typescript
interface OrganizationIntelligence {
  buyingIntentScore: number;   // 0-1 based on intent_signal_account
  departmentGrowthScore: number; // 0-1 based on relevant department growth
  technologyMatchScore: number;  // 0-1 based on tech stack overlap
}

function calculateBuyingIntentScore(intent: IntentSignalAccount): number {
  if (intent.overall_intent === 'high') return 1.0;
  if (intent.overall_intent === 'medium') return 0.6;
  return 0.3;
}

function calculateDepartmentGrowthScore(
  metrics: EmployeeMetrics, 
  syllabusDomai: 'finance' | 'engineering' | 'marketing' | etc
): number {
  const relevantDept = metrics[syllabusDomai];
  if (!relevantDept) return 0.5; // Unknown
  
  const growthRate = relevantDept.new / (relevantDept.retained || 1);
  return Math.min(1, growthRate * 2); // Cap at 1
}
```

### Phase 4: Job-Skills Matching Engine
**New file:**
- `supabase/functions/_shared/job-skills-matcher.ts`

**Purpose:** AI-powered semantic matching between job posting titles and syllabus skills

**Flow:**
```
Job Postings for Company X         Syllabus Skills
├── "Senior Financial Analyst"     ├── "Financial Modeling"
├── "Investment Associate"    ───▶ ├── "Portfolio Analysis"
├── "Risk Manager"                 ├── "Risk Assessment"
└── "Data Scientist"               └── "Data Analysis"
                                          │
                                          ▼
                                   Match Score: 0.85
```

**Implementation:**
```typescript
interface JobSkillsMatchResult {
  matchScore: number;         // 0-1 overall match
  matchedPairs: Array<{
    jobTitle: string;
    matchedSkill: string;
    confidence: number;
  }>;
  unmatchedJobs: string[];
  unmatchedSkills: string[];
}

async function matchJobsToSkills(
  jobPostings: JobPosting[],
  syllabusSkills: ExtractedSkill[]
): Promise<JobSkillsMatchResult> {
  // Use Lovable AI for semantic matching
  const prompt = `
    Match these job titles to these skills. Return confidence (0-1) for each match.
    
    Job Titles: ${jobPostings.map(j => j.title).join(', ')}
    Skills: ${syllabusSkills.map(s => s.skill).join(', ')}
    
    Return JSON: { matches: [{ job: "...", skill: "...", confidence: 0.X }] }
  `;
  
  // Call AI Gateway
  // Parse response
  // Calculate overall match score
}
```

### Phase 5: Composite Signal Scoring
**Files to modify:**
- `supabase/functions/discover-companies/index.ts`
- `supabase/functions/discover-companies/providers/apollo-provider.ts`

**New Scoring Model:**
```typescript
interface CompositeSignalScore {
  overall: number;           // 0-100 final score
  confidence: 'high' | 'medium' | 'low';
  
  components: {
    skillMatch: number;      // 0-25 points - Job postings match syllabus skills
    marketActivity: number;  // 0-25 points - News signals (hiring, investment)
    buyingIntent: number;    // 0-25 points - Intent signal from Apollo
    departmentGrowth: number; // 0-25 points - Relevant department is growing
  };
  
  signals: {
    hasActiveJobPostings: boolean;
    hasFundingNews: boolean;
    hasHiringNews: boolean;
    hasDepartmentGrowth: boolean;
    hasTechnologyMatch: boolean;
  };
}

function calculateCompositeScore(
  jobSkillsMatch: JobSkillsMatchResult,
  marketSignals: MarketSignalScore,
  orgIntelligence: OrganizationIntelligence
): CompositeSignalScore {
  const components = {
    skillMatch: jobSkillsMatch.matchScore * 25,
    marketActivity: marketSignals.score * 25,
    buyingIntent: orgIntelligence.buyingIntentScore * 25,
    departmentGrowth: orgIntelligence.departmentGrowthScore * 25
  };
  
  const overall = Object.values(components).reduce((a, b) => a + b, 0);
  
  const confidence = 
    overall >= 70 ? 'high' :
    overall >= 40 ? 'medium' : 'low';
  
  return { overall, confidence, components, signals };
}
```

### Phase 6: Graceful Fallback System
**Files to modify:**
- `supabase/functions/discover-companies/index.ts`
- `supabase/functions/generate-projects/index.ts`

**Fallback Logic:**
```typescript
async function discoverWithFallback(courseContext: CourseContext): Promise<DiscoveryResult> {
  const MIN_COMPANIES = 3;
  const INITIAL_THRESHOLD = 70;
  const THRESHOLD_STEP = 15;
  let threshold = INITIAL_THRESHOLD;
  
  let companies = await discoverCompanies(courseContext);
  let filteredCompanies = companies.filter(c => c.compositeScore >= threshold);
  
  // Adaptive threshold lowering
  while (filteredCompanies.length < MIN_COMPANIES && threshold > 20) {
    threshold -= THRESHOLD_STEP;
    console.log(`⚠️ Lowering threshold to ${threshold}%`);
    filteredCompanies = companies.filter(c => c.compositeScore >= threshold);
  }
  
  // If still < MIN_COMPANIES, return best available with warning
  if (filteredCompanies.length < MIN_COMPANIES) {
    const bestAvailable = companies
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, MIN_COMPANIES);
    
    return {
      companies: bestAvailable,
      confidence: 'low',
      fallbackReason: `Only ${companies.length} companies found. Returning best ${bestAvailable.length} matches.`,
      warning: 'Lower confidence matches - review recommended'
    };
  }
  
  return {
    companies: filteredCompanies,
    confidence: threshold >= 50 ? 'high' : 'medium',
    fallbackReason: null
  };
}
```

### Phase 7: Bulk Enrichment Optimization
**Files to modify:**
- `supabase/functions/discover-companies/providers/apollo-provider.ts`

**Changes:**
1. Replace individual `organizations/enrich` calls with `organizations/bulk_enrich`
2. Batch companies into groups of 10
3. Expected improvement: 50% reduction in API calls

```typescript
async function bulkEnrichOrganizations(domains: string[]): Promise<ApolloOrganization[]> {
  const BATCH_SIZE = 10;
  const results: ApolloOrganization[] = [];
  
  for (let i = 0; i < domains.length; i += BATCH_SIZE) {
    const batch = domains.slice(i, i + BATCH_SIZE);
    
    const response = await fetch(
      'https://api.apollo.io/v1/organizations/bulk_enrich',
      {
        method: 'POST',
        headers: { 'X-Api-Key': this.apolloApiKey },
        body: JSON.stringify({ domains: batch })
      }
    );
    
    const data = await response.json();
    results.push(...data.organizations);
  }
  
  return results;
}
```

### Phase 8: Re-enable Technology Filtering
**Files to modify:**
- `supabase/functions/discover-companies/providers/apollo-provider.ts`

**Current state:** Technology filtering is DISABLED ("crisis mode")

**Changes:**
1. Re-enable `currently_using_any_of_technology_uids` parameter
2. Map syllabus technologies to Apollo technology UIDs
3. Add fallback if technology filtering returns 0 results

```typescript
// Current (DISABLED):
currently_using_any_of_technology_uids: undefined

// New (ENABLED with fallback):
currently_using_any_of_technology_uids: technologiesFromSyllabus.length > 0 
  ? mapToApolloTechnologyUIDs(technologiesFromSyllabus) 
  : undefined
```

### Phase 9: Consistency Between Generation Paths
**Files to modify:**
- `src/pages/Configure.tsx`
- `src/pages/ReviewSyllabus.tsx`
- `supabase/functions/generate-projects/index.ts`

**Ensure both paths:**
1. Use identical discovery pipeline
2. Apply same scoring system
3. Handle fallbacks identically
4. Show same UI warnings/feedback

---

## Part 4: Expected Outcomes

### For Portfolio Management Course (Finance):
| Stage | Current | After Implementation |
|-------|---------|---------------------|
| Initial Discovery | Generic business companies | Companies with "Financial Analyst" jobs |
| Market Signals | Not checked | Recent investment/hiring news |
| Intent | Not checked | High buying intent for finance tools |
| Department Growth | Not checked | Finance department growing |
| **Result** | Staffing firms, random companies | Investment firms, asset managers, banks |

### For Computer Science Course:
| Stage | Current | After Implementation |
|-------|---------|---------------------|
| Initial Discovery | Generic tech companies | Companies with "Software Engineer" jobs |
| Market Signals | Not checked | Tech hiring signals |
| Intent | Not checked | High intent for dev tools |
| Department Growth | Not checked | Engineering department growing |
| **Result** | Sometimes irrelevant | SaaS companies, tech startups |

### For ANY Course:
1. Skills extracted dynamically from syllabus
2. Job postings matched to those specific skills
3. Market signals filter for ACTIVE companies
4. Department growth validates REAL opportunity
5. **Result:** Companies with PROVEN NEED → RELEVANT PROJECTS

---

## Part 5: Implementation Priority

| Phase | Priority | Estimated Impact | Complexity |
|-------|----------|------------------|------------|
| Phase 2: News Articles | P0 - Critical | High | Medium |
| Phase 3: Complete Org Info | P0 - Critical | High | Medium |
| Phase 4: Job-Skills Matcher | P1 - High | Very High | High |
| Phase 5: Composite Scoring | P1 - High | Very High | Medium |
| Phase 6: Graceful Fallback | P1 - High | Medium | Low |
| Phase 7: Bulk Enrichment | P2 - Medium | Medium (cost savings) | Low |
| Phase 8: Technology Filter | P2 - Medium | Medium | Low |
| Phase 9: Path Consistency | P2 - Medium | Low (stability) | Low |

---

## Part 6: Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| News API rate limits | Batch requests, cache results for 24h |
| Complete Org API extra calls | Only fetch for top 10 candidates after initial filter |
| AI Gateway latency for job matching | Use fast model (gemini-2.5-flash), cache embeddings |
| Zero companies after all filters | Graceful fallback with explicit warning |
| Breaking existing functionality | Feature flags, parallel A/B testing |

---

## Part 7: Success Metrics

### Quantitative:
- **Relevance Score**: % of generated projects rated "relevant" by faculty (target: 80%+)
- **Discovery Accuracy**: % of companies with matching job postings (target: 70%+)
- **API Efficiency**: Credits used per successful discovery (target: -30%)

### Qualitative:
- Finance courses get finance companies
- Engineering courses get engineering companies
- No more staffing firms in project proposals

---

## Approval Checklist

- [ ] API documentation reviewed and accurate
- [ ] Implementation phases are complete and clear
- [ ] Risks identified with mitigations
- [ ] Success metrics defined
- [ ] No breaking changes to existing functionality

---

**Next Steps:**
1. Get approval for this implementation plan
2. Implement Phase 2 (News Articles) and Phase 3 (Complete Org Info) first
3. Test with existing syllabi to validate improvement
4. Roll out remaining phases

---

*Document created: 23rd December 2025*
*Author: Lovable AI Agent*
*Version: 1.0*
