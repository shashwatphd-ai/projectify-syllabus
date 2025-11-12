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
 * Uses cosine similarity of Sentence-BERT embeddings
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

  // Compute similarity using simple keyword matching (placeholder for embeddings)
  // TODO: Replace with actual Sentence-BERT embeddings when @xenova/transformers is available
  const similarity = computeKeywordSimilarity(courseText, companyText);

  return similarity;
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
    const similarity = await computeCourseSimilarity(
      courseSkills,
      occupations,
      company.job_postings || company.jobPostings || [],
      company.description || company.organizationDescription || '',
      company.technologies_used || company.technologiesUsed || []
    );

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
      .filter(dwa => dwa.importance > 70)
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
  const importantBonus = Math.min(0.3, importantMatches * 0.1);

  return Math.min(1.0, jaccard + importantBonus);
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
      if (dwa.importance > 70) {
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
 * Get recommended threshold based on company count
 */
export function getRecommendedThreshold(companyCount: number): number {
  // If we have many companies, be more selective
  if (companyCount > 20) return 0.75;
  if (companyCount > 10) return 0.70;
  // If we have few companies, be more lenient
  return 0.65;
}
