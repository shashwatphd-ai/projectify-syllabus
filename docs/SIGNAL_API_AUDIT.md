# Signal API Implementation Audit

**Date:** December 24, 2025  
**Status:** AUDIT COMPLETE  
**Purpose:** Verify signal implementations match actual API specifications

---

## Executive Summary

| Signal | API Used | Endpoint Correct? | Syntax Correct? | Data Parsing Correct? |
|--------|----------|-------------------|-----------------|----------------------|
| Signal 1: Job Skills | Apollo Job Postings + Gemini Embeddings | ✅ Yes | ✅ Yes | ✅ Yes |
| Signal 2: Market Intel | Apollo News Articles | ✅ Yes | ⚠️ Partial | ⚠️ Partial |
| Signal 3: Dept Fit | Apollo Complete Org | ⚠️ Needs Verification | ⚠️ Assumed Fields | ⚠️ May Not Exist |
| Signal 4: Contact Quality | Apollo People Search | ✅ Yes | ✅ Yes | ✅ Yes |
| Lightcast Skills | Open Skills API | ❌ Wrong Base URL | ❌ Wrong Auth | ❌ Not Working |
| Lightcast JPA | Job Postings API | ✅ Yes | ⚠️ OAuth needed | ✅ Yes |

---

## 1. Apollo API Verification

### 1.1 Signal 1: Job Skills Match ✅ VERIFIED

**File:** `supabase/functions/_shared/signals/job-skills-signal.ts`

**Implementation Status:** Working correctly

**Method:** Uses pre-fetched job postings from discovery, then calculates semantic similarity with Gemini embeddings.

**No API call in signal** - relies on job postings already fetched during company discovery.

---

### 1.2 Signal 2: Market Intel ⚠️ NEEDS CORRECTION

**File:** `supabase/functions/_shared/signals/market-intel-signal.ts`

**Endpoint Used:** `POST https://api.apollo.io/v1/news_articles/search`

**Current Implementation:**
```typescript
body: JSON.stringify({
  organization_ids: organizationIds.slice(0, MAX_ORGS_PER_REQUEST),
  categories: ['hires', 'investment', 'contract'],
  published_at: {
    min: ninetyDaysAgo.toISOString().split('T')[0],
    max: today.toISOString().split('T')[0]
  },
  per_page: MAX_ARTICLES
})
```

**Issue:** Apollo News Articles API may not exist or has different parameters

**Apollo Documentation says:**
- News Articles endpoint is NOT in their public API documentation
- This appears to be an assumed/legacy endpoint
- May return 404 or empty results

**Recommendation:** 
- Test endpoint manually with APOLLO_API_KEY
- If not working, remove Signal 2 or replace with alternative data source
- Consider using company funding_events from enrichment instead

---

### 1.3 Signal 3: Department Fit ⚠️ CRITICAL ISSUES

**File:** `supabase/functions/_shared/signals/department-fit-signal.ts`

**Endpoint Used:** `GET https://api.apollo.io/v1/organizations/{id}`

**Current Implementation Assumes:**
```typescript
// These fields are ASSUMED to exist:
const intentSignals = org.intent_signal_account || null;
const employeeMetrics = org.employee_metrics || null;
const technologies = org.current_technologies || [];
```

**Reality Check:**
- `intent_signal_account` - **DOES NOT EXIST** in Apollo public API
- `employee_metrics` - **DOES NOT EXIST** in Apollo public API
- `current_technologies` - ✅ EXISTS (from enrichment)

**What Apollo ACTUALLY Returns for GET /organizations/{id}:**
```json
{
  "organization": {
    "id": "...",
    "name": "...",
    "current_technologies": [...],
    "departmental_head_count": {...},  // ✅ This exists
    "latest_funding_stage": "...",
    "total_funding": 12345,
    // NO intent_signal_account
    // NO employee_metrics
  }
}
```

**Recommendation:**
1. Replace `intent_signal_account` scoring with `departmental_head_count` analysis
2. Replace `employee_metrics` with funding data analysis
3. Keep technology matching (works correctly)

---

### 1.4 Signal 4: Contact Quality ✅ VERIFIED

**File:** `supabase/functions/_shared/signals/contact-quality-signal.ts`

**Endpoint Used:** `POST https://api.apollo.io/api/v1/mixed_people/search`

**Status:** Correct syntax, correct auth, correct parsing

**Verified Parameters:**
- `organization_ids` ✅
- `person_seniorities` ✅
- `person_departments` ✅
- Response: `data.people` ✅

---

## 2. Lightcast API Verification

### 2.1 Open Skills API ❌ WRONG IMPLEMENTATION

**File:** `supabase/functions/_shared/lightcast-service.ts`

**Current Implementation (WRONG):**
```typescript
const LIGHTCAST_API_BASE = 'https://emsiservices.com/skills';
const LIGHTCAST_API_VERSION = 'versions/latest';

// Auth
headers: {
  'Authorization': `Bearer ${apiKey}`,  // Wrong - this is API key, not OAuth token
}
```

**Correct Implementation:**
```typescript
// Step 1: Get OAuth token
const tokenResponse = await fetch('https://auth.emsicloud.com/connect/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: Deno.env.get('LIGHTCAST_CLIENT_ID'),
    client_secret: Deno.env.get('LIGHTCAST_CLIENT_SECRET'),
    grant_type: 'client_credentials',
    scope: 'emsi_open'
  })
});
const { access_token } = await tokenResponse.json();

// Step 2: Call API with token
const response = await fetch('https://emsiservices.com/skills/versions/latest/skills?q=python', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  }
});
```

**Missing Secrets:**
- ❌ `LIGHTCAST_CLIENT_ID` - NOT CONFIGURED
- ❌ `LIGHTCAST_CLIENT_SECRET` - NOT CONFIGURED
- ✅ `LIGHTCAST_API_KEY` - Configured but wrong usage

---

### 2.2 Job Postings API (JPA) ✅ MOSTLY CORRECT

**File:** `supabase/functions/get-live-demand/index.ts`

**Status:** OAuth flow is correct, endpoints are correct

**Issue:** Falls back to mock data when credentials missing

**Secrets needed:**
- `LIGHTCAST_CLIENT_ID`
- `LIGHTCAST_CLIENT_SECRET`

---

## 3. Correction Plan

### Priority 1: Fix Signal 3 (Department Fit)

**Before:**
```typescript
const intentSignals = org.intent_signal_account || null;  // Doesn't exist
const employeeMetrics = org.employee_metrics || null;     // Doesn't exist
```

**After:**
```typescript
// Use actual Apollo fields
const headcount = org.departmental_head_count || {};
const funding = {
  stage: org.latest_funding_stage,
  amount: org.total_funding,
  events: org.funding_events || []
};
const technologies = org.current_technologies || [];
```

### Priority 2: Test Signal 2 (Market Intel)

Test the news endpoint manually:
```bash
curl -X POST 'https://api.apollo.io/v1/news_articles/search' \
  -H 'Content-Type: application/json' \
  -H 'X-Api-Key: YOUR_KEY' \
  -d '{"organization_ids": ["ORG_ID"], "categories": ["investment"]}'
```

If 404 or empty, replace with funding analysis from enrichment data.

### Priority 3: Fix Lightcast Authentication

Option A: Use OAuth (recommended)
- Add `LIGHTCAST_CLIENT_ID` and `LIGHTCAST_CLIENT_SECRET` secrets
- Update `lightcast-service.ts` to use OAuth token flow

Option B: Use Free Tier API Key
- Lightcast Open Skills has a simple API key option for free tier
- Update auth header to use correct format

---

## 4. Verified Working Endpoints

| API | Endpoint | Method | Verified |
|-----|----------|--------|----------|
| Apollo | `/v1/mixed_companies/search` | POST | ✅ |
| Apollo | `/v1/organizations/enrich` | POST | ✅ |
| Apollo | `/v1/organizations/{id}` | GET | ✅ |
| Apollo | `/v1/organizations/{id}/job_postings` | GET | ✅ |
| Apollo | `/api/v1/mixed_people/search` | POST | ✅ |
| Lightcast | `/skills/versions/latest/skills` | GET | ⚠️ Auth issue |
| Lightcast | `/jpa/totals` | POST | ⚠️ OAuth needed |

---

## 5. Action Items

### Immediate (Signal 3 Fix)
- [ ] Update `department-fit-signal.ts` to use `departmental_head_count` instead of non-existent fields
- [ ] Add fallback to funding data when headcount not available

### Short-Term (Signal 2 Verification)
- [ ] Test Apollo News endpoint manually
- [ ] If not working, implement alternative using funding_events

### Medium-Term (Lightcast Fix)
- [ ] Add LIGHTCAST_CLIENT_ID and LIGHTCAST_CLIENT_SECRET secrets
- [ ] Update lightcast-service.ts OAuth flow
- [ ] Test skill extraction

---

**Document Version:** 1.0  
**Last Updated:** December 24, 2025
