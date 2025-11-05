# Apollo.io Data Enrichment System

## Overview

The Apollo.io enrichment system maximizes the quality and completeness of company and contact data in the EduThree platform. It provides verified professional contact information, organizational details, and business intelligence.

## Architecture

### 1. **Data Enrichment Pipeline** (`data-enrichment-pipeline`)
- Discovers companies via Google Places API
- Performs initial data collection
- Stores basic company profiles in the database

### 2. **Apollo Enrichment Service** (`enrich-apollo`)
- Enriches existing company profiles with Apollo.io data
- Can be triggered manually or automatically
- Provides person and organization enrichment

### 3. **Frontend Integration**
- `EnrichmentPanel` component shows data quality status
- One-click enrichment from Contact tab
- Real-time progress feedback

## Data Quality Levels

### Basic (`basic`)
- Data completeness: 0-39%
- Source: Google Places API + web search
- Contact: Generic or publicly available

### Apollo Verified (`apollo_verified`)
- Data completeness: 40-79%
- Source: Apollo.io API + Google data
- Contact: Partially verified professional details

### Fully Enriched (`fully_enriched`)
- Data completeness: 80-100%
- Source: Apollo.io comprehensive enrichment
- Contact: Complete verified professional profile

## Enrichment Fields

### Person/Contact Data
- ✅ First & Last Name
- ✅ Professional Title
- ✅ Headline/Bio
- ✅ Photo URL
- ✅ Location (City, State, Country)
- ✅ Email & Email Status
- ✅ Phone Numbers
- ✅ LinkedIn Profile
- ✅ Twitter/Social URLs
- ✅ Employment History

### Organization Data
- ✅ Company Name
- ✅ Website
- ✅ LinkedIn Company Page
- ✅ Twitter/Facebook URLs
- ✅ Founded Year
- ✅ Logo URL
- ✅ Employee Count
- ✅ Revenue Range
- ✅ Industry Keywords

## Usage

### Manual Enrichment (UI)

1. Navigate to any project's Contact tab
2. View the Enrichment Panel at the top
3. Click "Maximize Data with Apollo.io"
4. Wait for completion (~1-2 seconds per company)

### Programmatic Enrichment (API)

```typescript
// Enrich a single company
const { data } = await supabase.functions.invoke('enrich-apollo', {
  body: { companyProfileId: 'uuid-here' }
});

// Batch enrich multiple companies
const { data } = await supabase.functions.invoke('enrich-apollo', {
  body: { companyProfileIds: ['uuid1', 'uuid2', 'uuid3'] }
});
```

### Response Format

```json
{
  "success": true,
  "message": "Enriched 3 of 3 profiles",
  "enriched": 3,
  "failed": 0,
  "skipped": 0,
  "details": [
    {
      "id": "company-uuid",
      "name": "Company Name",
      "completeness": 85,
      "level": "fully_enriched"
    }
  ]
}
```

## Rate Limits

- **Apollo.io API**: 100 requests/minute
- **Built-in throttling**: 650ms delay between requests
- **Re-enrichment cooldown**: 7 days for fully enriched profiles

## Data Completeness Scoring

The system calculates a 0-100% completeness score:

**Contact Fields (40 points total):**
- First Name: 5 pts
- Last Name: 5 pts
- Email: 10 pts
- Phone: 5 pts
- Title: 5 pts
- Headline: 5 pts
- Photo: 5 pts

**Organization Fields (40 points total):**
- LinkedIn URL: 10 pts
- Logo: 10 pts
- Employee Count: 5 pts
- Revenue Range: 10 pts
- Founded Year: 5 pts

**Basic Fields (20 points total):**
- Website: 5 pts
- Address: 5 pts
- Sector: 5 pts
- Inferred Needs: 5 pts

## Best Practices

### When to Enrich

✅ **DO** enrich when:
- Preparing to contact a company
- Company data is > 7 days old
- Data completeness < 80%
- Proposing partnerships

❌ **DON'T** enrich when:
- Profile was enriched in last 7 days
- Already at 100% completeness
- No website available (enrichment will fail)

### Error Handling

The system gracefully handles:
- Missing Apollo API key → Falls back to existing data
- No person match → Keeps existing contact info
- No org match → Preserves current org details
- Rate limits → Returns partial results with clear messaging

### Performance Tips

1. **Batch operations**: Enrich multiple profiles at once
2. **Off-peak hours**: Run large enrichments during low-traffic times
3. **Selective enrichment**: Only enrich profiles you actively use
4. **Cache awareness**: System auto-skips recent enrichments

## Monitoring

### Success Metrics
- Track enrichment success rate in logs
- Monitor data completeness score improvements
- Review enrichment level distribution

### Error Tracking
```typescript
// Check logs for enrichment issues
console.log('🔍 Starting Apollo enrichment...');
console.log('✅ Successfully enriched Company X (85% complete)');
console.log('❌ Failed to enrich Company Y: API error');
```

## Security

- ✅ API keys stored in Supabase secrets
- ✅ Service role for database access
- ✅ CORS enabled for web app calls
- ✅ JWT verification disabled (public endpoint)
- ✅ No sensitive data in client-side code

## Troubleshooting

### No data returned
- **Check**: Apollo API key configured
- **Verify**: Company has a valid website
- **Confirm**: Website domain is accessible

### Low completeness scores
- **Possible**: Company too small/new for Apollo
- **Try**: Wait and retry later
- **Alternative**: Manual data entry

### Enrichment timeout
- **Cause**: Too many profiles at once
- **Solution**: Batch in groups of 10-20
- **Workaround**: Retry failed profiles individually

## Future Enhancements

- [ ] Automatic background enrichment on schedule
- [ ] Integration with additional data sources
- [ ] Custom enrichment rules per institution
- [ ] Bulk enrichment admin dashboard
- [ ] Enrichment history & audit trail
- [ ] A/B testing for enrichment strategies
