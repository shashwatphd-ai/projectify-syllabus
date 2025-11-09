import { 
  DiscoveryProvider, 
  CourseContext, 
  DiscoveryResult, 
  DiscoveredCompany 
} from './types.ts';

interface ApolloSearchFilters {
  organization_locations: string[];
  q_organization_keyword_tags: string[];
  q_organization_job_titles: string[];
  organization_num_employees_ranges?: string[];
  organization_num_jobs_range?: { min?: number; max?: number };
  currently_using_any_of_technology_uids?: string[];
  revenue_range?: { min?: number; max?: number };
  latest_funding_date_range?: { min?: string; max?: string };
}

interface ApolloOrganization {
  id: string;
  name: string;
  website_url: string;
  linkedin_url: string;
  logo_url: string;
  primary_domain: string;
  estimated_num_employees?: number;
  annual_revenue?: string;
  industry?: string;
  keywords?: string[];
  founded_year?: number;
  phone_number?: string;
  primary_phone?: { number?: string };
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  current_technologies?: Array<{
    uid: string;
    name: string;
    category?: string;
  }>;
  latest_funding_stage?: string;
  total_funding?: number;
  latest_funding_stage_cd?: string;
  industry_tag_list?: string[];
  twitter_url?: string;
  facebook_url?: string;
}

/**
 * APOLLO.IO DISCOVERY PROVIDER
 * Uses Apollo's Organization Search API with AI-generated filters
 */
export class ApolloProvider implements DiscoveryProvider {
  readonly name = 'Apollo.io';
  readonly version = '1.0.0';
  
  private apolloApiKey: string | null;
  private lovableApiKey: string | null;
  
  constructor() {
    this.apolloApiKey = Deno.env.get('APOLLO_API_KEY') || null;
    this.lovableApiKey = Deno.env.get('LOVABLE_API_KEY') || null;
  }
  
  isConfigured(): boolean {
    return !!(this.apolloApiKey && this.lovableApiKey);
  }
  
  getRequiredSecrets(): string[] {
    return ['APOLLO_API_KEY', 'LOVABLE_API_KEY'];
  }
  
  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    
    try {
      // Simple API call to verify credentials
      // SECURITY: API key in headers (not URL params) per Apollo's security requirements
      const response = await fetch(
        'https://api.apollo.io/v1/mixed_companies/search',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': this.apolloApiKey!
          },
          body: JSON.stringify({
            organization_locations: ['United States'],
            page: 1,
            per_page: 1
          })
        }
      );
      
      return response.ok;
    } catch (error) {
      console.error('Apollo health check failed:', error);
      return false;
    }
  }
  
  async discover(context: CourseContext): Promise<DiscoveryResult> {
    const startTime = Date.now();
    
    if (!this.isConfigured()) {
      throw new Error('Apollo provider not configured. Missing: ' + this.getRequiredSecrets().join(', '));
    }
    
    console.log(`🚀 Apollo Provider: Discovering companies for ${context.location}`);
    
    // Step 1: Generate Apollo search filters using AI
    const filters = await this.generateFilters(context);
    
    // Step 2: Search Apollo for organizations
    const organizations = await this.searchOrganizations(filters, context.targetCount * 3);
    
    // Step 3: Enrich organizations with contacts and market intelligence
    const companies = await this.enrichOrganizations(organizations, context.targetCount);
    
    const processingTime = (Date.now() - startTime) / 1000;
    
    return {
      companies,
      stats: {
        discovered: organizations.length,
        enriched: companies.length,
        processingTimeSeconds: processingTime,
        apiCreditsUsed: companies.length * 2, // Org search + People search
        providerUsed: 'apollo'
      }
    };
  }
  
  private async generateFilters(context: CourseContext): Promise<ApolloSearchFilters> {
    // Add randomization for variety in results
    const randomSeed = Date.now() % 1000;
    const jobTitleCategories = [
      ['Director', 'VP', 'Manager', 'Lead'],
      ['Engineer', 'Analyst', 'Specialist', 'Coordinator'],
      ['Operations', 'Business', 'Technical', 'Strategic']
    ];
    const employeeRanges = [
      ['10,50', '51,200'],
      ['51,200', '201,500'],
      ['201,500', '501,1000']
    ];
    const randomTitleCategory = jobTitleCategories[randomSeed % 3];
    const randomEmployeeRange = employeeRanges[randomSeed % 3];
    
    const systemPrompt = `You are an AI that analyzes course syllabi and generates Apollo.io search filters.

Apollo.io Organization Search Filters:
- organization_locations: ["city", "state", "country"]
- q_organization_keyword_tags: ["industry1", "industry2"]
- q_organization_job_titles: ["Software Engineer", "Data Analyst"]
- organization_num_employees_ranges: ["10,50", "51,200", "201,500"]
- organization_num_jobs_range: {min: 3}
- currently_using_any_of_technology_uids: ["salesforce", "python"]

Return ONLY valid JSON with these filters.`;

    // PHASE 1: Smart location handling - use precise searchLocation from detect-location
    let apolloLocation = context.searchLocation;
    
    // Map ISO country codes to full names for Apollo API
    const countryCodeMap: Record<string, string> = {
      'IN': 'India',
      'US': 'United States',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'JP': 'Japan',
      'CN': 'China',
      'SG': 'Singapore',
      'AE': 'United Arab Emirates',
      'NL': 'Netherlands',
      'SE': 'Sweden',
      'CH': 'Switzerland',
      'ES': 'Spain',
      'IT': 'Italy',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'KR': 'South Korea',
      'IL': 'Israel'
    };
    
    // Convert 2-letter ISO codes to full country names
    if (apolloLocation && apolloLocation.length === 2 && apolloLocation.match(/^[A-Z]{2}$/)) {
      const fullCountryName = countryCodeMap[apolloLocation] || apolloLocation;
      console.log(`  🌍 Location Conversion: "${apolloLocation}" → "${fullCountryName}"`);
      apolloLocation = fullCountryName;
    }
    
    // Handle "Institution Name, Country" format - extract just the country
    if (apolloLocation && apolloLocation.includes(',')) {
      const parts = apolloLocation.split(',').map((p: string) => p.trim());
      // If last part is a 2-letter code, convert it
      const lastPart = parts[parts.length - 1];
      if (lastPart.length === 2 && lastPart.match(/^[A-Z]{2}$/)) {
        parts[parts.length - 1] = countryCodeMap[lastPart] || lastPart;
        apolloLocation = parts.join(', ');
        console.log(`  🌍 Multi-part location converted: "${apolloLocation}"`);
      }
    }
    
    console.log(`  📍 Final Apollo location: "${apolloLocation}"`);
    
    const userPrompt = `Generate Apollo search filters for ${context.targetCount}+ companies within 50 miles of ${apolloLocation}.

COURSE: ${context.level}
TOPICS: ${context.topics.join(', ')}
OUTCOMES: ${context.outcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}

VARIETY SEED: ${randomSeed} - Use these job title categories for variety: ${randomTitleCategory.join(', ')}
Employee ranges to prefer: ${randomEmployeeRange.join(', ')}

Return JSON:
{
  "organization_locations": ["${apolloLocation}"],
  "q_organization_keyword_tags": ["relevant industries"],
  "q_organization_job_titles": ["matching job titles from suggested categories"],
  "organization_num_employees_ranges": ${JSON.stringify(randomEmployeeRange)},
  "organization_num_jobs_range": {"min": 3}
}`;

    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.lovableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`AI filter generation failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error('No content from AI');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not extract JSON from AI response');

    return JSON.parse(jsonMatch[0]);
  }
  
  private async searchOrganizations(
    filters: ApolloSearchFilters, 
    maxResults: number
  ): Promise<ApolloOrganization[]> {
    const originalLocation = filters.organization_locations[0];
    console.log(`  🔍 Searching Apollo for ${maxResults} organizations...`);
    
    // Try with original location first
    let organizations = await this.trySearch(filters, maxResults);
    
    // If no results and location has multiple parts, try broader searches
    if (organizations.length === 0 && originalLocation.includes(',')) {
      const locationParts = originalLocation.split(',').map(p => p.trim());
      
      // Try state + country (e.g., "Tamil Nadu, India")
      if (locationParts.length >= 3) {
        const broaderLocation = locationParts.slice(-2).join(', ');
        console.log(`  🔄 No results for "${originalLocation}", trying broader: "${broaderLocation}"`);
        filters.organization_locations = [broaderLocation];
        organizations = await this.trySearch(filters, maxResults);
      }
      
      // Try just country (e.g., "India")
      if (organizations.length === 0 && locationParts.length >= 2) {
        const countryOnly = locationParts[locationParts.length - 1];
        console.log(`  🔄 Still no results, trying country-wide: "${countryOnly}"`);
        filters.organization_locations = [countryOnly];
        organizations = await this.trySearch(filters, maxResults);
      }
    }
    
    console.log(`  ✓ Found ${organizations.length} organizations`);
    return organizations;
  }
  
  private async trySearch(
    filters: ApolloSearchFilters,
    maxResults: number
  ): Promise<ApolloOrganization[]> {
    const response = await fetch(
      'https://api.apollo.io/v1/mixed_companies/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.apolloApiKey!
        },
        body: JSON.stringify({
          ...filters,
          page: 1,
          per_page: Math.min(maxResults, 100)
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Apollo search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.organizations || [];
  }
  
  private async enrichOrganizations(
    organizations: ApolloOrganization[], 
    targetCount: number
  ): Promise<DiscoveredCompany[]> {
    const enriched: DiscoveredCompany[] = [];
    
    for (const org of organizations) {
      if (enriched.length >= targetCount) break;
      
      try {
        const company = await this.enrichSingleOrganization(org);
        if (company) {
          enriched.push(company);
        }
      } catch (error) {
        console.error(`Failed to enrich ${org.name}:`, error);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return enriched;
  }
  
  private async enrichSingleOrganization(
    org: ApolloOrganization
  ): Promise<DiscoveredCompany | null> {
    // Step 1: Call Organization Enrichment API to get complete data including technologies
    let enrichedOrg = org;
    try {
      const enrichResponse = await fetch(
        'https://api.apollo.io/v1/organizations/enrich',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apolloApiKey!
          },
          body: JSON.stringify({
            domain: org.primary_domain
          })
        }
      );

      if (enrichResponse.ok) {
        const enrichData = await enrichResponse.json();
        if (enrichData.organization) {
          enrichedOrg = { ...org, ...enrichData.organization };
          console.log(`  ✓ Enriched ${org.name} with technologies: ${enrichData.organization.technology_names?.length || 0}`);
        }
      } else {
        console.log(`  ⚠ Enrichment API returned ${enrichResponse.status} for ${org.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Enrichment error for ${org.name}:`, error);
    }

    // Step 2: Find decision-maker contact
    const peopleResponse = await fetch(
      'https://api.apollo.io/v1/mixed_people/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apolloApiKey!
        },
        body: JSON.stringify({
          organization_ids: [org.id],
          person_titles: ['Director of Partnerships', 'VP of Partnerships', 'COO', 'CEO', 'Owner'],
          person_seniorities: ['c_suite', 'vp', 'director', 'owner'],
          reveal_personal_emails: true,
          reveal_phone_number: true,
          page: 1,
          per_page: 1
        })
      }
    );

    if (!peopleResponse.ok) return null;

    const peopleData = await peopleResponse.json();
    if (!peopleData.people?.length) return null;

    const contact = peopleData.people[0];
    if (!contact.email || !contact.name) return null;

    // Fetch job postings using correct Apollo endpoint
    let jobPostings: any[] = [];
    try {
      const jobResponse = await fetch(
        `https://api.apollo.io/api/v1/organizations/${org.id}/job_postings?page=1&per_page=25`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': this.apolloApiKey!
          }
        }
      );

      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        // CRITICAL: Apollo returns "organization_job_postings", not "job_postings"
        if (jobData.organization_job_postings && Array.isArray(jobData.organization_job_postings)) {
          jobPostings = jobData.organization_job_postings.slice(0, 25);
          console.log(`  ✓ Found ${jobPostings.length} job postings for ${org.name}`);
        } else {
          console.log(`  ℹ No job postings found for ${org.name}`);
        }
      } else {
        console.log(`  ⚠ Job postings API returned ${jobResponse.status} for ${org.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Job postings fetch error for ${org.name}:`, error);
    }

    // Calculate buying intent signals
    const buyingIntentSignals = this.calculateBuyingIntent(enrichedOrg, jobPostings);
    
    // ===== NORMALIZATION SHIELD =====
    // Apollo returns tech as objects: [{name: "React"}, {name: "AWS"}]
    // We MUST normalize to simple strings: ["React", "AWS"]
    const rawTechnologies = enrichedOrg.current_technologies || [];
    const technologies: string[] = rawTechnologies
      .map(tech => tech.name)
      .filter(Boolean);
    
    // CRITICAL: Calculate actual data completeness (not hardcoded)
    const completeness = this.calculateDataCompleteness({
      contact,
      org: enrichedOrg,
      jobPostings,
      technologies: technologies // Now using normalized string array
    });

    // Format employee count into ranges
    const formatEmployeeCount = (count?: number): string => {
      if (!count) return 'Unknown';
      if (count < 50) return '1-50';
      if (count < 200) return '51-200';
      if (count < 500) return '201-500';
      if (count < 1000) return '501-1000';
      if (count < 5000) return '1001-5000';
      return '5000+';
    };

    // Clean up address - only include non-empty parts
    const addressParts = [
      enrichedOrg.street_address,
      enrichedOrg.city,
      enrichedOrg.state,
      enrichedOrg.postal_code
    ].filter(part => part && part.trim());
    const cleanAddress = addressParts.join(', ');

    return {
      name: enrichedOrg.name,
      apollo_organization_id: enrichedOrg.id,
      website: enrichedOrg.website_url,
      sector: enrichedOrg.industry || 'Unknown',
      size: formatEmployeeCount(enrichedOrg.estimated_num_employees),
      address: cleanAddress,
      city: enrichedOrg.city || '',
      state: enrichedOrg.state,
      zip: enrichedOrg.postal_code || '',
      country: enrichedOrg.country,
      
      contactPerson: contact.name,
      contactEmail: contact.email,
      contactPhone: contact.phone_numbers?.[0]?.sanitized_number || org.primary_phone?.number,
      contactTitle: contact.title,
      contactFirstName: contact.first_name,
      contactLastName: contact.last_name,
      contactHeadline: contact.headline,
      contactPhotoUrl: contact.photo_url,
      contactLinkedin: contact.linkedin_url,
      contactTwitter: contact.twitter_url,
      contactCity: contact.city,
      contactState: contact.state,
      contactCountry: contact.country,
      contactEmailStatus: contact.email_status,
      contactEmploymentHistory: contact.employment_history,
      contactPhoneNumbers: contact.phone_numbers,
      
      organizationLinkedin: enrichedOrg.linkedin_url,
      organizationTwitter: enrichedOrg.twitter_url,
      organizationFacebook: enrichedOrg.facebook_url,
      organizationLogoUrl: enrichedOrg.logo_url,
      organizationFoundedYear: enrichedOrg.founded_year,
      organizationEmployeeCount: formatEmployeeCount(enrichedOrg.estimated_num_employees),
      organizationRevenueRange: enrichedOrg.annual_revenue ? `$${enrichedOrg.annual_revenue}` : undefined,
      organizationIndustryKeywords: enrichedOrg.industry_tag_list,
      
      jobPostings,
      technologiesUsed: technologies, // Now guaranteed to be string[]
      buyingIntentSignals,
      fundingStage: enrichedOrg.latest_funding_stage,
      totalFundingUsd: enrichedOrg.total_funding,
      
      discoverySource: 'apollo_discovery',
      enrichmentLevel: completeness.level,
      dataCompletenessScore: completeness.score,
      lastEnrichedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString()
    };
  }
  
  // CRITICAL: Calculate actual data completeness instead of hardcoding
  private calculateDataCompleteness(data: {
    contact: any;
    org: ApolloOrganization;
    jobPostings: any[];
    technologies: string[];
  }): { score: number; level: 'basic' | 'apollo_verified' | 'fully_enriched' } {
    let score = 0;
    let maxScore = 0;
    
    // Contact data (40 points max)
    const contactFields = [
      { field: data.contact.email, points: 10, name: 'email' },
      { field: data.contact.name, points: 8, name: 'name' },
      { field: data.contact.title, points: 6, name: 'title' },
      { field: data.contact.phone_numbers?.length, points: 6, name: 'phone' },
      { field: data.contact.linkedin_url, points: 5, name: 'linkedin' },
      { field: data.contact.headline, points: 5, name: 'headline' }
    ];
    
    contactFields.forEach(({ field, points, name }) => {
      maxScore += points;
      if (field) {
        score += points;
        console.log(`    ✓ ${name}: +${points}`);
      }
    });
    
    // Organization data (30 points max)
    const orgFields = [
      { field: data.org.website_url, points: 5, name: 'website' },
      { field: data.org.industry, points: 5, name: 'industry' },
      { field: data.org.estimated_num_employees, points: 5, name: 'employee_count' },
      { field: data.org.annual_revenue, points: 5, name: 'revenue' },
      { field: data.org.founded_year, points: 3, name: 'founded_year' },
      { field: data.org.linkedin_url, points: 3, name: 'org_linkedin' },
      { field: data.org.city, points: 2, name: 'location' },
      { field: data.org.logo_url, points: 2, name: 'logo' }
    ];
    
    orgFields.forEach(({ field, points, name }) => {
      maxScore += points;
      if (field) {
        score += points;
        console.log(`    ✓ ${name}: +${points}`);
      }
    });
    
    // Market intelligence (30 points max) - CRITICAL for project quality
    maxScore += 15; // Job postings
    if (data.jobPostings.length > 0) {
      const jobScore = Math.min(15, data.jobPostings.length);
      score += jobScore;
      console.log(`    ✓ job_postings (${data.jobPostings.length}): +${jobScore}`);
    } else {
      console.log(`    ✗ job_postings: 0 (missing critical intelligence)`);
    }
    
    maxScore += 10; // Technologies
    if (data.technologies.length > 0) {
      const techScore = Math.min(10, data.technologies.length);
      score += techScore;
      console.log(`    ✓ technologies (${data.technologies.length}): +${techScore}`);
    } else {
      console.log(`    ✗ technologies: 0 (missing critical intelligence)`);
    }
    
    maxScore += 5; // Funding
    if (data.org.latest_funding_stage) {
      score += 5;
      console.log(`    ✓ funding_stage: +5`);
    }
    
    const percentage = Math.round((score / maxScore) * 100);
    
    let level: 'basic' | 'apollo_verified' | 'fully_enriched';
    if (percentage >= 80 && data.jobPostings.length >= 3) {
      level = 'fully_enriched';
    } else if (percentage >= 60 || data.jobPostings.length >= 1) {
      level = 'apollo_verified'; // Verified but not fully enriched
    } else {
      level = 'basic';
    }
    
    console.log(`  📊 Data Completeness: ${percentage}% (${score}/${maxScore}) - Level: ${level}`);
    
    return { score: percentage, level };
  }
  
  private calculateBuyingIntent(org: ApolloOrganization, jobPostings: any[]) {
    const signals = [];
    
    // Recent funding signal
    if (org.latest_funding_stage && ['Series A', 'Series B', 'Series C'].includes(org.latest_funding_stage)) {
      const fundingDate = org.latest_funding_stage_cd || new Date().toISOString();
      const monthsSince = (Date.now() - new Date(fundingDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince < 12) {
        signals.push({
          signal_type: 'recent_funding',
          confidence: 'high',
          details: `Raised ${org.latest_funding_stage} within last ${Math.round(monthsSince)} months`,
          timing: 'immediate'
        });
      }
    }
    
    // Hiring velocity signal
    if (jobPostings.length >= 5) {
      signals.push({
        signal_type: 'hiring_velocity',
        confidence: jobPostings.length >= 10 ? 'high' : 'medium',
        details: `${jobPostings.length} active job openings`,
        timing: 'immediate'
      });
    }
    
    return signals;
  }
}
