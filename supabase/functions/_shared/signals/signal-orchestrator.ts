/**
 * Signal Orchestrator - Coordinates All Signal Providers
 * 
 * This is the main entry point for signal-driven company discovery.
 * It orchestrates all 4 signal providers and calculates composite scores.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only orchestrates signals
 * - Open/Closed: New signals can be added without modification
 * - Dependency Inversion: Depends on SignalProvider interface
 * 
 * @module signal-orchestrator
 */

import {
  SignalResult,
  SignalContext,
  SignalProvider,
  CompositeScore,
  SignalScores,
  CompanyForSignal,
  SIGNAL_WEIGHTS,
  DEFAULT_FALLBACK_CONFIG,
  FallbackConfig,
  StorableSignalData,
  JobPosting
} from '../signal-types.ts';

// Import all signal providers
import { JobSkillsSignal } from './job-skills-signal.ts';
import { MarketIntelSignal } from './market-intel-signal.ts';
import { DepartmentFitSignal } from './department-fit-signal.ts';
import { ContactQualitySignal } from './contact-quality-signal.ts';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract job postings from company data (handles various formats)
 */
function extractJobPostings(jobPostings: unknown): JobPosting[] {
  if (!jobPostings) return [];
  
  try {
    const parsed = typeof jobPostings === 'string' 
      ? JSON.parse(jobPostings)
      : jobPostings;
    
    if (!Array.isArray(parsed)) return [];
    
    return parsed.map((j: Record<string, unknown>) => ({
      id: String(j.id || ''),
      title: String(j.title || 'Unknown Role'),
      url: j.url ? String(j.url) : undefined,
      description: j.description ? String(j.description) : undefined
    }));
  } catch {
    console.warn('  ⚠️ Could not parse job_postings');
    return [];
  }
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/** All signal providers in execution order */
const SIGNAL_PROVIDERS: SignalProvider[] = [
  JobSkillsSignal,
  MarketIntelSignal,
  DepartmentFitSignal,
  ContactQualitySignal
];

/** Maximum time to wait for all signals (ms) */
const SIGNAL_TIMEOUT_MS = 30000;

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

/**
 * Calculate composite signal score for a single company
 * 
 * @param company - Company to evaluate
 * @param syllabusSkills - Skills extracted from syllabus
 * @param syllabusDomain - Domain/field of the syllabus
 * @param apolloApiKey - Apollo API key for additional lookups
 * @param geminiApiKey - Gemini API key for embeddings
 * @returns Composite score with breakdown
 */
export async function calculateCompanySignals(
  company: CompanyForSignal,
  syllabusSkills: string[],
  syllabusDomain: string,
  apolloApiKey?: string,
  geminiApiKey?: string
): Promise<CompositeScore> {
  const startTime = Date.now();
  console.log(`\n🎯 [Orchestrator] Calculating signals for: ${company.name}`);
  
  // Extract job postings from company data
  const jobPostings = extractJobPostings(company.job_postings);
  console.log(`  📋 Job postings available: ${jobPostings.length}`);
  
  // Build context for all signals
  const context: SignalContext = {
    company,
    syllabusSkills,
    syllabusDomain,
    jobPostings,
    apolloApiKey,
    geminiApiKey
  };
  
  // Execute all signals in parallel with timeout
  const signalResults = await executeSignalsWithTimeout(context);
  
  // Calculate composite score
  const composite = calculateCompositeScore(signalResults, company.name);
  
  const processingTime = Date.now() - startTime;
  console.log(`  ⏱️  Total processing time: ${processingTime}ms`);
  console.log(`  📊 Final score: ${composite.overall}/100 (${composite.confidence} confidence)`);
  
  return composite;
}

/**
 * Calculate signals for multiple companies in batch
 * Optimized for API efficiency with rate limiting
 */
export async function calculateBatchSignals(
  companies: CompanyForSignal[],
  syllabusSkills: string[],
  syllabusDomain: string,
  apolloApiKey?: string,
  geminiApiKey?: string
): Promise<Map<string, CompositeScore>> {
  console.log(`\n🚀 [Orchestrator] Batch processing ${companies.length} companies`);
  const startTime = Date.now();
  
  const results = new Map<string, CompositeScore>();
  
  // Process companies in chunks to avoid overwhelming APIs
  const BATCH_SIZE = 5;
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);
    console.log(`\n  📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(companies.length / BATCH_SIZE)}`);
    
    // Process batch in parallel
    const batchPromises = batch.map(company =>
      calculateCompanySignals(
        company,
        syllabusSkills,
        syllabusDomain,
        apolloApiKey,
        geminiApiKey
      ).then(score => ({ company, score }))
       .catch(error => {
         console.error(`  ❌ Failed for ${company.name}:`, error);
         return { company, score: createErrorScore(company.name, error) };
       })
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const { company, score } of batchResults) {
      results.set(company.id, score);
    }
    
    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < companies.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`\n✅ [Orchestrator] Batch complete: ${companies.length} companies in ${totalTime}ms`);
  
  return results;
}

/**
 * Filter and rank companies by signal score
 * Implements graceful fallback if too few results
 */
export function filterAndRankCompanies(
  companies: CompanyForSignal[],
  scores: Map<string, CompositeScore>,
  config: FallbackConfig = DEFAULT_FALLBACK_CONFIG
): CompanyForSignal[] {
  console.log(`\n🔍 [Orchestrator] Filtering ${companies.length} companies`);
  
  // Pair companies with scores
  const companiesWithScores = companies
    .filter(c => scores.has(c.id))
    .map(company => ({
      company,
      score: scores.get(company.id)!
    }));
  
  // Sort by overall score descending
  companiesWithScores.sort((a, b) => b.score.overall - a.score.overall);
  
  // Apply threshold filtering
  let threshold = config.minScoreThreshold;
  let filtered = companiesWithScores.filter(c => c.score.overall >= threshold);
  
  // Fallback: lower threshold if too few results
  if (filtered.length < config.minCompaniesToReturn && companiesWithScores.length > 0) {
    console.log(`  ⚠️ Only ${filtered.length} companies above ${threshold}, lowering threshold to ${config.fallbackThreshold}`);
    threshold = config.fallbackThreshold;
    filtered = companiesWithScores.filter(c => c.score.overall >= threshold);
  }
  
  // Still not enough? Take top N regardless of score
  if (filtered.length < config.minCompaniesToReturn) {
    console.log(`  ⚠️ Still only ${filtered.length} companies, taking top ${config.minCompaniesToReturn}`);
    filtered = companiesWithScores.slice(0, config.minCompaniesToReturn);
  }
  
  // Cap at max
  const result = filtered.slice(0, config.maxCompaniesToReturn).map(c => c.company);
  
  console.log(`  ✅ Returning ${result.length} companies (threshold: ${threshold})`);
  
  return result;
}

// =============================================================================
// SIGNAL EXECUTION
// =============================================================================

/**
 * Execute all signals in parallel with timeout protection
 */
async function executeSignalsWithTimeout(
  context: SignalContext
): Promise<Map<string, SignalResult>> {
  const results = new Map<string, SignalResult>();
  
  // Create signal promises with individual error handling
  const signalPromises = SIGNAL_PROVIDERS.map(async (provider) => {
    try {
      const result = await provider.calculate(context);
      return { name: provider.name, result };
    } catch (error) {
      console.error(`  ❌ [${provider.name}] Signal failed:`, error);
      return {
        name: provider.name,
        result: {
          score: 0,
          confidence: 0,
          signals: ['Signal calculation failed'],
          error: error instanceof Error ? error.message : 'Unknown error'
        } as SignalResult
      };
    }
  });
  
  // Race against timeout
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Signal timeout')), SIGNAL_TIMEOUT_MS)
  );
  
  try {
    const signalResults = await Promise.race([
      Promise.all(signalPromises),
      timeoutPromise
    ]) as Array<{ name: string; result: SignalResult }>;
    
    for (const { name, result } of signalResults) {
      results.set(name, result);
    }
  } catch (error) {
    console.error('  ⚠️ Signal execution timeout, using partial results');
    // On timeout, return whatever results we have (will be empty/partial)
  }
  
  return results;
}

// =============================================================================
// SCORE CALCULATION
// =============================================================================

/**
 * Calculate composite score from individual signal results
 */
function calculateCompositeScore(
  signalResults: Map<string, SignalResult>,
  companyName: string
): CompositeScore {
  // Extract individual scores (default to 0 if missing)
  const jobSkillsResult = signalResults.get('job_skills_match');
  const marketIntelResult = signalResults.get('market_intelligence');
  const departmentFitResult = signalResults.get('department_fit');
  const contactQualityResult = signalResults.get('contact_quality');
  
  const components: SignalScores = {
    jobSkillsMatch: jobSkillsResult?.score ?? 0,
    marketIntelligence: marketIntelResult?.score ?? 0,
    departmentFit: departmentFitResult?.score ?? 0,
    contactQuality: contactQualityResult?.score ?? 0
  };
  
  // Calculate weighted overall score
  const overall = Math.round(
    (components.jobSkillsMatch * SIGNAL_WEIGHTS.job_skills_match) +
    (components.marketIntelligence * SIGNAL_WEIGHTS.market_intelligence) +
    (components.departmentFit * SIGNAL_WEIGHTS.department_fit) +
    (components.contactQuality * SIGNAL_WEIGHTS.contact_quality)
  );
  
  // Calculate aggregate confidence
  const confidences = [
    jobSkillsResult?.confidence ?? 0,
    marketIntelResult?.confidence ?? 0,
    departmentFitResult?.confidence ?? 0,
    contactQualityResult?.confidence ?? 0
  ];
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const confidence = avgConfidence > 0.7 ? 'high' : avgConfidence > 0.4 ? 'medium' : 'low';
  
  // Detect which signals were found
  const signalsDetected = {
    hasActiveJobPostings: (jobSkillsResult?.score ?? 0) > 30,
    hasFundingNews: (marketIntelResult?.rawData as Record<string, unknown>)?.hasFundingNews === true,
    hasHiringNews: (marketIntelResult?.rawData as Record<string, unknown>)?.hasHiringNews === true,
    hasDepartmentGrowth: (departmentFitResult?.score ?? 0) > 50,
    hasTechnologyMatch: ((departmentFitResult?.rawData as Record<string, unknown>)?.technologyMatchScore as number ?? 0) > 0.5,
    hasDecisionMakers: (contactQualityResult?.score ?? 0) > 40
  };
  
  // Collect all signal descriptions
  const allSignals: string[] = [];
  for (const result of signalResults.values()) {
    allSignals.push(...(result.signals || []));
  }
  
  // Generate human-readable breakdown
  const breakdown = generateBreakdown(components, signalsDetected, companyName);
  
  // Collect errors
  const errors: string[] = [];
  for (const result of signalResults.values()) {
    if (result.error) {
      errors.push(result.error);
    }
  }
  
  return {
    overall,
    confidence,
    components,
    signalsDetected,
    breakdown,
    errors
  };
}

/**
 * Generate human-readable score breakdown
 */
function generateBreakdown(
  components: SignalScores,
  detected: CompositeScore['signalsDetected'],
  companyName: string
): string {
  const lines: string[] = [`Signal Analysis for ${companyName}:`];
  
  // Component scores
  lines.push(`• Skills Match: ${components.jobSkillsMatch}/100 (weight: ${SIGNAL_WEIGHTS.job_skills_match * 100}%)`);
  lines.push(`• Market Activity: ${components.marketIntelligence}/100 (weight: ${SIGNAL_WEIGHTS.market_intelligence * 100}%)`);
  lines.push(`• Department Fit: ${components.departmentFit}/100 (weight: ${SIGNAL_WEIGHTS.department_fit * 100}%)`);
  lines.push(`• Contact Quality: ${components.contactQuality}/100 (weight: ${SIGNAL_WEIGHTS.contact_quality * 100}%)`);
  
  // Key signals detected
  const positiveSignals: string[] = [];
  if (detected.hasActiveJobPostings) positiveSignals.push('active hiring');
  if (detected.hasFundingNews) positiveSignals.push('recent funding');
  if (detected.hasHiringNews) positiveSignals.push('hiring news');
  if (detected.hasDepartmentGrowth) positiveSignals.push('department growth');
  if (detected.hasTechnologyMatch) positiveSignals.push('tech alignment');
  if (detected.hasDecisionMakers) positiveSignals.push('reachable leaders');
  
  if (positiveSignals.length > 0) {
    lines.push(`• Positive signals: ${positiveSignals.join(', ')}`);
  }
  
  return lines.join('\n');
}

/**
 * Create an error score for failed company processing
 */
function createErrorScore(companyName: string, error: unknown): CompositeScore {
  return {
    overall: 0,
    confidence: 'low',
    components: {
      jobSkillsMatch: 0,
      marketIntelligence: 0,
      departmentFit: 0,
      contactQuality: 0
    },
    signalsDetected: {
      hasActiveJobPostings: false,
      hasFundingNews: false,
      hasHiringNews: false,
      hasDepartmentGrowth: false,
      hasTechnologyMatch: false,
      hasDecisionMakers: false
    },
    breakdown: `Failed to calculate signals for ${companyName}`,
    errors: [error instanceof Error ? error.message : 'Unknown error']
  };
}

// =============================================================================
// DATA STORAGE HELPERS
// =============================================================================

/**
 * Convert CompositeScore to storable database format
 * Maps to company_profiles table columns
 */
export function toStorableSignalData(composite: CompositeScore): StorableSignalData {
  return {
    skill_match_score: composite.components.jobSkillsMatch,
    market_signal_score: composite.components.marketIntelligence,
    department_fit_score: composite.components.departmentFit,
    contact_quality_score: composite.components.contactQuality,
    composite_signal_score: composite.overall,
    signal_confidence: composite.confidence,
    signal_data: composite
  };
}

/**
 * Prepare batch update payload for company_profiles
 */
export function prepareSignalUpdates(
  scores: Map<string, CompositeScore>
): Array<{ id: string; updates: StorableSignalData }> {
  const updates: Array<{ id: string; updates: StorableSignalData }> = [];
  
  for (const [companyId, composite] of scores) {
    updates.push({
      id: companyId,
      updates: toStorableSignalData(composite)
    });
  }
  
  return updates;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { SIGNAL_PROVIDERS };

export type {
  SignalResult,
  CompositeScore,
  SignalScores,
  CompanyForSignal
};

export { SIGNAL_WEIGHTS };
