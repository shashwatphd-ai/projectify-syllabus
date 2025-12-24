# eduthree Commercialization Strategy Using Lightcast APIs

**Date:** December 24, 2024  
**Status:** Strategic Plan  
**Document Type:** Business + Technical Strategy  

---

## Executive Summary

Lightcast provides the data infrastructure that powers enterprise solutions like Skillabi ($5,000-15,000/year). By strategically integrating their APIs, eduthree can:

1. **Replicate Skillabi's core value** at a fraction of the cost
2. **Differentiate with real-time labor market validation** for generated projects
3. **Create premium tier features** that justify higher pricing
4. **Build competitive moats** with data-driven matching

**Bottom Line:** Lightcast APIs enable eduthree to compete with enterprise EdTech solutions while operating at startup costs.

---

## 1. Commercial Value Propositions by API

### 1.1 Job Postings API → "Live Demand Validation"

**What it does:** Real-time job posting data with skills, locations, and employer requirements.

**Commercial Application for eduthree:**

| Feature | Value Proposition | Monetization |
|---------|------------------|--------------|
| "X companies hiring for these skills right now" | Proves project relevance to faculty | Premium tier |
| Regional demand heatmaps | Helps faculty justify curriculum to administration | Enterprise upsell |
| Skill-to-posting matching | Shows students direct career pathways | Student engagement |

**Implementation:**
```typescript
// Show live demand when viewing a project
const demandData = await getLightcastJobPostings({
  skills: project.skills,
  location: course.location,
  radius_miles: 50
});

// Display: "47 companies in Kansas City are hiring for Python, Data Analysis"
```

**Pricing Justification:**
- Free tier: "Based on market data" (cached/aggregated)
- Premium tier: "47 live job postings match this project" (real-time API)

---

### 1.2 Career Coach API → "Personalized Career Pathways"

**What it does:** Interest assessments + career recommendations + local job matching.

**Commercial Application for eduthree:**

| Feature | Value Proposition | Monetization |
|---------|------------------|--------------|
| Student interest → project matching | Students pick projects aligned with their career goals | Freemium hook |
| "What can I do with these skills?" | Post-project career guidance | Premium student tier |
| Career pathway visualization | Shows progression from current skills to dream job | Student engagement |

**New Feature Concept: "Career-Aligned Project Matching"**

```
Student Profile:
- Interests: Technology, Problem-solving, Creative
- Skills: Python (beginner), Excel (intermediate)
- Goal: Data Scientist

Recommended Projects:
1. "Customer Analytics Dashboard for TechCorp" (87% career match)
   → Builds: Python, Data Visualization, SQL
   → Career Path: Junior Data Analyst → Data Scientist

2. "Predictive Maintenance System for ManuCo" (72% career match)
   → Builds: Python, Machine Learning, Statistics
```

**This doesn't exist in the market!** No platform currently matches students to industry projects based on career trajectory analysis.

---

### 1.3 Projected Occupation Growth API → "Future-Proof Projects"

**What it does:** 5-10 year forecasts for occupation and skill demand.

**Commercial Application for eduthree:**

| Feature | Value Proposition | Monetization |
|---------|------------------|--------------|
| "This skill is projected to grow 23% by 2030" | Helps faculty prioritize curriculum updates | Faculty premium |
| Emerging skills identification | Position eduthree as forward-looking | Marketing differentiator |
| Declining skill warnings | Alert faculty to outdated curriculum | Admin/enterprise tier |

**Marketing Copy:**
> "eduthree doesn't just match students to today's jobs—we prepare them for tomorrow's careers with AI-powered labor market forecasting."

---

### 1.4 Market Salary API → "ROI Transparency"

**What it does:** Salary data by occupation, region, experience level, and industry.

**Commercial Application for eduthree:**

| Feature | Value Proposition | Monetization |
|---------|------------------|--------------|
| "Skills learned → $X salary potential" | Quantifies education value for students | Marketing hook |
| Regional salary comparisons | Helps students make informed location decisions | Premium feature |
| Salary progression pathways | Shows value of skill development over time | Student premium |

**Project Display Enhancement:**
```
Project: "Cloud Infrastructure Migration for FinServ Inc."

Skills You'll Gain:
├── AWS (Cloud) → +$12,400 avg salary boost
├── Python → +$8,200 avg salary boost  
├── DevOps → +$15,100 avg salary boost
└── Total Projected Value: +$35,700/year

Entry Salary (this region): $78,000
With 3 years experience: $112,000
```

**This is powerful marketing.** Universities can show concrete ROI to prospective students and parents.

---

### 1.5 Salary Boosting Skills API → "High-Value Skill Targeting"

**What it does:** Identifies which skills provide the highest wage premiums within an occupation.

**Commercial Application for eduthree:**

| Feature | Value Proposition | Monetization |
|---------|------------------|--------------|
| "Top 5 salary-boosting skills for your major" | Helps students prioritize learning | Student engagement |
| Skill gap analysis with dollar values | Shows cost of NOT learning certain skills | Premium feature |
| Industry-specific premiums | Helps employer-facing marketing | Enterprise tier |

**Feature Concept: "Skill Investment Calculator"**
```
Your Current Skills: Excel, PowerPoint, Basic Python
Your Target Role: Marketing Analyst

Skills to Add (by ROI):
1. SQL (+$9,200/year) ← Project available!
2. Tableau (+$7,800/year) ← Project available!
3. Google Analytics (+$4,100/year)
4. A/B Testing (+$3,400/year) ← Project available!

Total Potential Uplift: +$24,500/year
```

---

### 1.6 Classification API → "Curriculum-to-Market Mapping"

**What it does:** Maps course content (CIP codes, syllabi text) to Lightcast's skill and occupation taxonomies.

**Commercial Application for eduthree:**

| Feature | Value Proposition | Monetization |
|---------|------------------|--------------|
| Automatic syllabus parsing | Reduces faculty setup time | Core product value |
| CIP-to-SOC mapping | Connects academic codes to labor market | Data quality |
| Skill gap identification | Shows what curriculum is missing | Premium analytics |

**This is foundational.** Every syllabus uploaded to eduthree should be parsed through this API for:
1. Accurate skill extraction (vs. our regex patterns)
2. Standardized taxonomy (Lightcast IDs enable cross-platform matching)
3. Gap analysis (what skills are employers asking for that this course doesn't teach?)

---

## 2. Tiered Product Strategy

### 2.1 Free Tier (Acquisition)

**Lightcast Features Used:**
- Open Skills API (33,000 skills, free)
- Basic skill matching
- Cached/aggregated market data

**What Users Get:**
- Syllabus upload and skill extraction
- 3 AI-generated project proposals per course
- Basic company matching
- "Market demand" indicator (cached)

**Goal:** Get faculty hooked on the platform's value.

---

### 2.2 Pro Tier ($49-99/faculty/month)

**Lightcast Features Used:**
- Skills Extractor API (NLP-based parsing)
- Job Postings API (regional demand)
- Market Salary API

**What Users Get:**
- Unlimited project generation
- Real-time job market validation
- "X companies hiring now" badges
- Salary/ROI projections for skills
- Priority company enrichment (Apollo)

**Value Justification:**
> "See exactly which companies in your region need the skills your students are learning—and generate projects that connect them."

---

### 2.3 Institution Tier ($5,000-15,000/year)

**Lightcast Features Used:**
- Full Career Coach API
- Projected Growth APIs
- Bulk Classification API
- Career Pathways API

**What Institutions Get:**
- Campus-wide license
- Student career guidance integration
- Curriculum gap analysis dashboard
- Accreditation-ready reports
- API access for LMS integration
- Custom regional labor market reports

**Competitive Positioning:**
> "Get the power of Skillabi at a fraction of the cost, plus AI-generated industry projects that Skillabi doesn't offer."

---

## 3. Feature Roadmap by API

### Phase 1: Foundation (Current → 4 Weeks)

| API | Feature | Priority | Cost |
|-----|---------|----------|------|
| Open Skills API | Activate skill enrichment | HIGH | $0 |
| Skills Extractor | Hybrid skill extraction | HIGH | $0-9/mo |
| Classification API | Title normalization | MEDIUM | Included |

**Deliverables:**
- [ ] Add `LIGHTCAST_API_KEY` secret
- [ ] Activate existing `lightcast-service.ts`
- [ ] Replace pattern matching with NLP extraction
- [ ] Standardize Apollo job titles

---

### Phase 2: Differentiation (Weeks 5-8)

| API | Feature | Priority | Cost |
|-----|---------|----------|------|
| Job Postings API | Live demand badges | HIGH | ~$100-300/mo |
| Market Salary API | ROI projections | MEDIUM | Included |
| Career Pathways | Career trajectory viz | MEDIUM | ~$200/mo |

**Deliverables:**
- [ ] "X companies hiring now" component
- [ ] Salary boost indicators on skills
- [ ] Career pathway visualization for students

---

### Phase 3: Premium Value (Weeks 9-16)

| API | Feature | Priority | Cost |
|-----|---------|----------|------|
| Career Coach API | Student interest matching | HIGH | ~$300-500/mo |
| Projected Growth API | Future-proofing scores | MEDIUM | Included |
| Bulk Classification | Institution curriculum analysis | MEDIUM | ~$200/mo |

**Deliverables:**
- [ ] Career-aligned project matching
- [ ] "This skill is growing 23% by 2030" badges
- [ ] Institution-wide curriculum gap dashboard

---

## 4. Competitive Differentiation

### 4.1 vs. Skillabi (Lightcast's Own Product)

| Capability | Skillabi | eduthree |
|------------|----------|----------|
| Curriculum-to-occupation alignment | ✅ | ✅ (via APIs) |
| Skill gap analysis | ✅ | ✅ (via APIs) |
| Real-time job posting data | ✅ | ✅ (via APIs) |
| **AI-generated industry projects** | ❌ | ✅ UNIQUE |
| **Direct company connections** | ❌ | ✅ UNIQUE |
| **Student-employer matching** | ❌ | ✅ UNIQUE |
| Pricing | $5,000-15,000/year | $1,200-5,000/year |

**eduthree's Moat:** We don't just analyze—we **generate actionable projects** and **connect students to real companies**.

---

### 4.2 vs. Handshake

| Capability | Handshake | eduthree |
|------------|-----------|----------|
| Job board | ✅ | ❌ (not our focus) |
| Employer connections | ✅ (apply-based) | ✅ (project-based) |
| Labor market data | Limited | ✅ (Lightcast-powered) |
| **Curriculum alignment** | ❌ | ✅ UNIQUE |
| **Project-based learning** | ❌ | ✅ UNIQUE |
| **AI generation** | ❌ | ✅ UNIQUE |

**eduthree's Moat:** We create learning experiences, not just job listings.

---

### 4.3 vs. Riipen / PracticumHub

| Capability | Riipen | eduthree |
|------------|--------|----------|
| Experiential learning marketplace | ✅ | ✅ |
| Company project matching | Manual | AI-generated |
| Labor market validation | ❌ | ✅ (Lightcast) |
| Skill-based matching | Basic | ✅ (33,000+ skills) |
| **ROI/salary projections** | ❌ | ✅ UNIQUE |
| **Career pathway guidance** | ❌ | ✅ UNIQUE |

**eduthree's Moat:** Data-driven project generation with measurable career outcomes.

---

## 5. Revenue Projections

### 5.1 Unit Economics

| Tier | Price | Lightcast Cost | Gross Margin |
|------|-------|----------------|--------------|
| Free | $0 | ~$0 (Open Skills only) | N/A |
| Pro (Faculty) | $79/mo | ~$5-10/faculty/mo | ~85% |
| Institution | $10,000/yr | ~$1,500-3,000/yr | ~70-85% |

### 5.2 Scaling Scenarios

**Conservative (Year 1):**
- 50 Pro faculty × $79/mo = $47,400/year
- 3 Institutions × $10,000 = $30,000/year
- **Total ARR: $77,400**
- Lightcast costs: ~$8,000/year
- **Net margin: ~90%**

**Growth (Year 2):**
- 200 Pro faculty × $79/mo = $189,600/year
- 15 Institutions × $12,000 = $180,000/year
- **Total ARR: $369,600**
- Lightcast costs: ~$24,000/year
- **Net margin: ~93%**

---

## 6. Implementation Priority Matrix

| Feature | Commercial Impact | Implementation Effort | Priority |
|---------|-------------------|----------------------|----------|
| Activate Open Skills API | HIGH | LOW (1 day) | **P0** |
| Skills Extractor hybrid | HIGH | MEDIUM (1 week) | **P0** |
| Live demand badges | HIGH | MEDIUM (1 week) | **P1** |
| Salary/ROI projections | HIGH | LOW (3 days) | **P1** |
| Career pathway viz | MEDIUM | HIGH (2 weeks) | **P2** |
| Career Coach matching | HIGH | HIGH (3 weeks) | **P2** |
| Institution dashboard | MEDIUM | HIGH (4 weeks) | **P3** |

---

## 7. Immediate Action Items

### This Week (Priority 0)

1. **Sign up for Lightcast Open Skills API**
   - URL: https://lightcast.io/open-skills/access
   - Free tier: 1,000 requests/month
   - Expected approval: 1-2 business days

2. **Add API key to Supabase secrets**
   ```bash
   # Secret name: LIGHTCAST_API_KEY
   # Value: (from Lightcast email)
   ```

3. **Verify existing implementation works**
   - File: `supabase/functions/_shared/lightcast-service.ts`
   - Test: Skill enrichment for 1 course

### Next 2 Weeks (Priority 1)

4. **Implement hybrid skill extraction**
   - Primary: Lightcast Skills Extractor
   - Fallback: Current pattern matching
   - Benefit: 33,000 skills vs. ~500 keywords

5. **Add "Live Demand" badges**
   - Query Job Postings API for project skills
   - Display: "12 companies hiring for Python in Kansas City"
   - Location: Project cards + detail pages

6. **Add salary boost indicators**
   - Query Salary Boosting Skills API
   - Display: "+$8,200/year potential" on skill badges

---

## 8. Marketing Messaging

### For Faculty

> **"See exactly which employers need the skills you teach."**
> 
> eduthree connects your curriculum to real-time labor market data from Lightcast, powering universities like ASU, Purdue, and Georgia Tech. Generate industry-validated projects that prove your program's relevance.

### For Students

> **"Projects that build your career, not just your resume."**
> 
> Every eduthree project is matched to real employer demand. See which skills boost your salary, which companies are hiring, and how your work connects to your dream career.

### For Institutions

> **"The ROI of experiential learning—quantified."**
> 
> Track curriculum-to-career outcomes with Lightcast labor market intelligence. Generate accreditation-ready reports showing how student projects align with regional workforce needs.

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Lightcast API downtime | Implement caching (7-day TTL for skills) |
| Rate limits exceeded | Request limit monitoring + quota alerts |
| Price increases | Diversify to Adzuna/O*NET fallbacks |
| Feature parity with Skillabi | Focus on unique project generation value |
| Enterprise sales cycle length | Self-serve Pro tier for cash flow |

---

## 10. Success Metrics

| Metric | Baseline | 3-Month Target | 6-Month Target |
|--------|----------|----------------|----------------|
| Skill match accuracy | ~60% (pattern) | ~85% (Lightcast) | ~90% |
| Faculty conversion (free→paid) | 0% | 5% | 12% |
| "Demand validated" projects | 0% | 50% | 100% |
| Institution pipeline | 0 | 5 demos | 3 contracts |
| NPS (faculty) | Unknown | 40+ | 50+ |

---

## Appendix: API Cost Modeling

### Lightcast API Tiers

| Tier | Monthly Cost | Requests | Best For |
|------|-------------|----------|----------|
| Open Skills (Free) | $0 | 1,000/month | Basic skill lookup |
| Developer | ~$100-300 | 10,000/month | Production apps |
| Professional | ~$500-1,000 | 50,000/month | High-volume |
| Enterprise | Custom | Unlimited | Institution-wide |

### eduthree Usage Projection

| Component | Requests/Course | Monthly Volume (50 courses) | Tier Needed |
|-----------|-----------------|----------------------------|-------------|
| Skill enrichment | 20 | 1,000 | Free |
| Job postings query | 5 | 250 | Developer |
| Salary lookup | 10 | 500 | Developer |
| Career pathways | 3 | 150 | Developer |
| **Total** | 38 | **1,900** | **Developer ($100-300/mo)** |

---

*Document created: December 24, 2024*  
*Last updated: December 24, 2024*  
*Author: Lovable AI Agent*
