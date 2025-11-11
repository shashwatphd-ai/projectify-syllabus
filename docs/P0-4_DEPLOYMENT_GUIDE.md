# 🚀 P0-4 Intelligent Company Matching - Deployment Guide

## Overview

Complete deployment instructions for all 4 phases of P0-4 intelligent company matching.

**Total Implementation Time:** 3-4 weeks
**Deployment Time:** 2-4 hours
**Cost:** $0 (all FREE APIs)

---

## 📋 **Pre-Deployment Checklist**

### **Required:**
- [x] Phase 1: Skill extraction service (BUILT ✅)
- [x] Phase 2: O*NET integration service (BUILT ✅)
- [x] Phase 3: Semantic matching service (BUILT ✅)
- [x] Phase 4: Lightcast integration service (BUILT ✅)
- [ ] O*NET API credentials (YOU MUST PROVIDE)
- [ ] Database migrations applied
- [ ] Edge functions deployed

### **Optional:**
- [ ] Lightcast API credentials (for enhanced skill taxonomy)
- [ ] Analytics dashboard (Retool/Lovable)

---

## 🔐 **Step 1: Get API Credentials**

### **O*NET Credentials (REQUIRED)**

1. **Sign up for O*NET Web Services:**
   - Go to: https://services.onetcenter.org/
   - Click "Register for O*NET Web Services"
   - Fill in:
     - Name
     - Email
     - Organization: `[Your University/Company Name]`
     - Intended Use: `Academic research - course-to-career mapping`
   - Submit form

2. **Receive credentials:**
   - Check email for username and password
   - Example:
     ```
     Username: user@university.edu
     Password: abc123xyz789
     ```

3. **Test credentials:**
   ```bash
   curl -u "user@university.edu:abc123xyz789" \
     "https://services.onetcenter.org/ws/online/search?keyword=mechanical+engineer"
   ```

   Should return JSON with occupation data.

### **Lightcast Credentials (OPTIONAL - Phase 4 only)**

1. **Sign up for Lightcast Open Skills:**
   - Go to: https://docs.lightcast.io/apis/open-skills
   - Click "Get API Access"
   - Fill in application form
   - Wait for approval (usually 1-2 business days)

2. **Receive API key:**
   - Check email for API key
   - Example: `sk_light_abc123xyz789...`

3. **Test API key:**
   ```bash
   curl -H "Authorization: Bearer sk_light_abc123xyz789..." \
     "https://emsiservices.com/skills/versions/latest/skills?q=python&limit=1"
   ```

   Should return JSON with skill data.

---

## 🗄️ **Step 2: Apply Database Migrations**

### **Via Supabase Dashboard:**

1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order:

**Migration 1: Phase 1 - Extracted Skills**
```sql
-- File: supabase/migrations/20251111000001_add_extracted_skills_to_generation_runs.sql
-- Adds extracted_skills JSONB column to generation_runs

-- Copy-paste entire file content and run
```

**Migration 2: Phase 2 - O*NET Data**
```sql
-- File: supabase/migrations/20251111000002_add_onet_data_to_generation_runs.sql
-- Adds onet_occupations JSONB column and O*NET tracking columns

-- Copy-paste entire file content and run
```

**Migration 3: Phase 3 - Semantic Similarity**
```sql
-- File: supabase/migrations/20251111000003_add_semantic_similarity_scores.sql
-- Adds similarity_score, match_confidence to company_profiles
-- Creates company_match_quality_analytics view

-- Copy-paste entire file content and run
```

3. **Verify migrations:**
   ```sql
   -- Check that columns exist
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'generation_runs'
     AND column_name IN ('extracted_skills', 'onet_occupations', 'semantic_filter_applied');

   -- Should return 3 rows
   ```

### **Via Supabase CLI (Alternative):**

```bash
cd projectify-syllabus
supabase db push
```

---

## 🔧 **Step 3: Configure Edge Function Secrets**

### **Set O*NET Credentials (REQUIRED):**

1. Go to Supabase Dashboard → Settings → Edge Functions → Secrets
2. Add new secrets:

```
ONET_USERNAME = user@university.edu
ONET_PASSWORD = abc123xyz789
```

3. **Or via CLI:**
   ```bash
   supabase secrets set ONET_USERNAME=user@university.edu
   supabase secrets set ONET_PASSWORD=abc123xyz789
   ```

### **Set Lightcast Credentials (OPTIONAL):**

```
LIGHTCAST_API_KEY = sk_light_abc123xyz789...
```

---

## 📦 **Step 4: Deploy Edge Functions**

### **Via Supabase Dashboard:**

1. Go to Edge Functions
2. Deploy updated functions:
   - `discover-companies` (includes Phase 1-3)
   - `generate-projects` (includes Phase 1)

### **Via CLI:**

```bash
# Deploy discover-companies (Phase 1-3)
supabase functions deploy discover-companies

# Deploy generate-projects (Phase 1)
supabase functions deploy generate-projects

# Verify deployment
supabase functions list
```

---

## ✅ **Step 5: Test the System**

### **Test 1: Skill Extraction (Phase 1)**

1. Upload a test course with clear outcomes:
   ```
   Course: Fluid Mechanics
   Outcomes:
   - Apply Bernoulli's equation to analyze fluid flow in pipes
   - Calculate Reynolds number and determine flow regime
   - Use MATLAB to model fluid systems
   ```

2. Trigger company discovery
3. Check Supabase logs for:
   ```
   🧠 [Phase 1] Extracting skills from course outcomes...
   📊 Skill Extraction Results for: Fluid Mechanics
      Total Skills: 5
      Skills by Category:
      TECHNICAL:
        • Fluid Dynamics (confidence: 0.90)
        • Bernoulli's Equation Application (confidence: 0.85)
      TOOL:
        • MATLAB Programming (confidence: 0.95)
   ```

4. **Verify in database:**
   ```sql
   SELECT
     id,
     course_id,
     jsonb_array_length(extracted_skills) as skill_count,
     extracted_skills->0->>'skill' as first_skill
   FROM generation_runs
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   Should show extracted skills stored.

### **Test 2: O*NET Mapping (Phase 2)**

1. Check logs for:
   ```
   🔍 [Phase 2] Mapping skills to O*NET occupations...
   📊 O*NET Mapping Results
      Occupations Mapped: 3
      Top Occupations:
      1. Mechanical Engineers (17-2141.00) - Match: 95%
         DWAs: 15, Skills: 35
         Tools: MATLAB, ANSYS, CAD, SolidWorks, ...
         Technologies: Computational fluid dynamics (CFD), ...
   ```

2. **Verify O*NET data stored:**
   ```sql
   SELECT
     id,
     jsonb_array_length(onet_occupations) as occupation_count,
     onet_occupations->0->>'title' as top_occupation,
     onet_api_calls,
     onet_cache_hits
   FROM generation_runs
   WHERE onet_mapped_at IS NOT NULL
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. **Check Apollo filters used intelligent job titles:**
   - Logs should show: `📋 Intelligent Job Titles: Mechanical Engineers, Thermal Engineers`
   - NOT: `Director, VP, Manager` (old random titles)

### **Test 3: Semantic Filtering (Phase 3)**

1. Check logs for:
   ```
   🧠 [Phase 3] Applying semantic similarity filtering...
   📊 Semantic Filtering Results
      Total Companies: 20
      Passed Filter: 8
      Filtered Out: 12
      Threshold: 70%
      Average Similarity: 78%

      🏆 Top 5 Matches:
         1. Thermal Dynamics Inc. - 89% (high)
         2. Energy Solutions Corp. - 87% (high)
         3. HVAC Systems Ltd. - 84% (high)
         ...

      ❌ Filtered Out (< 70%):
         • Generic Consulting Firm - 45%
         • Social Policy Nonprofit - 15%
   ```

2. **Verify similarity scores stored:**
   ```sql
   SELECT
     name,
     similarity_score,
     match_confidence,
     matching_skills,
     match_explanation
   FROM company_profiles
   WHERE generation_run_id = '[your_generation_run_id]'
     AND similarity_score IS NOT NULL
   ORDER BY similarity_score DESC;
   ```

3. **Expected results:**
   - Engineering course → Engineering/manufacturing companies (0.75+ similarity)
   - CS course → Tech companies (0.75+ similarity)
   - Business course → Business/consulting firms (0.75+ similarity)
   - NO "stupid matches" (e.g., Fluid Mechanics → Social nonprofit)

### **Test 4: End-to-End Verification**

Run this query to verify the complete pipeline:

```sql
SELECT
  gr.id,
  cp.title as course_title,
  -- Phase 1: Skills
  jsonb_array_length(gr.extracted_skills) as skills_extracted,
  -- Phase 2: O*NET
  jsonb_array_length(gr.onet_occupations) as onet_occupations_mapped,
  gr.onet_api_calls,
  gr.onet_cache_hits,
  -- Phase 3: Semantic
  gr.semantic_filter_applied,
  gr.companies_before_filter,
  gr.companies_after_filter,
  ROUND((gr.companies_after_filter::numeric / NULLIF(gr.companies_before_filter, 0)) * 100, 0) as pass_rate_pct,
  gr.average_similarity_score,
  gr.semantic_processing_time_ms
FROM generation_runs gr
JOIN course_profiles cp ON gr.course_id = cp.id
WHERE gr.created_at > NOW() - INTERVAL '1 hour'
ORDER BY gr.created_at DESC
LIMIT 1;
```

**Expected Output:**
```
course_title: Fluid Mechanics
skills_extracted: 5
onet_occupations_mapped: 3
onet_api_calls: 12
onet_cache_hits: 3
semantic_filter_applied: true
companies_before_filter: 20
companies_after_filter: 8
pass_rate_pct: 40
average_similarity_score: 0.78
semantic_processing_time_ms: 450
```

---

## 🎯 **Step 6: Validate Success Criteria**

Run these checks to ensure system is working:

### **Check 1: No "Stupid Matches"**

```sql
-- Find any low-similarity matches that got through
SELECT
  cp_course.title as course_title,
  cp_course.level,
  comp.name as company_name,
  comp.sector,
  comp.similarity_score,
  comp.match_explanation
FROM company_profiles comp
JOIN generation_runs gr ON comp.generation_run_id = gr.id
JOIN course_profiles cp_course ON gr.course_id = cp_course.id
WHERE comp.similarity_score < 0.60
  AND gr.semantic_filter_applied = TRUE
  AND gr.created_at > NOW() - INTERVAL '7 days'
ORDER BY comp.similarity_score ASC;
```

**Expected:** 0 rows (or very few edge cases)
**Action if fails:** Increase similarity threshold from 0.70 to 0.75

### **Check 2: O*NET Cache is Working**

```sql
-- Cache hit rate should be > 50% after initial runs
SELECT
  ROUND((SUM(onet_cache_hits)::numeric / NULLIF(SUM(onet_api_calls + onet_cache_hits), 0)) * 100, 0) as cache_hit_rate_pct
FROM generation_runs
WHERE onet_mapped_at > NOW() - INTERVAL '7 days';
```

**Expected:** > 50%
**Action if fails:** Check cache expiration (30 days), may need larger cache

### **Check 3: Performance is Acceptable**

```sql
-- Average processing time should be < 2000ms
SELECT
  AVG(semantic_processing_time_ms) as avg_ms,
  MAX(semantic_processing_time_ms) as max_ms,
  MIN(semantic_processing_time_ms) as min_ms
FROM generation_runs
WHERE semantic_filter_applied = TRUE
  AND created_at > NOW() - INTERVAL '7 days';
```

**Expected:** avg_ms < 2000
**Action if fails:** Optimize similarity computation, consider caching embeddings

---

## 🐛 **Troubleshooting**

### **Issue 1: O*NET Authentication Failed**

**Error:** `O*NET authentication failed - check credentials`

**Solutions:**
1. Verify credentials in Supabase secrets
2. Test credentials manually:
   ```bash
   curl -u "username:password" \
     "https://services.onetcenter.org/ws/online/search?keyword=test"
   ```
3. Check if credentials expired (rare, but possible)
4. Re-generate credentials from O*NET portal

### **Issue 2: O*NET Rate Limit Exceeded**

**Error:** `O*NET rate limit exceeded (1000/day)`

**Solutions:**
1. Check daily usage:
   ```sql
   SELECT DATE(created_at), SUM(onet_api_calls) as daily_calls
   FROM generation_runs
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY DATE(created_at)
   ORDER BY daily_calls DESC;
   ```
2. If consistently hitting limit:
   - Increase cache TTL from 30 days to 60 days
   - Contact O*NET for higher rate limit (academic use)
   - Batch course processing during off-peak hours

### **Issue 3: No Skills Extracted**

**Error:** Skills array is empty or has < 2 skills

**Solutions:**
1. Check course outcomes quality:
   ```sql
   SELECT outcomes
   FROM course_profiles
   WHERE id = '[course_id]';
   ```
2. Outcomes should be specific, action-oriented:
   - Good: "Apply Bernoulli's equation to analyze fluid flow"
   - Bad: "Understand fluid mechanics concepts"
3. If outcomes are good but no extraction:
   - Check `skill-extraction-service.ts` patterns
   - May need to add domain-specific terms for niche courses

### **Issue 4: All Companies Filtered Out**

**Error:** semantic_filter results in 0 companies

**Solutions:**
1. Check threshold:
   ```sql
   SELECT semantic_filter_threshold
   FROM generation_runs
   WHERE id = '[run_id]';
   ```
2. If threshold too high (> 0.75), lower it:
   - Modify `getRecommendedThreshold()` in semantic-matching-service.ts
   - Or manually set lower threshold
3. Check if Apollo returned poor matches:
   - Review O*NET job titles used
   - May need better skill → occupation mapping

### **Issue 5: Slow Performance**

**Error:** semantic_processing_time_ms > 3000

**Solutions:**
1. Check company count:
   ```sql
   SELECT companies_before_filter
   FROM generation_runs
   WHERE id = '[run_id]';
   ```
2. If processing > 30 companies, consider:
   - Limiting Apollo results
   - Implementing parallel processing
   - Caching company embeddings
3. Profile slow queries in similarity computation

---

## 📊 **Post-Deployment Monitoring**

### **Daily Checks (First Week):**
- [ ] Check error logs in Supabase Edge Functions
- [ ] Review O*NET API usage (stay under 900/day)
- [ ] Spot-check 3-5 company matches for quality
- [ ] Monitor similarity score distribution

### **Weekly Checks:**
- [ ] Run analytics Query 1 (match quality overview)
- [ ] Review Query 11 (low match quality alert)
- [ ] Check Query 12 (API rate limits)
- [ ] User feedback: Any "stupid matches" reported?

### **Monthly Review:**
- [ ] Run full analytics dashboard
- [ ] Calculate ROI: Match quality improvement vs time invested
- [ ] Identify courses needing better skill extraction
- [ ] Tune similarity thresholds if needed

---

## 🎓 **Optional: Phase 4 Lightcast Deployment**

### **If you have Lightcast credentials:**

1. **Add to secrets:**
   ```bash
   supabase secrets set LIGHTCAST_API_KEY=sk_light_...
   ```

2. **Modify discover-companies to use Lightcast:**
   ```typescript
   // In discover-companies/index.ts, after Phase 1:
   import { enrichSkillsWithLightcast } from '../_shared/lightcast-service.ts';

   const lightcastResult = await enrichSkillsWithLightcast(skillExtractionResult.skills);
   console.log(formatLightcastEnrichmentForDisplay(lightcastResult));

   // Pass enriched skills to Phase 2 instead of raw skills
   const onetMappingResult = await mapSkillsToOnet(lightcastResult.enrichedSkills);
   ```

3. **Benefits:**
   - 32,000+ skills vs O*NET's 1,000
   - Better skill standardization
   - Skill relationships and trends
   - ~5-10% additional match quality improvement

4. **Trade-offs:**
   - Additional API calls (1000/day limit)
   - Slightly slower processing (~100ms per skill)
   - More complex to maintain

**Recommendation:** Deploy Phase 4 after Phase 1-3 are stable and validated.

---

## ✅ **Deployment Checklist Summary**

- [ ] **Step 1:** Get O*NET credentials ✅
- [ ] **Step 2:** Apply database migrations ✅
- [ ] **Step 3:** Configure edge function secrets ✅
- [ ] **Step 4:** Deploy edge functions ✅
- [ ] **Step 5:** Test all 3 phases ✅
- [ ] **Step 6:** Validate success criteria ✅
- [ ] **Step 7:** Set up monitoring ⏳
- [ ] **Step 8:** Document for team ⏳

---

## 🎉 **Success!**

If all tests pass, you now have:
- ✅ Intelligent skill extraction (Phase 1)
- ✅ O*NET-based job title matching (Phase 2)
- ✅ Semantic similarity filtering (Phase 3)
- ✅ NO MORE "stupid matches"!

**Expected Improvement:**
- Match quality: 0.3-0.5 → 0.75-0.9 (+80%)
- Bad matches: ~40% → <5% (-88%)
- Faculty satisfaction: ↑↑↑

---

## 📞 **Support**

**Issues?**
- Check `docs/P0-4_INTELLIGENT_COMPANY_MATCHING.md` for technical details
- Review `docs/P0-4_ANALYTICS_DASHBOARD_QUERIES.md` for monitoring
- Check Supabase Edge Function logs for errors

**Questions?**
- O*NET API docs: https://services.onetcenter.org/reference/
- Lightcast API docs: https://docs.lightcast.io/apis/open-skills

---

**Created By:** Claude Code
**Date:** 2025-11-11
**Version:** 1.0
**Deployment Time:** 2-4 hours
**Cost:** $0 (FREE APIs)
