/**
 * Signal 5: Active Hiring Signal
 * 
 * Scores companies based on their active job postings:
 * - Has active jobs (0-30 points)
 * - Job count bonus (0-10 points)
 * - Job title relevance to course (0-20 points)
 * - Recent postings bonus (0-10 points)
 * 
 * Total: 0-70 points (normalized to 0-100 for composite scoring)
 * 
 * SOLID Principles:
 * - Single Responsibility: Only calculates hiring-based signals
 * - Open/Closed: Implements SignalProvider interface
 * 
 * @module hiring-signal
 */

import { 
  SignalResult, 
  SignalProvider, 
  SignalContext, 
  JobPosting 
} from '../signal-types.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Maximum points per category */
const POINTS_HAS_ACTIVE_JOBS = 30;        // Base points for having any jobs
const POINTS_JOB_COUNT_BONUS = 10;        // Bonus for multiple jobs (scaled)
const POINTS_TITLE_RELEVANCE = 20;        // Relevance of job titles to course
const POINTS_RECENT_POSTINGS = 10;        // Bonus for recently posted jobs

/** How many days to consider a job "recent" */
const RECENT_JOB_DAYS = 30;

/** Maximum jobs to analyze for efficiency */
const MAX_JOBS_TO_ANALYZE = 25;

// ============================================================================
// HIRING SIGNAL PROVIDER
// ============================================================================

/**
 * Hiring Signal Provider
 * 
 * Calculates a score based on a company's active job postings,
 * prioritizing companies that are actively hiring for relevant roles.
 */
export const HiringSignal: SignalProvider = {
  name: 'active_hiring' as any, // Extended signal type
  weight: 0.15, // 15% boost to companies with active hiring
  
  async calculate(context: SignalContext): Promise<SignalResult> {
    const { company, syllabusSkills, syllabusDomain, jobPostings } = context;
    
    console.log(`  📊 [Hiring Signal] Calculating for ${company.name}`);
    
    // Get job postings from context or company
    const jobs = getJobPostings(jobPostings, company);
    
    if (jobs.length === 0) {
      console.log(`     ⚠️ No active job postings`);
      return {
        score: 0,
        confidence: 0.5,
        signals: ['No active job postings found'],
        rawData: {
          hasActiveJobs: false,
          jobCount: 0,
          relevantJobCount: 0,
          recentJobCount: 0,
          sampleRelevantJobs: [],
          hiringScore: 0
        }
      };
    }
    
    // Limit jobs for efficiency
    const limitedJobs = jobs.slice(0, MAX_JOBS_TO_ANALYZE);
    
    // Calculate each component
    const hasActiveJobsPoints = POINTS_HAS_ACTIVE_JOBS; // Full points for having any jobs
    
    const jobCountPoints = calculateJobCountBonus(limitedJobs.length);
    
    const { relevancePoints, relevantJobs, sampleRelevantJobs } = calculateTitleRelevance(
      limitedJobs, 
      syllabusSkills, 
      syllabusDomain
    );
    
    const { recentPoints, recentJobCount } = calculateRecentPostingsBonus(limitedJobs);
    
    // Total raw score (0-70)
    const rawScore = hasActiveJobsPoints + jobCountPoints + relevancePoints + recentPoints;
    
    // Normalize to 0-100
    const normalizedScore = Math.round((rawScore / 70) * 100);
    
    // Calculate confidence based on data quality
    const confidence = calculateConfidence(limitedJobs.length, relevantJobs, recentJobCount);
    
    // Generate human-readable signals
    const signals = generateSignalDescriptions(
      limitedJobs.length,
      relevantJobs,
      recentJobCount,
      sampleRelevantJobs
    );
    
    console.log(`     ✅ Hiring Score: ${normalizedScore}/100 (${limitedJobs.length} jobs, ${relevantJobs} relevant, ${recentJobCount} recent)`);
    
    return {
      score: normalizedScore,
      confidence,
      signals,
      rawData: {
        hasActiveJobs: true,
        jobCount: limitedJobs.length,
        relevantJobCount: relevantJobs,
        recentJobCount,
        sampleRelevantJobs,
        hiringScore: normalizedScore,
        breakdown: {
          hasActiveJobsPoints,
          jobCountPoints,
          relevancePoints,
          recentPoints,
          rawTotal: rawScore,
          normalized: normalizedScore
        }
      }
    };
  }
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate bonus points based on number of job postings (0-10)
 * Logarithmic scale to avoid over-weighting companies with many jobs
 */
function calculateJobCountBonus(jobCount: number): number {
  if (jobCount <= 0) return 0;
  if (jobCount === 1) return 2;
  if (jobCount <= 3) return 4;
  if (jobCount <= 5) return 6;
  if (jobCount <= 10) return 8;
  return POINTS_JOB_COUNT_BONUS; // 10 points for 10+ jobs
}

/**
 * Calculate relevance of job titles to course skills/domain (0-20)
 */
function calculateTitleRelevance(
  jobs: JobPosting[],
  syllabusSkills: string[],
  syllabusDomain: string
): { relevancePoints: number; relevantJobs: number; sampleRelevantJobs: string[] } {
  if (jobs.length === 0 || syllabusSkills.length === 0) {
    return { relevancePoints: 0, relevantJobs: 0, sampleRelevantJobs: [] };
  }
  
  // Normalize skills for matching
  const normalizedSkills = syllabusSkills.map(s => s.toLowerCase().trim());
  const domainKeywords = getDomainKeywords(syllabusDomain);
  
  let relevantJobs = 0;
  const sampleRelevantJobs: string[] = [];
  
  for (const job of jobs) {
    const titleLower = (job.title || '').toLowerCase();
    const descLower = (job.description || '').toLowerCase();
    const combinedText = `${titleLower} ${descLower}`;
    
    // Check for skill matches
    const hasSkillMatch = normalizedSkills.some(skill => 
      combinedText.includes(skill) || 
      skill.split(' ').some(word => word.length > 3 && combinedText.includes(word))
    );
    
    // Check for domain keyword matches
    const hasDomainMatch = domainKeywords.some(keyword => combinedText.includes(keyword));
    
    if (hasSkillMatch || hasDomainMatch) {
      relevantJobs++;
      if (sampleRelevantJobs.length < 5) {
        sampleRelevantJobs.push(job.title);
      }
    }
  }
  
  // Calculate points: percentage of relevant jobs (0-20 points)
  const relevanceRatio = relevantJobs / jobs.length;
  const relevancePoints = Math.round(relevanceRatio * POINTS_TITLE_RELEVANCE);
  
  return { relevancePoints, relevantJobs, sampleRelevantJobs };
}

/**
 * Get domain-specific keywords for matching
 */
function getDomainKeywords(domain: string): string[] {
  const domainLower = (domain || '').toLowerCase();
  
  const domainKeywordMap: Record<string, string[]> = {
    'finance': ['financial', 'analyst', 'investment', 'portfolio', 'accounting', 'banking', 'risk', 'trading', 'cfa', 'cpa'],
    'engineering': ['engineer', 'developer', 'software', 'technical', 'architect', 'devops', 'data', 'cloud', 'backend', 'frontend'],
    'marketing': ['marketing', 'digital', 'brand', 'content', 'social', 'seo', 'growth', 'campaign', 'advertising'],
    'operations': ['operations', 'supply chain', 'logistics', 'process', 'lean', 'project manager', 'procurement'],
    'healthcare': ['healthcare', 'medical', 'clinical', 'patient', 'nursing', 'pharma', 'biomedical'],
    'hr': ['human resources', 'recruiter', 'talent', 'hr manager', 'people operations', 'workforce'],
    'sales': ['sales', 'account executive', 'business development', 'customer success', 'client'],
    'design': ['designer', 'ux', 'ui', 'product design', 'creative', 'visual', 'graphic']
  };
  
  // Find matching domain
  for (const [key, keywords] of Object.entries(domainKeywordMap)) {
    if (domainLower.includes(key)) {
      return keywords;
    }
  }
  
  // Default keywords for general courses
  return ['analyst', 'associate', 'coordinator', 'specialist', 'manager'];
}

/**
 * Calculate bonus for recent job postings (0-10)
 */
function calculateRecentPostingsBonus(jobs: JobPosting[]): { recentPoints: number; recentJobCount: number } {
  const now = Date.now();
  const recentThreshold = now - (RECENT_JOB_DAYS * 24 * 60 * 60 * 1000);
  
  let recentJobCount = 0;
  
  for (const job of jobs) {
    if (job.posted_at) {
      try {
        const postedDate = new Date(job.posted_at).getTime();
        if (postedDate >= recentThreshold) {
          recentJobCount++;
        }
      } catch {
        // Skip jobs with invalid dates
      }
    }
  }
  
  // Calculate points based on recent job ratio
  if (recentJobCount === 0) return { recentPoints: 0, recentJobCount: 0 };
  
  const recentRatio = recentJobCount / jobs.length;
  const recentPoints = Math.round(recentRatio * POINTS_RECENT_POSTINGS);
  
  return { recentPoints, recentJobCount };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract job postings from context or company data
 */
function getJobPostings(
  contextJobs: JobPosting[] | undefined, 
  company: SignalContext['company']
): JobPosting[] {
  // Prefer context-provided jobs
  if (contextJobs && contextJobs.length > 0) {
    return contextJobs;
  }
  
  // Fall back to company's stored job postings
  if (company.job_postings) {
    try {
      const parsed = typeof company.job_postings === 'string' 
        ? JSON.parse(company.job_postings)
        : company.job_postings;
      
      if (Array.isArray(parsed)) {
        return parsed.map((j: unknown) => ({
          id: (j as Record<string, unknown>).id as string,
          title: (j as Record<string, unknown>).title as string || 'Unknown Role',
          url: (j as Record<string, unknown>).url as string,
          description: (j as Record<string, unknown>).description as string,
          posted_at: (j as Record<string, unknown>).posted_at as string
        }));
      }
    } catch {
      console.warn(`     ⚠️ Could not parse company job_postings`);
    }
  }
  
  return [];
}

/**
 * Calculate confidence based on data availability
 */
function calculateConfidence(
  jobCount: number,
  relevantJobs: number,
  recentJobCount: number
): number {
  // More jobs = higher confidence
  let dataScore = Math.min(1, jobCount / 10);
  
  // Having relevant jobs increases confidence
  if (relevantJobs > 0) dataScore += 0.2;
  
  // Having recent jobs increases confidence
  if (recentJobCount > 0) dataScore += 0.1;
  
  return Math.min(1, dataScore);
}

/**
 * Generate human-readable signal descriptions
 */
function generateSignalDescriptions(
  jobCount: number,
  relevantJobs: number,
  recentJobCount: number,
  sampleJobs: string[]
): string[] {
  const signals: string[] = [];
  
  signals.push(`${jobCount} active job posting${jobCount !== 1 ? 's' : ''}`);
  
  if (relevantJobs > 0) {
    signals.push(`${relevantJobs} job${relevantJobs !== 1 ? 's' : ''} relevant to course skills`);
    if (sampleJobs.length > 0) {
      signals.push(`Relevant roles: ${sampleJobs.slice(0, 3).join(', ')}`);
    }
  }
  
  if (recentJobCount > 0) {
    signals.push(`${recentJobCount} job${recentJobCount !== 1 ? 's' : ''} posted in last 30 days`);
  }
  
  return signals;
}

// ============================================================================
// STANDALONE HIRING SCORE CALCULATOR (for early pipeline use)
// ============================================================================

/**
 * Calculate hiring score for a company without full signal context
 * Used in early pipeline stages before full signal orchestration
 */
export function calculateHiringScore(
  jobPostings: any[],
  syllabusSkills: string[] = [],
  syllabusDomain: string = ''
): number {
  if (!jobPostings || jobPostings.length === 0) {
    return 0;
  }
  
  const jobs = jobPostings.slice(0, MAX_JOBS_TO_ANALYZE).map(j => ({
    id: j.id,
    title: j.title || 'Unknown',
    url: j.url,
    description: j.description || j.short_description,
    posted_at: j.posted_at
  }));
  
  // Calculate components
  const hasActiveJobsPoints = POINTS_HAS_ACTIVE_JOBS;
  const jobCountPoints = calculateJobCountBonus(jobs.length);
  const { relevancePoints } = calculateTitleRelevance(jobs, syllabusSkills, syllabusDomain);
  const { recentPoints } = calculateRecentPostingsBonus(jobs);
  
  // Total raw score (0-70)
  const rawScore = hasActiveJobsPoints + jobCountPoints + relevancePoints + recentPoints;
  
  // Normalize to 0-100
  return Math.round((rawScore / 70) * 100);
}

/**
 * Check if company has active job postings
 */
export function hasActiveJobs(jobPostings: any[]): boolean {
  return Array.isArray(jobPostings) && jobPostings.length > 0;
}

/**
 * Get hiring stats for a batch of companies
 */
export function getHiringStats(companies: Array<{ jobPostings?: any[] }>): {
  companiesWithJobs: number;
  companiesWithoutJobs: number;
  totalJobPostings: number;
  averageJobsPerCompany: number;
} {
  let companiesWithJobs = 0;
  let companiesWithoutJobs = 0;
  let totalJobPostings = 0;
  
  for (const company of companies) {
    const jobs = company.jobPostings || [];
    if (Array.isArray(jobs) && jobs.length > 0) {
      companiesWithJobs++;
      totalJobPostings += jobs.length;
    } else {
      companiesWithoutJobs++;
    }
  }
  
  return {
    companiesWithJobs,
    companiesWithoutJobs,
    totalJobPostings,
    averageJobsPerCompany: companiesWithJobs > 0 
      ? Math.round(totalJobPostings / companiesWithJobs * 10) / 10 
      : 0
  };
}

export default HiringSignal;
