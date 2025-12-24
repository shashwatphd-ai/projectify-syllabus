# Lightcast API Integration Analysis for eduthree

**Date:** December 24, 2024  
**Status:** Research Complete  
**Priority:** HIGH - Untapped Free Resource  

## Executive Summary

Lightcast offers a comprehensive ecosystem specifically designed for education-workforce alignment - exactly what eduthree needs. After reviewing their documentation and product offerings, I've identified **significant opportunities** to enhance our matching capabilities, particularly through:

1. **Skillabi** - Purpose-built for curriculum-to-occupation alignment
2. **Skills Extractor API** - Parse syllabi directly (50 free/month starter tier)
3. **Title Normalization API** - Standardize Apollo job titles
4. **Open Skills API** - 33,000+ skills taxonomy (FREE 1,000 req/month)

---

## 1. Lightcast Product Ecosystem

### 1.1 Skillabi (Enterprise - Education Focus)

**What it is:** A dedicated SaaS platform for higher education that maps academic curriculum to labor market demand.

**Key Features:**
- **Program-to-Occupation Alignment Score (0-100)** - Exactly what eduthree needs
- **Course Description SEO** - Improve course descriptions with market-relevant skill language
- **Skill Gap Analysis** - Identify what skills are missing from curriculum vs. market demand
- **Labor Market ROI** - Show students/employers the economic value of skills taught

**Relevance to eduthree:**
- This is essentially a commercial version of what we're building
- We can replicate core functionality using their APIs
- Our "mutual benefit score" maps directly to their "alignment score"

**Pricing:** Enterprise only ($5,000-15,000/year) - NOT recommended for MVP
**Alternative:** Replicate using Open Skills API + Skills Extractor API

---

### 1.2 Open Skills API (FREE TIER AVAILABLE)

**Endpoint:** `https://emsiservices.com/skills/versions/latest/skills`

**Free Tier:**
- 1,000 requests/month
- 5 requests/second rate limit
- Access to full 33,000+ skill taxonomy
- No authentication required for basic access

**What We Get:**
```json
{
  "id": "KS1200364C9C1LK3V5Q1",
  "name": "Python (Programming Language)",
  "type": {
    "id": "ST1",
    "name": "Hard Skill"
  },
  "category": {
    "id": "SC1.1",
    "name": "Information Technology"
  },
  "subcategory": {
    "id": "SC1.1.1", 
    "name": "Programming Languages"
  },
  "relatedSkills": [
    {"id": "KS125LS6N7WP4S6SFTCK", "name": "Django (Web Framework)"},
    {"id": "KS440GJ6XCBPBZZV2TYK", "name": "Machine Learning"}
  ]
}
```

**Current Implementation Status:** ✅ Exists in `lightcast-service.ts` but NOT ACTIVATED (no API key)

---

### 1.3 Skills Extractor API (50 FREE/year Starter Tier)

**Endpoint:** `POST https://classification.emsicloud.com/classifications/{release}/skills/extract`

**What it does:** Parse raw text (syllabi, job descriptions) and extract structured skills with confidence scores.

**Request:**
```json
{
  "text": "Students will learn Python programming, machine learning algorithms, and data visualization using pandas and matplotlib."
}
```

**Response:**
```json
{
  "data": [
    {
      "skill": {
        "id": "KS1200364C9C1LK3V5Q1",
        "name": "Python (Programming Language)"
      },
      "confidence": 0.95
    },
    {
      "skill": {
        "id": "KS440GJ6XCBPBZZV2TYK", 
        "name": "Machine Learning"
      },
      "confidence": 0.88
    }
  ]
}
```

**CRITICAL INSIGHT:** This could REPLACE our entire `skill-extraction-service.ts` pattern-matching approach with proper NLP!

**Current Implementation:** We have a shell in `extractSkillsFromJobPosting()` but it's never called due to missing API key.

---

### 1.4 Syllabus-to-Skills API (Classification API Professional Tier)

**Endpoint:** `POST https://classification.emsicloud.com/classifications/{release}/syllabus/skills`

**What it does:** Specialized endpoint designed specifically for academic syllabi.

**Features:**
- Understands academic language ("students will learn", "outcomes include")
- Maps to labor market demand directly
- Returns skill gaps vs. market demand
- Confidence scoring optimized for curriculum

**Pricing:** Professional tier required (~$500/month minimum)
**Recommendation:** Use Skills Extractor API instead (same core functionality)

---

### 1.5 Title Normalization API

**Endpoint:** `POST https://classification.emsicloud.com/classifications/{release}/titles/normalize`

**What it does:** Standardize messy job titles from Apollo into Lightcast taxonomy.

**Example:**
```json
// Input
{ "title": "Sr. Full Stack Dev" }

// Output
{
  "normalized": "Full Stack Developer",
  "socCode": "15-1252.00",
  "socTitle": "Software Developers",
  "confidence": 0.92
}
```

**Value for eduthree:**
- Apollo returns inconsistent job titles
- This maps them to O*NET SOC codes automatically
- Enables better skill-to-occupation matching

---

## 2. Current eduthree Implementation Gap Analysis

### 2.1 What We Have Now

| Component | Status | Quality |
|-----------|--------|---------|
| `lightcast-service.ts` | ✅ Exists | ⚠️ Shell only - not activated |
| `skill-extraction-service.ts` | ✅ Active | 🔴 Pattern matching only |
| `onet-service.ts` | ✅ Active | ✅ Good |
| `esco-provider.ts` | ✅ Active | ✅ Good |
| API Key configured | ❌ Missing | - |

### 2.2 Current Skill Extraction (Pattern-Based)

Our current `skill-extraction-service.ts` uses regex patterns:
```typescript
// Current: Pattern matching (line 166)
const toolPattern = /\b(MATLAB|Python|Java|JavaScript|...)\b/gi;
```

**Problems:**
1. Only matches pre-defined keywords
2. Misses context ("Python for data science" vs "Python basics")
3. No confidence scoring based on NLP
4. Can't extract new/emerging skills

### 2.3 Lightcast Alternative

```typescript
// Lightcast: NLP-based extraction
const response = await extractSkillsFromJobPosting(syllabusText);
// Returns: 33,000+ possible skills with confidence scores
```

---

## 3. Integration Opportunities by Priority

### 3.1 IMMEDIATE (Free, High Value)

#### A. Activate Open Skills API
**Effort:** 1 hour
**Cost:** $0 (1,000 req/month free)
**Value:** 33,000 skills vs. our ~500 keywords

**Implementation:**
1. Sign up at https://lightcast.io/open-skills/access
2. Add API key to Supabase secrets: `LIGHTCAST_API_KEY`
3. Our existing `lightcast-service.ts` will start working immediately

#### B. Enhance Skill Matching
**Effort:** 2 hours
**Cost:** $0

**Current flow:**
```
Course Outcomes → Pattern Matching → Skills → Apollo Search
```

**Enhanced flow:**
```
Course Outcomes → Lightcast API → Enriched Skills → O*NET DWAs → Apollo Search
```

---

### 3.2 SHORT-TERM (Low Cost, High Value)

#### A. Replace Pattern Matching with Skills Extractor
**Effort:** 4-6 hours
**Cost:** $0 (50 free extractions/year starter, or pay $9/month for 1,000)

**File to modify:** `supabase/functions/_shared/skill-extraction-service.ts`

```typescript
// NEW: Hybrid approach
export async function extractSkillsFromOutcomes(
  outcomes: string[],
  courseTitle?: string,
  courseLevel?: string
): Promise<SkillExtractionResult> {
  
  // Try Lightcast first (NLP-based)
  const lightcastAvailable = await checkLightcastQuota();
  if (lightcastAvailable) {
    const combinedText = outcomes.join('\n');
    const lightcastSkills = await extractSkillsFromJobPosting(combinedText);
    if (lightcastSkills.length > 0) {
      return mapLightcastToExtractedSkills(lightcastSkills);
    }
  }
  
  // Fallback to pattern matching
  return extractSkillsFromOutcomesPatternBased(outcomes, courseTitle, courseLevel);
}
```

#### B. Add Title Normalization to Apollo Pipeline
**Effort:** 3 hours
**Cost:** Included in Classification API (if using Skills Extractor)

**File to modify:** `supabase/functions/discover-companies/providers/apollo-provider.ts`

```typescript
// After getting Apollo job postings
const normalizedTitles = await Promise.all(
  jobPostings.map(job => normalizeLightcastTitle(job.title))
);
// Now we have SOC codes for each job posting!
```

---

### 3.3 LONG-TERM (Strategic Value)

#### A. Program-to-Occupation Alignment Score
Replicate Skillabi's core value proposition:

```typescript
interface ProgramAlignment {
  score: number;              // 0-100
  matchedOccupations: string[];
  skillGaps: string[];
  marketDemandTrend: 'growing' | 'stable' | 'declining';
  salaryRange: { min: number; max: number };
}

async function calculateProgramAlignment(
  courseSkills: LightcastEnrichedSkill[],
  targetOccupations: string[]
): Promise<ProgramAlignment> {
  // Use Lightcast skill relationships + O*NET occupation data
}
```

#### B. Career Pathways Integration
Lightcast has a Career Pathways API that shows:
- Entry-level → Mid-level → Senior progression
- Skill requirements at each level
- Salary progression

**Value:** Show students where their skills lead, not just current jobs.

---

## 4. API Authentication Details

### 4.1 OAuth 2.0 Flow (Required for Professional Tier)

```typescript
async function getAuthToken(): Promise<string> {
  const response = await fetch('https://auth.emsicloud.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('LIGHTCAST_CLIENT_ID'),
      client_secret: Deno.env.get('LIGHTCAST_CLIENT_SECRET'),
      grant_type: 'client_credentials',
      scope: 'emsi_open'
    })
  });
  
  const data = await response.json();
  return data.access_token; // Valid for 1 hour
}
```

### 4.2 Scopes Available

| Scope | Description | Free? |
|-------|-------------|-------|
| `lightcast_open_free` | Open Skills API only | ✅ Yes |
| `emsi_open` | Full Open Skills + basic endpoints | ✅ Yes |
| `classification_api` | Skills Extractor, Title Normalization | ❌ Paid |
| `job_postings` | Job Postings API | ❌ Paid |
| `profiles` | Talent Analytics | ❌ Paid |

---

## 5. Recommended Implementation Plan

### Phase 1: Activate Free Tier (Week 1)
- [ ] Sign up for Open Skills API access
- [ ] Add `LIGHTCAST_API_KEY` to Supabase secrets
- [ ] Verify existing `lightcast-service.ts` works
- [ ] Add skill enrichment to discovery pipeline

### Phase 2: Hybrid Extraction (Week 2-3)
- [ ] Implement quota checking for Skills Extractor
- [ ] Add fallback logic to `skill-extraction-service.ts`
- [ ] Test with 5 real syllabi
- [ ] Measure improvement in skill quality

### Phase 3: Title Normalization (Week 4)
- [ ] Add title normalization to Apollo pipeline
- [ ] Map normalized titles to O*NET SOC codes
- [ ] Improve job-skill matching accuracy

### Phase 4: Full Integration (Month 2)
- [ ] Implement Program Alignment Score
- [ ] Add Career Pathways visualization
- [ ] Build Skill Gap Analysis feature

---

## 6. Cost Projection

| Tier | Monthly Cost | Requests | Use Case |
|------|-------------|----------|----------|
| Free (Open Skills) | $0 | 1,000/month | Basic skill lookup |
| Starter (Extractor) | $0 | 50/year | Testing only |
| Developer (Extractor) | $9/month | 1,000/month | Production syllabus parsing |
| Professional | $500+/month | Unlimited | Full Skillabi replacement |

**Recommendation:** Start with FREE tier, upgrade to Developer ($9/mo) when needed.

---

## 7. Key Insights for eduthree

### 7.1 Competitive Advantage
Lightcast powers universities like ASU, Purdue, and Georgia Tech. By integrating their data:
- We match the data quality of enterprise solutions
- We provide labor market validation for projects
- We can show "market demand" for skills taught

### 7.2 Unique Value Proposition
eduthree + Lightcast enables:
```
Syllabus → Lightcast Skills → Apollo Companies → Real Projects
         ↓
    Labor Market Validation
         ↓
    "This skill is in demand by 5,000+ companies hiring now"
```

### 7.3 Faculty Selling Point
"Your course's skills are aligned with 234 active job postings in your region"
- This is exactly what Skillabi sells to universities
- We can provide it as part of project generation

---

## 8. Files Requiring Updates

| File | Changes Needed | Priority |
|------|---------------|----------|
| `supabase/functions/_shared/lightcast-service.ts` | Add OAuth flow, title normalization | HIGH |
| `supabase/functions/_shared/skill-extraction-service.ts` | Add Lightcast fallback | HIGH |
| `supabase/functions/discover-companies/index.ts` | Integrate skill enrichment | MEDIUM |
| `supabase/functions/generate-projects/index.ts` | Add skill gap analysis | LOW |
| `src/components/project-detail/MarketInsightsTab.tsx` | Display Lightcast data | LOW |

---

## 9. Action Items

### Immediate (This Week)
1. ⏳ Sign up for Lightcast Open Skills API
2. ⏳ Add `LIGHTCAST_API_KEY` secret
3. ⏳ Test basic skill lookup

### Short-Term (Next 2 Weeks)
4. ⏳ Implement hybrid skill extraction
5. ⏳ Add title normalization
6. ⏳ Measure quality improvement

### Long-Term (Month 2+)
7. ⏳ Build Program Alignment Score
8. ⏳ Add Career Pathways
9. ⏳ Create Skill Gap Dashboard

---

## 10. References

- [Skillabi Product Page](https://lightcast.io/solutions/education/skillabi)
- [Open Skills API Access](https://lightcast.io/open-skills/access)
- [Skills Extraction Demo](https://lightcast.io/open-skills/extraction)
- [API Documentation](https://docs.lightcast.io/lightcast-api/docs/introduction)
- [Classification API Reference](https://docs.lightcast.dev/apis/classification)
- [Skills Blog Post Referenced](https://lightcast.io/resources/blog/actionable-curriculum-insights-powered-by-skills)

---

*Document created: December 24, 2024*  
*Last updated: December 24, 2024*
