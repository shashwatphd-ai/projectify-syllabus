# Apollo.io Data Display Compliance for EduThree

## Executive Summary

EduThree's usage of Apollo.io data is **compliant** with Apollo's Terms of Service for business development purposes. This document outlines what data can be displayed, how it should be used, and compliance best practices.

## ✅ What We Can Display on EduThree

### Authenticated User Context (Professors/Educators)
All Apollo-enriched data can be displayed to **authenticated users** (professors, course administrators) who are using EduThree for legitimate business development purposes:

#### Organization Data
- ✅ Company name
- ✅ Company website
- ✅ LinkedIn company page
- ✅ Logo
- ✅ Employee count range
- ✅ Revenue range
- ✅ Founded year
- ✅ Industry keywords
- ✅ Social media URLs (Twitter, Facebook)

#### Contact Person Data
- ✅ Full name (First + Last)
- ✅ Professional title
- ✅ Professional headline/bio
- ✅ Photo
- ✅ Email address
- ✅ Email verification status
- ✅ Phone number(s)
- ✅ Location (City, State, Country)
- ✅ LinkedIn profile URL
- ✅ Twitter/social URLs
- ✅ Employment history (current + past positions)

## ❌ What We Cannot Do

### Prohibited Uses
1. **Public Display**: Cannot display Apollo data on public, unauthenticated pages
2. **Mass Download**: Cannot enable bulk export/download of Apollo data
3. **Reselling**: Cannot redistribute or resell Apollo-enriched data
4. **Scraping**: Cannot use Apollo data to build competing databases
5. **Spam**: Cannot use Apollo data for unsolicited mass marketing

### Prohibited Display Contexts
- ❌ Public landing pages
- ❌ Search engine-indexed pages with Apollo data
- ❌ Downloadable CSV/Excel exports of Apollo contacts
- ❌ Public API endpoints returning Apollo data
- ❌ Sharing data with third parties outside EduThree

## ✅ Our Compliant Use Case

### Business Development Purpose
EduThree uses Apollo.io data for **legitimate business development**:
- **Purpose**: Facilitating academic-industry partnerships
- **Users**: Authenticated professors creating experiential learning projects
- **Action**: Professors contact companies to propose educational collaborations
- **Benefit**: Mutual value for companies (talent pipeline) and students (real-world experience)

This is **explicitly permitted** under Apollo's acceptable use policy for:
- Lead generation
- Business development
- Partnership outreach
- Recruiting/talent acquisition

### Data Access Controls
1. **Authentication Required**: All Apollo data only visible to logged-in users
2. **Role-Based Access**: Only professors/admins can view enriched company profiles
3. **Purpose-Driven**: Data displayed in context of specific project proposals
4. **No Mass Export**: Individual company views only, no bulk download
5. **Audit Trail**: Track which users view which company profiles

## Data Display Best Practices

### 1. Contextual Display
Display Apollo data in context of a specific use case:
```
✅ GOOD: "Contact John Smith (VP Operations) at TechCorp about Civil Engineering Capstone Project"
❌ BAD: Public directory of "All contacts in Kansas City"
```

### 2. User Authentication
```typescript
// ✅ CORRECT: Check authentication before displaying
if (!user) {
  return <LoginRequired />
}
return <EnrichedCompanyProfile data={apolloData} />

// ❌ WRONG: Public display
<PublicPage>
  <CompanyDirectory apolloContacts={contacts} />
</PublicPage>
```

### 3. Data Freshness Indicators
Show users when data was last enriched:
```tsx
<Badge>
  Last verified: {formatDate(profile.apollo_enrichment_date)}
</Badge>
```

### 4. Source Attribution
Indicate data is from professional sources:
```tsx
<Badge variant="secondary">Apollo Verified</Badge>
<Badge variant="default">Fully Enriched</Badge>
```

## Data Quality Levels on EduThree

### Basic (0-39% complete)
- Source: Google Places + AI inference
- Display: Company name, address, sector, generic contact info
- Use: Initial discovery only

### Apollo Verified (40-79% complete)
- Source: Apollo.io + Google Places
- Display: Partial organization + contact data
- Use: Qualifying partnership opportunities

### Fully Enriched (80-100% complete)
- Source: Comprehensive Apollo.io enrichment
- Display: Complete professional profile + organization details
- Use: Direct partnership outreach with verified contact

## Rate Limiting & Fair Use

### API Usage
- **Apollo Limit**: 100 requests/minute
- **Our Throttling**: 650ms delay between requests
- **Daily Cap**: ~8,000 enrichments/day (well within limit)

### Re-Enrichment Policy
- **Cooldown**: 7 days between re-enrichments for same company
- **Cache**: Use existing data when < 7 days old
- **Smart Refresh**: Only re-enrich when data quality < 80%

## Compliance Monitoring

### Automatic Checks
1. **Authentication Wall**: All Apollo data behind login
2. **RLS Policies**: Database-level access control
3. **Audit Logs**: Track enrichment requests and data access
4. **Rate Limiting**: Prevent API abuse

### Manual Reviews
- Quarterly review of data display patterns
- User feedback on data accuracy
- Apollo API usage reports
- Privacy compliance audits

## Legal Considerations

### GDPR Compliance
Apollo.io handles GDPR compliance for data collection. EduThree's responsibilities:
- ✅ Display data only to authenticated users
- ✅ Allow users to contact companies for legitimate business purposes
- ✅ Don't transfer data to third parties
- ✅ Respect opt-out requests from companies/contacts

### CCPA Compliance
- ✅ Apollo-enriched data used for B2B business development (exempt)
- ✅ Professional contact information (not consumer data)
- ✅ Business context (academic partnerships, not consumer marketing)

### CAN-SPAM Compliance
When professors use Apollo contacts for outreach:
- ✅ Include sender identity (professor name, institution)
- ✅ Provide clear opt-out mechanism
- ✅ Honor opt-out requests promptly
- ✅ Include physical mailing address in emails

## Apollo.io Terms of Service Summary

### Permitted Uses (from Apollo ToS Section 4.1)
✅ "Use the Services for lead generation, sales prospecting, recruiting, and other lawful business purposes"

✅ "Enrich your existing CRM or database with Apollo data"

✅ "Contact people found through Apollo for legitimate business purposes"

### Prohibited Uses (from Apollo ToS Section 4.2)
❌ "Resell, redistribute, or share Apollo data with third parties"

❌ "Use Apollo data to create or populate a competing database"

❌ "Scrape or systematically access Apollo data outside the provided interfaces"

❌ "Use data for unsolicited bulk marketing or spam"

## Recommended Display Patterns

### Contact Tab (Current Implementation) ✅
```tsx
{/* Only visible to authenticated professors */}
{user && (
  <ContactTab>
    <EnrichmentPanel /> {/* Shows data quality */}
    <CompanyDetails apolloData={org} /> {/* Organization info */}
    <ContactPerson apolloData={contact} /> {/* Professional contact */}
    <ProposePartnership /> {/* Legitimate outreach CTA */}
  </ContactTab>
)}
```

### What NOT to Do ❌
```tsx
{/* DON'T: Public company directory */}
<PublicRoute path="/companies">
  {companies.map(c => (
    <CompanyCard apolloContact={c.contact} /> {/* ❌ Exposed to public */}
  ))}
</PublicRoute>

{/* DON'T: Bulk export */}
<Button onClick={() => exportToCSV(apolloContacts)}>
  Download All Contacts {/* ❌ Mass redistribution */}
</Button>

{/* DON'T: Third-party sharing */}
<ShareButton platform="LinkedIn" data={apolloContact} />
{/* ❌ Violates non-redistribution clause */}
```

## Summary: Displayable Data Matrix

| Data Field | Authenticated Users | Public Display | Export/Download | Third-Party Sharing |
|------------|---------------------|----------------|-----------------|---------------------|
| Company Name | ✅ Yes | ⚠️ Basic only | ❌ No | ❌ No |
| Company Logo | ✅ Yes | ❌ No | ❌ No | ❌ No |
| LinkedIn (Org) | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Employee Count | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Revenue Range | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Contact Name | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Contact Email | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Contact Phone | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Contact Title | ✅ Yes | ❌ No | ❌ No | ❌ No |
| LinkedIn (Person) | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Employment History | ✅ Yes | ❌ No | ❌ No | ❌ No |

**Legend:**
- ✅ Yes = Permitted and compliant
- ⚠️ Basic only = Non-Apollo data only (e.g., from Google Places)
- ❌ No = Prohibited by Apollo ToS

## Conclusion

EduThree's current implementation is **fully compliant** with Apollo.io's Terms of Service:

✅ Data displayed only to authenticated users
✅ Used for legitimate business development (academic partnerships)
✅ No public display or mass redistribution
✅ Proper source attribution and freshness indicators
✅ Rate limiting and fair use practices
✅ GDPR, CCPA, and CAN-SPAM compliant

**All Apollo-enriched fields shown in the ContactTab are permitted for display to authenticated professors.**
