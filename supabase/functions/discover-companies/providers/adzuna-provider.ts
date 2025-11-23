/**
 * ADZUNA PROVIDER
 *
 * Job-based company discovery using Adzuna API
 *
 * Strategy:
 * 1. Search jobs by occupation + location
 * 2. Extract companies from job postings
 * 3. Aggregate jobs by company
 * 4. Infer sector/size from job data
 *
 * Advantages over Apollo keyword search:
 * - Companies have ACTUAL job postings (not just keyword matches)
 * - FREE tier: 250 calls/month
 * - More precise: Companies hiring for roles, not just "about" industry
 */

import type {
  DiscoveryProvider,
  CourseContext,
  DiscoveryResult,
  DiscoveredCompany
} from './types.ts';

/**
 * Adzuna API Response Types
 */
interface AdzunaJob {
  id: string;
  title: string;
  company: {
    display_name: string;
  };
  location: {
    display_name: string;
    area: string[];
  };
  description: string;
  salary_min?: number;
  salary_max?: number;
  category: {
    label: string;
    tag: string;
  };
  created: string;
  redirect_url: string;
}

interface AdzunaSearchResponse {
  results: AdzunaJob[];
  count: number;
  mean?: number;
}

/**
 * SOC Code to Adzuna Category Mapping
 *
 * Adzuna categories: https://api.adzuna.com/v1/api/jobs/us/categories
 */
const SOC_TO_ADZUNA_CATEGORY: Record<string, string> = {
  // Engineering (17-XXXX)
  '17-2141': 'engineering-jobs',     // Mechanical Engineers
  '17-2011': 'engineering-jobs',     // Aerospace Engineers
  '17-2051': 'engineering-jobs',     // Civil Engineers
  '17-2071': 'engineering-jobs',     // Electrical Engineers
  '17-2112': 'engineering-jobs',     // Industrial Engineers
  '17-2199': 'engineering-jobs',     // Engineers, All Other

  // Computer and Mathematical (15-XXXX)
  '15-1252': 'it-jobs',              // Software Developers
  '15-1253': 'it-jobs',              // Software Quality Assurance
  '15-1244': 'it-jobs',              // Network and Computer Systems Administrators
  '15-1299': 'it-jobs',              // Computer Occupations, All Other
  '15-2051': 'scientific-qa-jobs',   // Data Scientists
  '15-2021': 'scientific-qa-jobs',   // Mathematicians

  // Architecture and Design (17-10XX)
  '17-1011': 'engineering-jobs',     // Architects
  '17-1012': 'engineering-jobs',     // Landscape Architects
  '17-3011': 'engineering-jobs',     // Architectural and Civil Drafters

  // Life, Physical, and Social Science (19-XXXX)
  '19-1029': 'scientific-qa-jobs',   // Biological Scientists
  '19-2031': 'scientific-qa-jobs',   // Chemists
  '19-2042': 'scientific-qa-jobs',   // Geoscientists
  '19-3051': 'scientific-qa-jobs',   // Urban and Regional Planners

  // Management (11-XXXX)
  '11-2021': 'marketing-pr-jobs',    // Marketing Managers
  '11-2022': 'sales-jobs',           // Sales Managers
  '11-3021': 'admin-jobs',           // Computer and Information Systems Managers
  '11-9041': 'engineering-jobs',     // Architectural and Engineering Managers

  // Business and Financial Operations (13-XXXX)
  '13-2011': 'accounting-finance-jobs', // Accountants and Auditors
  '13-2051': 'accounting-finance-jobs', // Financial Analysts
  '13-1161': 'consultancy-jobs',     // Market Research Analysts

  // Healthcare (29-XXXX)
  '29-1141': 'healthcare-nursing-jobs', // Registered Nurses
  '29-1071': 'healthcare-nursing-jobs', // Physician Assistants

  // Education (25-XXXX)
  '25-1071': 'teaching-jobs',        // Health Specialties Teachers, Postsecondary
  '25-1194': 'teaching-jobs',        // Vocational Education Teachers

  // Arts, Design, Entertainment (27-XXXX)
  '27-1024': 'creative-arts-design-jobs', // Graphic Designers
  '27-3031': 'pr-advertising-marketing-jobs', // Public Relations Specialists
};

/**
 * Extract SOC major group from full SOC code
 * E.g., "17-2141.00" -> "17"
 */
function getSocMajorGroup(socCode: string): string {
  return socCode.split('-')[0];
}

/**
 * Map SOC code to Adzuna category with fallback
 */
function mapSocToAdzunaCategory(socCode: string): string {
  // Try exact match (without .XX suffix)
  const cleanCode = socCode.replace(/\..*$/, '');
  if (SOC_TO_ADZUNA_CATEGORY[cleanCode]) {
    return SOC_TO_ADZUNA_CATEGORY[cleanCode];
  }

  // Fallback: Map by major group
  const majorGroup = getSocMajorGroup(socCode);
  const fallbackMap: Record<string, string> = {
    '11': 'admin-jobs',              // Management
    '13': 'accounting-finance-jobs', // Business and Financial
    '15': 'it-jobs',                 // Computer and Mathematical
    '17': 'engineering-jobs',        // Architecture and Engineering
    '19': 'scientific-qa-jobs',      // Life, Physical, and Social Science
    '25': 'teaching-jobs',           // Education
    '27': 'creative-arts-design-jobs', // Arts, Design, Entertainment
    '29': 'healthcare-nursing-jobs', // Healthcare
  };

  return fallbackMap[majorGroup] || 'other-general-jobs';
}

/**
 * Normalize company name for deduplication
 *
 * Handles variations like:
 * - "Boeing" vs "The Boeing Company" vs "Boeing Co."
 * - "Google LLC" vs "Google Inc." vs "Google"
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corporation|company|co|corp|the)\b\.?/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Infer industry sector from job categories
 */
function inferSectorFromJobs(jobs: AdzunaJob[]): string {
  if (jobs.length === 0) return 'Unknown';

  // Count category frequencies
  const categoryCounts = new Map<string, number>();
  for (const job of jobs) {
    const category = job.category?.label || 'Unknown';
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  }

  // Find most common category
  let maxCount = 0;
  let mostCommonCategory = 'Unknown';

  for (const [category, count] of categoryCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonCategory = category;
    }
  }

  // Map Adzuna categories to broader sectors
  const categoryToSector: Record<string, string> = {
    'Engineering Jobs': 'Engineering',
    'IT Jobs': 'Technology',
    'Scientific & QA Jobs': 'Research & Development',
    'Accounting & Finance Jobs': 'Financial Services',
    'Healthcare & Nursing Jobs': 'Healthcare',
    'Teaching Jobs': 'Education',
    'Manufacturing Jobs': 'Manufacturing',
    'Construction Jobs': 'Construction',
    'Marketing & PR Jobs': 'Marketing & Advertising',
    'Sales Jobs': 'Sales',
    'Admin Jobs': 'Business Services',
  };

  return categoryToSector[mostCommonCategory] || mostCommonCategory;
}

/**
 * Estimate company size from job posting volume
 */
function estimateSizeFromJobCount(jobCount: number): string {
  if (jobCount >= 20) return '1000+';
  if (jobCount >= 10) return '500-1000';
  if (jobCount >= 5) return '100-500';
  if (jobCount >= 2) return '50-100';
  return '1-50';
}

/**
 * Parse location string to extract city and state
 * E.g., "Kansas City, MO" -> { city: "Kansas City", state: "MO" }
 */
function parseLocation(locationStr: string): { city: string; state?: string; country?: string } {
  const parts = locationStr.split(',').map(p => p.trim());

  if (parts.length >= 2) {
    return {
      city: parts[0],
      state: parts[1],
      country: parts[2] || 'United States'
    };
  }

  return {
    city: locationStr,
    country: 'United States'
  };
}

/**
 * Adzuna Discovery Provider
 */
export class AdzunaProvider implements DiscoveryProvider {
  readonly name = 'adzuna';
  readonly version = '1.0.0';

  private appId: string;
  private appKey: string;
  private baseUrl = 'https://api.adzuna.com/v1/api/jobs';
  private country = 'us'; // TODO: Make configurable based on location

  constructor() {
    this.appId = Deno.env.get('ADZUNA_APP_ID') || '';
    this.appKey = Deno.env.get('ADZUNA_APP_KEY') || '';
  }

  isConfigured(): boolean {
    return this.appId !== '' && this.appKey !== '';
  }

  getRequiredSecrets(): string[] {
    return ['ADZUNA_APP_ID', 'ADZUNA_APP_KEY'];
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Simple test query
      const url = `${this.baseUrl}/${this.country}/search/1?app_id=${this.appId}&app_key=${this.appKey}&results_per_page=1&what=engineer`;
      const response = await fetch(url);
      return response.ok;
    } catch (error) {
      console.error('❌ Adzuna health check failed:', error);
      return false;
    }
  }

  /**
   * Main discovery method
   */
  async discover(context: CourseContext): Promise<DiscoveryResult> {
    const startTime = Date.now();
    console.log('🔍 [Adzuna] Starting job-based company discovery...');

    if (!this.isConfigured()) {
      throw new Error('Adzuna provider not configured. Missing: ' + this.getRequiredSecrets().join(', '));
    }

    // Step 1: Determine search parameters from context
    const { searchQuery, category, location } = this.buildSearchParams(context);

    console.log(`   Search query: "${searchQuery}"`);
    console.log(`   Category: ${category}`);
    console.log(`   Location: ${location}`);

    // Step 2: Search jobs
    const jobs = await this.searchJobs({
      what: searchQuery,
      where: location,
      category: category,
      resultsPerPage: 50,
      maxPages: 2 // Up to 100 jobs total
    });

    console.log(`   Found ${jobs.length} job postings`);

    // Step 3: Aggregate jobs by company
    const companies = this.aggregateJobsByCompany(jobs, context);

    console.log(`   Extracted ${companies.length} unique companies`);

    // Step 4: Format as DiscoveredCompany
    const discoveredCompanies = companies.map(c => this.formatCompany(c, context));

    const processingTime = (Date.now() - startTime) / 1000;

    return {
      companies: discoveredCompanies,
      stats: {
        discovered: discoveredCompanies.length,
        enriched: 0, // No enrichment yet (Apollo will do this later)
        processingTimeSeconds: processingTime,
        apiCreditsUsed: Math.ceil(jobs.length / 50), // Adzuna credits = pages fetched
        providerUsed: 'adzuna'
      }
    };
  }

  /**
   * Build search parameters from course context
   */
  private buildSearchParams(context: CourseContext): {
    searchQuery: string;
    category: string;
    location: string;
  } {
    // Use O*NET occupations if available
    let searchQuery = '';
    let category = 'other-general-jobs';

    if (context.onetOccupations && context.onetOccupations.length > 0) {
      // Use top 3 occupation titles
      const topOccupations = context.onetOccupations
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 3);

      searchQuery = topOccupations
        .map(occ => occ.title)
        .join(' OR ');

      // Get category from first occupation's SOC code
      const firstSocCode = topOccupations[0].code;
      category = mapSocToAdzunaCategory(firstSocCode);

      console.log(`   Using O*NET occupations: ${topOccupations.map(o => o.title).join(', ')}`);
      console.log(`   Mapped SOC ${firstSocCode} → Adzuna category: ${category}`);
    } else if (context.extractedSkills && context.extractedSkills.length > 0) {
      // Fallback: Use top skills as search query
      const topSkills = context.extractedSkills
        .filter(s => s.category === 'technical' || s.category === 'domain')
        .slice(0, 5);

      searchQuery = topSkills.map(s => s.skill).join(' ');
      console.log(`   Using skills: ${searchQuery}`);
    } else {
      // Last resort: Use course topics
      searchQuery = context.topics.join(' ');
      console.log(`   Using topics: ${searchQuery}`);
    }

    // Parse location
    const location = this.parseSearchLocation(context.searchLocation);

    return { searchQuery, category, location };
  }

  /**
   * Parse search location to Adzuna format
   * Input: "Kansas City, Missouri, United States"
   * Output: "Kansas City, MO"
   */
  private parseSearchLocation(searchLocation: string): string {
    // For now, just use as-is
    // TODO: Add state abbreviation mapping
    return searchLocation;
  }

  /**
   * Search Adzuna jobs API
   */
  private async searchJobs(params: {
    what: string;
    where: string;
    category?: string;
    resultsPerPage?: number;
    maxPages?: number;
  }): Promise<AdzunaJob[]> {
    const allJobs: AdzunaJob[] = [];
    const resultsPerPage = params.resultsPerPage || 50;
    const maxPages = params.maxPages || 1;

    for (let page = 1; page <= maxPages; page++) {
      const url = new URL(`${this.baseUrl}/${this.country}/search/${page}`);
      url.searchParams.set('app_id', this.appId);
      url.searchParams.set('app_key', this.appKey);
      url.searchParams.set('results_per_page', resultsPerPage.toString());
      url.searchParams.set('what', params.what);
      url.searchParams.set('where', params.where);

      if (params.category && params.category !== 'other-general-jobs') {
        url.searchParams.set('category', params.category);
      }

      console.log(`   Fetching page ${page}...`);

      try {
        const response = await fetch(url.toString());

        if (!response.ok) {
          if (response.status === 404 && page > 1) {
            // No more results
            break;
          }
          throw new Error(`Adzuna API error: ${response.status} ${response.statusText}`);
        }

        const data: AdzunaSearchResponse = await response.json();

        if (data.results.length === 0) {
          console.log(`   No more results on page ${page}`);
          break;
        }

        allJobs.push(...data.results);

        console.log(`   Got ${data.results.length} jobs (total: ${allJobs.length})`);

        // If we got fewer results than requested, no need to fetch more pages
        if (data.results.length < resultsPerPage) {
          break;
        }
      } catch (error) {
        console.error(`   ❌ Error fetching page ${page}:`, error);
        // Continue with what we have
        break;
      }
    }

    return allJobs;
  }

  /**
   * Aggregate jobs by company name
   */
  private aggregateJobsByCompany(
    jobs: AdzunaJob[],
    context: CourseContext
  ): Array<{
    name: string;
    normalizedName: string;
    jobs: AdzunaJob[];
  }> {
    const companyMap = new Map<string, {
      name: string;
      normalizedName: string;
      jobs: AdzunaJob[];
    }>();

    for (const job of jobs) {
      const companyName = job.company?.display_name;

      if (!companyName || companyName === '' || companyName === 'Unknown') {
        continue; // Skip jobs without company info
      }

      const normalized = normalizeCompanyName(companyName);

      if (!companyMap.has(normalized)) {
        companyMap.set(normalized, {
          name: companyName, // Use first occurrence as display name
          normalizedName: normalized,
          jobs: []
        });
      }

      companyMap.get(normalized)!.jobs.push(job);
    }

    // Convert to array and sort by job count (descending)
    return Array.from(companyMap.values())
      .sort((a, b) => b.jobs.length - a.jobs.length);
  }

  /**
   * Format company data for discovery result
   */
  private formatCompany(
    companyData: {
      name: string;
      normalizedName: string;
      jobs: AdzunaJob[];
    },
    context: CourseContext
  ): DiscoveredCompany {
    const { name, jobs } = companyData;

    // Get first job for location info
    const firstJob = jobs[0];
    const location = parseLocation(firstJob.location.display_name);

    // Infer sector from job categories
    const sector = inferSectorFromJobs(jobs);

    // Estimate size from job count
    const size = estimateSizeFromJobCount(jobs.length);

    // Extract job postings
    const jobPostings = jobs.map(job => ({
      id: job.id,
      title: job.title,
      url: job.redirect_url,
      city: location.city,
      state: location.state,
      posted_at: job.created,
      last_seen_at: job.created,
      skills_needed: this.extractSkillsFromJobDescription(job.description)
    }));

    // Calculate data completeness
    const dataCompletenessScore = this.calculateCompletenessScore({
      hasName: true,
      hasLocation: true,
      hasSector: sector !== 'Unknown',
      hasJobs: jobs.length > 0,
      hasWebsite: false, // Adzuna doesn't provide this
      hasContacts: false // Will be enriched by Apollo
    });

    return {
      // Basic info
      name,
      website: '', // Will be enriched by Apollo
      sector,
      size,

      // Location
      address: firstJob.location.display_name,
      city: location.city || '',
      state: location.state,
      zip: '', // Adzuna doesn't provide ZIP
      country: location.country,

      // Market intelligence (from Adzuna jobs)
      jobPostings,
      technologiesUsed: this.extractTechnologiesFromJobs(jobs),

      // Metadata
      discoverySource: 'adzuna',
      enrichmentLevel: 'basic',
      dataCompletenessScore,
      lastEnrichedAt: new Date().toISOString()
    };
  }

  /**
   * Extract skills from job description using simple keyword matching
   */
  private extractSkillsFromJobDescription(description: string): string[] {
    const skills: string[] = [];

    // Common technical skills to look for
    const skillKeywords = [
      'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'SQL',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
      'React', 'Angular', 'Vue', 'Node.js',
      'Machine Learning', 'AI', 'Data Science',
      'AutoCAD', 'SolidWorks', 'MATLAB', 'CAD',
      'Agile', 'Scrum', 'CI/CD'
    ];

    const lowerDesc = description.toLowerCase();

    for (const skill of skillKeywords) {
      if (lowerDesc.includes(skill.toLowerCase())) {
        skills.push(skill);
      }
    }

    return [...new Set(skills)]; // Deduplicate
  }

  /**
   * Extract technologies from all job descriptions
   */
  private extractTechnologiesFromJobs(jobs: AdzunaJob[]): string[] {
    const allTechnologies = new Set<string>();

    for (const job of jobs) {
      const skills = this.extractSkillsFromJobDescription(job.description);
      skills.forEach(skill => allTechnologies.add(skill));
    }

    return Array.from(allTechnologies);
  }

  /**
   * Calculate data completeness score (0.0 to 1.0)
   */
  private calculateCompletenessScore(checks: {
    hasName: boolean;
    hasLocation: boolean;
    hasSector: boolean;
    hasJobs: boolean;
    hasWebsite: boolean;
    hasContacts: boolean;
  }): number {
    const weights = {
      hasName: 0.2,
      hasLocation: 0.2,
      hasSector: 0.15,
      hasJobs: 0.25,
      hasWebsite: 0.1,
      hasContacts: 0.1
    };

    let score = 0;

    for (const [key, hasData] of Object.entries(checks)) {
      if (hasData) {
        score += weights[key as keyof typeof weights];
      }
    }

    return score;
  }
}
