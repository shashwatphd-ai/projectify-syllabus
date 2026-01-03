/**
 * Semantic Matching Service
 *
 * Uses Gemini text-embedding-004 to compute semantic similarity between
 * course content and company job postings/descriptions.
 *
 * Phase 3 of intelligent company matching system.
 *
 * Model: Google Gemini text-embedding-004 (768 dimensions)
 * Speed: ~50-100ms per batch (optimized batch processing)
 * Quality: Superior semantic understanding vs keyword matching
 */

import { ExtractedSkill } from './skill-extraction-service.ts';
import { StandardOccupation } from './occupation-provider-interface.ts';
import { 
  computeBatchSimilarities, 
  isEmbeddingServiceAvailable,
  getCircuitBreakerStatus 
} from './embedding-service.ts';
import { shouldExcludeIndustry, classifyCourseDomain } from './context-aware-industry-filter.ts';
import { SOCMapping } from './course-soc-mapping.ts';

// ========================================
// FEATURE FLAG: Toggle between keyword and embedding-based matching
// ========================================
// Default: true (embeddings enabled), set USE_SEMANTIC_EMBEDDINGS=false to disable
const USE_SEMANTIC_EMBEDDINGS = Deno.env.get('USE_SEMANTIC_EMBEDDINGS') !== 'false';
const EMBEDDING_FALLBACK_ENABLED = Deno.env.get('EMBEDDING_FALLBACK_ENABLED') !== 'false';

// Log current mode on module load
console.log(`\n🔧 [Semantic Matching] Configuration:`);
console.log(`   Mode: ${USE_SEMANTIC_EMBEDDINGS ? 'GEMINI EMBEDDINGS (High Quality)' : 'KEYWORDS (Fallback)'}`);
console.log(`   Fallback to keywords: ${EMBEDDING_FALLBACK_ENABLED ? 'ENABLED' : 'DISABLED'}`);
if (USE_SEMANTIC_EMBEDDINGS) {
  console.log(`   Provider: Google Gemini text-embedding-004 (768-dim)`);
}

export interface SemanticMatch {
  companyId?: string;
  companyName: string;
  similarityScore: number;         // 0.0 to 1.0
  confidence: 'high' | 'medium' | 'low';
  matchingSkills: string[];        // Skills that matched
  matchingDWAs: string[];          // DWAs that matched
  explanation: string;             // Why this is a good/bad match
  hiringBoost?: number;            // Boost applied for active hiring (0-0.15)
  hasActiveJobs?: boolean;         // Whether company has active job postings
}

export interface SemanticFilteringResult {
  matches: SemanticMatch[];        // Companies that passed threshold
  allMatches: SemanticMatch[];     // ALL companies with raw scores (for fallback)
  totalCompanies: number;
  filteredCount: number;           // How many were filtered out
  averageSimilarity: number;
  threshold: number;                // Threshold used
  processingTimeMs: number;
  embeddingProvider?: string;       // Which provider was used
  hiringStats?: {                   // Hiring statistics for companies
    companiesWithJobs: number;
    companiesWithoutJobs: number;
    totalJobPostings: number;
    averageJobsPerCompany: number;
  };
}

/**
 * Compute semantic similarity between course and company
 *
 * Dual-mode support:
 * - USE_SEMANTIC_EMBEDDINGS=true → Gemini embeddings (with fallback)
 * - USE_SEMANTIC_EMBEDDINGS=false → Keyword matching (always works)
 */
export async function computeCourseSimilarity(
  courseSkills: ExtractedSkill[],
  occupations: StandardOccupation[],
  companyJobPostings: any[],
  companyDescription: string,
  companyTechnologies: string[] = []
): Promise<number> {
  // Build course text from skills and occupation data
  const courseText = buildCourseText(courseSkills, occupations);

  // Build company text from job postings and description
  const companyText = buildCompanyText(companyJobPostings, companyDescription, companyTechnologies);

  // Choose similarity computation method based on feature flag and availability
  if (USE_SEMANTIC_EMBEDDINGS && isEmbeddingServiceAvailable()) {
    return await computeSimilarityWithFallback(courseText, companyText);
  } else {
    // Use keyword-based similarity
    return computeKeywordSimilarity(courseText, companyText);
  }
}

/**
 * Compute similarity using Gemini embeddings with automatic fallback to keywords
 * This ensures the system never breaks if embeddings fail
 */
async function computeSimilarityWithFallback(
  text1: string,
  text2: string
): Promise<number> {
  try {
    // Use batch API for efficiency (single course + single company)
    const [similarity] = await computeBatchSimilarities(text1, [text2]);
    return similarity;
  } catch (error) {
    if (EMBEDDING_FALLBACK_ENABLED) {
      console.warn(`⚠️  [Semantic Matching] Embeddings failed, falling back to keywords:`, error);
      return computeKeywordSimilarity(text1, text2);
    } else {
      throw error;
    }
  }
}

/**
 * Configuration for semantic ranking with hiring boost
 */
export interface RankingConfig {
  threshold?: number;               // Similarity threshold (default: 0.7)
  prioritizeHiring?: boolean;       // Whether to boost companies with active jobs (default: true)
  hiringBoostFactor?: number;       // Boost multiplier for active hiring (default: 0.15 = 15%)
  requireActiveHiring?: boolean;    // If true, filter out companies with no jobs (default: false)
  minJobPostings?: number;          // Minimum jobs required (default: 0)
}

/**
 * Rank companies by semantic similarity to course
 * NOW OPTIMIZED: Uses batch embedding processing for efficiency
 * NOW CONTEXT-AWARE: Accepts socMappings for intelligent industry filtering
 * NOW HIRING-AWARE: Boosts companies with active, relevant job postings
 */
export async function rankCompaniesBySimilarity(
  courseSkills: ExtractedSkill[],
  occupations: StandardOccupation[],
  companies: any[],
  threshold: number = 0.7,
  socMappings: SOCMapping[] = [],
  config: RankingConfig = {}
): Promise<SemanticFilteringResult> {
  const startTime = Date.now();
  
  // Apply config defaults
  const {
    prioritizeHiring = true,
    hiringBoostFactor = 0.15,
    requireActiveHiring = false,
    minJobPostings = 0
  } = config;

  console.log(`\n🧠 [Phase 3] Ranking ${companies.length} companies by semantic similarity...`);
  console.log(`   Threshold: ${threshold.toFixed(2)}`);
  console.log(`   Hiring Boost: ${prioritizeHiring ? `ENABLED (${(hiringBoostFactor * 100).toFixed(0)}%)` : 'DISABLED'}`);
  if (requireActiveHiring) {
    console.log(`   ⚠️  Require Active Hiring: YES (min ${minJobPostings} jobs)`);
  }

  // Classify course domain for context-aware filtering
  const { domain: courseDomain } = classifyCourseDomain(socMappings);
  console.log(`   🎓 Course Domain: ${courseDomain.toUpperCase()} (context-aware filtering enabled)`);

  // Determine which provider to use
  const useEmbeddings = USE_SEMANTIC_EMBEDDINGS && isEmbeddingServiceAvailable();
  const embeddingProvider = useEmbeddings ? 'Gemini text-embedding-004' : 'Keyword Matching';
  console.log(`   🔧 Provider: ${embeddingProvider}`);
  
  if (useEmbeddings) {
    const circuitStatus = getCircuitBreakerStatus();
    if (circuitStatus.failures > 0) {
      console.log(`   ⚠️  Circuit breaker: ${circuitStatus.failures}/${circuitStatus.threshold} failures`);
    }
  }

  // Build course text once
  const courseText = buildCourseText(courseSkills, occupations);
  
  // Build all company texts
  const companyTexts = companies.map(company => 
    buildCompanyText(
      company.job_postings || company.jobPostings || [],
      company.description || company.organizationDescription || '',
      company.technologies_used || company.technologiesUsed || []
    )
  );

  // Compute similarities - batch for embeddings, individual for keywords
  let similarities: number[];
  
  if (useEmbeddings) {
    try {
      // OPTIMIZED: Single batch call for all companies
      similarities = await computeBatchSimilarities(courseText, companyTexts);
    } catch (error) {
      if (EMBEDDING_FALLBACK_ENABLED) {
        console.warn(`⚠️  [Semantic Matching] Batch embeddings failed, falling back to keywords:`, error);
        similarities = companyTexts.map(companyText => 
          computeKeywordSimilarity(courseText, companyText)
        );
      } else {
        throw error;
      }
    }
  } else {
    // Keyword matching
    similarities = companyTexts.map(companyText => 
      computeKeywordSimilarity(courseText, companyText)
    );
  }

  // Calculate hiring stats for all companies
  let companiesWithJobs = 0;
  let companiesWithoutJobs = 0;
  let totalJobPostings = 0;
  
  // Build matches with industry penalties and hiring boost
  const matches: SemanticMatch[] = companies.map((company, i) => {
    let similarity = similarities[i];
    
    // Get job postings for this company
    const jobPostings = company.job_postings || company.jobPostings || [];
    const jobCount = Array.isArray(jobPostings) ? jobPostings.length : 0;
    const hasActiveJobs = jobCount > 0;
    
    // Track hiring stats
    if (hasActiveJobs) {
      companiesWithJobs++;
      totalJobPostings += jobCount;
    } else {
      companiesWithoutJobs++;
    }
    
    // INDUSTRY VALIDATION: Context-aware penalty system
    const companySector = (company.sector || '').toLowerCase();
    const industryDecision = calculateIndustryPenalty(
      occupations,
      companySector,
      socMappings,
      jobPostings
    );

    const rawSimilarity = similarity;
    if (industryDecision.penalty > 0) {
      similarity = similarity * (1 - industryDecision.penalty);
      console.log(`   ⚠️  ${company.name}: ${industryDecision.reason}`);
      console.log(`      Raw: ${(rawSimilarity * 100).toFixed(0)}% → Penalized: ${(similarity * 100).toFixed(0)}%`);
    }
    
    // HIRING BOOST: Increase score for companies with active job postings
    let hiringBoost = 0;
    if (prioritizeHiring && hasActiveJobs) {
      // Scale boost by job count (more jobs = slightly higher boost, capped at hiringBoostFactor)
      const jobCountMultiplier = Math.min(1, jobCount / 10); // 10+ jobs = full boost
      hiringBoost = hiringBoostFactor * (0.5 + 0.5 * jobCountMultiplier);
      similarity = similarity * (1 + hiringBoost);
      
      // Cap at 1.0
      similarity = Math.min(1.0, similarity);
    }

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low';
    if (similarity >= 0.8) confidence = 'high';
    else if (similarity >= 0.65) confidence = 'medium';
    else confidence = 'low';

    // Identify matching skills and DWAs
    const matchingSkills = findMatchingSkills(courseSkills, company);
    const matchingDWAs = findMatchingDWAs(occupations, company);
    const explanation = generateMatchExplanation(similarity, matchingSkills, matchingDWAs);

    return {
      companyId: company.id,
      companyName: company.name,
      similarityScore: similarity,
      confidence,
      matchingSkills,
      matchingDWAs,
      explanation,
      hiringBoost,
      hasActiveJobs
    };
  });

  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarityScore - a.similarityScore);

  // Apply hiring filter if required
  let preFilterCount = matches.length;
  let matchesToFilter = matches;
  
  if (requireActiveHiring) {
    matchesToFilter = matches.filter(m => {
      const jobCount = companies.find(c => c.name === m.companyName)?.job_postings?.length || 0;
      return jobCount >= minJobPostings;
    });
    console.log(`   🎯 Hiring Filter: ${preFilterCount} → ${matchesToFilter.length} companies (require ≥${minJobPostings} jobs)`);
  }

  // Filter by threshold
  const filteredMatches = matchesToFilter.filter(m => m.similarityScore >= threshold);

  const processingTimeMs = Date.now() - startTime;
  const averageSimilarity = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.similarityScore, 0) / matches.length
    : 0;

  // Calculate hiring stats
  const hiringStats = {
    companiesWithJobs,
    companiesWithoutJobs,
    totalJobPostings,
    averageJobsPerCompany: companiesWithJobs > 0 
      ? Math.round(totalJobPostings / companiesWithJobs * 10) / 10 
      : 0
  };

  console.log(`\n📊 [Semantic Filtering Results]`);
  console.log(`   Provider: ${embeddingProvider}`);
  console.log(`   Total Companies: ${companies.length}`);
  console.log(`   Threshold: ${(threshold * 100).toFixed(0)}%`);
  console.log(`   Passed Filter: ${filteredMatches.length}`);
  console.log(`   Filtered Out: ${companies.length - filteredMatches.length}`);
  console.log(`   Average Similarity: ${(averageSimilarity * 100).toFixed(0)}%`);
  console.log(`   Processing Time: ${processingTimeMs}ms`);
  console.log(`\n   📈 Hiring Stats:`);
  console.log(`      Companies with jobs: ${hiringStats.companiesWithJobs}`);
  console.log(`      Companies without jobs: ${hiringStats.companiesWithoutJobs}`);
  console.log(`      Total job postings: ${hiringStats.totalJobPostings}`);
  console.log(`      Avg jobs/company: ${hiringStats.averageJobsPerCompany}`);

  // Log ALL companies with their scores (for debugging)
  console.log(`\n   📋 All Companies (sorted by similarity):`);
  matches.forEach((match, i) => {
    const company = companies.find(c => c.name === match.companyName);
    const industry = company?.sector || 'Unknown';
    const jobCount = company?.job_postings?.length || 0;
    const status = match.similarityScore >= threshold ? '✅ PASS' : '❌ FAIL';
    const hiringBadge = match.hasActiveJobs ? `🟢 ${jobCount} jobs` : '⚪ No jobs';
    console.log(`      ${i + 1}. ${match.companyName} - ${(match.similarityScore * 100).toFixed(0)}% (${match.confidence}) ${status} ${hiringBadge}`);
    console.log(`         Industry: ${industry} | Skills: ${match.matchingSkills.length} | DWAs: ${match.matchingDWAs.length}${match.hiringBoost ? ` | Hiring Boost: +${(match.hiringBoost * 100).toFixed(0)}%` : ''}`);
  });

  // Log filtered out companies with industry information for debugging
  const filtered = matches.filter(m => m.similarityScore < threshold);
  if (filtered.length > 0) {
    console.log(`\n   ❌ Filtered Out (< ${(threshold * 100).toFixed(0)}%):`);
    filtered.slice(0, 5).forEach(match => {
      const company = companies.find(c => c.name === match.companyName);
      const industry = company?.sector || company?.industry || 'Unknown';
      console.log(`      • ${match.companyName} - ${(match.similarityScore * 100).toFixed(0)}% (${industry})`);
    });

    // DIAGNOSTIC: Show if filtered companies were context-excluded
    const contextExcludedFiltered = filtered.filter(m => {
      const company = companies.find(c => c.name === m.companyName);
      const sector = company?.sector || company?.industry || '';
      const decision = shouldExcludeIndustry(sector, courseDomain, socMappings, company?.job_postings || []);
      return decision.shouldExclude;
    });

    if (contextExcludedFiltered.length > 0) {
      console.log(`\n   ℹ️  Note: ${contextExcludedFiltered.length}/${filtered.length} filtered companies were excluded by context-aware rules`);
    }
  }

  return {
    matches: filteredMatches,
    allMatches: matches,
    totalCompanies: companies.length,
    filteredCount: filtered.length,
    averageSimilarity,
    threshold,
    processingTimeMs,
    embeddingProvider,
    hiringStats
  };
}

/**
 * Build course text from skills and O*NET data
 */
function buildCourseText(skills: ExtractedSkill[], occupations: StandardOccupation[]): string {
  const parts: string[] = [];

  // Add skills
  parts.push('Skills required:');
  parts.push(skills.map(s => s.skill).join(', '));

  // Add O*NET occupations
  if (occupations.length > 0) {
    parts.push('\nRelevant occupations:');
    parts.push(occupations.map(o => o.title).join(', '));

    // Add high-importance DWAs
    parts.push('\nWork activities:');
    const topDWAs = occupations
      .flatMap(o => o.dwas)
      .filter(dwa => dwa.importance && dwa.importance > 70)
      .slice(0, 10);
    parts.push(topDWAs.map(dwa => dwa.description).join('; '));

    // Add technologies
    parts.push('\nTechnologies:');
    const techs = [...new Set(occupations.flatMap(o => o.technologies))];
    parts.push(techs.slice(0, 10).join(', '));
  }

  return parts.join(' ');
}

/**
 * Build company text from job postings and description
 */
function buildCompanyText(
  jobPostings: any[],
  description: string,
  technologies: string[]
): string {
  const parts: string[] = [];

  // Add company description
  if (description) {
    parts.push(description);
  }

  // Add job titles
  if (jobPostings && jobPostings.length > 0) {
    parts.push('\nJob openings:');
    parts.push(jobPostings.map(jp => jp.title).join(', '));
  }

  // Add technologies
  if (technologies && technologies.length > 0) {
    parts.push('\nTechnologies used:');
    parts.push(technologies.join(', '));
  }

  return parts.join(' ');
}

/**
 * Compute similarity using keyword overlap (placeholder for embeddings)
 * TODO: Replace with actual Sentence-BERT cosine similarity
 */
function computeKeywordSimilarity(text1: string, text2: string): number {
  // Tokenize and normalize
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));

  // Calculate Jaccard similarity
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);

  const jaccard = intersection.size / union.size;

  // Also check for important term matches (skills, technologies)
  const importantTerms1 = extractImportantTerms(text1);
  const importantTerms2 = extractImportantTerms(text2);

  const importantMatches = importantTerms1.filter(t => importantTerms2.includes(t)).length;
  
  // BALANCED SCORING: Give appropriate weight to both broad overlap AND specific term matches
  // Base score (Jaccard): 0.0-1.0 measuring general overlap
  // Important bonus: Up to 0.20 for matching key technical terms (was 0.10)
  const importantBonus = Math.min(0.20, importantMatches * 0.04);
  
  // If we have ZERO overlap but some important matches, give minimum viable score
  const minimumViableScore = importantMatches > 0 ? 0.15 : 0.0;

  return Math.max(minimumViableScore, Math.min(1.0, jaccard + importantBonus));
}

/**
 * Tokenize text for similarity computation
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 3)  // Filter short words
    .filter(t => !isStopWord(t));
}

/**
 * Check if word is a stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'will',
    'can', 'are', 'was', 'were', 'been', 'has', 'had', 'does', 'did',
    'should', 'could', 'would', 'may', 'might', 'must', 'shall'
  ]);
  return stopWords.has(word);
}

/**
 * Extract important terms (technical skills, technologies)
 * Enhanced with more comprehensive patterns
 */
function extractImportantTerms(text: string): string[] {
  const terms: string[] = [];
  const lower = text.toLowerCase();

  // Comprehensive technical terms patterns
  const technicalPatterns = [
    // Programming languages
    /\b(python|java|javascript|typescript|c\+\+|c#|ruby|php|swift|kotlin|go|rust|scala|r|matlab)\b/gi,

    // Web & Mobile frameworks
    /\b(react|angular|vue|node\.js|express|django|flask|spring|laravel|flutter|react native)\b/gi,

    // Data & AI
    /\b(sql|nosql|mongodb|postgresql|mysql|redis|elasticsearch)\b/gi,
    /\b(machine learning|deep learning|data analysis|data science|artificial intelligence|neural networks)\b/gi,
    /\b(tensorflow|pytorch|scikit-learn|pandas|numpy|keras|spark|hadoop)\b/gi,

    // Cloud & DevOps
    /\b(aws|azure|gcp|google cloud|cloud computing|kubernetes|docker|jenkins|terraform)\b/gi,
    /\b(devops|ci\/cd|agile|scrum|git|github|gitlab)\b/gi,

    // Engineering software & tools
    /\b(cad|autocad|solidworks|catia|ansys|matlab|simulink|labview|plc)\b/gi,
    /\b(finite element|cfd|computational fluid dynamics|fem|fea)\b/gi,

    // Engineering disciplines
    /\b(mechanical|electrical|civil|chemical|industrial|aerospace|automotive|manufacturing)\b/gi,
    /\b(thermal|fluid|structural|power systems|hvac|robotics)\b/gi,
    /\b(engineering|software|hardware|firmware|embedded systems)\b/gi,

    // Technical activities
    /\b(analysis|design|development|modeling|simulation|optimization|testing|validation)\b/gi,
    /\b(prototyping|fabrication|integration|deployment|maintenance|troubleshooting)\b/gi,

    // Business & Analytics
    /\b(excel|powerbi|tableau|salesforce|crm|erp|sap|oracle)\b/gi,
    /\b(business intelligence|analytics|reporting|dashboard|kpi|metrics)\b/gi
  ];

  for (const pattern of technicalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      terms.push(...matches.map(m => m.toLowerCase().trim()));
    }
  }

  return [...new Set(terms)];
}

/**
 * Find skills that match between course and company
 */
function findMatchingSkills(courseSkills: ExtractedSkill[], company: any): string[] {
  const matches: string[] = [];

  const companyText = (
    (company.description || '') + ' ' +
    (company.jobPostings || []).map((jp: any) => jp.title).join(' ') + ' ' +
    (company.technologiesUsed || []).join(' ')
  ).toLowerCase();

  for (const skill of courseSkills) {
    const skillTokens = skill.skill.toLowerCase().split(/\s+/);
    const hasMatch = skillTokens.some(token => companyText.includes(token));

    if (hasMatch) {
      matches.push(skill.skill);
    }
  }

  return matches;
}

/**
 * Find DWAs that match between O*NET and company
 */
function findMatchingDWAs(occupations: StandardOccupation[], company: any): string[] {
  const matches: string[] = [];

  const companyText = (
    (company.description || '') + ' ' +
    (company.jobPostings || []).map((jp: any) => jp.title).join(' ')
  ).toLowerCase();

  for (const occ of occupations) {
    for (const dwa of occ.dwas) {
      if (dwa.importance && dwa.importance > 70) {
        const dwaTokens = dwa.name.toLowerCase().split(/\s+/);
        const hasMatch = dwaTokens.some(token => companyText.includes(token));

        if (hasMatch) {
          matches.push(dwa.name);
        }
      }
    }
  }

  return [...new Set(matches)];
}

/**
 * Generate explanation for match quality
 */
function generateMatchExplanation(
  similarity: number,
  matchingSkills: string[],
  matchingDWAs: string[]
): string {
  if (similarity >= 0.8) {
    return `Excellent match: ${matchingSkills.length} matching skills (${matchingSkills.slice(0, 3).join(', ')}) and ${matchingDWAs.length} matching work activities.`;
  } else if (similarity >= 0.65) {
    return `Good match: ${matchingSkills.length} matching skills (${matchingSkills.slice(0, 2).join(', ')}).`;
  } else if (similarity >= 0.5) {
    return `Moderate match: Some skill overlap but may not be ideal fit.`;
  } else {
    return `Poor match: Limited skill/activity alignment with course requirements.`;
  }
}

/**
 * Format semantic filtering results for display
 */
export function formatSemanticFilteringForDisplay(result: SemanticFilteringResult): string {
  const lines = [
    `\n📊 Semantic Filtering Results`,
    `   Total Companies: ${result.totalCompanies}`,
    `   Passed Filter: ${result.matches.length}`,
    `   Filtered Out: ${result.filteredCount}`,
    `   Threshold: ${(result.threshold * 100).toFixed(0)}%`,
    `   Average Similarity: ${(result.averageSimilarity * 100).toFixed(0)}%`,
    `   Processing Time: ${result.processingTimeMs}ms`,
    '\n   Top Matches:'
  ];

  result.matches.slice(0, 10).forEach((match, i) => {
    lines.push(`\n   ${i + 1}. ${match.companyName}`);
    lines.push(`      Similarity: ${(match.similarityScore * 100).toFixed(0)}% (${match.confidence})`);
    lines.push(`      Matching Skills: ${match.matchingSkills.slice(0, 3).join(', ')}`);
    if (match.matchingDWAs.length > 0) {
      lines.push(`      Matching Activities: ${match.matchingDWAs.slice(0, 2).join(', ')}`);
    }
  });

  return lines.join('\n');
}

/**
 * Calculate industry penalty based on occupation-industry mismatch
 * NOW CONTEXT-AWARE: Uses course domain classification and job posting analysis
 * Returns decision with reason and penalty (0.0 to 1.0)
 */
function calculateIndustryPenalty(
  occupations: StandardOccupation[],
  companySector: string,
  socMappings: SOCMapping[] = [],
  jobPostings: any[] = []
): { reason: string; penalty: number } {
  if (!companySector || occupations.length === 0) {
    return { reason: 'No sector or occupations', penalty: 0 };
  }

  // Classify course domain
  const { domain: courseDomain } = classifyCourseDomain(socMappings);

  // Use context-aware industry exclusion system
  const decision = shouldExcludeIndustry(companySector, courseDomain, socMappings, jobPostings);

  if (decision.shouldExclude) {
    return {
      reason: decision.reason,
      penalty: decision.penalty
    };
  }

  // If not excluded, check for expected industries (old logic for non-excluded industries)
  if (!companySector) return { reason: 'No sector info', penalty: 0 };

  // Map occupations to expected industries
  const expectedIndustries = new Set<string>();

  for (const occ of occupations) {
    const title = occ.title.toLowerCase();
    const code = occ.code;
    const majorGroup = code.substring(0, 2);

    // Engineering occupations (17-xxxx)
    if (majorGroup === '17' || title.includes('engineer')) {
      expectedIndustries.add('engineering');
      expectedIndustries.add('manufacturing');
      expectedIndustries.add('construction');
      expectedIndustries.add('automotive');
      expectedIndustries.add('aerospace');
      expectedIndustries.add('energy');
      expectedIndustries.add('hvac');
      expectedIndustries.add('mechanical');
      expectedIndustries.add('industrial');
      expectedIndustries.add('renewables');
      expectedIndustries.add('environment');

      // Specific engineering types
      if (title.includes('mechanical') || title.includes('thermal')) {
        expectedIndustries.add('thermal');
        expectedIndustries.add('fluid');
        expectedIndustries.add('power generation');
      }
      if (title.includes('software') || title.includes('computer')) {
        expectedIndustries.add('software');
        expectedIndustries.add('technology');
        expectedIndustries.add('it services');
      }
    }

    // Computer/IT occupations (15-xxxx)
    if (majorGroup === '15' || title.includes('software') || title.includes('data')) {
      expectedIndustries.add('software');
      expectedIndustries.add('technology');
      expectedIndustries.add('information technology');
      expectedIndustries.add('it services');
    }
  }

  // MODERATE penalties for industries that MAY have relevant roles (not excluded, but less ideal)
  const moderatePenaltyIndustries = [
    'marketing', 'advertising', 'public relations',
    'retail', 'consumer goods',
    'hospitality', 'tourism', 'entertainment',
    'real estate', 'property'
  ];

  // Check for moderate penalty (reduced to 10% for better coverage)
  for (const moderate of moderatePenaltyIndustries) {
    if (companySector.includes(moderate)) {
      return {
        reason: `${moderate} industry - moderate penalty`,
        penalty: 0.10 // Reduced from 0.20 to 0.10
      };
    }
  }

  // Check if company is in an expected industry
  for (const expected of expectedIndustries) {
    if (companySector.includes(expected)) {
      return {
        reason: `Expected industry: ${expected}`,
        penalty: 0
      };
    }
  }

  // Mild penalty for unclear/generic industries
  const genericIndustries = ['services', 'consulting', 'solutions', 'systems'];
  for (const generic of genericIndustries) {
    if (companySector.includes(generic)) {
      return {
        reason: `Generic industry: ${generic}`,
        penalty: 0.15
      };
    }
  }

  // Default: reduced penalty for unknown industries (many companies have vague Apollo data)
  return {
    reason: 'Unknown industry',
    penalty: 0.10 // Reduced from 0.20 to 0.10 for better coverage
  };
}

/**
 * Get recommended threshold based on company count
 * RELAXED: Further lowered thresholds to increase result quantity while maintaining reasonable quality
 */
export function getRecommendedThreshold(companyCount: number): number {
  // RELAXED FILTERING: Lower thresholds to get more results
  // Goal: Balance quality with quantity to provide more options
  if (companyCount > 20) return 0.50;  // Good sample → relaxed from 0.65 to 0.50
  if (companyCount > 10) return 0.45;  // Moderate sample → relaxed from 0.60 to 0.45
  if (companyCount > 5) return 0.40;   // Small sample → relaxed from 0.55 to 0.40
  // Very few companies → accept even lower matches to ensure we have results
  return 0.35;  // Relaxed from 0.50 to 0.35 for maximum coverage
}

/**
 * Check if semantic filtering should be skipped
 * Skip filtering when we have no meaningful data to filter with
 */
export function shouldSkipSemanticFiltering(
  skills: ExtractedSkill[],
  occupations: StandardOccupation[]
): boolean {
  const hasSkills = skills.length > 0;
  const hasOccupations = occupations.length > 0;
  const hasOccupationData = occupations.some(occ =>
    (occ.skills && occ.skills.length > 0) ||
    (occ.dwas && occ.dwas.length > 0)
  );

  // Skip if we have no skills AND no occupation data
  if (!hasSkills && !hasOccupationData) {
    console.warn(`   ⚠️  [Semantic Filtering] No skills or occupation data available`);
    console.warn(`   Skipping semantic filtering to avoid filtering out all companies`);
    return true;
  }

  return false;
}
