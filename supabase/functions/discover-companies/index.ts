import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ProviderFactory } from './providers/provider-factory.ts';
import { CourseContext, DiscoveredCompany } from './providers/types.ts';
import { extractSkillsFromOutcomes, formatSkillsForDisplay } from '../_shared/skill-extraction-service.ts';
import { createDefaultCoordinator, formatCoordinatedResultsForDisplay } from '../_shared/occupation-coordinator.ts';
import { rankCompaniesBySimilarity, formatSemanticFilteringForDisplay, getRecommendedThreshold, shouldSkipSemanticFiltering } from '../_shared/semantic-matching-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ERROR CLASSIFICATION MODEL
 *
 * Categorizes discovery errors by domain to enable targeted debugging and user-friendly messages
 */
type ErrorCategory = 'CONFIG_ERROR' | 'EXTERNAL_API_ERROR' | 'DATA_ERROR' | 'DB_ERROR' | 'UNKNOWN_ERROR';

interface ClassifiedError {
  category: ErrorCategory;
  message: string;
  details: {
    source?: string;        // 'APOLLO_SEARCH' | 'AI_GATEWAY' | 'APOLLO_ENRICHMENT' | etc
    status?: number;        // HTTP status code if applicable
    table?: string;         // DB table if DB_ERROR
    operation?: string;     // 'insert' | 'update' | 'select'
    code?: string;          // Error code (Supabase error codes, etc)
    phase?: string;         // Which phase failed: 'initialization' | 'search' | 'enrichment' | 'filtering' | 'storage'
    rawError?: string;      // Sanitized raw error for debugging
  };
}

/**
 * Classify an unknown error into a structured category
 */
function classifyDiscoveryError(error: unknown, phase: string = 'unknown'): ClassifiedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : 'UnknownError';

  // CONFIG_ERROR: Missing API keys, provider not configured
  if (errorMessage.includes('not configured') ||
      errorMessage.includes('missing API key') ||
      errorMessage.includes('APOLLO_API_KEY') ||
      errorMessage.includes('LOVABLE_API_KEY')) {
    return {
      category: 'CONFIG_ERROR',
      message: 'Service configuration error - missing required API credentials',
      details: {
        phase,
        rawError: errorMessage.substring(0, 200)
      }
    };
  }

  // EXTERNAL_API_ERROR: Apollo or AI gateway failures
  if (errorMessage.includes('Apollo search failed') ||
      errorMessage.includes('Apollo enrichment failed') ||
      errorMessage.includes('AI filter generation failed')) {

    // Extract HTTP status if present (e.g., "Apollo search failed: 401")
    const statusMatch = errorMessage.match(/failed:?\s*(\d{3})/);
    const status = statusMatch ? parseInt(statusMatch[1]) : undefined;

    let source = 'UNKNOWN_API';
    if (errorMessage.includes('Apollo search')) source = 'APOLLO_SEARCH';
    else if (errorMessage.includes('Apollo enrichment')) source = 'APOLLO_ENRICHMENT';
    else if (errorMessage.includes('AI filter')) source = 'AI_GATEWAY';

    return {
      category: 'EXTERNAL_API_ERROR',
      message: `External API failure: ${source}`,
      details: {
        source,
        status,
        phase,
        rawError: errorMessage.substring(0, 200)
      }
    };
  }

  // DB_ERROR: Supabase database operation failures
  if (errorMessage.includes('Database') ||
      errorMessage.includes('insert failed') ||
      errorMessage.includes('update failed') ||
      (error as any)?.code?.startsWith('23')) {  // PostgreSQL constraint violations

    const tableMatch = errorMessage.match(/table ['"]?(\w+)['"]?/i);
    const operationMatch = errorMessage.match(/(insert|update|select|delete)/i);

    return {
      category: 'DB_ERROR',
      message: 'Database operation failed',
      details: {
        table: tableMatch?.[1],
        operation: operationMatch?.[1]?.toLowerCase(),
        code: (error as any)?.code,
        phase,
        rawError: errorMessage.substring(0, 200)
      }
    };
  }

  // DATA_ERROR: No viable companies, semantic filtering rejected all
  if (errorMessage.includes('No companies found') ||
      errorMessage.includes('No viable companies') ||
      errorMessage.includes('all companies filtered out')) {
    return {
      category: 'DATA_ERROR',
      message: 'No suitable companies found for the given criteria',
      details: {
        phase,
        rawError: errorMessage.substring(0, 200)
      }
    };
  }

  // UNKNOWN_ERROR: Everything else
  return {
    category: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred during company discovery',
    details: {
      phase,
      rawError: errorMessage.substring(0, 200)
    }
  };
}

/**
 * MODULAR DISCOVERY ARCHITECTURE
 * 
 * This edge function uses a plugin-based provider system:
 * - Providers implement a common interface (DiscoveryProvider)
 * - Providers are swappable via environment variables
 * - Automatic fallback support if primary provider fails
 * - Easy to extend with new providers
 * 
 * Configuration via environment variables:
 * - DISCOVERY_PROVIDER: "apollo" | "google" | "hybrid" (default: "apollo")
 * - FALLBACK_PROVIDER: "apollo" | "google" (optional)
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  // Declare variables outside try block for catch block access
  let supabase: any;
  let generationRunId: string | undefined;

  try {
    supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { courseId, location, industries = [], count = 4 } = await req.json();

    // Get course data including search_location for Apollo queries
    const { data: course, error: courseError } = await supabase
      .from('course_profiles')
      .select('*, search_location')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    const outcomes = course.outcomes || [];
    // Extract topics from course title and outcomes for O*NET keyword search
    const topics = [
      course.title,
      ...(outcomes || []).slice(0, 2)
    ].filter(Boolean);

    // Use search_location if available (Apollo-friendly), fallback to location parameter
    const searchLocation = course.search_location || location;

    // 🗺️ DIAGNOSTIC: Trace searchLocation data flow
    console.log(`\n🎓 COURSE DISCOVERY INITIALIZATION`);
    console.log(`   Course: ${course.title}`);
    console.log(`   📍 Location Tracing:`);
    console.log(`      - location (request param): "${location}"`);
    console.log(`      - course.search_location (DB): "${course.search_location || '(not set)'}"`);
    console.log(`      - Final searchLocation: "${searchLocation}"`);

    // DEFENSIVE: Validate searchLocation exists for proximity sorting
    if (!searchLocation || searchLocation.trim().length === 0) {
      console.log(`   ⚠️  WARNING: searchLocation is EMPTY - proximity sorting will be SKIPPED`);
      console.log(`   💡 To enable proximity: Populate course.search_location during syllabus parsing`);
    }

    console.log(`   Target: ${count} companies\n`);

    // ====================================
    // Step 1: Create generation run record
    // ====================================
    const { data: generationRun, error: runError } = await supabase
      .from('generation_runs')
      .insert({
        course_id: courseId,
        location: location,
        industries: industries,
        num_teams: count,
        status: 'in_progress',
        ai_models_used: { discovery: 'modular_provider_system' }
      })
      .select()
      .single();

    if (runError) throw runError;
    generationRunId = generationRun.id;

    // ====================================
    // Step 2: PHASE 1: Direct SOC Code Mapping (SURGICAL FIX)
    // ====================================
    console.log(`\n🎯 [Phase 1] Direct SOC Code Mapping (replacing flawed keyword search)...`);
    
    // Import SOC mapping service
    const { mapCourseToSOC, getIndustryKeywordsFromSOC, getJobTitlesFromSOC, generateFallbackSkillsFromSOC, generateFallbackTechnologiesFromSOC } =
      await import('../_shared/course-soc-mapping.ts');
    
    // Map course directly to correct SOC codes
    const socMappings = mapCourseToSOC(course.title, outcomes, course.level);
    
    if (socMappings.length === 0) {
      console.warn(`   ⚠️  No SOC mappings found for course, using fallback...`);
    }
    
    // Get O*NET occupation details from SOC codes using OnetProvider
    const { OnetProvider } = await import('../_shared/onet-service.ts');
    const onetProvider = new OnetProvider();
    const onetOccupations: any[] = [];
    
    for (const socMapping of socMappings.slice(0, 3)) {
      try {
        // Fetch occupation details using O*NET provider
        const occDetails = await onetProvider.getOccupationDetails(socMapping.socCode);

        if (occDetails && occDetails.skills && occDetails.skills.length > 0) {
          // O*NET returned valid data
          console.log(`   ✅ O*NET data retrieved for ${socMapping.socCode}: ${occDetails.skills.length} skills, ${occDetails.technologies.length} technologies`);
          onetOccupations.push({
            code: occDetails.code || socMapping.socCode,
            title: occDetails.title || socMapping.title,
            description: occDetails.description || '',
            matchScore: socMapping.confidence,
            skills: occDetails.skills || [],
            dwas: occDetails.dwas || [],
            tools: occDetails.tools || [],
            technologies: occDetails.technologies || [],
            tasks: occDetails.tasks || [],
            provider: 'onet',
            confidence: socMapping.confidence
          });
        } else {
          // O*NET returned empty data - use fallback
          console.warn(`   ⚠️  O*NET returned empty data for ${socMapping.socCode}, using SOC-based fallback`);
          const fallbackTechs = generateFallbackTechnologiesFromSOC(socMapping);
          onetOccupations.push({
            code: socMapping.socCode,
            title: socMapping.title,
            description: `${socMapping.title} in ${socMapping.industries.join(', ')} industries`,
            matchScore: socMapping.confidence,
            skills: [], // Will be populated by fallback skills below
            dwas: [],
            tools: [],
            technologies: fallbackTechs,
            tasks: [],
            provider: 'soc-fallback',
            confidence: socMapping.confidence * 0.8, // Lower confidence for fallback
            _socMapping: socMapping // Store for fallback skill generation
          });
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to fetch O*NET details for ${socMapping.socCode}:`, error);
        // Use fallback when O*NET API fails
        const fallbackTechs = generateFallbackTechnologiesFromSOC(socMapping);
        onetOccupations.push({
          code: socMapping.socCode,
          title: socMapping.title,
          description: `${socMapping.title} in ${socMapping.industries.join(', ')} industries`,
          matchScore: socMapping.confidence,
          skills: [],
          dwas: [],
          tools: [],
          technologies: fallbackTechs,
          tasks: [],
          provider: 'soc-fallback',
          confidence: socMapping.confidence * 0.8,
          _socMapping: socMapping
        });
      }
    }
    
    console.log(`   ✅ Fetched ${onetOccupations.length} O*NET occupations from SOC codes`);
    
    // Extract skills from O*NET occupations
    type ExtractedSkill = {
      skill: string;
      category: 'technical' | 'analytical' | 'domain' | 'tool' | 'framework';
      confidence: number;
      source: string;
      keywords: string[];
    };
    
    const extractedSkills: ExtractedSkill[] = [];

    for (const occ of onetOccupations) {
      console.log(`   Extracting skills from: ${occ.title} (provider: ${occ.provider})`);

      if (occ.provider === 'soc-fallback' && occ._socMapping) {
        // Use fallback skills when O*NET data is unavailable
        console.log(`   📦 Using fallback skills for ${occ.code}`);
        const fallbackSkills = generateFallbackSkillsFromSOC(occ._socMapping);
        extractedSkills.push(...fallbackSkills);
      } else {
        // Use O*NET data
        // Add top skills
        occ.skills.slice(0, 10).forEach((skill: any) => {
          extractedSkills.push({
            skill: skill.name,
            category: 'technical',
            confidence: 0.9,
            source: `onet:${occ.code}`,
            keywords: [skill.name.toLowerCase()]
          });
        });

        // Add technologies
        occ.technologies.slice(0, 5).forEach((tech: string) => {
          extractedSkills.push({
            skill: tech,
            category: 'tool',
            confidence: 0.85,
            source: `onet:${occ.code}:tech`,
            keywords: [tech.toLowerCase()]
          });
        });
      }
    }

    // Remove duplicates
    const uniqueSkills = Array.from(
      new Map(extractedSkills.map(s => [s.skill.toLowerCase(), s])).values()
    );

    const skillExtractionResult = {
      skills: uniqueSkills,
      totalExtracted: uniqueSkills.length,
      sources: {
        onet: uniqueSkills.filter(s => s.source.startsWith('onet')).length,
        fallback: uniqueSkills.filter(s => s.source.startsWith('soc-fallback')).length
      },
      extractionMethod: 'soc-direct-mapping-with-fallback'
    };

    console.log(`   ✅ Extracted ${uniqueSkills.length} skills via SOC mapping`);
    console.log(`   Sources: ${skillExtractionResult.sources.onet} from O*NET, ${skillExtractionResult.sources.fallback} from fallback`);
    console.log(`   Top skills: ${uniqueSkills.slice(0, 5).map(s => s.skill).join(', ')}`);

    // ====================================
    // Step 2: PHASE 2: Store SOC Mapping Results
    // ====================================
    console.log(`\n📊 [Phase 2] Storing SOC mapping results...`);
    
    // Prepare O*NET occupations in standardized format with all required fields
    const primaryOccupations = onetOccupations.map((occ: any) => ({
      code: occ.code,
      title: occ.title,
      description: occ.description || '',
      matchScore: occ.matchScore || 0,
      skills: occ.skills || [],
      dwas: occ.dwas || [],
      tools: occ.tools || [],
      technologies: occ.technologies || [],
      tasks: occ.tasks || [],
      provider: occ.provider || 'onet',
      confidence: occ.confidence || 0.9
    }));
    
    // Store in generation_run
    const { error: updateRunError2 } = await supabase
      .from('generation_runs')
      .update({
        onet_occupations: primaryOccupations,
        occupation_mapping_provider: 'onet-soc-direct',
        occupation_mapping_confidence: socMappings[0]?.confidence || 0,
        extracted_skills: skillExtractionResult.skills,
        skill_extraction_model: 'soc-mapping'
      })
      .eq('id', generationRunId);
    
    if (updateRunError2) {
      console.error('Failed to store O*NET mapping:', updateRunError2);
    }
    
    console.log(`   ✅ Stored SOC mapping data in generation_run ${generationRunId}`);

    // ====================================
    // Step 3: Get provider configuration
    // ====================================
    const providerConfig = ProviderFactory.getConfigFromEnv();
    console.log(`\n📋 Provider Configuration:`);
    console.log(`   Primary: ${providerConfig.provider}`);
    console.log(`   Fallback: ${providerConfig.fallbackProvider || 'none'}`);

    // ====================================
    // Step 3: Get configured provider
    // ====================================
    const provider = await ProviderFactory.getProvider(providerConfig);
    console.log(`\n✓ Using provider: ${provider.name} v${provider.version}`);

    // ====================================
    // Step 4: Run discovery (WITH AUTOMATIC FALLBACK)
    // ====================================
    const courseContext: CourseContext = {
      outcomes,
      level: course.level,
      topics,
      location, // Display location for logging/UI
      searchLocation, // Apollo-friendly format for searches
      targetCount: count,
      // Phase 1+2: Include intelligent matching data from SOC mapping
      extractedSkills: skillExtractionResult.skills,
      onetOccupations: primaryOccupations,
      courseTitle: course.title,
      socMappings // Pass SOC mappings for industry-based search
    };

    // HYBRID DISCOVERY: Try primary provider, auto-fallback to Adzuna if 0 results
    let discoveryResult;
    let usedFallback = false;
    let primaryProviderError: string | null = null;

    try {
      discoveryResult = await provider.discover(courseContext);

      // Check if primary provider returned 0 companies
      if (discoveryResult.companies.length === 0 && providerConfig.provider === 'apollo') {
        console.log(`\n⚠️  PRIMARY PROVIDER (${provider.name}) RETURNED 0 COMPANIES`);
        console.log(`   Attempting automatic fallback to Adzuna...`);

        primaryProviderError = `${provider.name} returned 0 companies for location: ${searchLocation}`;

        // Try Adzuna fallback
        const adzunaProvider = await ProviderFactory.getProvider({ provider: 'adzuna' });
        console.log(`   Fallback provider: ${adzunaProvider.name} v${adzunaProvider.version}`);

        try {
          discoveryResult = await adzunaProvider.discover(courseContext);
          usedFallback = true;

          console.log(`   ✅ Fallback successful: ${discoveryResult.companies.length} companies from Adzuna`);
        } catch (fallbackError) {
          console.error(`   ❌ Fallback to Adzuna also failed:`, fallbackError);
          // Keep original Apollo result (0 companies) and continue
          // Error will be handled in later stages
        }
      }
    } catch (primaryError) {
      console.error(`\n❌ PRIMARY PROVIDER (${provider.name}) FAILED WITH ERROR`);
      console.error(`   Error:`, primaryError);

      primaryProviderError = primaryError instanceof Error ? primaryError.message : String(primaryError);

      // Try Adzuna as fallback for any primary provider error
      if (providerConfig.provider === 'apollo') {
        console.log(`   Attempting automatic fallback to Adzuna...`);

        try {
          const adzunaProvider = await ProviderFactory.getProvider({ provider: 'adzuna' });
          discoveryResult = await adzunaProvider.discover(courseContext);
          usedFallback = true;

          console.log(`   ✅ Fallback successful: ${discoveryResult.companies.length} companies from Adzuna`);
        } catch (fallbackError) {
          console.error(`   ❌ Fallback to Adzuna also failed:`, fallbackError);
          throw primaryError; // Re-throw original error if fallback also fails
        }
      } else {
        throw primaryError; // No fallback available for non-Apollo providers
      }
    }

    console.log(`\n✅ Discovery Complete:`);
    console.log(`   Discovered: ${discoveryResult.stats.discovered}`);
    console.log(`   Enriched: ${discoveryResult.stats.enriched}`);
    console.log(`   Time: ${discoveryResult.stats.processingTimeSeconds.toFixed(2)}s`);
    console.log(`   Provider: ${discoveryResult.stats.providerUsed}`);
    if (usedFallback) {
      console.log(`   ⚠️  FALLBACK USED: Primary provider (${providerConfig.provider}) failed/returned 0`);
      console.log(`   Primary error: ${primaryProviderError}`);
    }

    // ====================================
    // Step 5: PHASE 3: Semantic similarity filtering (WITH GRACEFUL DEGRADATION)
    // ====================================
    const companiesBeforeFilter = discoveryResult.companies.length;

    // SURGICAL FIX: Check if we should skip semantic filtering
    const skipFiltering = shouldSkipSemanticFiltering(
      skillExtractionResult.skills,
      primaryOccupations
    );

    // Type-safe filtered companies with all semantic matching metadata
    // Using intersection type: DiscoveredCompany properties + additional semantic fields
    let filteredCompanies: Array<DiscoveredCompany & {
      similarityScore: number;
      matchConfidence: string;
      matchingSkills?: string[];
      matchingDWAs?: string[];
      matchExplanation?: string;
    }>;

    if (skipFiltering || companiesBeforeFilter === 0) {
      // Skip semantic filtering - use all companies
      console.log(`\n⚠️  [Phase 3] Skipping semantic filtering (insufficient data or 0 companies)`);
      filteredCompanies = discoveryResult.companies.map(company => ({
        ...company,
        similarityScore: 0.5, // Default score when filtering is skipped
        matchConfidence: 'medium' as const,
        matchingSkills: [],
        matchingDWAs: [],
        matchExplanation: 'Semantic filtering skipped due to insufficient O*NET data'
      }));

      // Update generation_run
      await supabase
        .from('generation_runs')
        .update({
          semantic_filter_threshold: null,
          semantic_filter_applied: false,
          companies_before_filtering: companiesBeforeFilter,
          companies_after_filtering: filteredCompanies.length,
          average_similarity_score: 0.5,
          semantic_processing_time_ms: 0
        })
        .eq('id', generationRunId);

      console.log(`   Returning all ${filteredCompanies.length} companies without filtering`);
    } else {
      // Apply semantic filtering with adaptive threshold retry
      let threshold = getRecommendedThreshold(companiesBeforeFilter);
      const MIN_THRESHOLD = 0.15; // Don't go below 15%
      const THRESHOLD_STEP = 0.10; // Lower by 10% each retry
      const targetCount = Math.ceil(count * 0.5); // Need at least 50% of requested projects
      let semanticResult;
      let retryAttempt = 0;

      console.log(`\n🧠 [Phase 3] Applying semantic similarity filtering with adaptive retry...`);
      console.log(`   Target: At least ${targetCount} companies (50% of ${count} requested projects)`);
      console.log(`   Initial threshold: ${(threshold * 100).toFixed(0)}%`);

      // DIAGNOSTIC: Log what companies Apollo returned BEFORE filtering
      console.log(`\n📊 [DIAGNOSTIC] Companies from Apollo (BEFORE semantic filtering):`);
      discoveryResult.companies.slice(0, 5).forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name}`);
        console.log(`      Industry: ${c.sector || 'Unknown'}`);
        console.log(`      Location: ${c.city || 'Unknown'}, ${c.state || 'Unknown'}`);
        console.log(`      Technologies: ${c.technologiesUsed?.length || 0} listed`);
        console.log(`      Job Postings: ${c.jobPostings?.length || 0}`);
      });
      console.log(`\n📦 [DIAGNOSTIC] Skills being used for matching (${skillExtractionResult.skills.length} total):`);
      console.log(`   ${skillExtractionResult.skills.slice(0, 10).map(s => s.skill).join(', ')}...`);

      // Adaptive threshold retry loop
      while (true) {
        retryAttempt++;
        console.log(`\n🎯 Attempt ${retryAttempt}: Threshold ${(threshold * 100).toFixed(0)}%`);

        semanticResult = await rankCompaniesBySimilarity(
          skillExtractionResult.skills,
          primaryOccupations, // Use O*NET direct results
          discoveryResult.companies,
          threshold,
          socMappings // Pass SOC mappings for context-aware filtering
        );

        console.log(`   Result: ${semanticResult.matches.length} companies passed`);

        // Check if we have enough companies or hit minimum threshold
        if (semanticResult.matches.length >= targetCount) {
          console.log(`   ✅ Target met: ${semanticResult.matches.length} >= ${targetCount} companies`);
          break;
        } else if (threshold - THRESHOLD_STEP < MIN_THRESHOLD) {
          console.log(`   ⚠️  Cannot lower threshold below ${(MIN_THRESHOLD * 100).toFixed(0)}%`);
          console.log(`   Proceeding with ${semanticResult.matches.length} companies (${((semanticResult.matches.length / count) * 100).toFixed(0)}% of target)`);
          break;
        } else {
          threshold -= THRESHOLD_STEP;
          console.log(`   📉 Lowering threshold to ${(threshold * 100).toFixed(0)}% and retrying...`);
        }
      }

      console.log(formatSemanticFilteringForDisplay(semanticResult));

      // Update generation_run with semantic filtering stats
      await supabase
        .from('generation_runs')
        .update({
          semantic_filter_threshold: threshold,
          semantic_filter_applied: true,
          companies_before_filtering: companiesBeforeFilter,
          companies_after_filtering: semanticResult.matches.length,
          average_similarity_score: semanticResult.averageSimilarity,
          semantic_processing_time_ms: semanticResult.processingTimeMs,
          scoring_notes: retryAttempt > 1 
            ? `Adaptive threshold: Started at ${(getRecommendedThreshold(companiesBeforeFilter) * 100).toFixed(0)}%, lowered to ${(threshold * 100).toFixed(0)}% over ${retryAttempt} attempts to reach target`
            : null
        })
        .eq('id', generationRunId);

      console.log(`✅ Semantic filtering: ${companiesBeforeFilter} → ${semanticResult.matches.length} companies (${retryAttempt} attempts)`);

      // INTELLIGENT FALLBACK: If filtering rejected ALL companies but we have enriched companies
      // Preserve top N with a confidence flag indicating lower quality match
      // CRITICAL FIX: Only preserve companies with score > minimum threshold (not 0%)
      if (semanticResult.matches.length === 0 && discoveryResult.companies.length > 0) {
        console.log(`\n⚠️  [Intelligent Fallback] All companies filtered out by semantic threshold`);

        // Sort all companies by their raw similarity scores (before threshold filtering)
        // FIX: Use allMatches instead of matches to get raw scores for ALL companies
        const allMatchesSorted = discoveryResult.companies.map(company => {
          const match = semanticResult.allMatches.find(m => m.companyName === company.name);
          return {
            company,
            similarityScore: match?.similarityScore || 0,
            matchingSkills: match?.matchingSkills || [],
            matchingDWAs: match?.matchingDWAs || []
          };
        }).sort((a, b) => b.similarityScore - a.similarityScore);

        // 🔥 ADAPTIVE FALLBACK THRESHOLD: Relaxed to get more results
        // RELAXED: Lowered all thresholds to allow more companies through
        const apolloCompanyCount = discoveryResult.companies.length;
        let MINIMUM_FALLBACK_SCORE: number;

        if (apolloCompanyCount <= 2) {
          MINIMUM_FALLBACK_SCORE = 0.005; // 0.5% - relaxed from 1%
          console.log(`   📉 DESPERATION MODE: Apollo only returned ${apolloCompanyCount} companies - accepting ANY match > 0.5%`);
        } else if (apolloCompanyCount <= 5) {
          MINIMUM_FALLBACK_SCORE = 0.02; // 2% - relaxed from 3%
          console.log(`   📉 RELAXED MODE: Apollo returned ${apolloCompanyCount} companies - accepting matches > 2%`);
        } else {
          MINIMUM_FALLBACK_SCORE = 0.03; // 3% - relaxed from 5%
          console.log(`   📊 STANDARD MODE: Apollo returned ${apolloCompanyCount} companies - accepting matches > 3%`);
        }

        const viableCompanies = allMatchesSorted.filter(m => m.similarityScore > MINIMUM_FALLBACK_SCORE);

        if (viableCompanies.length === 0) {
          console.log(`   ❌ No viable companies found - all scored below ${(MINIMUM_FALLBACK_SCORE * 100).toFixed(0)}%`);
          console.log(`   Cannot generate projects with 0% similarity companies (likely staffing/recruiting firms)`);

          // DIAGNOSTIC: Show top companies with industries for debugging
          console.log(`   Top companies discovered:`);
          allMatchesSorted.slice(0, 3).forEach((m, i) => {
            const industry = m.company.sector || 'Unknown';
            console.log(`     ${i + 1}. ${m.company.name}: ${(m.similarityScore * 100).toFixed(0)}% (${industry})`);
          });

          filteredCompanies = []; // Return empty - better than bad matches

          // Update generation_run to reflect failure
          await supabase
            .from('generation_runs')
            .update({
              companies_after_filtering: 0,
              semantic_filter_threshold: threshold,
              scoring_notes: `Fallback rejected: All companies scored below ${(MINIMUM_FALLBACK_SCORE * 100).toFixed(0)}% (likely staffing firms or irrelevant industries)`,
              status: 'failed'
            })
            .eq('id', generationRunId);
        } else {
          // Take top N viable companies
          console.log(`   Preserving top ${Math.min(count, viableCompanies.length)} viable companies (score > ${(MINIMUM_FALLBACK_SCORE * 100).toFixed(0)}%)`);

          filteredCompanies = viableCompanies.slice(0, count).map(({ company, similarityScore, matchingSkills, matchingDWAs }) => ({
            ...company,
            similarityScore,
            matchConfidence: 'low' as const,
            matchingSkills,
            matchingDWAs,
            matchExplanation: `Preserved by fallback: Below threshold but best available match (${(similarityScore * 100).toFixed(0)}%)`
          }));

          // Log preserved companies for visibility
          filteredCompanies.forEach((c, i) => {
            console.log(`     ${i + 1}. ${c.name}: ${(c.similarityScore * 100).toFixed(0)}% (${c.sector || 'Unknown'})`);
          });

          // Update generation_run to reflect fallback was used
          await supabase
            .from('generation_runs')
            .update({
              companies_after_filtering: filteredCompanies.length,
              semantic_filter_threshold: threshold,
              scoring_notes: `Intelligent fallback activated: preserved ${filteredCompanies.length} companies above ${(MINIMUM_FALLBACK_SCORE * 100).toFixed(0)}% threshold`
            })
            .eq('id', generationRunId);

          console.log(`   ✅ Fallback preserved ${filteredCompanies.length} companies for project generation`);
        }
      } else {
        // Map semantic matches back to company objects with similarity data
        filteredCompanies = semanticResult.matches.map(match => {
          const company = discoveryResult.companies.find(c => c.name === match.companyName)!;
          return {
            ...company,
            // Add Phase 3 metadata
            similarityScore: match.similarityScore,
            matchConfidence: match.confidence,
            matchingSkills: match.matchingSkills,
            matchingDWAs: match.matchingDWAs,
            matchExplanation: match.explanation
          };
        });
      }
    }

    // ====================================
    // Step 5.5: HYBRID FALLBACK - Try Adzuna if semantic filtering removed all companies
    // ====================================
    if (filteredCompanies.length === 0 && !usedFallback && providerConfig.provider === 'apollo') {
      console.log(`\n❌ No companies passed semantic filtering`);
      console.log(`   Discovered: ${discoveryResult.companies.length}`);
      console.log(`   After filtering: 0`);
      console.log(`   This usually means: companies were staffing/recruiting firms or irrelevant industries`);
      console.log(`\n⚠️  SEMANTIC FILTER FALLBACK: Attempting Adzuna...`);

      primaryProviderError = `Apollo returned ${discoveryResult.companies.length} companies but all were filtered out (irrelevant industries)`;

      try {
        // Try Adzuna fallback
        const adzunaProvider = await ProviderFactory.getProvider({ provider: 'adzuna' });
        console.log(`   Fallback provider: ${adzunaProvider.name} v${adzunaProvider.version}`);

        const adzunaResult = await adzunaProvider.discover(courseContext);
        usedFallback = true;

        console.log(`   ✅ Adzuna fallback returned ${adzunaResult.companies.length} companies`);

        // Re-run semantic filtering on Adzuna companies
        if (adzunaResult.companies.length > 0) {
          const adzunaThreshold = getRecommendedThreshold(adzunaResult.companies.length);
          console.log(`   🧠 Applying semantic filtering to Adzuna companies (threshold: ${(adzunaThreshold * 100).toFixed(0)}%)`);

          const adzunaSemanticResult = await rankCompaniesBySimilarity(
            skillExtractionResult.skills,
            primaryOccupations,
            adzunaResult.companies,
            adzunaThreshold,
            socMappings
          );

          console.log(`   📊 Adzuna semantic filtering: ${adzunaResult.companies.length} → ${adzunaSemanticResult.matches.length} companies`);

          if (adzunaSemanticResult.matches.length > 0) {
            // Map Adzuna matches to filteredCompanies format
            filteredCompanies = adzunaSemanticResult.matches.map(match => {
              const company = adzunaResult.companies.find(c => c.name === match.companyName)!;
              return {
                ...company,
                similarityScore: match.similarityScore,
                matchConfidence: match.confidence,
                matchingSkills: match.matchingSkills,
                matchingDWAs: match.matchingDWAs,
                matchExplanation: match.explanation
              };
            });

            // Update generation_run with Adzuna success
            await supabase
              .from('generation_runs')
              .update({
                companies_before_filtering: adzunaResult.companies.length,
                companies_after_filtering: filteredCompanies.length,
                semantic_filter_threshold: adzunaThreshold,
                scoring_notes: `Adzuna fallback successful: ${filteredCompanies.length} companies after semantic filtering`
              })
              .eq('id', generationRunId);

            console.log(`   ✅ Proceeding with ${filteredCompanies.length} companies from Adzuna`);
          } else {
            console.log(`   ❌ Adzuna companies also filtered out by semantic matching`);
          }
        }
      } catch (adzunaError) {
        console.error(`   ❌ Adzuna fallback failed:`, adzunaError);
      }
    }

    // Final check: If still no companies after all fallbacks
    if (filteredCompanies.length === 0) {
      console.log(`\n❌ FINAL: No companies available after all fallback attempts`);
      
      // Return early with informative error
      const totalProcessingTime = (Date.now() - startTime) / 1000;
      await supabase
        .from('generation_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          processing_time_seconds: totalProcessingTime,
          scoring_notes: usedFallback 
            ? `All providers exhausted. Apollo filtered out (irrelevant). Adzuna fallback also failed.`
            : 'No viable companies found after semantic filtering (likely all were staffing/recruiting firms)'
        })
        .eq('id', generationRunId);

      return new Response(
        JSON.stringify({
          success: false,
          error: usedFallback
            ? 'No suitable companies found from any provider. Apollo returned irrelevant industries, and Adzuna fallback was attempted but also failed. Try a different location or broader search.'
            : 'No suitable companies found. All discovered companies were filtered out (likely staffing/recruiting firms or irrelevant industries). Try adjusting search parameters.',
          companies: [],
          count: 0,
          generation_run_id: generationRunId,
          diagnostics: {
            primaryProvider: providerConfig.provider,
            usedFallback,
            primaryProviderError,
            companiesDiscovered: discoveryResult.companies.length,
            companiesAfterFiltering: 0
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`\n✅ Proceeding with ${filteredCompanies.length} filtered companies`);

    // ====================================
    // Step 6: Store companies in database
    // ====================================
    for (const company of filteredCompanies) {  // Use filtered companies from Phase 3
      const companyData = {
        name: company.name,
        sector: company.sector,
        size: company.size,
        website: company.website,
        full_address: company.address,
        city: company.city,
        zip: company.zip,
        
        // Contact fields
        contact_person: company.contactPerson,
        contact_email: company.contactEmail,
        contact_phone: company.contactPhone,
        contact_first_name: company.contactFirstName,
        contact_last_name: company.contactLastName,
        contact_title: company.contactTitle,
        contact_headline: company.contactHeadline,
        contact_photo_url: company.contactPhotoUrl,
        contact_city: company.contactCity,
        contact_state: company.contactState,
        contact_country: company.contactCountry,
        contact_email_status: company.contactEmailStatus,
        contact_employment_history: company.contactEmploymentHistory,
        contact_phone_numbers: company.contactPhoneNumbers,
        linkedin_profile: company.contactLinkedin,
        contact_twitter_url: company.contactTwitter,
        
        // Organization fields
        organization_linkedin_url: company.organizationLinkedin,
        organization_twitter_url: company.organizationTwitter,
        organization_facebook_url: company.organizationFacebook,
        organization_founded_year: company.organizationFoundedYear,
        organization_logo_url: company.organizationLogoUrl,
        organization_employee_count: company.organizationEmployeeCount,
        organization_revenue_range: company.organizationRevenueRange,
        organization_industry_keywords: company.organizationIndustryKeywords,
        
        // Market intelligence
        job_postings: company.jobPostings,
        job_postings_last_fetched: company.jobPostings && company.jobPostings.length > 0 
          ? new Date().toISOString() 
          : null,
        technologies_used: company.technologiesUsed,
        buying_intent_signals: company.buyingIntentSignals,
        funding_stage: company.fundingStage,
        total_funding_usd: company.totalFundingUsd,
        
        // Metadata
        source: company.discoverySource,
        discovery_source: 'syllabus_generation',
        generation_run_id: generationRunId,
        apollo_enrichment_date: company.lastEnrichedAt,
        data_enrichment_level: company.enrichmentLevel,
        data_completeness_score: company.dataCompletenessScore,
        last_enriched_at: company.lastEnrichedAt,
        last_verified_at: company.lastVerifiedAt,

        // Phase 3: Semantic matching data
        similarity_score: company.similarityScore,
        match_confidence: company.matchConfidence,
        matching_skills: company.matchingSkills,
        matching_dwas: company.matchingDWAs,
      };


      // UPSERT using website as unique identifier
      const { data: existingCompany } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('website', company.website)
        .maybeSingle();

      if (existingCompany) {
        const { error: updateError } = await supabase
          .from('company_profiles')
          .update(companyData)
          .eq('id', existingCompany.id);
        
        if (updateError) {
          console.error(`❌ Failed to update company ${company.name}:`, updateError);
          throw new Error(`Database update failed for ${company.name}: ${updateError.message}`);
        }
        console.log(`   ✓ Updated existing company: ${company.name}`);
      } else {
        const { error: insertError } = await supabase
          .from('company_profiles')
          .insert(companyData);
        
        if (insertError) {
          console.error(`❌ Failed to insert company ${company.name}:`, insertError);
          throw new Error(`Database insert failed for ${company.name}: ${insertError.message}`);
        }
        console.log(`   ✓ Inserted new company: ${company.name}`);
      }
    }

    // ====================================
    // Step 6: Update generation run
    // ====================================
    const totalProcessingTime = (Date.now() - startTime) / 1000;
    
    await supabase
      .from('generation_runs')
      .update({
        companies_discovered: discoveryResult.stats.discovered,
        companies_enriched: discoveryResult.stats.enriched,
        status: 'completed',
        completed_at: new Date().toISOString(),
        processing_time_seconds: totalProcessingTime,
        apollo_credits_used: discoveryResult.stats.apiCreditsUsed,
        ai_models_used: { 
          discovery: discoveryResult.stats.providerUsed,
          provider_version: provider.version
        }
      })
      .eq('id', generationRunId);

    return new Response(
      JSON.stringify({
        success: true,
        companies: discoveryResult.companies,
        count: discoveryResult.companies.length,
        generation_run_id: generationRunId,
        stats: {
          ...discoveryResult.stats,
          totalProcessingTime
        },
        // DIAGNOSTICS: Provider and fallback information
        diagnostics: {
          primaryProvider: providerConfig.provider,
          usedFallback: usedFallback,
          fallbackProvider: usedFallback ? 'adzuna' : null,
          primaryProviderError: primaryProviderError,
          locationUsed: searchLocation,
          companiesBeforeFiltering: companiesBeforeFilter,
          companiesAfterFiltering: filteredCompanies.length,
          semanticFilterApplied: !skipFiltering,
          averageSimilarity: !skipFiltering && filteredCompanies.length > 0
            ? (filteredCompanies.reduce((sum, c) => sum + (c.similarityScore || 0), 0) / filteredCompanies.length).toFixed(2)
            : null
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    // Enhanced logging for debugging with proper type guards
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.constructor.name : typeof error;

    console.error('❌ DISCOVERY_PIPELINE_FAILED');
    console.error('   Error type:', errorName);
    console.error('   Error message:', errorMessage?.substring(0, 300));
    console.error('   Stack trace:', errorStack?.substring(0, 500));

    // Classify the error using our taxonomy
    const classified = classifyDiscoveryError(error, 'discovery_pipeline');

    console.error('❌ Discovery error (structured):', {
      category: classified.category,
      message: classified.message,
      details: classified.details
    });

    // Persist error diagnostics to generation_runs (if generationRunId exists)
    try {
      if (typeof generationRunId !== 'undefined') {
        await supabase
          .from('generation_runs')
          .update({
            status: 'failed',
            error_category: classified.category,
            error_message: classified.message,
            error_details: classified.details
          })
          .eq('id', generationRunId);
      }
    } catch (updateError) {
      console.error('⚠️  Failed to update generation_run with error details:', updateError);
    }

    // Determine HTTP status based on error category
    // DATA_ERROR returns 200 with success:false (business failure, not system failure)
    // CONFIG_ERROR and UNKNOWN_ERROR return 500 (system failures)
    // EXTERNAL_API_ERROR and DB_ERROR return 500 but with clear categorization
    const httpStatus = (classified.category === 'DATA_ERROR') ? 200 : 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: classified.message,
        category: classified.category,
        details: classified.details
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: httpStatus
      }
    );
  }
});
