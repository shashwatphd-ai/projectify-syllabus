/**
 * Semantic Matching Service
 *
 * Uses Sentence-BERT embeddings to compute semantic similarity between
 * course content and company job postings/descriptions.
 *
 * Phase 3 of intelligent company matching system.
 *
 * Model: @xenova/transformers - all-MiniLM-L6-v2 (Sentence-BERT)
 * Size: ~23MB (acceptable for edge functions)
 * Speed: ~50-100ms per embedding
 */

import { ExtractedSkill } from './skill-extraction-service.ts';
import { StandardOccupation } from './occupation-provider-interface.ts';
import { computeSemanticSimilarity } from './embedding-service.ts';

// ========================================
// FEATURE FLAG: Toggle between keyword and embedding-based matching
// ========================================
const USE_SEMANTIC_EMBEDDINGS = Deno.env.get('USE_SEMANTIC_EMBEDDINGS') === 'true';
const EMBEDDING_FALLBACK_ENABLED = Deno.env.get('EMBEDDING_FALLBACK_ENABLED') !== 'false'; // Default: true

// Log current mode on module load
console.log(`\n🔧 [Semantic Matching] Mode: ${USE_SEMANTIC_EMBEDDINGS ? 'EMBEDDINGS' : 'KEYWORDS'}`);
if (USE_SEMANTIC_EMBEDDINGS && EMBEDDING_FALLBACK_ENABLED) {
  console.log('   Fallback to keywords: ENABLED');
}

export interface SemanticMatch {
  companyId?: string;
  companyName: string;
  similarityScore: number;         // 0.0 to 1.0
  confidence: 'high' | 'medium' | 'low';
  matchingSkills: string[];        // Skills that matched
  matchingDWAs: string[];          // DWAs that matched
  explanation: string;             // Why this is a good/bad match
}

export interface SemanticFilteringResult {
  matches: SemanticMatch[];
  totalCompanies: number;
  filteredCount: number;           // How many were filtered out
  averageSimilarity: number;
  threshold: number;                // Threshold used
  processingTimeMs: number;
}

/**
 * Compute semantic similarity between course and company
 *
 * Dual-mode support:
 * - USE_SEMANTIC_EMBEDDINGS=true → Sentence-BERT embeddings (with fallback)
 * - USE_SEMANTIC_EMBEDDINGS=false → Keyword matching (default, always works)
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

  // Choose similarity computation method based on feature flag
  if (USE_SEMANTIC_EMBEDDINGS) {
    // Try embedding-based similarity with automatic fallback
    return await computeSimilarityWithFallback(courseText, companyText);
  } else {
    // Use keyword-based similarity (default, no breaking changes)
    return computeKeywordSimilarity(courseText, companyText);
  }
}

/**
 * Compute similarity using embeddings with automatic fallback to keywords
 * This ensures the system never breaks if embeddings fail
 */
async function computeSimilarityWithFallback(
  text1: string,
  text2: string
): Promise<number> {
  try {
    // Try embedding-based similarity
    const similarity = await computeSemanticSimilarity(text1, text2);
    return similarity;
  } catch (error) {
    if (EMBEDDING_FALLBACK_ENABLED) {
      console.warn(`⚠️  [Semantic Matching] Embeddings failed, falling back to keywords:`, error);
      return computeKeywordSimilarity(text1, text2);
    } else {
      // Fallback disabled - propagate error
      throw error;
    }
  }
}

/**
 * Rank companies by semantic similarity to course
 */
export async function rankCompaniesBySimilarity(
  courseSkills: ExtractedSkill[],
  occupations: StandardOccupation[],
  companies: any[],
  threshold: number = 0.7
): Promise<SemanticFilteringResult> {
  const startTime = Date.now();

  console.log(`\n🧠 [Phase 3] Ranking ${companies.length} companies by semantic similarity...`);
  console.log(`   Threshold: ${threshold.toFixed(2)}`);

  const matches: SemanticMatch[] = [];

  for (const company of companies) {
    let similarity = await computeCourseSimilarity(
      courseSkills,
      occupations,
      company.job_postings || company.jobPostings || [],
      company.description || company.organizationDescription || '',
      company.technologies_used || company.technologiesUsed || []
    );

    // INDUSTRY VALIDATION: Penalize companies from irrelevant industries
    const companySector = (company.sector || '').toLowerCase();
    const industryPenalty = calculateIndustryPenalty(occupations, companySector);
    if (industryPenalty > 0) {
      console.log(`   ⚠️  ${company.name}: ${companySector} → ${(industryPenalty * 100).toFixed(0)}% penalty`);
      similarity = Math.max(0, similarity - industryPenalty);
    }

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low';
    if (similarity >= 0.8) confidence = 'high';
    else if (similarity >= 0.65) confidence = 'medium';
    else confidence = 'low';

    // Identify matching skills and DWAs
    const matchingSkills = findMatchingSkills(courseSkills, company);
    const matchingDWAs = findMatchingDWAs(occupations, company);

    // Generate explanation
    const explanation = generateMatchExplanation(similarity, matchingSkills, matchingDWAs);

    matches.push({
      companyId: company.id,
      companyName: company.name,
      similarityScore: similarity,
      confidence,
      matchingSkills,
      matchingDWAs,
      explanation
    });
  }

  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarityScore - a.similarityScore);

  // Filter by threshold
  const filteredMatches = matches.filter(m => m.similarityScore >= threshold);

  const processingTimeMs = Date.now() - startTime;
  const averageSimilarity = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.similarityScore, 0) / matches.length
    : 0;

  console.log(`   ✅ Filtered: ${companies.length} → ${filteredMatches.length} companies`);
  console.log(`   📊 Average similarity: ${averageSimilarity.toFixed(2)}`);
  console.log(`   ⏱️  Processing time: ${processingTimeMs}ms`);

  // Log top 5 matches
  console.log(`\n   🏆 Top 5 Matches:`);
  filteredMatches.slice(0, 5).forEach((match, i) => {
    console.log(`      ${i + 1}. ${match.companyName} - ${(match.similarityScore * 100).toFixed(0)}% (${match.confidence})`);
  });

  // Log filtered out companies
  const filtered = matches.filter(m => m.similarityScore < threshold);
  if (filtered.length > 0) {
    console.log(`\n   ❌ Filtered Out (< ${(threshold * 100).toFixed(0)}%):`);
    filtered.slice(0, 5).forEach(match => {
      console.log(`      • ${match.companyName} - ${(match.similarityScore * 100).toFixed(0)}%`);
    });
  }

  return {
    matches: filteredMatches,
    totalCompanies: companies.length,
    filteredCount: filtered.length,
    averageSimilarity,
    threshold,
    processingTimeMs
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
 */
function extractImportantTerms(text: string): string[] {
  const terms: string[] = [];
  const lower = text.toLowerCase();

  // Common technical terms
  const technicalPatterns = [
    /\b(python|java|javascript|typescript|c\+\+|sql|excel|matlab|ansys|tensorflow|pytorch|react|angular|vue)\b/gi,
    /\b(machine learning|deep learning|data analysis|cloud computing|devops|agile|scrum)\b/gi,
    /\b(engineering|software|hardware|mechanical|thermal|fluid|structural|civil)\b/gi,
    /\b(analysis|design|development|modeling|simulation|optimization)\b/gi
  ];

  for (const pattern of technicalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      terms.push(...matches.map(m => m.toLowerCase()));
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
 * Returns a penalty (0.0 to 0.5) to subtract from similarity score
 */
function calculateIndustryPenalty(occupations: StandardOccupation[], companySector: string): number {
  if (!companySector || occupations.length === 0) return 0;

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

  // MODERATE penalties for industries that MAY be relevant (allow context-based matching)
  const moderatePenaltyIndustries = [
    'recruitment', 'human resources', 'hr', 'staffing',
    'marketing', 'advertising', 'public relations',
    'retail', 'consumer goods',
    'hospitality', 'tourism', 'entertainment',
    'real estate', 'property'
  ];

  // SEVERE penalties only for industries that are NEVER relevant for academic projects
  const severePenaltyIndustries = [
    'insurance', 'legal services', 'law firm'
  ];

  // Check for severe penalty (30%)
  for (const severe of severePenaltyIndustries) {
    if (companySector.includes(severe)) {
      return 0.30; // Severe penalty - rarely relevant
    }
  }

  // Check for moderate penalty (15%) - allow some flexibility
  for (const moderate of moderatePenaltyIndustries) {
    if (companySector.includes(moderate)) {
      return 0.15; // Moderate penalty - may have relevant roles (e.g., HR analytics, retail operations)
    }
  }

  // Check if company is in an expected industry
  for (const expected of expectedIndustries) {
    if (companySector.includes(expected)) {
      return 0; // No penalty for relevant industries
    }
  }

  // Mild penalty for unclear/generic industries
  const genericIndustries = ['services', 'consulting', 'solutions', 'systems'];
  for (const generic of genericIndustries) {
    if (companySector.includes(generic)) {
      return 0.15; // Mild penalty (15%) for generic industries
    }
  }

  // Default: small penalty for unknown industries
  return 0.20; // 20% penalty for unrecognized industries
}

/**
 * Get recommended threshold based on company count
 * SURGICAL FIX: Lowered thresholds to prevent filtering out all companies
 */
export function getRecommendedThreshold(companyCount: number): number {
  // GRACEFUL DEGRADATION: Lower thresholds when we have few companies
  // Prevents filtering out ALL companies when O*NET data is sparse
  if (companyCount > 20) return 0.65;  // Good sample → maintain higher quality
  if (companyCount > 10) return 0.60;  // Moderate sample → balance quality/quantity
  if (companyCount > 5) return 0.55;   // Small sample → prioritize coverage
  // Very few companies → accept lower matches to ensure we have SOME results
  return 0.50;  // Was 0.75 → Now 0.50 (surgical fix for 0 companies issue)
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
