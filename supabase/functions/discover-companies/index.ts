import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ProviderFactory } from './providers/provider-factory.ts';
import { CourseContext } from './providers/types.ts';

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
    const topics = course.artifacts?.topics || [];
    
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
    // Step 2: Get provider configuration
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
      targetCount: count
    } as CourseContext & { searchLocation?: string };

    const discoveryResult = await provider.discover(courseContext);

    console.log(`\n✅ Discovery Complete:`);
    console.log(`   Discovered: ${discoveryResult.stats.discovered}`);
    console.log(`   Enriched: ${discoveryResult.stats.enriched}`);
    console.log(`   Time: ${discoveryResult.stats.processingTimeSeconds.toFixed(2)}s`);
    console.log(`   Provider: ${discoveryResult.stats.providerUsed}`);

    // ====================================
    // Step 5: Store companies in database
    // ====================================
    for (const company of discoveryResult.companies) {
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
        last_verified_at: company.lastVerifiedAt
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
