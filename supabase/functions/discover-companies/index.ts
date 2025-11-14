import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ProviderFactory } from './providers/provider-factory.ts';
import { CourseContext } from './providers/types.ts';
import { extractSkillsFromOutcomes, formatSkillsForDisplay } from '../_shared/skill-extraction-service.ts';
import { createDefaultCoordinator, formatCoordinatedResultsForDisplay } from '../_shared/occupation-coordinator.ts';
import { rankCompaniesBySimilarity, formatSemanticFilteringForDisplay, getRecommendedThreshold, shouldSkipSemanticFiltering } from '../_shared/semantic-matching-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  try {
    const supabase = createClient(
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

    console.log(`\n🎓 MODULAR DISCOVERY SYSTEM`);
    console.log(`   Course: ${course.title}`);
    console.log(`   Location: ${location}`);
    console.log(`   Target: ${count} companies`);

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
    const generationRunId = generationRun.id;

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
    // Step 4: Run discovery
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

    const discoveryResult = await provider.discover(courseContext);

    console.log(`\n✅ Discovery Complete:`);
    console.log(`   Discovered: ${discoveryResult.stats.discovered}`);
    console.log(`   Enriched: ${discoveryResult.stats.enriched}`);
    console.log(`   Time: ${discoveryResult.stats.processingTimeSeconds.toFixed(2)}s`);
    console.log(`   Provider: ${discoveryResult.stats.providerUsed}`);

    // ====================================
    // Step 5: PHASE 3: Semantic similarity filtering (WITH GRACEFUL DEGRADATION)
    // ====================================
    const companiesBeforeFilter = discoveryResult.companies.length;

    // SURGICAL FIX: Check if we should skip semantic filtering
    const skipFiltering = shouldSkipSemanticFiltering(
      skillExtractionResult.skills,
      primaryOccupations
    );

    let filteredCompanies;

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
          companies_before_filter: companiesBeforeFilter,
          companies_after_filter: filteredCompanies.length,
          average_similarity_score: 0.5,
          semantic_processing_time_ms: 0
        })
        .eq('id', generationRunId);

      console.log(`   Returning all ${filteredCompanies.length} companies without filtering`);
    } else {
      // Apply semantic filtering normally
      const threshold = getRecommendedThreshold(companiesBeforeFilter);

      console.log(`\n🧠 [Phase 3] Applying semantic similarity filtering...`);
      console.log(`   Threshold: ${(threshold * 100).toFixed(0)}% (adaptive based on ${companiesBeforeFilter} companies)`);

      const semanticResult = await rankCompaniesBySimilarity(
        skillExtractionResult.skills,
        primaryOccupations, // Use O*NET direct results
        discoveryResult.companies,
        threshold
      );
      console.log(formatSemanticFilteringForDisplay(semanticResult));

      // Update generation_run with semantic filtering stats
      await supabase
        .from('generation_runs')
        .update({
          semantic_filter_threshold: threshold,
          semantic_filter_applied: true,
          companies_before_filter: companiesBeforeFilter,
          companies_after_filter: semanticResult.matches.length,
          average_similarity_score: semanticResult.averageSimilarity,
          semantic_processing_time_ms: semanticResult.processingTimeMs
        })
        .eq('id', generationRunId);

      console.log(`✅ Semantic filtering: ${companiesBeforeFilter} → ${semanticResult.matches.length} companies`);

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
        match_explanation: company.matchExplanation,
        semantic_matched_at: new Date().toISOString()
      };

      // UPSERT using website as unique identifier
      const { data: existingCompany } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('website', company.website)
        .maybeSingle();

      if (existingCompany) {
        await supabase
          .from('company_profiles')
          .update(companyData)
          .eq('id', existingCompany.id);
      } else {
        await supabase
          .from('company_profiles')
          .insert(companyData);
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
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Discovery error:', error);
    // Return generic error message to prevent information leakage
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to discover companies. Please check your configuration and try again.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
