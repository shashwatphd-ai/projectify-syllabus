# 🚀 P0-4: Phased Deployment Plan for Intelligent Company Matching

## Overview

**Total Phases:** 4 phases (can be deployed independently)
**Total Timeline:** 3-4 weeks
**Deployment Strategy:** Incremental rollout with testing at each phase
**Rollback Safety:** Each phase is backward-compatible

---

## 📊 **Phase Breakdown**

### **Phase 1: Skill Extraction Foundation** ⚡ (Week 1 - 3 days)
**Goal:** Extract structured skills from course outcomes instead of generic text

**What Gets Built:**
- `supabase/functions/_shared/skill-extraction-service.ts`
- NLP-based skill extraction using Stanza.js or compromise.js
- Categorization: technical/analytical/domain skills
- Store extracted skills in `generation_runs` table

**User Impact:**
- No visible change yet (backend only)
- But: Skills now captured for future matching

**What I Need From You:**
1. ✅ **Approval to proceed** (no API keys needed - open source NLP)
2. ✅ **Test on 5-10 sample courses** after implementation
   - I'll extract skills, you verify they make sense
   - Example: "Apply Bernoulli's equation" → Should extract "Fluid Dynamics", "Mathematical Modeling"
3. ✅ **Deployment approval** after testing

**Deployment:**
- Deploy to edge function
- No database migration needed
- Zero risk (additive change only)

**Success Criteria:**
- 80%+ of technical terms correctly extracted
- Skills categorized appropriately
- No performance degradation (<200ms added)

---

### **Phase 2: O*NET Occupational Mapping** 🎯 (Week 1-2 - 4 days)
**Goal:** Map extracted skills to real-world occupations and job titles

**What Gets Built:**
- `supabase/functions/_shared/onet-service.ts`
- Integration with O*NET Web Services API (FREE)
- Caching layer for O*NET data (30-day TTL)
- Map skills → SOC codes → Detailed Work Activities → Tools/Technologies

**User Impact:**
- Apollo filters now use SPECIFIC job titles (e.g., "Thermal Engineer") instead of RANDOM titles
- Better company matches immediately visible
- **Estimated improvement: 30-40% better matches**

**What I Need From You:**
1. ✅ **O*NET API Credentials** (FREE - takes 2 minutes)
   - Sign up at: https://services.onetcenter.org/
   - Get API username + password
   - Provide to me (I'll store in Supabase secrets)
2. ✅ **Test generation with 3 courses:**
   - Engineering course (e.g., Fluid Mechanics)
   - Business course (e.g., Marketing Strategy)
   - CS/Data course (e.g., Data Structures)
3. ✅ **Compare old vs new company matches**
   - Are job titles more specific?
   - Do companies make more sense?
4. ✅ **Deployment approval** after testing

**Deployment:**
- Add O*NET credentials to Supabase secrets
- Deploy updated `apollo-provider.ts` with intelligent filters
- Add `onet_occupations` JSONB column to `generation_runs`
- **Rollback available:** Can revert to old filter generation if needed

**Success Criteria:**
- Fluid Mechanics → "Mechanical Engineer", "Thermal Engineer" job titles (not "Director", "VP")
- Engineering courses → No more social nonprofit matches
- Match relevance visibly improved

---

### **Phase 3: Semantic Similarity Filtering** 🧠 (Week 2-3 - 5 days)
**Goal:** Post-filter companies using semantic similarity (course ↔ company job postings)

**What Gets Built:**
- `supabase/functions/_shared/semantic-matching-service.ts`
- Sentence-BERT model integration (@xenova/transformers)
- Embedding generation for courses and companies
- Cosine similarity scoring (0.0 to 1.0)
- Threshold-based filtering (0.7+ = good match)

**User Impact:**
- **Dramatic improvement:** "Stupid matches" eliminated
- Companies ranked by semantic similarity
- Match confidence shown to users
- **Estimated improvement: 50-60% better matches (cumulative)**

**What I Need From You:**
1. ✅ **Test on 10+ courses** across different domains
2. ✅ **Validate no bad matches:**
   - Engineering → No nonprofits/consulting firms
   - Business → No pure tech companies (unless appropriate)
   - CS → No manufacturing (unless software-related)
3. ✅ **Feedback on similarity threshold:**
   - Is 0.7 too strict? (fewer companies)
   - Or should we use 0.65? (more companies, slightly lower quality)
4. ✅ **Performance check:**
   - Is discovery taking too long? (target: <30 seconds)
5. ✅ **Deployment approval**

**Deployment:**
- Deploy Sentence-BERT model to edge function
- Add semantic filtering to `apollo-provider.ts`
- Add `similarity_score` column to `company_profiles` and `generation_runs`
- **Rollback available:** Can disable semantic filtering via feature flag

**Success Criteria:**
- Fluid Mechanics → Thermal/Manufacturing companies (0.85+ similarity)
- Social nonprofit → Similarity score 0.15, FILTERED OUT
- Average match quality: 0.75+
- No "stupid matches" reported

---

### **Phase 4: Lightcast Enrichment + Analytics** 📊 (Week 3-4 - 5 days - OPTIONAL)
**Goal:** Enhance with richer skill taxonomy and build analytics dashboard

**What Gets Built:**
- `supabase/functions/_shared/lightcast-service.ts`
- Integration with Lightcast Open Skills API (FREE)
- 32,000+ skills vs O*NET's ~1000
- Skill relationships (parent/child)
- Analytics dashboard for match quality monitoring

**User Impact:**
- Even more precise skill matching
- Skill trend data (growing/declining skills)
- Analytics to monitor system performance
- **Estimated improvement: 5-10% better matches (cumulative)**

**What I Need From You:**
1. ✅ **Lightcast API Credentials** (FREE)
   - Sign up at: https://docs.lightcast.io/apis/open-skills
   - Get API key
   - Provide to me
2. ✅ **Decide on analytics dashboard features:**
   - What metrics do you want to see?
   - Match quality over time?
   - Most common skills extracted?
   - Company match distribution?
3. ✅ **A/B testing (optional):**
   - Run 50% old system, 50% new system for 1 week
   - Compare results
4. ✅ **Final deployment approval**

**Deployment:**
- Add Lightcast credentials to Supabase secrets
- Deploy enrichment service
- Add analytics views/queries
- **Optional:** Build Retool/Lovable dashboard

**Success Criteria:**
- More granular skill matching (32K vs 1K skills)
- Analytics dashboard live
- Match quality tracked over time

---

## 📅 **Deployment Timeline**

### **Aggressive Timeline (3 weeks):**
```
Week 1:
  Mon-Wed: Phase 1 (Skill Extraction) → Deploy
  Thu-Fri: Phase 2 (O*NET Mapping) → Deploy

Week 2:
  Mon-Wed: Phase 3 (Semantic Matching) → Deploy
  Thu-Fri: Testing & Tuning

Week 3:
  Mon-Wed: Phase 4 (Lightcast + Analytics) → Deploy
  Thu-Fri: Final testing & documentation
```

### **Conservative Timeline (4 weeks):**
```
Week 1:
  Mon-Fri: Phase 1 (Skill Extraction) → Deploy + thorough testing

Week 2:
  Mon-Fri: Phase 2 (O*NET Mapping) → Deploy + extensive testing

Week 3:
  Mon-Fri: Phase 3 (Semantic Matching) → Deploy + validation

Week 4:
  Mon-Fri: Phase 4 (Lightcast + Analytics) → Deploy + monitoring
```

**Recommended:** Conservative timeline for production stability

---

## 🎯 **What You Need to Provide**

### **Phase 1 (No External Dependencies):**
- [x] Approval to proceed *(just say "yes, start Phase 1")*
- [ ] Test skills extracted from 5-10 courses
- [ ] Deployment approval

**Required Time from You:** 30-60 minutes (testing)

---

### **Phase 2 (O*NET Integration):**
- [ ] **O*NET API Credentials** (2-minute signup)
  - Go to: https://services.onetcenter.org/
  - Click "Register"
  - Fill form (name, email, organization)
  - Get username + password
  - Provide to me: `ONET_USERNAME=xxx` and `ONET_PASSWORD=xxx`
- [ ] Test 3 courses (engineering, business, CS)
- [ ] Compare before/after company matches
- [ ] Deployment approval

**Required Time from You:** 1-2 hours (signup + testing)

---

### **Phase 3 (Semantic Matching):**
- [ ] Test 10+ courses across domains
- [ ] Validate no "stupid matches" appear
- [ ] Feedback on similarity threshold (0.7 vs 0.65)
- [ ] Performance validation (<30 seconds discovery)
- [ ] Deployment approval

**Required Time from You:** 2-3 hours (extensive testing)

---

### **Phase 4 (Lightcast + Analytics) - OPTIONAL:**
- [ ] **Lightcast API Credentials** (5-minute signup)
  - Go to: https://docs.lightcast.io/apis/open-skills
  - Sign up for free tier
  - Get API key
  - Provide to me: `LIGHTCAST_API_KEY=xxx`
- [ ] Define analytics dashboard requirements
- [ ] Optional: A/B testing (1 week)
- [ ] Final deployment approval

**Required Time from You:** 1-2 hours (signup + dashboard review)

---

## 💡 **Minimum Viable Enhancement (MVE)**

If you want to move **fast** and see results quickly:

### **Deploy Only Phases 1-2 First (Week 1):**
- Skill extraction + O*NET mapping
- Intelligent job titles instead of randomized
- **30-40% improvement** with minimal effort
- Only need O*NET credentials from you

### **Then Add Phase 3 Later (Week 2-3):**
- Semantic filtering for maximum quality
- **50-60% cumulative improvement**
- More testing required from you

### **Skip Phase 4 Initially:**
- Lightcast is "nice to have" not "must have"
- Analytics can be built later
- Focus on core matching first

**Recommended MVE:** Phases 1-3 (skip Phase 4 initially)

---

## 🔄 **Rollback Strategy**

### **Each Phase is Reversible:**

**Phase 1 Rollback:**
- Remove skill extraction call
- No impact on matching (data only)
- Time: < 5 minutes

**Phase 2 Rollback:**
- Revert to old `generateFilters()` function
- Remove O*NET mapping call
- Time: < 10 minutes

**Phase 3 Rollback:**
- Disable semantic filtering via feature flag
- Keep over-fetching but don't filter
- Time: < 5 minutes

**Phase 4 Rollback:**
- Remove Lightcast enrichment call
- Fall back to O*NET only
- Time: < 5 minutes

**Full System Rollback:**
- Git revert to commit before Phase 1
- Redeploy old edge function
- Time: < 15 minutes

---

## 📊 **Expected Improvement by Phase**

| Phase | Match Quality | Bad Matches | User Satisfaction | Cumulative |
|-------|--------------|-------------|-------------------|------------|
| **Baseline (Current)** | 0.3-0.5 | ~40% | Low | - |
| **Phase 1** | 0.35-0.55 | ~35% | Low-Medium | +10% |
| **Phase 2** | 0.50-0.70 | ~15% | Medium | +40% |
| **Phase 3** | 0.75-0.90 | <5% | High | +80% |
| **Phase 4** | 0.80-0.95 | <3% | Very High | +90% |

**Key Takeaway:** Phase 2-3 deliver 80% of the value

---

## 🚀 **Recommended Deployment Strategy**

### **Option A: Conservative (Recommended for Production)**
```
Week 1: Phase 1 → Deploy → Test thoroughly
Week 2: Phase 2 → Deploy → Test + collect feedback
Week 3: Phase 3 → Deploy → Extensive validation
Week 4: Phase 4 (optional) → Deploy → Monitor

Total: 3-4 weeks, maximum stability
```

### **Option B: Aggressive (Faster Results)**
```
Week 1: Phase 1+2 → Deploy → Quick testing
Week 2: Phase 3 → Deploy → Validation
Week 3: Phase 4 (optional) + final polish

Total: 2-3 weeks, slightly higher risk
```

### **Option C: MVP (Minimum Viable Product)**
```
Week 1: Phase 1+2 → Deploy → Testing
Week 2: Tuning + bug fixes
Week 3: Phase 3 → Deploy (skip Phase 4)

Total: 3 weeks, core functionality only
```

**My Recommendation:** **Option A** (Conservative) for production system

---

## ✅ **Your Decision Points**

### **Decision 1: Which Timeline?**
- [ ] Aggressive (3 weeks)
- [ ] Conservative (4 weeks) ← **Recommended**
- [ ] MVP (3 weeks, skip Phase 4)

### **Decision 2: Include Phase 4 (Lightcast)?**
- [ ] Yes (full enhancement)
- [ ] No (focus on core matching) ← **Can add later**
- [ ] Decide after Phase 3 results ← **Pragmatic approach**

### **Decision 3: Testing Approach?**
- [ ] Test each phase before moving to next ← **Recommended**
- [ ] Test only Phase 2+3 together (faster)
- [ ] Full system test at end only (risky)

---

## 📋 **What Happens Next?**

### **Once You Approve:**

**Step 1:** You tell me:
- "Start Phase 1" or "Start all phases"
- Which timeline (aggressive/conservative/MVP)
- Whether to include Phase 4

**Step 2:** I'll start building:
- Create skill extraction service
- Test on sample courses
- Request your feedback

**Step 3:** You provide:
- O*NET credentials (2-minute signup)
- Test a few courses
- Give deployment approval

**Step 4:** We iterate:
- Deploy phase by phase
- Test incrementally
- Tune as needed

**Step 5:** You enjoy:
- No more "stupid matches"
- Fluid Mechanics → Thermal Engineering companies
- 80-90% better match quality

---

## 🎯 **Summary: What You Need to Do**

### **Minimal Requirements (Phases 1-3 only):**

1. **5 minutes:** Say "yes, start Phase 1" and choose timeline
2. **2 minutes:** Sign up for O*NET API (free)
3. **30 minutes:** Test skill extraction (Phase 1)
4. **1 hour:** Test 3 courses with O*NET mapping (Phase 2)
5. **2 hours:** Test 10+ courses with semantic filtering (Phase 3)
6. **15 minutes:** Approve each deployment (3 times)

**Total Time from You: ~4 hours over 3-4 weeks**

### **Full Enhancement (Include Phase 4):**

All of above, plus:
- **5 minutes:** Sign up for Lightcast API (free)
- **1 hour:** Define analytics dashboard requirements
- **Optional:** 1 week A/B testing

**Total Time from You: ~5-6 hours over 4 weeks**

---

## 🤔 **My Recommendation**

**Best Approach:**
1. **Start with Phases 1-3** (Conservative timeline, 3 weeks)
2. **Skip Phase 4 initially** (add later if needed)
3. **Test thoroughly at each phase** (prevents issues downstream)
4. **Monitor match quality after Phase 3**
5. **Decide on Phase 4** based on results

**Why:**
- Phases 1-3 deliver 80% of value
- Lower risk with incremental deployment
- Can add Lightcast anytime later
- Get results faster (3 weeks vs 4 weeks)

---

## ❓ **Questions to Answer**

Before I start, please confirm:

1. **Timeline:** Aggressive (3 weeks) or Conservative (4 weeks)?
2. **Phase 4:** Include now, skip, or decide later?
3. **Testing:** Will you be available for testing at each phase?
4. **API Access:** Can you sign up for free O*NET credentials?

**Just reply with:**
- "Start Phase 1, conservative timeline, skip Phase 4 for now"
- OR your preferred approach

Then I'll begin immediately! 🚀

---

**Created By:** Claude Code
**Date:** 2025-11-11
**Version:** 1.0
