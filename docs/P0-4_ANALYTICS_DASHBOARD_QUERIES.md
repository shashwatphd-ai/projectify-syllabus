# 📊 P0-4 Analytics Dashboard Queries

## Overview

SQL queries for monitoring intelligent company matching performance.
Use these in Retool, Lovable, or direct Supabase console.

---

## 🎯 **Key Metrics Dashboard**

### **Query 1: Match Quality Overview**

```sql
-- Overall match quality across all generation runs
SELECT
  COUNT(DISTINCT gr.id) as total_runs,
  COUNT(DISTINCT gr.course_id) as unique_courses,
  SUM(gr.companies_before_filter) as total_companies_discovered,
  SUM(gr.companies_after_filter) as total_companies_matched,
  ROUND(AVG(gr.average_similarity_score)::numeric, 2) as avg_similarity,
  ROUND(AVG(gr.onet_api_calls)::numeric, 0) as avg_onet_calls,
  ROUND(AVG(gr.semantic_processing_time_ms)::numeric, 0) as avg_processing_time_ms
FROM generation_runs gr
WHERE gr.semantic_filter_applied = TRUE
  AND gr.created_at > NOW() - INTERVAL '30 days';
```

**Expected Output:**
```
total_runs: 150
unique_courses: 45
total_companies_discovered: 3000
total_companies_matched: 1800
avg_similarity: 0.78
avg_onet_calls: 12
avg_processing_time_ms: 450
```

---

### **Query 2: Match Quality by Course**

```sql
-- Top 10 courses with best match quality
SELECT
  cp.title as course_title,
  cp.level,
  COUNT(gr.id) as generation_runs,
  ROUND(AVG(gr.average_similarity_score)::numeric, 2) as avg_similarity,
  SUM(gr.companies_after_filter) as total_matches,
  ROUND((SUM(gr.companies_after_filter)::numeric / NULLIF(SUM(gr.companies_before_filter), 0)) * 100, 0) as pass_rate_pct
FROM generation_runs gr
JOIN course_profiles cp ON gr.course_id = cp.id
WHERE gr.semantic_filter_applied = TRUE
  AND gr.created_at > NOW() - INTERVAL '30 days'
GROUP BY cp.id, cp.title, cp.level
ORDER BY avg_similarity DESC
LIMIT 10;
```

**Use Case:** Identify which types of courses get best matches

---

### **Query 3: Match Confidence Distribution**

```sql
-- Distribution of high/medium/low confidence matches
SELECT
  gr.course_id,
  cp.title as course_title,
  COUNT(cprof.id) FILTER (WHERE cprof.match_confidence = 'high') as high_confidence,
  COUNT(cprof.id) FILTER (WHERE cprof.match_confidence = 'medium') as medium_confidence,
  COUNT(cprof.id) FILTER (WHERE cprof.match_confidence = 'low') as low_confidence,
  COUNT(cprof.id) as total_companies,
  ROUND(AVG(cprof.similarity_score)::numeric, 2) as avg_similarity
FROM generation_runs gr
JOIN course_profiles cp ON gr.course_id = cp.id
LEFT JOIN company_profiles cprof ON cprof.generation_run_id = gr.id
WHERE gr.semantic_filter_applied = TRUE
  AND gr.created_at > NOW() - INTERVAL '7 days'
GROUP BY gr.course_id, cp.title
ORDER BY high_confidence DESC;
```

**Chart:** Stacked bar chart showing confidence distribution per course

---

## 🔍 **Skill Extraction Analytics**

### **Query 4: Most Common Extracted Skills**

```sql
-- Top 20 most frequently extracted skills across all courses
SELECT
  skill->>'skill' as skill_name,
  skill->>'category' as skill_category,
  COUNT(*) as frequency,
  ROUND(AVG((skill->>'confidence')::numeric), 2) as avg_confidence
FROM generation_runs,
     LATERAL jsonb_array_elements(extracted_skills) as skill
WHERE extracted_skills IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY skill->>'skill', skill->>'category'
ORDER BY frequency DESC
LIMIT 20;
```

**Chart:** Horizontal bar chart of top skills

---

### **Query 5: Skills by Course Domain**

```sql
-- Skill extraction performance by course level/domain
SELECT
  cp.level as course_level,
  COUNT(DISTINCT gr.id) as courses,
  ROUND(AVG(jsonb_array_length(gr.extracted_skills))::numeric, 1) as avg_skills_per_course,
  COUNT(*) FILTER (WHERE jsonb_array_length(gr.extracted_skills) < 3) as courses_with_few_skills
FROM generation_runs gr
JOIN course_profiles cp ON gr.course_id = cp.id
WHERE gr.extracted_skills IS NOT NULL
  AND gr.created_at > NOW() - INTERVAL '30 days'
GROUP BY cp.level
ORDER BY avg_skills_per_course DESC;
```

**Use Case:** Identify courses where skill extraction needs improvement

---

## 🎓 **O*NET Integration Analytics**

### **Query 6: Most Matched O*NET Occupations**

```sql
-- Top 10 O*NET occupations matched across courses
SELECT
  occ->>'code' as soc_code,
  occ->>'title' as occupation_title,
  COUNT(*) as frequency,
  ROUND(AVG((occ->>'matchScore')::numeric), 2) as avg_match_score
FROM generation_runs,
     LATERAL jsonb_array_elements(onet_occupations) as occ
WHERE onet_occupations IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY occ->>'code', occ->>'title'
ORDER BY frequency DESC
LIMIT 10;
```

**Chart:** Treemap of O*NET occupations

---

### **Query 7: O*NET API Performance**

```sql
-- O*NET API usage and cache performance
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_runs,
  SUM(onet_api_calls) as total_api_calls,
  SUM(onet_cache_hits) as total_cache_hits,
  ROUND((SUM(onet_cache_hits)::numeric / NULLIF(SUM(onet_api_calls + onet_cache_hits), 0)) * 100, 0) as cache_hit_rate_pct,
  ROUND(AVG(onet_api_calls)::numeric, 1) as avg_calls_per_run
FROM generation_runs
WHERE onet_mapped_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '14 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Chart:** Line chart showing cache hit rate over time
**Alert:** If cache_hit_rate < 50%, investigate caching issues

---

## 🧠 **Semantic Matching Analytics**

### **Query 8: Filtering Effectiveness**

```sql
-- How many companies are filtered out by semantic matching
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_runs,
  SUM(companies_before_filter) as total_discovered,
  SUM(companies_after_filter) as total_matched,
  ROUND((SUM(companies_after_filter)::numeric / NULLIF(SUM(companies_before_filter), 0)) * 100, 0) as pass_rate_pct,
  ROUND(AVG(semantic_processing_time_ms)::numeric, 0) as avg_processing_ms
FROM generation_runs
WHERE semantic_filter_applied = TRUE
  AND created_at > NOW() - INTERVAL '14 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Chart:** Dual-axis chart (bar: companies, line: pass rate)
**Target:** Pass rate between 40-60% (too high = not selective, too low = too strict)

---

### **Query 9: Similarity Score Distribution**

```sql
-- Histogram of similarity scores
SELECT
  CASE
    WHEN similarity_score >= 0.9 THEN '0.90-1.00'
    WHEN similarity_score >= 0.8 THEN '0.80-0.89'
    WHEN similarity_score >= 0.7 THEN '0.70-0.79'
    WHEN similarity_score >= 0.6 THEN '0.60-0.69'
    ELSE '0.00-0.59'
  END as similarity_bucket,
  COUNT(*) as company_count,
  ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM company_profiles WHERE similarity_score IS NOT NULL)) * 100, 1) as percentage
FROM company_profiles
WHERE similarity_score IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY similarity_bucket
ORDER BY similarity_bucket DESC;
```

**Chart:** Histogram showing distribution
**Target:** Most companies in 0.70-0.89 range

---

## 🏆 **Success Metrics**

### **Query 10: Before vs After Comparison**

```sql
-- Compare match quality before and after P0-4 implementation
WITH before_p04 AS (
  SELECT
    COUNT(*) as runs,
    COUNT(DISTINCT course_id) as courses,
    AVG(companies_discovered) as avg_companies
  FROM generation_runs
  WHERE created_at < '2025-11-11'  -- P0-4 deployment date
    AND created_at > '2025-10-01'
),
after_p04 AS (
  SELECT
    COUNT(*) as runs,
    COUNT(DISTINCT course_id) as courses,
    AVG(companies_after_filter) as avg_companies,
    AVG(average_similarity_score) as avg_similarity,
    AVG(CASE WHEN semantic_filter_applied THEN 1 ELSE 0 END) as p04_adoption_rate
  FROM generation_runs
  WHERE created_at >= '2025-11-11'
)
SELECT
  'Before P0-4' as period,
  before_p04.runs,
  before_p04.courses,
  before_p04.avg_companies,
  NULL as avg_similarity,
  NULL as p04_adoption_rate
FROM before_p04
UNION ALL
SELECT
  'After P0-4' as period,
  after_p04.runs,
  after_p04.courses,
  after_p04.avg_companies,
  after_p04.avg_similarity,
  after_p04.p04_adoption_rate
FROM after_p04;
```

---

## 🚨 **Alerts & Monitoring**

### **Query 11: Low Match Quality Alert**

```sql
-- Courses with consistently low match quality (< 0.6 avg similarity)
SELECT
  cp.id as course_id,
  cp.title,
  cp.level,
  COUNT(gr.id) as generation_runs,
  ROUND(AVG(gr.average_similarity_score)::numeric, 2) as avg_similarity,
  ROUND(AVG(jsonb_array_length(gr.extracted_skills))::numeric, 1) as avg_skills_extracted,
  STRING_AGG(DISTINCT occ->>'title', ', ') as onet_occupations
FROM generation_runs gr
JOIN course_profiles cp ON gr.course_id = cp.id
LEFT JOIN LATERAL jsonb_array_elements(gr.onet_occupations) as occ ON true
WHERE gr.semantic_filter_applied = TRUE
  AND gr.created_at > NOW() - INTERVAL '30 days'
GROUP BY cp.id, cp.title, cp.level
HAVING AVG(gr.average_similarity_score) < 0.6
ORDER BY avg_similarity ASC;
```

**Action:** Review course outcomes, check if skills are being extracted correctly

---

### **Query 12: API Rate Limit Monitoring**

```sql
-- Monitor O*NET API usage approaching rate limits (1000/day)
SELECT
  DATE(created_at) as date,
  SUM(onet_api_calls) as daily_api_calls,
  1000 - SUM(onet_api_calls) as remaining_calls,
  CASE
    WHEN SUM(onet_api_calls) > 900 THEN '🚨 CRITICAL'
    WHEN SUM(onet_api_calls) > 700 THEN '⚠️ WARNING'
    ELSE '✅ OK'
  END as status
FROM generation_runs
WHERE onet_mapped_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Alert Threshold:** > 900 calls/day

---

## 📈 **Trend Analysis**

### **Query 13: Match Quality Trend (7-day moving average)**

```sql
-- 7-day moving average of match quality
SELECT
  date,
  avg_similarity,
  AVG(avg_similarity) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as moving_avg_7day
FROM (
  SELECT
    DATE(created_at) as date,
    AVG(average_similarity_score) as avg_similarity
  FROM generation_runs
  WHERE semantic_filter_applied = TRUE
    AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
) daily
ORDER BY date;
```

**Chart:** Line chart with smoothed trend line

---

## 🎨 **Dashboard Layout Recommendation**

### **Page 1: Executive Overview**
- Query 1: Key Metrics (KPI cards)
- Query 8: Filtering Effectiveness (line chart)
- Query 10: Before/After Comparison (comparison table)

### **Page 2: Match Quality Deep Dive**
- Query 2: Match Quality by Course (table)
- Query 3: Confidence Distribution (stacked bar)
- Query 9: Similarity Score Distribution (histogram)

### **Page 3: Skill & O*NET Analytics**
- Query 4: Most Common Skills (horizontal bar)
- Query 6: Top O*NET Occupations (treemap)
- Query 7: O*NET API Performance (line chart)

### **Page 4: Alerts & Monitoring**
- Query 11: Low Match Quality Alert (table with red highlight)
- Query 12: API Rate Limits (gauge chart)
- Query 13: Trend Analysis (line chart with forecast)

---

## 🔧 **Setup Instructions**

### **Option A: Retool Dashboard**
1. Create new Retool app
2. Add Supabase as data source
3. Create PostgreSQL queries using above SQL
4. Build visualizations (charts, tables, KPIs)
5. Set up scheduled refreshes (every 1 hour)

### **Option B: Lovable Dashboard**
1. Create new page in Lovable: `/analytics/match-quality`
2. Use Supabase client to run queries
3. Display using React components (recharts, shadcn/ui)
4. Add filters for date range, course level

### **Option C: Supabase Direct**
1. Run queries in Supabase SQL editor
2. Export as CSV for manual analysis
3. Use for one-off investigations

---

## 📊 **Sample Dashboard Screenshots**

```
┌─────────────────────────────────────────────────────────────┐
│  Match Quality Dashboard                          📅 Last 30 Days │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Total Runs: 150    Avg Similarity: 0.78    Pass Rate: 60%  │
│  Courses: 45        O*NET Calls: 1,800      Cache: 85%      │
│                                                               │
│  ┌──────────────────── Match Quality Trend ─────────────────┐│
│  │                                                    0.85   ││
│  │                          ╱──────────╲                    ││
│  │            ╱────────────╱            ╲─────╲   0.75      ││
│  │  ────────╱                                  ╲            ││
│  │                                               0.70       ││
│  └───────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌──────── Top 5 Courses by Match Quality ──────┐           │
│  │  1. Fluid Mechanics (0.89) ████████████████   │          │
│  │  2. Data Structures (0.87) ███████████████    │          │
│  │  3. Marketing Strategy (0.82) ████████████    │          │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 **Success Criteria**

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Avg Similarity Score | > 0.75 | TBD | ⏳ |
| High Confidence % | > 50% | TBD | ⏳ |
| O*NET Cache Hit Rate | > 70% | TBD | ⏳ |
| Semantic Pass Rate | 40-60% | TBD | ⏳ |
| Avg Processing Time | < 2000ms | TBD | ⏳ |

Update these after deployment to track progress!

---

**Created By:** Claude Code
**Date:** 2025-11-11
**Version:** 1.0
