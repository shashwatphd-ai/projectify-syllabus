/**
 * Signal 1: Job-Skills Semantic Matching
 * 
 * Uses Gemini embeddings to calculate semantic similarity between
 * a company's job postings and the syllabus skills.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only calculates job-skills match
 * - Open/Closed: Implements SignalProvider interface
 * - Dependency Inversion: Depends on embedding-service abstraction
 * 
 * @module job-skills-signal
 */

import { 
  SignalResult, 
  SignalProvider, 
  SignalContext, 
  SignalName,
  JobPosting 
} from '../signal-types.ts';

import { 
  computeBatchEmbeddings, 
  isEmbeddingServiceAvailable,
  cosineSimilarity 
} from '../embedding-service.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Minimum similarity threshold for a valid match - lowered for cross-domain matching */
const MATCH_THRESHOLD = 0.45;

/** Weight for title match vs description match */
const TITLE_WEIGHT = 0.7;
const DESCRIPTION_WEIGHT = 0.3;

/** Maximum items to process (for API efficiency) */
const MAX_JOBS_TO_PROCESS = 15;
const MAX_SKILLS_TO_PROCESS = 20;

// ============================================================================
// JOB SKILLS SIGNAL PROVIDER
// ============================================================================

/**
 * Job-Skills Signal Provider
 * 
 * Calculates semantic similarity between job postings and syllabus skills
 * using Gemini text-embedding-004 model.
 */
export const JobSkillsSignal: SignalProvider = {
  name: 'job_skills_match' as SignalName,
  weight: 0.35, // 35% of composite score
  
  async calculate(context: SignalContext): Promise<SignalResult> {
    const { company, syllabusSkills, jobPostings } = context;
    
    console.log(`  📊 [Signal 1] Calculating job-skills match for ${company.name}`);
    
    // Default result for edge cases
    const defaultResult: SignalResult = {
      score: 0,
      confidence: 0,
      signals: [],
      rawData: null
    };
    
    // Get job postings from context or company
    const jobs = getJobPostings(jobPostings, company);
    
    if (jobs.length === 0) {
      console.log(`     ⚠️ No job postings available`);
      return {
        ...defaultResult,
        signals: ['No job postings found for this company'],
        error: 'No job postings available'
      };
    }
    
    if (syllabusSkills.length === 0) {
      console.log(`     ⚠️ No syllabus skills provided`);
      return {
        ...defaultResult,
        signals: ['No syllabus skills to match against'],
        error: 'No syllabus skills provided'
      };
    }
    
    // Check if embedding service is available
    if (!isEmbeddingServiceAvailable()) {
      console.log(`     ⚠️ Embedding service unavailable, using keyword fallback`);
      return calculateKeywordFallback(jobs, syllabusSkills);
    }
    
    try {
      return await calculateSemanticMatch(jobs, syllabusSkills);
    } catch (error) {
      console.error(`     ❌ Semantic matching failed:`, error);
      // Fallback to keyword matching
      return calculateKeywordFallback(jobs, syllabusSkills);
    }
  }
};

// ============================================================================
// SEMANTIC MATCHING (Primary Method)
// ============================================================================

/**
 * Calculate semantic similarity using Gemini embeddings
 */
async function calculateSemanticMatch(
  jobs: JobPosting[],
  skills: string[]
): Promise<SignalResult> {
  const startTime = Date.now();
  
  // Limit processing for efficiency
  const limitedJobs = jobs.slice(0, MAX_JOBS_TO_PROCESS);
  const limitedSkills = skills.slice(0, MAX_SKILLS_TO_PROCESS);
  
  // Prepare texts for embedding
  const jobTexts = limitedJobs.map(j => 
    `${j.title}${j.description ? '. ' + j.description.substring(0, 200) : ''}`
  );
  const skillTexts = limitedSkills.map(s => `Professional skill: ${s}`);
  
  // Get all embeddings in one batch call
  const allTexts = [...jobTexts, ...skillTexts];
  const allEmbeddings = await computeBatchEmbeddings(allTexts);
  
  if (allEmbeddings.length !== allTexts.length) {
    throw new Error('Embedding count mismatch');
  }
  
  // Split embeddings
  const jobEmbeddings = allEmbeddings.slice(0, jobTexts.length);
  const skillEmbeddings = allEmbeddings.slice(jobTexts.length);
  
  // Calculate similarity matrix
  const matches: Array<{
    job: string;
    skill: string;
    similarity: number;
  }> = [];
  
  const matchedJobs = new Set<string>();
  const matchedSkills = new Set<string>();
  
  for (let i = 0; i < jobEmbeddings.length; i++) {
    for (let j = 0; j < skillEmbeddings.length; j++) {
      const similarity = cosineSimilarity(jobEmbeddings[i], skillEmbeddings[j]);
      
      if (similarity >= MATCH_THRESHOLD) {
        matches.push({
          job: limitedJobs[i].title,
          skill: limitedSkills[j],
          similarity
        });
        matchedJobs.add(limitedJobs[i].title);
        matchedSkills.add(limitedSkills[j]);
      }
    }
  }
  
  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);
  
  // Calculate scores
  const avgSimilarity = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length
    : 0;
  
  const jobCoverage = matchedJobs.size / limitedJobs.length;
  const skillCoverage = matchedSkills.size / limitedSkills.length;
  
  // Final score: weighted combination
  // - 50% average similarity of matches
  // - 30% skill coverage (how many skills have relevant jobs)
  // - 20% job coverage (how many jobs are relevant)
  const score = Math.round(
    (avgSimilarity * 50) + 
    (skillCoverage * 30) + 
    (jobCoverage * 20)
  );
  
  // Confidence based on data availability
  const confidence = calculateConfidence(limitedJobs.length, limitedSkills.length, matches.length);
  
  // Generate human-readable signals
  const signals = generateSignalDescriptions(matches, matchedSkills.size, limitedSkills.length);
  
  const processingTime = Date.now() - startTime;
  console.log(`     ✅ Score: ${score}/100, ${matches.length} matches in ${processingTime}ms`);
  
  return {
    score,
    confidence,
    signals,
    rawData: {
      method: 'semantic_embedding',
      matches: matches.slice(0, 10), // Top 10 for storage
      jobCount: limitedJobs.length,
      skillCount: limitedSkills.length,
      matchCount: matches.length,
      avgSimilarity,
      skillCoverage,
      jobCoverage,
      processingTimeMs: processingTime
    }
  };
}

// ============================================================================
// KEYWORD FALLBACK (When embeddings unavailable)
// ============================================================================

/**
 * Fallback to keyword-based matching when embeddings fail
 */
function calculateKeywordFallback(
  jobs: JobPosting[],
  skills: string[]
): SignalResult {
  console.log(`     🔄 Using keyword fallback matching`);
  console.log(`     📋 Jobs: ${jobs.length}, Skills: ${skills.length}`);
  
  const limitedJobs = jobs.slice(0, MAX_JOBS_TO_PROCESS);
  const limitedSkills = skills.slice(0, MAX_SKILLS_TO_PROCESS);
  
  // Tokenize skills into keywords
  const skillKeywords = new Map<string, Set<string>>();
  for (const skill of limitedSkills) {
    const tokens = tokenize(skill);
    skillKeywords.set(skill, tokens);
  }
  
  // Match jobs to skills by keyword overlap
  const matches: Array<{ job: string; skill: string; overlap: number }> = [];
  const matchedSkills = new Set<string>();
  
  for (const job of limitedJobs) {
    const jobText = `${job.title} ${job.description || ''}`;
    const jobTokens = tokenize(jobText);
    
    for (const [skill, skillTokens] of skillKeywords) {
      const overlap = calculateOverlap(jobTokens, skillTokens);
      
      // Lowered threshold for better matching
      if (overlap >= 0.15) { // 15% keyword overlap threshold (was 30%)
        matches.push({ job: job.title, skill, overlap });
        matchedSkills.add(skill);
        console.log(`     ✓ Match: "${job.title}" ↔ "${skill}" (${Math.round(overlap * 100)}%)`);
      }
    }
  }
  
  // Sort by overlap
  matches.sort((a, b) => b.overlap - a.overlap);
  
  console.log(`     📊 Keyword matches found: ${matches.length}`);
  
  // Calculate score (lower confidence for keyword matching)
  const avgOverlap = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.overlap, 0) / matches.length
    : 0;
  
  const skillCoverage = matchedSkills.size / limitedSkills.length;
  
  // Improved scoring: give credit for any matches found
  const baseScore = Math.round((avgOverlap * 40) + (skillCoverage * 40));
  // Bonus for having matches at all
  const matchBonus = matches.length > 0 ? Math.min(20, matches.length * 5) : 0;
  const score = Math.min(baseScore + matchBonus, 70); // Cap at 70 for keyword matching
  
  console.log(`     ✅ Keyword fallback score: ${score}/100`);
  
  return {
    score,
    confidence: 0.5, // Lower confidence for keyword method
    signals: [
      `Keyword matching: ${matches.length} potential matches`,
      `Skills with job relevance: ${matchedSkills.size}/${limitedSkills.length}`,
      '(Using keyword fallback - embeddings unavailable)'
    ],
    rawData: {
      method: 'keyword_fallback',
      matchCount: matches.length,
      skillCoverage,
      topMatches: matches.slice(0, 5)
    }
  };
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
          description: (j as Record<string, unknown>).description as string
        }));
      }
    } catch {
      console.warn(`     ⚠️ Could not parse company job_postings`);
    }
  }
  
  return [];
}

/**
 * Calculate confidence level based on data availability
 */
function calculateConfidence(
  jobCount: number, 
  skillCount: number, 
  matchCount: number
): number {
  // More data = higher confidence
  const dataScore = Math.min(1, (jobCount + skillCount) / 20);
  
  // Some matches = higher confidence (not too few, not suspiciously many)
  const matchRatio = matchCount / (jobCount * skillCount);
  const matchScore = matchRatio > 0.01 && matchRatio < 0.5 ? 1 : 0.7;
  
  return Math.round((dataScore * 0.6 + matchScore * 0.4) * 100) / 100;
}

/**
 * Generate human-readable signal descriptions
 */
function generateSignalDescriptions(
  matches: Array<{ job: string; skill: string; similarity: number }>,
  matchedSkillCount: number,
  totalSkillCount: number
): string[] {
  const signals: string[] = [];
  
  if (matches.length === 0) {
    signals.push('No strong job-skill matches found');
    return signals;
  }
  
  // Top match
  const topMatch = matches[0];
  signals.push(
    `Best match: "${topMatch.job}" ↔ "${topMatch.skill}" (${Math.round(topMatch.similarity * 100)}%)`
  );
  
  // Coverage summary
  const coverage = Math.round((matchedSkillCount / totalSkillCount) * 100);
  signals.push(`${coverage}% of syllabus skills have matching job opportunities`);
  
  // Match count
  if (matches.length > 5) {
    signals.push(`${matches.length} job-skill connections identified`);
  }
  
  return signals;
}

/**
 * Tokenize text into lowercase keywords
 */
function tokenize(text: string): Set<string> {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'our', 'your'
  ]);
  
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopWords.has(t));
  
  return new Set(tokens);
}

/**
 * Calculate Jaccard-like overlap between two token sets
 */
function calculateOverlap(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 || set2.size === 0) return 0;
  
  let intersection = 0;
  for (const token of set1) {
    if (set2.has(token)) intersection++;
  }
  
  // Use smaller set as denominator for better matching
  const minSize = Math.min(set1.size, set2.size);
  return intersection / minSize;
}

export default JobSkillsSignal;
