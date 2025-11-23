# Kansas City Industrial Engineering Test Validation

## Test Case Overview

**Location**: Kansas City, Missouri
**Course Type**: Industrial Engineering
**Expected Companies**: Burns & McDonnell, Black & Veatch (both Kansas City-based engineering firms)
**Previous Issue**: System returned Onward Robotics (Pittsburgh, 500+ miles away) or 0 companies

---

## Expected Apollo API Request

After all fixes (Fix #1-4), the Apollo API request should look like:

```json
{
  "api_key": "[REDACTED]",
  "page": 1,
  "per_page": 50,
  "organization_locations": [
    "Kansas City, Missouri"  // ✅ Fix #2: Simplified format (was "Kansas City, Missouri, United States")
  ],
  "q_organization_keyword_tags": [
    "engineering",           // ✅ Fix #1: Simple keywords (was "Mechanical Or Industrial Engineering")
    "industrial",
    "manufacturing",
    "automation"
  ],
  "currently_using_any_of_technology_uids": [  // ✅ Fix #4: NEW - Technology filtering
    "autocad",
    "matlab",
    "minitab",
    "arena",
    "simul8",
    "plc"
  ],
  "person_not_titles": [
    "Recruiter",
    "HR Manager",
    "Talent Acquisition",
    "Staffing"
  ],
  "organization_num_employees_ranges": [
    "1,10",
    "11,50",
    "51,200",
    "201,500",
    "501,1000",
    "1001,10000"
  ]
}
```

---

## Expected Diagnostic Logs

When the function runs, you should see the following diagnostic output:

### 1. Course Classification
```
🎓 [Course Classification]
   Domain: ENGINEERING_TECHNICAL
   Confidence: 100%
   Reasoning: All occupations are engineering/technical (17-2112.00: Industrial Engineers)
```

### 2. Industry Mapping
```
🏭 [Industry Mapper] SOC → Apollo Translation:
   Input (SOC): industrial engineering, manufacturing, automation, production
   Output (Apollo): engineering, industrial, manufacturing, automation
   Excluded: Insurance, Legal Services, Gambling & Casinos, Staffing & Recruiting, Human Resources
```

### 3. Technology Filtering
```
🔧 Technology filtering enabled: autocad, matlab, minitab, plc, arena...
   (Automatically excludes staffing firms - they don't use engineering software)
```

### 4. Apollo API Request (Fix #3: Diagnostic Logging)
```
🔍 [Apollo API Request - DIAGNOSTIC]
   Endpoint: POST https://api.apollo.io/v1/mixed_companies/search
   Request Body:
   {
     "organization_locations": ["Kansas City, Missouri"],
     "q_organization_keyword_tags": ["engineering", "industrial", "manufacturing", "automation"],
     "currently_using_any_of_technology_uids": ["autocad", "matlab", "minitab", "plc", "arena", "simul8"]
   }
```

### 5. Apollo API Response
```
📥 [Apollo API Response - DIAGNOSTIC]
   Total Results: 25-50 (expected significant increase from previous 1-2)
   Pagination: {"page": 1, "per_page": 50, "total_entries": 45}

   Sample Results (first 3):
     1. Burns & McDonnell
        Industry: Engineering Services
        Location: Kansas City, Missouri, US
     2. Black & Veatch
        Industry: Engineering & Architecture
        Location: Kansas City, Missouri, US
     3. [Other Kansas City engineering firm]
        Industry: Manufacturing
        Location: Kansas City, Missouri, US
```

---

## Expected Companies in Results

### Must Appear (Kansas City Engineering Firms):
1. **Burns & McDonnell** - Kansas City, MO
   - Industry: Engineering Services
   - Technologies: AutoCAD, various engineering software
   - Employees: 7,000+

2. **Black & Veatch** - Kansas City, MO (actually Overland Park, KS - Kansas City metro)
   - Industry: Engineering & Architecture
   - Technologies: Engineering/design software
   - Employees: 10,000+

### Should NOT Appear:
1. **Staffing firms** (TechStaff, Uptalent.io, etc.)
   - Reason: Excluded by technology filtering (don't use CAD software)

2. **Distant companies** (Onward Robotics in Pittsburgh)
   - Reason: Location format fix ensures proper geographic filtering

---

## Validation Checklist

### ✅ API Request Validation
- [ ] Location format is "Kansas City, Missouri" (NOT "Kansas City, Missouri, United States")
- [ ] Industry keywords are simple: "engineering", "industrial", "manufacturing" (NOT "Mechanical Or Industrial Engineering")
- [ ] Technology UIDs are present: "autocad", "matlab", "minitab", etc.
- [ ] Request body is logged with full diagnostic detail

### ✅ Response Validation
- [ ] Total results > 10 companies (was 0-2 before fixes)
- [ ] Burns & McDonnell appears in top 10 results
- [ ] Black & Veatch appears in top 10 results
- [ ] All companies are in Kansas City metro area (within 50 miles)
- [ ] NO staffing/recruiting firms in results

### ✅ Semantic Filtering Validation
- [ ] Companies pass industry penalty checks (no 80% staffing penalty)
- [ ] Final results include at least 5-10 companies
- [ ] NO "All discovered companies were filtered out" error

---

## What Changed: Before vs After

### BEFORE (Broken State):
```
Apollo Request:
  Location: "Kansas City, Missouri, United States"  ❌ Too broad
  Industries: ["Mechanical Or Industrial Engineering"]  ❌ Made-up taxonomy
  Technologies: undefined  ❌ Not used

Apollo Response: 1 company (Uptalent.io - staffing firm in New Orleans)
After Filtering: 0 companies (staffing firm filtered out)
Error: "All discovered companies were filtered out"
```

### AFTER (Fixed State):
```
Apollo Request:
  Location: "Kansas City, Missouri"  ✅ Precise format
  Industries: ["engineering", "industrial", "manufacturing", "automation"]  ✅ Real keywords
  Technologies: ["autocad", "matlab", "minitab", "plc", ...]  ✅ Verified tech filtering

Apollo Response: 25-50 companies (Burns & McDonnell, Black & Veatch, etc.)
After Filtering: 10-20 companies (staffing firms auto-excluded by tech requirements)
Success: Multiple relevant engineering companies in Kansas City
```

---

## How to Run Test

1. **Trigger company discovery** with:
   - Location: Kansas City, Missouri (or kansas@university.edu email domain)
   - Course: Industrial Engineering or similar
   - SOC Code: 17-2112.00 (Industrial Engineers)

2. **Monitor logs** for:
   - Full Apollo API request body
   - Technology filtering activation
   - Apollo response count
   - Company names in results

3. **Verify results** include:
   - Burns & McDonnell
   - Black & Veatch
   - Other local engineering firms

4. **Check semantic filtering**:
   - Industry penalties should NOT eliminate all companies
   - Staffing firms should be absent (auto-excluded by technology requirements)

---

## Root Causes Fixed

| Issue | Root Cause | Fix Applied |
|-------|------------|-------------|
| **Wrong companies returned** | Made-up industry taxonomy Apollo doesn't understand | Fix #1: Simplified to generic keywords |
| **Distant companies (Pittsburgh)** | Location format too broad | Fix #2: Changed to "City, State" format |
| **0 companies after filtering** | Staffing firms passed initial filter, then eliminated | Fix #4: Technology filtering auto-excludes staffing |
| **No visibility into API calls** | Missing diagnostic logging | Fix #3: Already implemented |

---

## Expected Impact

- **Before**: 0-2 companies, 500+ miles away, wrong industry
- **After**: 20-40 companies, <50 miles away, correct industry
- **Improvement**: 1,000%+ increase in relevant results

---

## Notes

- O*NET still returns 0 skills/technologies for Industrial Engineers (separate issue)
- System falls back to 16 generic skills for semantic matching
- Technology filtering compensates for weak skill data
- If Burns & McDonnell still doesn't appear, check Apollo API rate limits or API key status
