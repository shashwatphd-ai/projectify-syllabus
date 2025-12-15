import {
  DiscoveryProvider,
  CourseContext,
  DiscoveryResult,
  DiscoveredCompany
} from './types.ts';
import { mapSOCIndustriesToApollo, getApolloSearchStrategy } from './apollo-industry-mapper.ts';
import { getTechnologiesForSOCCodes } from './apollo-technology-mapping.ts';
import { calculateDistanceBetweenLocations, formatDistance } from '../../_shared/geo-distance.ts';

interface ApolloSearchFilters {
  organization_locations: string[];
  q_organization_keyword_tags: string[]; // Industry keywords + course keywords + technologies
  person_not_titles?: string[]; // Exclude recruiters/HR
  q_organization_job_titles?: string[]; // Optional - used for ranking, not filtering
  organization_num_employees_ranges?: string[];
  organization_num_jobs_range?: { min?: number; max?: number }; // Not used in permissive strategy
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

    // ========================================
    // DIAGNOSTIC: Log all context received from discover-companies
    // ========================================
    console.log(`\n🔍 APOLLO PROVIDER RECEIVED CONTEXT:`);
    console.log(`   courseTitle: "${context.courseTitle || 'Unknown'}"`);
    console.log(`   location: "${context.location}"`);
    console.log(`   searchLocation: "${context.searchLocation || '(not set)'}"`);
    console.log(`   targetCount: ${context.targetCount}`);
    console.log(`   targetCompanies: ${JSON.stringify(context.targetCompanies || [])}`);
    console.log(`   targetIndustries: ${JSON.stringify(context.targetIndustries || [])}`);
    console.log(`   onetOccupations count: ${context.onetOccupations?.length || 0}`);

    console.log(`\n🚀 Apollo Provider: Discovering companies for ${context.location}`);
    console.log(`   Course: "${context.courseTitle || 'Unknown'}"`);

    // Check for user-specified companies
    const hasTargetCompanies = context.targetCompanies && context.targetCompanies.length > 0;
    const hasTargetIndustries = context.targetIndustries && context.targetIndustries.length > 0;
    
    if (hasTargetCompanies) {
      console.log(`   🎯 USER CUSTOMIZATION: Searching for specific companies: ${context.targetCompanies!.join(', ')}`);
    }
    if (hasTargetIndustries) {
      console.log(`   🏭 USER CUSTOMIZATION: Filtering by industries: ${context.targetIndustries!.join(', ')}`);
    }

    let organizations: ApolloOrganization[] = [];
    let targetCompanyResults: { found: string[]; notFound: string[] } = { found: [], notFound: [] };

    // Step 1: If user specified companies, search for them first
    if (hasTargetCompanies) {
      const { companies: foundCompanies, found, notFound } = await this.searchByCompanyNames(
        context.targetCompanies!,
        context.searchLocation || context.location
      );
      organizations = foundCompanies;
      targetCompanyResults = { found, notFound };
      
      console.log(`   📊 Company Name Search Results:`);
      console.log(`      Found: ${found.length > 0 ? found.join(', ') : '(none)'}`);
      console.log(`      Not Found: ${notFound.length > 0 ? notFound.join(', ') : '(none)'}`);
    }

    // Step 2: Calculate how many more companies we need
    const remainingCount = Math.max(0, context.targetCount - organizations.length);
    
    // Step 3: If we need more companies, do regular discovery
    if (remainingCount > 0 || organizations.length === 0) {
      console.log(`   🔍 Searching for ${remainingCount > 0 ? remainingCount + ' additional' : ''} companies via SOC-based discovery...`);
      
      // Step 3a: Calculate course-specific seed for diversity
      const courseSeed = this.generateCourseSeed(context);
      console.log(`   🎲 Course Seed: ${courseSeed} (ensures unique companies per course)`);

      // Step 3b: Generate Apollo search filters using AI
      const { filters, excludedIndustries, courseDomain } = await this.generateFilters(context, courseSeed);
      
      // Step 3c: If user specified industries, override or merge with generated industries
      if (hasTargetIndustries) {
        console.log(`   🏭 Merging user industries with generated filters...`);
        const existingKeywords = filters.q_organization_keyword_tags || [];
        // User industries take priority - add them at the front
        filters.q_organization_keyword_tags = [
          ...context.targetIndustries!.map(i => i.toLowerCase()),
          ...existingKeywords.filter(k => !context.targetIndustries!.some(ti => ti.toLowerCase() === k.toLowerCase()))
        ].slice(0, 15); // Limit to 15 keywords
        console.log(`   📋 Final industry keywords: ${filters.q_organization_keyword_tags.join(', ')}`);
      }

      // Step 3d: Search for organizations
      const pageOffset = this.calculatePageOffset(courseSeed);
      // Request more if we already have some from company name search
      const searchCount = organizations.length > 0 
        ? remainingCount * 5  // Just get what we need + buffer
        : context.targetCount * 5;  // Normal multiplier
      
      const additionalOrgs = await this.searchOrganizations(filters, searchCount, pageOffset);
      
      // Step 3e: Merge with any user-specified companies we found
      // Avoid duplicates by checking website/name
      const existingNames = new Set(organizations.map(o => o.name.toLowerCase()));
      const existingWebsites = new Set(organizations.map(o => o.website_url?.toLowerCase()).filter(Boolean));
      
      for (const org of additionalOrgs) {
        const nameMatch = existingNames.has(org.name.toLowerCase());
        const websiteMatch = org.website_url && existingWebsites.has(org.website_url.toLowerCase());
        if (!nameMatch && !websiteMatch) {
          organizations.push(org);
        }
      }
      
      console.log(`   📊 Total organizations after merge: ${organizations.length}`);
    }

    // Step 4: Generate filters for enrichment (needed for excluded industries)
    const courseSeed = this.generateCourseSeed(context);
    const { excludedIndustries, courseDomain } = await this.generateFilters(context, courseSeed);

    // Step 5: Enrich organizations with contacts and market intelligence
    // Pass excluded industries and course domain for context-aware post-filtering
    // Pass searchLocation for proximity-based sorting
    const companies = await this.enrichOrganizations(
      organizations,
      context.targetCount,
      excludedIndustries,
      courseDomain,
      context.socMappings || [],
      context.searchLocation || context.location,
      targetCompanyResults.found // Pass found company names to mark them as user-requested
    );

    const processingTime = (Date.now() - startTime) / 1000;

    return {
      companies,
      stats: {
        discovered: organizations.length,
        enriched: companies.length,
        processingTimeSeconds: processingTime,
        apiCreditsUsed: companies.length * 2, // Org search + People search
        providerUsed: 'apollo'
      },
      // Include feedback about user-specified companies
      userRequestedCompanies: hasTargetCompanies ? {
        requested: context.targetCompanies!,
        found: targetCompanyResults.found,
        notFound: targetCompanyResults.notFound
      } : undefined
    };
  }
  
  /**
   * Search Apollo API for specific companies by name
   */
  private async searchByCompanyNames(
    companyNames: string[],
    location: string
  ): Promise<{ companies: ApolloOrganization[]; found: string[]; notFound: string[] }> {
    const foundCompanies: ApolloOrganization[] = [];
    const found: string[] = [];
    const notFound: string[] = [];
    
    console.log(`\n  🔍 Searching for ${companyNames.length} specific companies by name...`);
    
    for (const companyName of companyNames) {
      console.log(`     Searching for: "${companyName}"...`);
      
      try {
        // Apollo's q_organization_name parameter searches by company name
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
              q_organization_name: companyName,
              organization_locations: [location],
              page: 1,
              per_page: 5 // Get a few in case of multiple matches
            })
          }
        );
        
        if (!response.ok) {
          console.warn(`     ⚠️  Apollo API error for "${companyName}": ${response.status}`);
          notFound.push(companyName);
          continue;
        }
        
        const data = await response.json();
        const orgs = (data.organizations || []) as ApolloOrganization[];
        
        if (orgs.length > 0) {
          // Find best match - exact or partial name match
          const exactMatch = orgs.find(o => 
            o.name.toLowerCase() === companyName.toLowerCase()
          );
          const partialMatch = orgs.find(o => 
            o.name.toLowerCase().includes(companyName.toLowerCase()) ||
            companyName.toLowerCase().includes(o.name.toLowerCase())
          );
          
          const bestMatch = exactMatch || partialMatch || orgs[0];
          
          if (bestMatch) {
            console.log(`     ✅ Found: "${bestMatch.name}" (${bestMatch.city || 'Unknown'}, ${bestMatch.state || 'Unknown'})`);
            foundCompanies.push(bestMatch);
            found.push(companyName);
          } else {
            console.log(`     ❌ No match for: "${companyName}"`);
            notFound.push(companyName);
          }
        } else {
          // Try broader search without location constraint
          console.log(`     🔄 No results in ${location}, trying without location filter...`);
          
          const broadResponse = await fetch(
            'https://api.apollo.io/v1/mixed_companies/search',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': this.apolloApiKey!
              },
              body: JSON.stringify({
                q_organization_name: companyName,
                page: 1,
                per_page: 5
              })
            }
          );
          
          if (broadResponse.ok) {
            const broadData = await broadResponse.json();
            const broadOrgs = (broadData.organizations || []) as ApolloOrganization[];
            
            if (broadOrgs.length > 0) {
              const bestMatch = broadOrgs.find(o => 
                o.name.toLowerCase().includes(companyName.toLowerCase()) ||
                companyName.toLowerCase().includes(o.name.toLowerCase())
              ) || broadOrgs[0];
              
              console.log(`     ✅ Found (different location): "${bestMatch.name}" (${bestMatch.city || 'Unknown'}, ${bestMatch.state || 'Unknown'})`);
              foundCompanies.push(bestMatch);
              found.push(companyName);
            } else {
              console.log(`     ❌ Company not found in Apollo database: "${companyName}"`);
              notFound.push(companyName);
            }
          } else {
            notFound.push(companyName);
          }
        }
      } catch (error) {
        console.error(`     ❌ Error searching for "${companyName}":`, error);
        notFound.push(companyName);
      }
    }
    
    console.log(`\n  📊 Company Name Search Summary:`);
    console.log(`     Requested: ${companyNames.length}`);
    console.log(`     Found: ${found.length} (${found.join(', ') || 'none'})`);
    console.log(`     Not Found: ${notFound.length} (${notFound.join(', ') || 'none'})\n`);
    
    return { companies: foundCompanies, found, notFound };
  }
  
  /**
   * Generate deterministic course-specific seed for diversity
   * Same course always gets same seed (reproducibility)
   * Different courses get different seeds (variety)
   */
  private generateCourseSeed(context: CourseContext): number {
    const courseIdentifier = `${context.courseTitle}_${context.level}_${context.topics.join('_')}`;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < courseIdentifier.length; i++) {
      const char = courseIdentifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash);
  }

  /**
   * Calculate page offset for smart pagination
   * FIXED: Always start with page 1 to ensure we don't skip relevant results
   * For narrow searches, higher pages may have no results
   */
  private calculatePageOffset(courseSeed: number): number {
    // SURGICAL FIX: Always use page 1
    // Diversity will be achieved through result randomization instead
    const pageNumber = 1;
    console.log(`   📄 Page Offset: ${pageNumber} (starting with most relevant results)`);
    return pageNumber;
  }

  /**
   * Extract course-specific keywords from title and topics
   * Adds specificity to Apollo search beyond just occupation titles
   */
  private extractCourseKeywords(context: CourseContext): string[] {
    const keywords = new Set<string>();

    // Extract from title (skip common words)
    const commonWords = ['course', 'introduction', 'advanced', 'fundamentals', 'principles', 'the', 'and', 'or', 'in', 'to', 'for'];
    const titleWords = (context.courseTitle || '')
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 3 && !commonWords.includes(w));

    titleWords.forEach(w => keywords.add(w));

    // Extract from topics (first 5 topics only)
    context.topics.slice(0, 5).forEach(topic => {
      const topicWords = topic
        .toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 4 && !commonWords.includes(w));

      topicWords.forEach(w => keywords.add(w));
    });

    const courseKeywords = Array.from(keywords).slice(0, 8); // Max 8 keywords

    if (courseKeywords.length > 0) {
      console.log(`   🔑 Course-Specific Keywords: ${courseKeywords.join(', ')}`);
    }

    return courseKeywords;
  }

  private async generateFilters(context: CourseContext, courseSeed: number): Promise<{ filters: ApolloSearchFilters; excludedIndustries: string[]; courseDomain: string }> {
    // PHASE 2: Use O*NET data for intelligent filtering (if available)
    const useIntelligentFilters = context.onetOccupations && context.onetOccupations.length > 0;

    console.log(`\n🎯 Filter Generation Mode: ${useIntelligentFilters ? 'INTELLIGENT (O*NET)' : 'LEGACY (Course-Specific)'}`);

    if (useIntelligentFilters) {
      return await this.generateIntelligentFilters(context, courseSeed);
    }

    // LEGACY: Use course-specific seed instead of timestamp
    const randomSeed = courseSeed % 1000;
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

    // Add timeout to prevent indefinite hangs on AI Gateway
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch(
        'https://ai.gateway.lovable.dev/v1/chat/completions',
        {
          signal: controller.signal,
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
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ AI_GATEWAY_TIMEOUT: Request exceeded 30 seconds');
        throw new Error('AI Gateway timeout after 30s - please try again');
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AI_FILTER_GENERATION_FAILED: HTTP ${response.status}`);
      console.error(`   AI Gateway Error: ${errorText.substring(0, 200)}`);
      console.error(`   Model: google/gemini-2.5-flash`);
      throw new Error(`AI filter generation failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error('No content from AI');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not extract JSON from AI response');

    return {
      filters: JSON.parse(jsonMatch[0]),
      excludedIndustries: [], // Legacy mode doesn't use industry taxonomy
      courseDomain: 'unknown' // Legacy mode doesn't classify domain
    };
  }

  /**
   * PHASE 2: Generate intelligent filters using O*NET data
   * Uses occupation-specific job titles and technologies instead of random categories
   * NOW WITH COURSE-SPECIFIC DIVERSITY: Adds course keywords for differentiation
   */
  private async generateIntelligentFilters(context: CourseContext, courseSeed: number): Promise<{ filters: ApolloSearchFilters; excludedIndustries: string[]; courseDomain: string }> {
    console.log(`  🧠 Using O*NET occupations for intelligent filtering...`);

    const onetOccupations = context.onetOccupations!;

    // Extract course-specific keywords for additional diversity
    const courseKeywords = this.extractCourseKeywords(context);

    // Extract specific job titles from O*NET occupations
    const specificJobTitles: string[] = [];
    const technologiesNeeded: string[] = [];
    const industryKeywords: string[] = [];

    for (const occ of onetOccupations.slice(0, 3)) {  // Top 3 occupations
      // Add occupation title
      specificJobTitles.push(occ.title);

      // Extract technologies
      technologiesNeeded.push(...occ.technologies.slice(0, 5));

      // Extract industry keywords from DWAs
      const highImportanceDWAs = occ.dwas
        .filter(dwa => dwa.importance && dwa.importance > 70)
        .slice(0, 5);

      for (const dwa of highImportanceDWAs) {
        // Simple keyword extraction from DWA names
        const words = dwa.name
          .toLowerCase()
          .split(/\W+/)
          .filter(w => w.length > 4 && !['design', 'develop', 'analyze', 'conduct'].includes(w));

        industryKeywords.push(...words);
      }
    }

    // Deduplicate
    const uniqueJobTitles = [...new Set(specificJobTitles)].slice(0, 5);
    const uniqueTechnologies = [...new Set(technologiesNeeded)].slice(0, 5);
    const uniqueKeywords = [...new Set(industryKeywords)].slice(0, 10);

    console.log(`  📋 Intelligent Job Titles: ${uniqueJobTitles.join(', ') || '(NONE)'}`);
    console.log(`  💻 Technologies from O*NET: ${uniqueTechnologies.join(', ') || '(NONE)'}`);
    console.log(`  🏭 Industry Keywords from DWAs: ${uniqueKeywords.slice(0, 5).join(', ') || '(NONE)'}`);

    // Map occupation titles to industries
    let inferredIndustries = this.mapOccupationsToIndustries(onetOccupations);

    // SURGICAL FIX #9: Prioritize SOC mapping industries over generic O*NET inference
    if (context.socMappings && context.socMappings.length > 0) {
      const socIndustries = context.socMappings.flatMap(soc => soc.industries);
      const uniqueSocIndustries = [...new Set(socIndustries)];

      if (uniqueSocIndustries.length > 0) {
        console.log(`  ⚠️  Using SOC mapping industries (more specific than O*NET title inference)`);
        console.log(`  🏢 O*NET Generic Industries: ${inferredIndustries.join(', ') || '(NONE)'}`);
        console.log(`  📦 SOC Specific Industries: ${uniqueSocIndustries.slice(0, 10).join(', ')}`);
        inferredIndustries = uniqueSocIndustries.slice(0, 10);
      }
    } else if (inferredIndustries.length === 0) {
      console.log(`  ⚠️  No industries available from either O*NET or SOC mappings`);
    }

    console.log(`  🏢 Final Industries (before Apollo mapping): ${inferredIndustries.join(', ')}`);

    // Map SOC industries to Apollo keyword search terms
    // Combined with person_not_titles exclusions to filter out staffing companies
    // CONTEXT-AWARE: Determines exclusions based on course domain
    const { includeIndustries, excludeIndustries, courseDomain } = mapSOCIndustriesToApollo(
      inferredIndustries,
      context.socMappings || []
    );

    // Handle location normalization
    let apolloLocation = context.searchLocation;
    const countryCodeMap: Record<string, string> = {
      'IN': 'India', 'US': 'United States', 'GB': 'United Kingdom',
      'CA': 'Canada', 'AU': 'Australia', 'DE': 'Germany', 'FR': 'France',
      'JP': 'Japan', 'CN': 'China', 'SG': 'Singapore', 'AE': 'United Arab Emirates',
      'NL': 'Netherlands', 'SE': 'Sweden', 'CH': 'Switzerland', 'ES': 'Spain',
      'IT': 'Italy', 'BR': 'Brazil', 'MX': 'Mexico', 'KR': 'South Korea', 'IL': 'Israel'
    };

    if (apolloLocation && apolloLocation.length === 2 && apolloLocation.match(/^[A-Z]{2}$/)) {
      apolloLocation = countryCodeMap[apolloLocation] || apolloLocation;
    }

    if (apolloLocation && apolloLocation.includes(',')) {
      const parts = apolloLocation.split(',').map((p: string) => p.trim());
      const lastPart = parts[parts.length - 1];
      if (lastPart.length === 2 && lastPart.match(/^[A-Z]{2}$/)) {
        parts[parts.length - 1] = countryCodeMap[lastPart] || lastPart;
        apolloLocation = parts.join(', ');
      }
    }

    // PERMISSIVE FILTER STRATEGY: Cast a wide net, then use semantic filtering to narrow down
    // With 30,000+ companies in Apollo, we should START permissive and filter client-side
    // rather than starting restrictive and getting 0 results
    const searchStrategy = getApolloSearchStrategy(includeIndustries.length);
    console.log(`  📊 Apollo Search Strategy: ${searchStrategy.toUpperCase()}`);

    // TECHNOLOGY FILTERING: TEMPORARILY DISABLED FOR CRISIS RECOVERY
    // Apollo may not support string-based technology UIDs (might need numeric IDs)
    // This was breaking discovery by returning 0 companies
    // TODO: Re-enable after verifying Apollo API supports this parameter format
    const socCodes = context.socMappings?.map(soc => soc.socCode) || [];
    const technologyUIDs = socCodes.length > 0 ? getTechnologiesForSOCCodes(socCodes) : [];

    const intelligentFilters: ApolloSearchFilters = {
      organization_locations: [apolloLocation],
      q_organization_keyword_tags: [...includeIndustries], // Industry keywords for filtering
      currently_using_any_of_technology_uids: undefined, // DISABLED - was causing 0 results
      // NOTE: Job titles removed from mandatory filters - will use for ranking instead
      // NOTE: Job posting requirement removed - most companies don't post all jobs publicly
      // NOTE: Employee size expanded to include small startups and large enterprises
      person_not_titles: ['Recruiter', 'HR Manager', 'Talent Acquisition', 'Staffing'], // Exclude recruiters
      organization_num_employees_ranges: ['1,10', '11,50', '51,200', '201,500', '501,1000', '1001,10000'] // All sizes
    };

    // Store job titles for later ranking (not filtering)
    const preferredJobTitles = uniqueJobTitles;
    console.log(`  💼 Job titles for ranking (not filtering): ${preferredJobTitles.join(', ')}`);

    // Technology filtering diagnostic logging - DISABLED
    // if (technologyUIDs.length > 0) {
    //   console.log(`  🔧 Technology filtering enabled: ${technologyUIDs.slice(0, 5).join(', ')}${technologyUIDs.length > 5 ? '...' : ''}`);
    //   console.log(`     (Automatically excludes staffing firms - they don't use engineering software)`);
    // }
    console.log(`  ⚠️  Technology filtering DISABLED (crisis recovery mode)`);

    // HYBRID STRATEGY: Add course-specific keywords for diversity (not generic industries)
    // This ensures different courses (even with same occupation) get different companies
    if (courseKeywords.length > 0) {
      intelligentFilters.q_organization_keyword_tags.push(...courseKeywords);
      console.log(`  🎯 Added ${courseKeywords.length} course-specific keywords for diversity`);
    }

    // Add technology keywords for additional filtering (not as primary filter)
    if (uniqueTechnologies.length > 0 && searchStrategy === 'hybrid') {
      intelligentFilters.q_organization_keyword_tags.push(...uniqueTechnologies.slice(0, 3).map(t => t.toLowerCase()));
      console.log(`  💻 Added ${Math.min(3, uniqueTechnologies.length)} technology keywords`);
    }

    console.log(`  ✅ Generated permissive filters (will rank/filter client-side):`);
    console.log(`     Industry Keywords: ${includeIndustries.slice(0, 5).join(', ')}${includeIndustries.length > 5 ? '...' : ''}`);
    console.log(`     Employee Ranges: All sizes (1-10,000+)`);
    console.log(`     Job Posting Requirement: NONE (removed for better coverage)`);
    console.log(`     Excluded Titles: ${intelligentFilters.person_not_titles?.join(', ')}`);

    return {
      filters: intelligentFilters,
      excludedIndustries: excludeIndustries, // FIXED: Use correct variable name for post-filtering
      courseDomain // Pass course domain for context-aware decisions
    };
  }

  /**
   * Map O*NET occupations to relevant industries for Apollo filtering
   */
  private mapOccupationsToIndustries(occupations: any[]): string[] {
    const industries = new Set<string>();

    for (const occ of occupations) {
      const title = occ.title.toLowerCase();
      const code = occ.code;

      // SOC code mapping (https://www.bls.gov/soc/2018/major_groups.htm)
      const majorGroup = code.substring(0, 2);

      // Engineering (17-xxxx)
      if (majorGroup === '17' || title.includes('engineer')) {
        industries.add('engineering');
        industries.add('manufacturing');
        industries.add('technology');

        if (title.includes('mechanical') || title.includes('thermal')) {
          industries.add('hvac');
          industries.add('automotive');
          industries.add('energy');
        }
        if (title.includes('software') || title.includes('computer')) {
          industries.add('software');
          industries.add('it services');
        }
        if (title.includes('civil') || title.includes('structural')) {
          industries.add('construction');
          industries.add('infrastructure');
        }
      }

      // Computer/IT (15-xxxx)
      if (majorGroup === '15' || title.includes('software') || title.includes('data')) {
        industries.add('software');
        industries.add('technology');
        industries.add('it services');
        industries.add('saas');

        if (title.includes('data')) {
          industries.add('data analytics');
          industries.add('business intelligence');
        }
      }

      // Business/Management (11-xxxx, 13-xxxx)
      if (majorGroup === '11' || majorGroup === '13' || title.includes('manager') || title.includes('analyst')) {
        industries.add('consulting');
        industries.add('business services');

        if (title.includes('financial') || title.includes('accounting')) {
          industries.add('financial services');
          industries.add('fintech');
        }
        if (title.includes('marketing')) {
          industries.add('marketing');
          industries.add('advertising');
        }
      }

      // Healthcare (29-xxxx, 31-xxxx)
      if (majorGroup === '29' || majorGroup === '31') {
        industries.add('healthcare');
        industries.add('biotech');
        industries.add('medical devices');
      }

      // Life Sciences (19-xxxx)
      if (majorGroup === '19') {
        industries.add('biotech');
        industries.add('pharmaceuticals');
        industries.add('research');
      }
    }

    return Array.from(industries).slice(0, 10);  // Top 10 industries
  }

  /**
   * Search Apollo API for organizations matching filters
   */
  private async searchOrganizations(
    filters: ApolloSearchFilters,
    maxResults: number,
    pageOffset: number = 1
  ): Promise<ApolloOrganization[]> {
    // CRITICAL FIX: Store original location for fallback reset
    const originalCityLocation = filters.organization_locations[0];
    const originalIndustryTags = [...filters.q_organization_keyword_tags];

    console.log(`\n  🔍 Searching Apollo with PERMISSIVE filters (Page ${pageOffset})...`);
    console.log(`  📋 Filter configuration:`);
    console.log(`     Location: "${originalCityLocation}"`);
    console.log(`     Industry keywords: ${filters.q_organization_keyword_tags.slice(0, 5).join(', ')}${filters.q_organization_keyword_tags.length > 5 ? '...' : ''}`);
    console.log(`     Employee ranges: ${filters.organization_num_employees_ranges?.join(', ') || 'ALL'}`);
    console.log(`     Job posting requirement: NONE`);
    console.log(`     Excluded titles: ${filters.person_not_titles?.join(', ') || 'none'}`);

    // Try with specific location first (e.g., "Kansas City, Missouri, United States")
    let organizations = await this.trySearch(filters, maxResults, pageOffset);
    const specificLocationResults = organizations.length;
    console.log(`  📊 Results with specific location "${originalCityLocation}": ${specificLocationResults} companies`);

    // FIX B: ONLY expand geography if we have ZERO local results
    // Changed from "< maxResults" to "=== 0" to prevent premature geographic expansion
    // Rationale: Better to return 5 LOCAL companies than 40 DISTANT companies
    if (organizations.length === 0 && originalCityLocation.includes(',')) {
      const locationParts = originalCityLocation.split(',').map(p => p.trim());

      console.log(`  ⚠️  ZERO local companies found - trying broader geography as last resort...`);

      // Try state + country (e.g., "Missouri, United States")
      if (locationParts.length >= 3 && organizations.length === 0) {
        const broaderLocation = locationParts.slice(-2).join(', ');
        console.log(`  🔄 Expanding to state-wide: "${broaderLocation}"`);
        filters.organization_locations = [broaderLocation];
        organizations = await this.trySearch(filters, maxResults, pageOffset);
        console.log(`  📊 Results with state/country: ${organizations.length} companies`);
      }

      // Try just country (e.g., "United States") - only if still zero
      if (organizations.length === 0 && locationParts.length >= 2) {
        const countryOnly = locationParts[locationParts.length - 1];
        console.log(`  🔄 Expanding to country-wide: "${countryOnly}"`);
        filters.organization_locations = [countryOnly];
        organizations = await this.trySearch(filters, maxResults, pageOffset);
        console.log(`  📊 Results country-wide: ${organizations.length} companies`);
      }
    } else if (organizations.length > 0 && organizations.length < maxResults) {
      console.log(`  ✅ Found ${organizations.length} local companies - SKIPPING geographic expansion`);
      console.log(`     (Prefer local companies over distant ones, even if fewer than target ${maxResults})`);
    }

    // 🔥 CRITICAL FIX: If still insufficient results, try relaxing industry filters
    // This is the KEY to making the platform work for ANY syllabus - don't be too specific with industries
    
    if (organizations.length < 3 && originalIndustryTags.length > 3) {
      console.log(`  ⚠️  Only ${organizations.length} companies found with specific industry filters`);
      console.log(`  🔄 Trying BROADER industry search (top 50% of industry keywords)...`);

      // Keep only the most important industry keywords (first half)
      filters.q_organization_keyword_tags = originalIndustryTags.slice(0, Math.ceil(originalIndustryTags.length / 2));

      const broaderResults = await this.trySearch(filters, maxResults, pageOffset);
      console.log(`  📊 Results with broader industries: ${broaderResults.length} companies`);

      if (broaderResults.length > organizations.length) {
        organizations = broaderResults;
      } else {
        // Restore original tags for next fallback
        filters.q_organization_keyword_tags = originalIndustryTags;
      }
    }

    // 🔥 ULTIMATE FALLBACK: If STILL too few results, try location-only search
    // Let semantic filtering handle relevance instead of Apollo industry tags
    if (organizations.length < 2) {
      console.log(`  ⚠️  Still only ${organizations.length} companies - trying LOCATION-ONLY search`);
      console.log(`  🔄 Removing ALL industry filters - semantic filtering will handle relevance`);

      // CRITICAL FIX: Reset to ORIGINAL city-specific location (not state/country from previous fallbacks)
      console.log(`  📍 Resetting location filter to original: "${originalCityLocation}"`);
      filters.organization_locations = [originalCityLocation];

      // Remove industry tags completely - just search by location
      filters.q_organization_keyword_tags = []; // Empty array instead of delete

      const locationOnlyResults = await this.trySearch(filters, maxResults * 2, pageOffset); // Request more since we're not filtering
      console.log(`  📊 Results with location-only search: ${locationOnlyResults.length} companies`);
      console.log(`     ✅ Semantic filtering will rank these by relevance to course`);

      if (locationOnlyResults.length > organizations.length) {
        organizations = locationOnlyResults;
      }
    }

    console.log(`  ✅ Apollo search complete: ${organizations.length} companies found`);

    // DISTANCE FILTER: TEMPORARILY DISABLED FOR CRISIS RECOVERY
    // This was added but may be causing issues - Apollo should already handle location filtering
    // Semantic filtering and proximity sorting will handle relevance/distance
    // TODO: Re-enable after confirming Apollo returns local companies successfully
    /*
    const MAX_DISTANCE_MILES = 150;
    const beforeDistanceFilter = organizations.length;

    if (organizations.length > 0) {
      const filteredOrgs: ApolloOrganization[] = [];
      let distantCount = 0;

      for (const org of organizations) {
        const orgLocation = `${org.city || ''}, ${org.state || ''}`.trim();
        if (!orgLocation || orgLocation === ',') {
          filteredOrgs.push(org);
          continue;
        }

        try {
          const distance = await calculateDistanceBetweenLocations(
            originalCityLocation,
            orgLocation
          );

          if (distance !== null && distance <= MAX_DISTANCE_MILES) {
            filteredOrgs.push(org);
          } else if (distance !== null) {
            distantCount++;
            if (distantCount <= 3) {
              console.log(`     🚫 Excluded ${org.name} (${orgLocation}) - ${formatDistance(distance)} away (> ${MAX_DISTANCE_MILES} miles)`);
            }
          } else {
            // Distance calculation failed - keep the company (safer than excluding)
            filteredOrgs.push(org);
          }
        } catch (error) {
          filteredOrgs.push(org);
        }
      }

      organizations = filteredOrgs;

      if (distantCount > 0) {
        console.log(`  📍 Distance filter: ${beforeDistanceFilter} → ${organizations.length} companies (excluded ${distantCount} distant companies)`);
      }
    }
    */
    console.log(`  ⚠️  Distance filter DISABLED (crisis recovery mode)`);
    console.log(`     Will apply semantic filtering + proximity sorting client-side\n`);

    if (organizations.length === 0) {
      console.error(`\n  ❌ ZERO RESULTS FROM APOLLO`);
      console.error(`     Location: "${originalCityLocation}"`);
      console.error(`     Keywords: ${originalIndustryTags.slice(0, 10).join(', ')}`);
      console.error(`     This likely indicates:`);
      console.error(`       - Apollo API issue or invalid API key`);
      console.error(`       - Location format incorrect in database`);
      console.error(`       - Filters too restrictive\n`);
    }

    return organizations;
  }

  private async trySearch(
    filters: ApolloSearchFilters,
    maxResults: number,
    pageOffset: number = 1
  ): Promise<ApolloOrganization[]> {
    const requestBody = {
      ...filters,
      page: pageOffset, // CRITICAL FIX: Use dynamic page instead of always page 1
      per_page: Math.min(maxResults, 100)
    };

    // 🔍 DIAGNOSTIC: Log complete request being sent to Apollo
    console.log(`\n  🔍 [Apollo API Request - DIAGNOSTIC]`);
    console.log(`     Endpoint: POST https://api.apollo.io/v1/mixed_companies/search`);
    console.log(`     Request Body:`);
    console.log(JSON.stringify(requestBody, null, 2));

    const response = await fetch(
      'https://api.apollo.io/v1/mixed_companies/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.apolloApiKey!
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ APOLLO_SEARCH_FAILED: HTTP ${response.status}`);
      console.error(`   Details: ${errorText.substring(0, 200)}`);
      console.error(`   Request filters:`, JSON.stringify(filters, null, 2).substring(0, 300));
      throw new Error(`Apollo search failed: ${response.status}`);
    }

    const data = await response.json();
    const organizations = data.organizations || [];

    // 🔍 DIAGNOSTIC: Log response received from Apollo
    console.log(`\n  📥 [Apollo API Response - DIAGNOSTIC]`);
    console.log(`     Total Results: ${organizations.length}`);
    console.log(`     Pagination: ${data.pagination ? JSON.stringify(data.pagination) : 'N/A'}`);

    if (organizations.length > 0) {
      console.log(`\n     Sample Results (first 3):`);
      organizations.slice(0, 3).forEach((org: ApolloOrganization, idx: number) => {
        console.log(`       ${idx + 1}. ${org.name}`);
        console.log(`          Industry: ${org.industry || 'N/A'}`);
        console.log(`          Location: ${org.city || '?'}, ${org.state || '?'}, ${org.country || '?'}`);
        console.log(`          Employees: ${org.estimated_num_employees || 'N/A'}`);
        console.log(`          Keywords: ${org.keywords?.slice(0, 3).join(', ') || 'N/A'}`);
      });
    } else {
      console.log(`     ❌ No organizations returned`);
    }

    return organizations;
  }
  
  private async enrichOrganizations(
    organizations: ApolloOrganization[],
    targetCount: number,
    excludedIndustries: string[] = [],
    courseDomain: string = 'unknown',
    socMappings: any[] = [],
    searchLocation: string = '',
    userRequestedCompanyNames: string[] = [] // Companies explicitly requested by user
  ): Promise<DiscoveredCompany[]> {
    const enriched: DiscoveredCompany[] = [];
    let skippedCount = 0;
    let reconsideredCount = 0;

    console.log(`\n🔍 ENRICHMENT STAGE`);
    console.log(`   Organizations to enrich: ${organizations.length}`);
    console.log(`   Target count: ${targetCount}`);
    console.log(`   🎓 Course Domain: ${courseDomain.toUpperCase()}`);
    if (excludedIndustries.length > 0) {
      console.log(`   🚫 Initially excluded: ${excludedIndustries.join(', ')}`);
    }

    // 🗺️ DIAGNOSTIC: Log searchLocation state for proximity sorting
    if (searchLocation && searchLocation.trim().length > 0) {
      console.log(`   📍 Proximity sorting: ENABLED`);
      console.log(`   📍 Search location: "${searchLocation}"`);
    } else {
      console.log(`   ⚠️  Proximity sorting: DISABLED (no search location)`);
    }
    console.log('');

    for (const org of organizations) {
      if (enriched.length >= targetCount) break;

      // POST-FILTER: Context-aware exclusion check
      // This catches any staffing/recruiting companies that slipped through Apollo filters
      if (excludedIndustries.length > 0 && org.industry) {
        const industryLower = org.industry.toLowerCase();
        const isInExcludedList = excludedIndustries.some(excluded =>
          industryLower.includes(excluded.toLowerCase())
        );

        if (isInExcludedList) {
          // Company is in excluded list, but check if we should reconsider
          // For hybrid/business courses, verify with job posting analysis
          if (courseDomain === 'business_management') {
            // Business courses: staffing companies are target industry
            console.log(`   ✅ ${org.name} (${org.industry}) - Business course: NOT excluded`);
            reconsideredCount++;
          } else if (courseDomain === 'hybrid') {
            // Hybrid courses: Fetch job postings and analyze
            console.log(`   🔀 ${org.name} (${org.industry}) - Hybrid course: Checking job postings...`);
            // Will be checked during enrichSingleOrganization with job posting data
          } else {
            // Engineering/Tech courses: definitely exclude
            console.log(`   🚫 Skipping ${org.name} (industry: ${org.industry})`);
            skippedCount++;
            continue;
          }
        }
      }

      try {
        const company = await this.enrichSingleOrganization(org);
        if (company) {
          // For hybrid courses with excluded industries, do final check with job postings
          if (courseDomain === 'hybrid' && excludedIndustries.some(e =>
            (company.sector || '').toLowerCase().includes(e.toLowerCase())
          )) {
            const { shouldExcludeIndustry } = await import('../../_shared/context-aware-industry-filter.ts');
            const decision = shouldExcludeIndustry(
              company.sector || '',
              courseDomain as any,
              socMappings as any,
              company.jobPostings
            );

            if (decision.shouldExclude) {
              console.log(`   🚫 ${company.name}: ${decision.reason}`);
              skippedCount++;
              continue;
            } else {
              console.log(`   ✅ ${company.name}: ${decision.reason}`);
              reconsideredCount++;
            }
          }

          // 🗺️ ENHANCED: Calculate distance with comprehensive error handling (now async with geocoding API)
          if (searchLocation && searchLocation.trim().length > 0) {
            const companyLocation = `${company.city}, ${company.state || company.country}`;
            const distance = await calculateDistanceBetweenLocations(searchLocation, companyLocation);

            if (distance !== null) {
              company.distanceFromSearchMiles = distance;
              console.log(`   📍 ${company.name} (${companyLocation}): ${formatDistance(distance)}`);
            } else {
              // Location parsing/geocoding failed - log for debugging
              console.log(`   ⚠️  ${company.name}: Could not calculate distance`);
              console.log(`      Search: "${searchLocation}" → Company: "${companyLocation}"`);
              // Don't set distance - company will sort to end
            }
          }

          enriched.push(company);
          console.log(`   ✅ Enriched ${company.name} (${enriched.length}/${targetCount})`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to enrich ${org.name}:`, error);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (skippedCount > 0 || reconsideredCount > 0) {
      console.log(`   📊 Post-filter results:`);
      console.log(`      Skipped: ${skippedCount} excluded companies`);
      if (reconsideredCount > 0) {
        console.log(`      Reconsidered: ${reconsideredCount} companies (context-aware inclusion)`);
      }
    }

    // 🗺️ ENHANCED: Sort by proximity with comprehensive statistics AND distance filtering
    if (searchLocation && searchLocation.trim().length > 0) {
      const withDistance = enriched.filter(c => c.distanceFromSearchMiles !== undefined);
      const withoutDistance = enriched.filter(c => c.distanceFromSearchMiles === undefined);

      if (withDistance.length > 0) {
        console.log(`\n🗺️ PROXIMITY FILTERING & SORTING`);
        console.log(`   ${withDistance.length} companies with calculated distance`);
        if (withoutDistance.length > 0) {
          console.log(`   ${withoutDistance.length} companies without distance (will be kept)`);
        }

        // CRITICAL FIX: Apply maximum distance threshold
        // Determine threshold based on search location specificity
        const MAX_DISTANCE_MILES = 150; // Reasonable commuting/regional radius
        console.log(`   🎯 Maximum distance threshold: ${MAX_DISTANCE_MILES} miles`);

        const withinRange = withDistance.filter(c => c.distanceFromSearchMiles! <= MAX_DISTANCE_MILES);
        const beyondRange = withDistance.filter(c => c.distanceFromSearchMiles! > MAX_DISTANCE_MILES);

        if (beyondRange.length > 0) {
          console.log(`   ❌ Filtered out ${beyondRange.length} companies beyond ${MAX_DISTANCE_MILES} miles:`);
          beyondRange.slice(0, 3).forEach(c => {
            const loc = `${c.city}, ${c.state || c.country}`;
            console.log(`      • ${c.name} (${loc}) - ${formatDistance(c.distanceFromSearchMiles!)} (TOO FAR)`);
          });
        }

        // Combine: companies within range + companies without calculable distance
        const finalEnriched = [...withinRange, ...withoutDistance];

        // Sort: nearest first, then companies without distance
        finalEnriched.sort((a, b) => {
          const distA = a.distanceFromSearchMiles ?? 999999;
          const distB = b.distanceFromSearchMiles ?? 999999;
          return distA - distB;
        });

        console.log(`   ✅ ${withinRange.length} companies within ${MAX_DISTANCE_MILES} miles`);

        if (withinRange.length > 0) {
          // Log top 5 closest
          console.log(`\n   📍 TOP ${Math.min(5, withinRange.length)} CLOSEST:`);
          withinRange
            .slice(0, 5)
            .forEach((c, i) => {
              const loc = `${c.city}, ${c.state || c.country}`;
              console.log(`      ${i + 1}. ${c.name} (${loc}) - ${formatDistance(c.distanceFromSearchMiles!)}`);
            });

          // Statistics
          const distances = withinRange.map(c => c.distanceFromSearchMiles!).sort((a, b) => a - b);
          const avg = distances.reduce((a, b) => a + b, 0) / distances.length;

          console.log(`\n   📊 STATISTICS (companies within range):`);
          console.log(`      Closest: ${formatDistance(distances[0])}`);
          console.log(`      Farthest: ${formatDistance(distances[distances.length - 1])}`);
          console.log(`      Average: ${formatDistance(avg)}`);
        }

      } else {
        console.log(`\n⚠️  PROXIMITY FILTERING SKIPPED: No calculable distances`);
      }
    } else {
      console.log(`\n⚠️  PROXIMITY FILTERING SKIPPED: No search location provided`);
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
