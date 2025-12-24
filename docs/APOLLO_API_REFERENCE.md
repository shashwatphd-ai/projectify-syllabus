# Apollo.io API Reference
**Last Updated: 23rd December 2025**

This document provides a complete reference for all Apollo.io API endpoints used or available for EduThree's company discovery pipeline.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Rate Limits](#rate-limits)
3. [Search Endpoints](#search-endpoints)
4. [Enrichment Endpoints](#enrichment-endpoints)
5. [Market Intelligence](#market-intelligence)
6. [Response Field Reference](#response-field-reference)

---

## Authentication

**Header Required:**
```
X-Api-Key: YOUR_APOLLO_API_KEY
```

**Environment Variable:** `APOLLO_API_KEY`

**Security Note:** API key should be in headers, NOT URL parameters.

---

## Rate Limits

Apollo uses a **fixed-window rate limiting strategy**.

- Rate limits vary by pricing plan
- Check your limits: `GET /api/v1/api_usage_stats`
- Bulk endpoints are throttled to 50% of individual rate limits

**Best Practices:**
- Use bulk endpoints when processing multiple records
- Implement exponential backoff on 429 errors
- Cache responses when appropriate

---

## Search Endpoints

### 1. Organization Search
**Endpoint:** `POST /api/v1/mixed_companies/search`

**Purpose:** Find companies by location, industry, size, and technology.

**Display Limit:** 50,000 records (100 per page, max 500 pages)

**Request:**
```json
{
  "organization_locations": ["San Francisco, California, United States"],
  "q_organization_keyword_tags": ["software", "fintech", "saas"],
  "q_organization_name": "Acme",
  "organization_num_employees_ranges": ["11,50", "51,200"],
  "currently_using_any_of_technology_uids": ["python", "react"],
  "page": 1,
  "per_page": 25
}
```

**Key Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `organization_locations` | string[] | Location filter (city, state, country) |
| `q_organization_keyword_tags` | string[] | Industry/keyword filter |
| `q_organization_name` | string | Company name search |
| `organization_num_employees_ranges` | string[] | Employee count ranges |
| `currently_using_any_of_technology_uids` | string[] | Technology stack filter |
| `page` | integer | Page number (1-500) |
| `per_page` | integer | Results per page (max 100) |

**Response:**
```json
{
  "organizations": [
    {
      "id": "5e66b6381e05b4008c8331b8",
      "name": "Acme Corp",
      "website_url": "https://acme.com",
      "linkedin_url": "https://linkedin.com/company/acme",
      "estimated_num_employees": 150,
      "industry": "Software",
      "founded_year": 2015,
      "city": "San Francisco",
      "state": "California",
      "country": "United States"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_entries": 1234,
    "total_pages": 50
  }
}
```

---

### 2. People Search
**Endpoint:** `POST /api/v1/mixed_people/api_search`

**Purpose:** Find contacts at companies by title, department, seniority.

**Request:**
```json
{
  "organization_ids": ["5e66b6381e05b4008c8331b8"],
  "person_titles": ["Director of Engineering", "CTO", "VP Engineering"],
  "person_seniorities": ["director", "vp", "c_suite"],
  "person_locations": ["United States"],
  "page": 1,
  "per_page": 10
}
```

**Key Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `organization_ids` | string[] | Filter by company Apollo IDs |
| `person_titles` | string[] | Job title filter |
| `person_seniorities` | string[] | Seniority level filter |
| `person_locations` | string[] | Person's location filter |

**Seniority Values:**
- `entry` - Entry level
- `senior` - Senior individual contributor
- `manager` - Manager
- `director` - Director
- `vp` - Vice President
- `c_suite` - C-level executives
- `owner` - Owner/Founder

**Response:**
```json
{
  "people": [
    {
      "id": "person_id",
      "first_name": "John",
      "last_name": "Doe",
      "title": "Director of Engineering",
      "email": "john@acme.com",
      "email_status": "verified",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "organization": {
        "id": "5e66b6381e05b4008c8331b8",
        "name": "Acme Corp"
      }
    }
  ]
}
```

---

### 3. Organization Job Postings
**Endpoint:** `GET /api/v1/organizations/{organization_id}/job_postings`

**Purpose:** Get active job listings for a specific company.

**Request:**
```
GET /api/v1/organizations/5e66b6381e05b4008c8331b8/job_postings?page=1&per_page=10
```

**Response:**
```json
{
  "organization_job_postings": [
    {
      "id": "job_123",
      "title": "Senior Financial Analyst",
      "url": "https://acme.com/careers/123",
      "city": "New York",
      "state": "New York",
      "country": "United States",
      "posted_at": "2024-12-01T00:00:00Z",
      "last_seen_at": "2024-12-23T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total_entries": 45
  }
}
```

**Use Case:** Match job titles to syllabus skills to prove company need.

---

### 4. News Articles Search
**Endpoint:** `POST /api/v1/news_articles/search`

**Purpose:** Find recent news about companies (hiring, investments, contracts).

**Request:**
```json
{
  "organization_ids": ["5e66b6381e05b4008c8331b8", "another_org_id"],
  "categories": ["hires", "investment", "contract"],
  "published_at": {
    "min": "2024-09-23",
    "max": "2024-12-23"
  },
  "page": 1,
  "per_page": 10
}
```

**Category Values:**
- `hires` - Leadership changes, key hires
- `investment` - Funding rounds, acquisitions
- `contract` - New partnerships, deals
- `expansion` - Office openings, market expansion
- `product_launch` - New product announcements

**Response:**
```json
{
  "news_articles": [
    {
      "id": "article_123",
      "title": "Acme Corp Raises $50M Series B",
      "snippet": "The funding will be used to expand engineering team...",
      "url": "https://techcrunch.com/article",
      "published_at": "2024-12-20T10:00:00Z",
      "event_categories": ["investment"],
      "organization_id": "5e66b6381e05b4008c8331b8"
    }
  ]
}
```

**Use Case:** Calculate market activity score based on recent news signals.

---

## Enrichment Endpoints

### 1. Single Organization Enrichment
**Endpoint:** `POST /api/v1/organizations/enrich`

**Purpose:** Get detailed company data by domain or name.

**Request:**
```json
{
  "domain": "acme.com"
}
```

**Response:** Full organization object (see field reference below).

---

### 2. Bulk Organization Enrichment
**Endpoint:** `POST /api/v1/organizations/bulk_enrich`

**Purpose:** Enrich up to 10 companies in a single API call.

**Rate Limit:** 50% of individual enrichment rate limit.

**Request:**
```json
{
  "domains": [
    "acme.com",
    "globex.com",
    "initech.com",
    "umbrella.com",
    "stark.com"
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

**Use Case:** Replace individual enrichment loops with batch calls for 50% rate limit savings.

---

### 3. Complete Organization Info
**Endpoint:** `GET /api/v1/organizations/{id}`

**Purpose:** Get FULL organization data including intent signals and growth metrics.

**Request:**
```
GET /api/v1/organizations/5e66b6381e05b4008c8331b8
```

**Response:** See "Full Organization Object" in field reference.

---

### 4. Single People Enrichment
**Endpoint:** `POST /api/v1/people/enrich`

**Request:**
```json
{
  "email": "john@acme.com"
}
```
OR
```json
{
  "linkedin_url": "https://linkedin.com/in/johndoe"
}
```

---

### 5. Bulk People Enrichment
**Endpoint:** `POST /api/v1/people/bulk_enrich`

**Request:**
```json
{
  "details": [
    { "email": "john@acme.com" },
    { "linkedin_url": "https://linkedin.com/in/janedoe" }
  ]
}
```

---

## Market Intelligence

### Intent Signal Account
Available in complete organization info (`GET /organizations/{id}`).

**Fields:**
```json
{
  "intent_signal_account": {
    "overall_intent": "high",  // "high" | "medium" | "low"
    "total_visits": 150,
    "top_5_paths": [
      "/products/enterprise",
      "/pricing",
      "/contact-sales"
    ]
  }
}
```

**Use Case:** Prioritize companies with "high" buying intent.

---

### Employee Metrics (Department Growth)
Available in complete organization info (`GET /organizations/{id}`).

**Fields:**
```json
{
  "employee_metrics": {
    "engineering": {
      "new": 15,        // Hired in period
      "retained": 100,  // Stayed
      "churned": 3      // Left
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
    },
    "marketing": {
      "new": 3,
      "retained": 20,
      "churned": 2
    },
    "operations": {
      "new": 2,
      "retained": 15,
      "churned": 1
    }
  }
}
```

**Use Case:** Match syllabus domain to growing departments.

---

## Response Field Reference

### Full Organization Object

```json
{
  // Basic Information
  "id": "5e66b6381e05b4008c8331b8",
  "name": "Acme Corporation",
  "website_url": "https://acme.com",
  "primary_domain": "acme.com",
  "linkedin_url": "https://linkedin.com/company/acme",
  "twitter_url": "https://twitter.com/acme",
  "facebook_url": "https://facebook.com/acme",
  "logo_url": "https://logo.clearbit.com/acme.com",
  
  // Company Details
  "founded_year": 2015,
  "estimated_num_employees": 250,
  "annual_revenue": "$10M-$50M",
  "industry": "Software",
  "industries": ["Software", "SaaS", "Enterprise"],
  "keywords": ["fintech", "payments", "banking"],
  
  // Location
  "street_address": "123 Main St",
  "city": "San Francisco",
  "state": "California",
  "postal_code": "94102",
  "country": "United States",
  
  // Description
  "short_description": "Acme builds payment infrastructure for banks.",
  "seo_description": "Leading provider of banking APIs...",
  
  // Technology Stack
  "current_technologies": [
    {
      "uid": "python",
      "name": "Python",
      "category": "Programming Languages"
    },
    {
      "uid": "aws",
      "name": "Amazon Web Services",
      "category": "Cloud"
    }
  ],
  "technology_names": ["Python", "React", "PostgreSQL", "AWS"],
  
  // Funding
  "latest_funding_stage": "Series B",
  "total_funding": 75000000,
  "funding_events": [
    {
      "funded_at": "2024-06-15",
      "amount": 50000000,
      "funding_type": "Series B",
      "investors": ["Sequoia", "a16z"]
    },
    {
      "funded_at": "2022-01-10",
      "amount": 25000000,
      "funding_type": "Series A",
      "investors": ["Accel"]
    }
  ],
  
  // Department Headcount
  "departmental_head_count": {
    "engineering": 80,
    "sales": 40,
    "marketing": 25,
    "finance": 15,
    "operations": 20,
    "hr": 10
  },
  
  // 🔥 INTENT SIGNALS (Complete Org Info only)
  "intent_signal_account": {
    "overall_intent": "high",
    "total_visits": 150,
    "top_5_paths": ["/pricing", "/enterprise"]
  },
  
  // 🔥 EMPLOYEE METRICS (Complete Org Info only)
  "employee_metrics": {
    "engineering": { "new": 15, "retained": 65, "churned": 3 },
    "finance": { "new": 5, "retained": 10, "churned": 1 }
  }
}
```

---

## Technology UIDs Reference

Common technology UIDs for filtering:

| Technology | UID |
|------------|-----|
| Python | `python` |
| JavaScript | `javascript` |
| React | `react` |
| Node.js | `nodejs` |
| AWS | `aws` |
| Azure | `azure` |
| Google Cloud | `gcp` |
| Salesforce | `salesforce` |
| SAP | `sap` |
| Oracle | `oracle` |
| PostgreSQL | `postgresql` |
| MongoDB | `mongodb` |
| Docker | `docker` |
| Kubernetes | `kubernetes` |

**Note:** Use Apollo's technology search to discover additional UIDs.

---

## Error Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Process response |
| 401 | Unauthorized | Check API key |
| 422 | Unprocessable Entity | Validate request parameters |
| 429 | Rate Limited | Implement backoff, retry later |
| 500 | Server Error | Retry with exponential backoff |

---

## Current Implementation Status

| Endpoint | Status | Location in Codebase |
|----------|--------|---------------------|
| Organization Search | ✅ Used | `apollo-provider.ts` - `searchOrganizations()` |
| People Search | ✅ Used | `apollo-provider.ts` - `findBestContact()` |
| Org Enrichment | ✅ Used | `apollo-provider.ts` - `enrichSingleOrganization()` |
| Job Postings | ✅ Used | `apollo-provider.ts` - within enrichment |
| News Articles | 🔴 NOT USED | Planned: Phase 2 |
| Complete Org Info | 🔴 NOT USED | Planned: Phase 3 |
| Bulk Enrichment | 🔴 NOT USED | Planned: Phase 7 |
| Technology Filter | 🟡 DISABLED | `apollo-provider.ts` line 738 |

---

## API Documentation Links

- [Organization Search](https://docs.apollo.io/reference/organization-search)
- [People Search](https://docs.apollo.io/reference/people-api-search)
- [Organization Job Postings](https://docs.apollo.io/reference/organization-jobs-postings)
- [News Articles Search](https://docs.apollo.io/reference/news-articles-search)
- [Organization Enrichment](https://docs.apollo.io/reference/organization-enrichment)
- [Bulk Organization Enrichment](https://docs.apollo.io/reference/bulk-organization-enrichment)
- [Complete Organization Info](https://docs.apollo.io/reference/get-complete-organization-info)
- [People Enrichment](https://docs.apollo.io/reference/people-enrichment)
- [Bulk People Enrichment](https://docs.apollo.io/reference/bulk-people-enrichment)
- [Rate Limits](https://docs.apollo.io/reference/rate-limits)
- [Authentication](https://docs.apollo.io/reference/authentication)
- [Status Codes](https://docs.apollo.io/reference/status-codes)

---

*Document created: 23rd December 2025*
*Maintained by: EduThree Engineering*
