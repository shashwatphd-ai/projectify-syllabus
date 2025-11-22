# Adzuna Integration Guide

## Overview

The Adzuna provider enables **job-based company discovery** as an alternative to Apollo's keyword search. This solves the fundamental problem of Apollo returning companies ABOUT industries rather than IN industries.

### Key Advantages

- **Precision**: Companies have ACTUAL job postings (not just keyword matches)
- **Cost-Effective**: FREE tier (250 calls/month) or $200/month for 10,000 calls
- **Better Results**: Companies actively hiring for relevant roles

## Architecture

### Provider Flow

```
1. Course → O*NET Occupations → Adzuna Categories
2. Search Adzuna Jobs API (by occupation + location)
3. Extract & Group jobs by company name
4. Aggregate company data (sector, size, job postings)
5. Return DiscoveredCompany objects
6. Existing semantic filtering applies normally
```

### Hybrid Approach (Recommended)

```
ADZUNA (Discovery)           APOLLO (Enrichment)
      ↓                              ↓
Job-based company list  →   Contact info, funding data
(FREE, high precision)      (Paid, optional enrichment)
```

## Setup Instructions

### 1. Get Adzuna API Credentials

1. Sign up at https://developer.adzuna.com/
2. Create an application
3. Note your `app_id` and `app_key`

### 2. Configure Supabase Secrets

Add the following secrets to your Supabase project:

```bash
# Via Supabase CLI
supabase secrets set ADZUNA_APP_ID=your_app_id_here
supabase secrets set ADZUNA_APP_KEY=your_app_key_here
```

Or via Supabase Dashboard:
- Settings → Edge Functions → Secrets
- Add `ADZUNA_APP_ID`
- Add `ADZUNA_APP_KEY`

### 3. Set Discovery Provider

Configure which provider to use (choose one option):

**Option A: Adzuna Only (Recommended for Testing)**
```bash
supabase secrets set DISCOVERY_PROVIDER=adzuna
```

**Option B: Adzuna with Apollo Fallback**
```bash
supabase secrets set DISCOVERY_PROVIDER=adzuna
supabase secrets set FALLBACK_PROVIDER=apollo
```

**Option C: Apollo Only (Current Default)**
```bash
supabase secrets set DISCOVERY_PROVIDER=apollo
# This is the current behavior - keyword search
```

## Environment Variables Reference

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `DISCOVERY_PROVIDER` | `apollo`, `adzuna`, `hybrid` | `apollo` | Primary discovery provider |
| `FALLBACK_PROVIDER` | `apollo`, `adzuna` | none | Fallback if primary fails |
| `ADZUNA_APP_ID` | string | - | Adzuna API application ID |
| `ADZUNA_APP_KEY` | string | - | Adzuna API key |
| `APOLLO_API_KEY` | string | - | Apollo.io API key (for enrichment) |

## SOC to Adzuna Category Mapping

The provider automatically maps O*NET SOC codes to Adzuna job categories:

| SOC Code | Occupation | Adzuna Category |
|----------|-----------|-----------------|
| 17-2141 | Mechanical Engineers | `engineering-jobs` |
| 17-2011 | Aerospace Engineers | `engineering-jobs` |
| 15-1252 | Software Developers | `it-jobs` |
| 11-2021 | Marketing Managers | `marketing-pr-jobs` |
| 13-2011 | Accountants | `accounting-finance-jobs` |
| 29-1141 | Registered Nurses | `healthcare-nursing-jobs` |

See `adzuna-provider.ts` lines 48-96 for complete mapping.

### Fallback Logic

If a SOC code is not in the mapping:
1. Use SOC major group (first 2 digits)
2. Map to broader category (e.g., 17-xxxx → `engineering-jobs`)
3. Default to `other-general-jobs` if no match

## Testing the Integration

### Test with Supabase CLI

```bash
# Test Adzuna provider health
supabase functions invoke discover-companies --data '{
  "courseId": "your-course-id",
  "location": "Kansas City, Missouri, United States",
  "count": 4
}'
```

### Expected Results

For "Fluid Mechanics" course in Kansas City:

**Before (Apollo):**
- 5-10 companies (Uptalent.io, staffing firms, consulting)
- 0 companies after semantic filtering ❌

**After (Adzuna):**
- 20-30 companies (Boeing, Honeywell, Garmin, etc.)
- 15+ companies after semantic filtering ✅

### Debug Logs

Check Edge Function logs for provider confirmation:

```
✓ Using provider: adzuna v1.0.0
🔍 [Adzuna] Starting job-based company discovery...
   Search query: "Mechanical Engineer OR Aerospace Engineer"
   Category: engineering-jobs
   Location: Kansas City, MO
   Found 47 job postings
   Extracted 23 unique companies
```

## Company Data Structure

### Data from Adzuna

| Field | Source | Completeness |
|-------|--------|--------------|
| `name` | Job posting | ✅ Always |
| `sector` | Inferred from job categories | ✅ High |
| `city`, `state` | Job location | ✅ Always |
| `jobPostings` | Job search results | ✅ Always |
| `size` | Estimated from job count | ⚠️ Rough estimate |
| `website` | - | ❌ Not available |
| `contacts` | - | ❌ Not available |

### Enrichment with Apollo (Optional)

After Adzuna discovery, top companies can be enriched with Apollo:
- Company website
- Contact information
- Employee count (accurate)
- Funding data

## Cost Analysis

### Current Apollo-Only Approach

```
Apollo: $79-149/month
Results: 0-5 companies (wrong types)
Cost per viable company: ∞
```

### Adzuna-Only Approach

```
Adzuna FREE: $0/month (250 calls)
Results: 20-50 companies (right types)
Cost per viable company: $0
```

### Hybrid Approach (Recommended)

```
Adzuna: $0-200/month (discovery)
Apollo: $79/month (enrichment only)
Results: 20-50 companies with contacts
Cost per viable company: $1.58-5.58
```

## Troubleshooting

### Error: "Provider 'adzuna' not configured"

**Cause**: Missing Adzuna API credentials

**Solution**:
```bash
supabase secrets set ADZUNA_APP_ID=your_app_id
supabase secrets set ADZUNA_APP_KEY=your_app_key
```

### Error: "No jobs found for location"

**Cause**: Location format may not match Adzuna's database

**Solutions**:
1. Try major city name: "Kansas City" instead of "Kansas City Metropolitan Area"
2. Try state abbreviation: "Kansas City, MO"
3. Try state full name: "Kansas City, Missouri"

### Low Company Count

**Cause**: Narrow occupation mapping or small job market

**Solutions**:
1. Check `maxPages` parameter in `searchJobs()` (currently 2)
2. Expand to related occupations (e.g., Mechanical + Manufacturing Engineers)
3. Expand geographic radius (future enhancement)

### Companies Without Job Postings

**Cause**: Company name variations (e.g., "Boeing" vs "The Boeing Company")

**Solution**: The `normalizeCompanyName()` function handles this:
```typescript
normalizeCompanyName("The Boeing Company") // → "boeing"
normalizeCompanyName("Boeing Inc.") // → "boeing"
// Both map to same company
```

## Migration from Apollo

### Phase 1: Test Adzuna (Recommended)

1. Set `DISCOVERY_PROVIDER=adzuna`
2. Test with 5-10 courses across different domains
3. Compare results with Apollo
4. Monitor logs for errors

### Phase 2: Hybrid Deployment

1. Keep `DISCOVERY_PROVIDER=adzuna`
2. Add Apollo enrichment step (future enhancement)
3. Monitor API usage and costs

### Phase 3: Optimize

1. Adjust `maxPages` based on typical course needs
2. Fine-tune SOC category mappings
3. Add geographic expansion logic

## Roadmap

### Completed ✅
- [x] Adzuna provider implementation
- [x] SOC to Adzuna category mapping
- [x] Company name normalization
- [x] Job data aggregation
- [x] Provider factory integration

### Next Steps 🔄
- [ ] Apollo enrichment integration
- [ ] Geographic radius expansion
- [ ] Company website extraction (from job redirects)
- [ ] Resume parsing integration (bonus feature)

### Future Enhancements 🚀
- [ ] Cache Adzuna results for common locations
- [ ] Multi-location search (e.g., "Kansas City OR St. Louis")
- [ ] Industry-specific job keyword matching
- [ ] Company size verification via LinkedIn

## Support

For issues or questions:
1. Check Edge Function logs in Supabase Dashboard
2. Review Adzuna API docs: https://developer.adzuna.com/docs/search
3. File issue in project repository

---

**Last Updated**: 2025-01-22
**Provider Version**: 1.0.0
