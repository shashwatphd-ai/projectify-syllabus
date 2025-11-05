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
  current_technologies?: string[];
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
      const response = await fetch(
        'https://api.apollo.io/v1/mixed_companies/search',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
    const systemPrompt = `You are an AI that analyzes course syllabi and generates Apollo.io search filters.

Apollo.io Organization Search Filters:
- organization_locations: ["city", "state", "country"]
- q_organization_keyword_tags: ["industry1", "industry2"]
- q_organization_job_titles: ["Software Engineer", "Data Analyst"]
- organization_num_employees_ranges: ["10,50", "51,200", "201,500"]
- organization_num_jobs_range: {min: 3}
- currently_using_any_of_technology_uids: ["salesforce", "python"]

Return ONLY valid JSON with these filters.`;

    const userPrompt = `Generate Apollo search filters for ${context.targetCount}+ companies within 50 miles of ${context.location}.

COURSE: ${context.level}
TOPICS: ${context.topics.join(', ')}
OUTCOMES: ${context.outcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Return JSON:
{
  "organization_locations": ["${context.location}"],
  "q_organization_keyword_tags": ["relevant industries"],
  "q_organization_job_titles": ["matching job titles"],
  "organization_num_employees_ranges": ["10,50", "51,200", "201,500"],
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
    console.log(`  🔍 Searching Apollo for ${maxResults} organizations...`);
    
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
    console.log(`  ✓ Found ${data.organizations?.length || 0} organizations`);
    
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
    // Find decision-maker contact
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

    // Fetch job postings
    let jobPostings: any[] = [];
    try {
      const jobResponse = await fetch(
        `https://api.apollo.io/api/v1/organizations/${org.id}/job_postings`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apolloApiKey!
          }
        }
      );

      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        if (jobData.job_postings) {
          jobPostings = jobData.job_postings.slice(0, 10);
        }
      }
    } catch (error) {
      console.log(`  ⚠ Could not fetch job postings for ${org.name}`);
    }

    // Calculate buying intent signals
    const buyingIntentSignals = this.calculateBuyingIntent(org, jobPostings);

    return {
      name: org.name,
      website: org.website_url,
      sector: org.industry || 'Unknown',
      size: org.estimated_num_employees ? `${org.estimated_num_employees}` : 'Unknown',
      address: `${org.street_address || ''}, ${org.city || ''}, ${org.state || ''} ${org.postal_code || ''}`.trim(),
      city: org.city || '',
      state: org.state,
      zip: org.postal_code || '',
      country: org.country,
      
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
      
      organizationLinkedin: org.linkedin_url,
      organizationTwitter: org.twitter_url,
      organizationFacebook: org.facebook_url,
      organizationLogoUrl: org.logo_url,
      organizationFoundedYear: org.founded_year,
      organizationEmployeeCount: org.estimated_num_employees ? `${org.estimated_num_employees}` : undefined,
      organizationRevenueRange: org.annual_revenue ? `$${org.annual_revenue}` : undefined,
      organizationIndustryKeywords: org.industry_tag_list,
      
      jobPostings,
      technologiesUsed: org.current_technologies || [],
      buyingIntentSignals,
      fundingStage: org.latest_funding_stage,
      totalFundingUsd: org.total_funding,
      
      discoverySource: 'apollo_discovery',
      enrichmentLevel: 'fully_enriched',
      dataCompletenessScore: 95,
      lastEnrichedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString()
    };
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
