import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ProviderFactory } from './providers/provider-factory.ts';
import { CourseContext } from './providers/types.ts';
import { extractSkillsFromOutcomes, formatSkillsForDisplay } from '../_shared/skill-extraction-service.ts';
import { createDefaultCoordinator, formatCoordinatedResultsForDisplay } from '../_shared/occupation-coordinator.ts';
import { rankCompaniesBySimilarity, formatSemanticFilteringForDisplay, getRecommendedThreshold } from '../_shared/semantic-matching-service.ts';

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
    // Step 2: PHASE 1: O*NET-First Skill Extraction
    // ====================================
    console.log(`\n🧠 [Phase 1] O*NET-First Skill Extraction...`);
    
    // Import types and services
    const { mapSkillsToOnet } = await import('../_shared/onet-service.ts');
    type ExtractedSkill = {
      skill: string;
      category: 'technical' | 'analytical' | 'domain' | 'tool' | 'framework';
      confidence: number;
      source: string;
      keywords: string[];
    };
    
    // Extract keywords from course title and topics for O*NET search
    const stopWords = ['course', 'introduction', 'advanced', 'able', 'skill', 'part', 'requisite'];
    const titleKeywords = course.title
      .toLowerCase()
      .replace(/[:\-]/g, ' ')  // Replace separators with spaces
      .split(/\s+/)
      .filter((word: string) => word.length > 3 && !stopWords.includes(word) && !/^\d+$/.test(word))
      .slice(0, 5);
    
    const topicKeywords = topics
      .slice(0, 3)
      .flatMap((topic: string) => 
        topic.toLowerCase()
          .split(/\s+/)
          .filter((word: string) => word.length > 3 && !stopWords.includes(word))
      )
      .slice(0, 10);
    
    const searchKeywords = [...new Set([...titleKeywords, ...topicKeywords])].slice(0, 8);
    console.log(`   Keywords for O*NET: ${searchKeywords.join(', ')}`);
    
    // Create simple keyword "skills" for O*NET search
    const keywordSkills: ExtractedSkill[] = searchKeywords.map(kw => ({
      skill: kw,
      category: 'technical' as const,
      confidence: 0.7,
      source: 'course-metadata',
      keywords: [kw]
    }));
    
    // Search O*NET for relevant occupations using keywords
    const onetResult = await mapSkillsToOnet(keywordSkills);
    console.log(`   Found ${onetResult.occupations.length} O*NET occupations`);
    
    // Extract skills from top O*NET occupations
    const extractedSkills: ExtractedSkill[] = [];
    
    for (const occ of onetResult.occupations.slice(0, 3)) {
      console.log(`   Extracting skills from: ${occ.title}`);
      
      // Add top skills from this occupation
      occ.skills.slice(0, 10).forEach((skill) => {
        extractedSkills.push({
          skill: skill.name,
          category: 'technical',
          confidence: 0.9,
          source: `onet:${occ.code}`,
          keywords: [skill.name.toLowerCase()]
        });
      });
      
      // Add technologies as skills
      occ.technologies.slice(0, 5).forEach((tech) => {
        extractedSkills.push({
          skill: tech,
          category: 'tool',
          confidence: 0.85,
          source: `onet:${occ.code}:tech`,
          keywords: [tech.toLowerCase()]
        });
      });
    }
    
    // Remove duplicates
    const uniqueSkills = Array.from(
      new Map(extractedSkills.map(s => [s.skill.toLowerCase(), s])).values()
    );
    
    const skillExtractionResult = {
      skills: uniqueSkills,
      totalExtracted: uniqueSkills.length,
      sources: { onet: uniqueSkills.length },
      extractionMethod: 'onet-first'
    };
    
    console.log(`   ✅ Extracted ${uniqueSkills.length} skills from O*NET`);
    console.log(`   Top skills: ${uniqueSkills.slice(0, 5).map(s => s.skill).join(', ')}`);

    console.log(`\n🔍 [Phase 2] O*NET Direct Occupation Mapping (Option 1)...`);
    
    // Use O*NET occupations directly from Phase 1 for semantic filtering
    // Convert to StandardOccupation format for consistency
    const primaryOccupations = onetResult.occupations.map(occ => ({
      code: occ.code,
      title: occ.title,
      description: occ.description,
      matchScore: occ.matchScore,
      skills: occ.skills.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        importance: s.importance,
        level: s.level
      })),
      dwas: occ.dwas.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        importance: d.importance,
        level: d.level
      })),
      tools: occ.tools,
      technologies: occ.technologies,
      tasks: occ.tasks || [],
      provider: 'onet',
      confidence: occ.matchScore
    }));
    
    console.log(`   ✅ Using ${primaryOccupations.length} O*NET occupations for semantic filtering`);
    console.log(`   Top occupations: ${primaryOccupations.slice(0, 3).map(o => o.title).join(', ')}`);
    
    // Extract job titles for intelligent filtering
    const intelligentJobTitles = new Set<string>();
    for (const occupation of primaryOccupations.slice(0, 5)) {
      intelligentJobTitles.add(occupation.title);
    }
    console.log(`   📋 Job titles for matching: ${Array.from(intelligentJobTitles).join(', ')}`);
    
    // Store O*NET mapping in generation_run
    await supabase
      .from('generation_runs')
      .update({
        extracted_skills: skillExtractionResult.skills,
        skill_extraction_method: skillExtractionResult.extractionMethod,
        skills_extracted_at: new Date().toISOString(),
        onet_occupations: primaryOccupations,
        onet_mapping_method: 'onet-direct',
        onet_mapped_at: new Date().toISOString(),
        onet_api_calls: onetResult.apiCalls,
        onet_cache_hits: onetResult.cacheHits
      })
      .eq('id', generationRunId);

    console.log(`   ✅ Stored O*NET occupation data in generation_run ${generationRunId}`);

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
      // Phase 1+2: Include intelligent matching data from O*NET
      extractedSkills: skillExtractionResult.skills,
      onetOccupations: primaryOccupations, // Use O*NET direct results
      courseTitle: course.title
    };

    const discoveryResult = await provider.discover(courseContext);

    console.log(`\n✅ Discovery Complete:`);
    console.log(`   Discovered: ${discoveryResult.stats.discovered}`);
    console.log(`   Enriched: ${discoveryResult.stats.enriched}`);
    console.log(`   Time: ${discoveryResult.stats.processingTimeSeconds.toFixed(2)}s`);
    console.log(`   Provider: ${discoveryResult.stats.providerUsed}`);

    // ====================================
    // Step 5: PHASE 3: Semantic similarity filtering
    // ====================================
    const companiesBeforeFilter = discoveryResult.companies.length;
    const threshold = getRecommendedThreshold(companiesBeforeFilter);

    console.log(`\n🧠 [Phase 3] Applying semantic similarity filtering...`);
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
    const filteredCompanies = semanticResult.matches.map(match => {
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
