# EduThree API Documentation

*Last Updated: 2026-01-02*

This document provides comprehensive API documentation for all Edge Functions in the EduThree platform.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Core APIs](#core-apis)
   - [Syllabus Parsing](#parse-syllabus)
   - [Company Discovery](#discover-companies)
   - [Project Generation](#generate-projects)
3. [Data Enrichment APIs](#data-enrichment-apis)
   - [Data Enrichment Pipeline](#data-enrichment-pipeline)
   - [Career Pathway Mapper](#career-pathway-mapper)
   - [Skill Gap Analyzer](#skill-gap-analyzer)
   - [Salary ROI Calculator](#salary-roi-calculator)
4. [Admin APIs](#admin-apis)
   - [Admin Regenerate Projects](#admin-regenerate-projects)
   - [Admin Reset Password](#admin-reset-password)
   - [Import University Data](#import-university-data)
5. [Integration APIs](#integration-apis)
   - [Apollo Webhook Listener](#apollo-webhook-listener)
   - [Firecrawl Scrape](#firecrawl-scrape)
6. [Student & Employer APIs](#student--employer-apis)
   - [Student Project Matcher](#student-project-matcher)
   - [Job Matcher](#job-matcher)
   - [Submit Employer Interest](#submit-employer-interest)
7. [Utility APIs](#utility-apis)
   - [Detect Location](#detect-location)
   - [Get Project Detail](#get-project-detail)
   - [Portfolio Export](#portfolio-export)

---

## Authentication

Most endpoints require JWT authentication via Supabase Auth.

### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Public Endpoints (No Auth Required)

The following endpoints skip JWT verification:
- `submit-employer-interest` - Public employer lead submission
- `apollo-webhook-listener` - Webhook receiver

---

## Core APIs

### Parse Syllabus

Extracts structured course data from uploaded PDF syllabi using AI.

**Endpoint:** `POST /functions/v1/parse-syllabus`

**Authentication:** Required

**Request Body:**
```json
{
  "file_path": "syllabi/user-id/filename.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "course": {
    "title": "Strategic Management",
    "level": "MBA",
    "weeks": 14,
    "hrs_per_week": 6,
    "outcomes": [
      "Define project scope and develop workplan",
      "Conduct external market analysis",
      "Present findings to stakeholders"
    ],
    "artifacts": [
      "Market analysis report",
      "Strategic recommendations deck"
    ],
    "schedule": [
      "Week 1-2: Project scoping",
      "Week 3-6: Research phase"
    ]
  }
}
```

**Error Responses:**
- `401` - Unauthorized (missing/invalid JWT)
- `400` - Missing file_path
- `500` - PDF parsing or AI extraction failed

---

### Discover Companies

Discovers and enriches companies matching course requirements using Apollo.io API.

**Endpoint:** `POST /functions/v1/discover-companies`

**Authentication:** Required

**Request Body:**
```json
{
  "course_id": "uuid",
  "generation_run_id": "uuid",
  "location": "Kansas City, MO",
  "industries": ["Technology", "Healthcare"],
  "num_teams": 5,
  "specific_companies": ["Company A", "Company B"]
}
```

**Response:**
```json
{
  "success": true,
  "companies": [
    {
      "id": "uuid",
      "name": "Tech Corp",
      "sector": "Technology",
      "size": "51-200",
      "city": "Kansas City",
      "website": "https://techcorp.com",
      "description": "Enterprise software company",
      "contact_email": "hr@techcorp.com",
      "contact_person": "Jane Smith",
      "composite_signal_score": 85,
      "matching_skills": ["Python", "Data Analysis"]
    }
  ],
  "discovery_stats": {
    "total_discovered": 25,
    "after_filtering": 12,
    "enriched": 10,
    "apollo_credits_used": 15
  }
}
```

**Error Categories:**
- `CONFIG_ERROR` - Missing API keys or configuration
- `EXTERNAL_API_ERROR` - Apollo API failure
- `DATA_ERROR` - Invalid input data
- `DB_ERROR` - Database operation failed

---

### Generate Projects

Generates AI-powered project proposals for discovered companies.

**Endpoint:** `POST /functions/v1/generate-projects`

**Authentication:** Required

**Request Body:**
```json
{
  "course_id": "uuid",
  "generation_run_id": "uuid",
  "companies": [
    {
      "id": "uuid",
      "name": "Tech Corp",
      "sector": "Technology",
      "size": "51-200",
      "needs": ["Market analysis", "Customer research"],
      "description": "Enterprise software company"
    }
  ],
  "course_context": {
    "title": "Strategic Management",
    "level": "MBA",
    "weeks": 14,
    "outcomes": ["Define project scope", "Conduct analysis"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "projects_created": 5,
  "projects": [
    {
      "id": "uuid",
      "title": "Market Entry Strategy for Tech Corp",
      "company_name": "Tech Corp",
      "description": "Develop comprehensive market analysis...",
      "tasks": ["Research competitors", "Analyze market trends"],
      "deliverables": ["Market analysis report", "Strategy deck"],
      "lo_score": 0.85,
      "feasibility_score": 0.90,
      "final_score": 0.87,
      "pricing_usd": 4500,
      "tier": "Gold"
    }
  ]
}
```

---

## Data Enrichment APIs

### Data Enrichment Pipeline

Enriches company profiles with additional data from multiple sources.

**Endpoint:** `POST /functions/v1/data-enrichment-pipeline`

**Authentication:** Required

**Request Body:**
```json
{
  "company_id": "uuid",
  "enrichment_types": ["news", "jobs", "contacts"]
}
```

---

### Career Pathway Mapper

Maps project skills to career pathways using O*NET data.

**Endpoint:** `POST /functions/v1/career-pathway-mapper`

**Authentication:** Required

**Request Body:**
```json
{
  "project_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "pathways": [
    {
      "occupation": "Management Analysts",
      "onet_code": "13-1111.00",
      "match_score": 0.92,
      "salary_range": {
        "median": 95290,
        "high": 163760
      },
      "growth_outlook": "Much faster than average"
    }
  ]
}
```

---

### Skill Gap Analyzer

Analyzes skill gaps between student competencies and job requirements.

**Endpoint:** `POST /functions/v1/skill-gap-analyzer`

**Authentication:** Required

**Request Body:**
```json
{
  "student_id": "uuid",
  "target_occupation": "13-1111.00"
}
```

---

### Salary ROI Calculator

Calculates expected ROI based on project participation and career outcomes.

**Endpoint:** `POST /functions/v1/salary-roi-calculator`

**Authentication:** Required

**Request Body:**
```json
{
  "project_id": "uuid"
}
```

---

## Admin APIs

### Admin Regenerate Projects

Regenerates projects for a course (admin only).

**Endpoint:** `POST /functions/v1/admin-regenerate-projects`

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "course_id": "uuid",
  "force": true
}
```

---

### Admin Reset Password

Sends password reset email to user (admin only).

**Endpoint:** `POST /functions/v1/admin-reset-password`

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "user_email": "user@example.com"
}
```

---

### Import University Data

Bulk imports university domain data from CSV/Excel.

**Endpoint:** `POST /functions/v1/import-university-data`

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "data": [
    {
      "domain": "umkc.edu",
      "name": "University of Missouri-Kansas City",
      "city": "Kansas City",
      "state": "MO",
      "country": "United States"
    }
  ]
}
```

---

## Integration APIs

### Apollo Webhook Listener

Receives webhooks from Apollo.io for company signals.

**Endpoint:** `POST /functions/v1/apollo-webhook-listener`

**Authentication:** None (webhook signature validation)

**Headers:**
```
X-Apollo-Signature: <webhook_signature>
```

---

### Firecrawl Scrape

Scrapes web pages using Firecrawl API.

**Endpoint:** `POST /functions/v1/firecrawl-scrape`

**Authentication:** Required

**Request Body:**
```json
{
  "url": "https://example.com/careers"
}
```

---

## Student & Employer APIs

### Student Project Matcher

Matches students to recommended projects based on skills.

**Endpoint:** `POST /functions/v1/student-project-matcher`

**Authentication:** Required (Student role)

**Request Body:**
```json
{
  "student_id": "uuid"
}
```

---

### Job Matcher

Matches student competencies to job postings.

**Endpoint:** `POST /functions/v1/job-matcher`

**Authentication:** Required (Student role)

**Request Body:**
```json
{
  "student_id": "uuid",
  "skills": ["Python", "Data Analysis", "Machine Learning"]
}
```

---

### Submit Employer Interest

Public endpoint for employers to express interest in projects.

**Endpoint:** `POST /functions/v1/submit-employer-interest`

**Authentication:** None (public)

**Request Body:**
```json
{
  "company_name": "Tech Corp",
  "contact_email": "hr@techcorp.com",
  "contact_name": "Jane Smith",
  "project_category": "Data Analysis",
  "project_description": "We need market research assistance",
  "preferred_timeline": "Spring 2026"
}
```

---

## Utility APIs

### Detect Location

Validates and geocodes location strings.

**Endpoint:** `POST /functions/v1/detect-location`

**Authentication:** Required

**Request Body:**
```json
{
  "location_input": "Kansas City, MO"
}
```

**Response:**
```json
{
  "success": true,
  "location": {
    "city": "Kansas City",
    "state": "MO",
    "country": "United States",
    "formatted": "Kansas City, MO, USA",
    "lat": 39.0997,
    "lng": -94.5786
  }
}
```

---

### Get Project Detail

Retrieves comprehensive project details with enrichment data.

**Endpoint:** `POST /functions/v1/get-project-detail`

**Authentication:** Required

**Request Body:**
```json
{
  "project_id": "uuid"
}
```

---

### Portfolio Export

Exports student portfolio as PDF.

**Endpoint:** `POST /functions/v1/portfolio-export`

**Authentication:** Required (Student role)

**Request Body:**
```json
{
  "student_id": "uuid",
  "format": "pdf"
}
```

---

## Rate Limiting

API calls are rate-limited based on endpoint type:

| Endpoint Type | Requests/Min | Burst |
|---------------|--------------|-------|
| Standard | 60 | 10 |
| Resource-Intensive | 10 | 2 |
| Public | 30 | 5 |

Rate limit headers are returned:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "category": "CONFIG_ERROR | EXTERNAL_API_ERROR | DATA_ERROR | DB_ERROR",
  "details": {
    "source": "APOLLO_SEARCH",
    "phase": "enrichment"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid JWT |
| 403 | Forbidden - Insufficient permissions |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |
| 504 | Gateway Timeout - Operation timed out |

---

## SDK Usage

### JavaScript/TypeScript

```typescript
import { supabase } from "@/integrations/supabase/client";

// Call edge function
const { data, error } = await supabase.functions.invoke('discover-companies', {
  body: {
    course_id: 'uuid',
    location: 'Kansas City, MO',
    num_teams: 5
  }
});
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-02 | Initial documentation |
