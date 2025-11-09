import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * GET-PROJECT-DETAIL EDGE FUNCTION
 * 
 * PURPOSE: Single source of truth for all project detail page data
 * REPLACES: 5 separate frontend queries (projects, forms, metadata, company, course)
 * GUARANTEES: Clean, normalized, predictable payload with explicit status fields
 */

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Read projectId from request body (not query params)
    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-project-detail] Fetching data for project: ${projectId}`);
    console.log(`[get-project-detail] DEBUG: Received projectId type:`, typeof projectId, 'value:', projectId);

    // ============================================================================
    // STEP 1: AGGREGATED QUERY (Single Database Call)
    // ============================================================================
    // LEFT JOIN all related tables to guarantee complete data fetch
    // Even if metadata/company/forms are null, we still get the project
    
    const { data: rawData, error: queryError } = await supabase
      .from('projects')
      .select(`
        *,
        project_forms!inner (*),
        course_profiles!inner (*),
        project_metadata (*),
        company_profiles (*)
      `)
      .eq('id', projectId)
      .maybeSingle();

    console.log(`[get-project-detail] DEBUG: Query completed`);
    console.log(`[get-project-detail] DEBUG: Query Error:`, queryError);
    console.log(`[get-project-detail] DEBUG: Raw Data:`, rawData ? 'Data received' : 'NULL', rawData ? `with keys: ${Object.keys(rawData).join(', ')}` : '');

    if (queryError) {
      console.error('[get-project-detail] Query error:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch project', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rawData) {
      console.log('[get-project-detail] Project not found:', projectId);
      console.log('[get-project-detail] DEBUG: This likely means INNER JOIN failed - project_forms or course_profiles missing');
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-project-detail] Raw data fetched successfully');

    // ============================================================================
    // STEP 2: VALIDATION & NORMALIZATION LAYER
    // ============================================================================
    // Transform raw database data into a clean, predictable payload
    // This is the critical "Shield" that protects the frontend from bad data

    const project = rawData;
    const forms = rawData.project_forms;
    const course = rawData.course_profiles;
    const metadata = rawData.project_metadata;
    const company = rawData.company_profiles;

    // ----------------------------------------------------------------------------
    // A. NORMALIZE TECHNOLOGIES_USED (Fix Stale Object Array Format)
    // ----------------------------------------------------------------------------
    // GUARANTEE: Frontend always receives string[] or empty array, never object[]
    
    let normalizedTechnologies: string[] = [];
    
    if (company?.technologies_used) {
      const raw = company.technologies_used;
      
      if (Array.isArray(raw)) {
        // Check if it's the old object format: [{ name: "React", ... }, ...]
        if (raw.length > 0 && typeof raw[0] === 'object' && raw[0] !== null && 'name' in raw[0]) {
          console.log('[get-project-detail] Normalizing technologies_used from object[] to string[]');
          normalizedTechnologies = raw
            .map((tech: any) => tech.name)
            .filter((name: any) => typeof name === 'string' && name.length > 0);
        } 
        // Already string[] format
        else if (raw.length > 0 && typeof raw[0] === 'string') {
          normalizedTechnologies = raw;
        }
      }
    }

    console.log('[get-project-detail] Normalized technologies:', normalizedTechnologies);

    // ----------------------------------------------------------------------------
    // B. CONSOLIDATE CONTACT INFO (Fix Conflicting Sources)
    // ----------------------------------------------------------------------------
    // GUARANTEE: Single contact_info object with clear priority logic
    // Priority: company_profiles (enriched) > form2 (user input) > null
    
    const consolidatedContact = {
      name: company?.contact_person || forms?.form2?.contact_name || null,
      email: company?.contact_email || forms?.form2?.contact_email || null,
      phone: company?.contact_phone || forms?.form2?.contact_phone || null,
      title: company?.contact_title || null,
      first_name: company?.contact_first_name || null,
      last_name: company?.contact_last_name || null,
      headline: company?.contact_headline || null,
      photo_url: company?.contact_photo_url || null,
      linkedin: company?.linkedin_profile || null,
      twitter: company?.contact_twitter_url || null,
      city: company?.contact_city || null,
      state: company?.contact_state || null,
      country: company?.contact_country || null,
      employment_history: company?.contact_employment_history || null,
      phone_numbers: company?.contact_phone_numbers || null,
      email_status: company?.contact_email_status || null,
      source: company?.contact_person ? 'enriched' : (forms?.form2?.contact_name ? 'user_input' : 'none')
    };

    console.log('[get-project-detail] Consolidated contact source:', consolidatedContact.source);

    // ----------------------------------------------------------------------------
    // C. CREATE STATUS FIELDS (Fix Incomplete/Legacy Data)
    // ----------------------------------------------------------------------------
    // GUARANTEE: Frontend knows exact state of optional data (not just null checks)
    
    // Pricing Breakdown Status
    const pricingData = metadata?.pricing_breakdown 
      ? { 
          status: 'complete' as const, 
          data: metadata.pricing_breakdown 
        }
      : { 
          status: 'legacy' as const, 
          message: 'This project was generated before detailed pricing breakdowns were implemented. Use pricing_usd for total budget.',
          fallback_value: project.pricing_usd
        };

    // Value Analysis Status
    const valueAnalysisData = metadata?.value_analysis
      ? {
          status: 'complete' as const,
          data: metadata.value_analysis
        }
      : {
          status: 'not_generated' as const,
          message: 'Value analysis has not been generated yet. Use the "Analyze Value" button to generate it.',
          trigger_action: 'analyze-project-value'
        };

    // Stakeholder Insights Status
    const stakeholderInsightsData = metadata?.stakeholder_insights
      ? {
          status: 'complete' as const,
          data: metadata.stakeholder_insights
        }
      : {
          status: 'not_generated' as const,
          message: 'Part of value analysis. Generate value analysis first.'
        };

    // Company Enrichment Status
    const companyEnrichmentStatus = company
      ? {
          level: company.data_enrichment_level || 'basic',
          last_enriched: company.last_enriched_at,
          completeness_score: company.data_completeness_score || 0,
          apollo_date: company.apollo_enrichment_date || null
        }
      : {
          level: 'none' as const,
          message: 'No company profile linked to this project'
        };

    console.log('[get-project-detail] Pricing status:', pricingData.status);
    console.log('[get-project-detail] Value analysis status:', valueAnalysisData.status);

    // ============================================================================
    // STEP 3: CONSTRUCT CLEAN, PREDICTABLE PAYLOAD
    // ============================================================================
    // All optional fields have explicit status. No surprise nulls.
    
    const cleanPayload = {
      // Core project data (always present)
      project: {
        id: project.id,
        title: project.title,
        company_name: project.company_name,
        sector: project.sector,
        tier: project.tier,
        team_size: project.team_size,
        duration_weeks: project.duration_weeks,
        pricing_usd: project.pricing_usd,
        tasks: project.tasks,
        deliverables: project.deliverables,
        lo_score: project.lo_score,
        feasibility_score: project.feasibility_score,
        mutual_benefit_score: project.mutual_benefit_score,
        final_score: project.final_score,
        needs_review: project.needs_review,
        created_at: project.created_at,
        course_id: project.course_id,
        generation_run_id: project.generation_run_id,
        company_profile_id: project.company_profile_id
      },

      // Forms (always present via INNER join)
      forms: {
        form1: forms.form1,
        form2: forms.form2,
        form3: forms.form3,
        form4: forms.form4,
        form5: forms.form5,
        form6: forms.form6,
        milestones: forms.milestones
      },

      // Course profile (always present via INNER join)
      course: {
        id: course.id,
        title: course.title,
        level: course.level,
        city_zip: course.city_zip,
        outcomes: course.outcomes,
        artifacts: course.artifacts,
        schedule: course.schedule,
        hrs_per_week: course.hrs_per_week,
        weeks: course.weeks,
        owner_id: course.owner_id
      },

      // Metadata with explicit status fields
      metadata: {
        // Generation metadata (always present if metadata row exists)
        algorithm_version: metadata?.algorithm_version || 'unknown',
        ai_model_version: metadata?.ai_model_version || 'unknown',
        generation_timestamp: metadata?.generation_timestamp || null,
        
        // Analysis data with status
        lo_alignment_detail: metadata?.lo_alignment_detail || null,
        lo_mapping_tasks: metadata?.lo_mapping_tasks || null,
        lo_mapping_deliverables: metadata?.lo_mapping_deliverables || null,
        scoring_rationale: metadata?.scoring_rationale || null,
        companies_considered: metadata?.companies_considered || null,
        selection_criteria: metadata?.selection_criteria || null,
        market_signals_used: metadata?.market_signals_used || {},
        
        // Scores with explicit completeness
        market_alignment_score: metadata?.market_alignment_score || 0,
        partnership_quality_score: metadata?.partnership_quality_score || 0,
        synergistic_value_index: metadata?.synergistic_value_index || 0,
        
        // Complex fields with status
        pricing_breakdown: pricingData,
        estimated_roi: metadata?.estimated_roi || {},
        value_analysis: valueAnalysisData,
        stakeholder_insights: stakeholderInsightsData,
        
        ai_prompts_used: metadata?.ai_prompts_used || null
      },

      // Company profile with normalized data
      company: company ? {
        id: company.id,
        name: company.name,
        website: company.website,
        sector: company.sector,
        size: company.size,
        
        // Location
        full_address: company.full_address,
        city: company.city,
        zip: company.zip,
        
        // Organization details
        organization_linkedin_url: company.organization_linkedin_url,
        organization_twitter_url: company.organization_twitter_url,
        organization_facebook_url: company.organization_facebook_url,
        organization_logo_url: company.organization_logo_url,
        organization_founded_year: company.organization_founded_year,
        organization_employee_count: company.organization_employee_count,
        organization_revenue_range: company.organization_revenue_range,
        organization_industry_keywords: company.organization_industry_keywords,
        
        // Market intelligence (NORMALIZED)
        technologies_used: normalizedTechnologies, // ✅ Always string[]
        job_postings: company.job_postings || [],
        buying_intent_signals: company.buying_intent_signals || [],
        funding_stage: company.funding_stage,
        total_funding_usd: company.total_funding_usd,
        
        // Enrichment status
        enrichment_status: companyEnrichmentStatus,
        
        discovery_source: company.discovery_source,
        source: company.source
      } : null,

      // Consolidated contact (SINGLE SOURCE OF TRUTH)
      contact_info: consolidatedContact,

      // Data quality metrics
      data_quality: {
        has_metadata: !!metadata,
        has_company: !!company,
        company_enrichment_level: companyEnrichmentStatus.level,
        technologies_normalized: normalizedTechnologies.length > 0,
        contact_source: consolidatedContact.source,
        pricing_status: pricingData.status,
        value_analysis_status: valueAnalysisData.status
      }
    };

    console.log('[get-project-detail] Clean payload constructed');
    console.log('[get-project-detail] Data quality:', cleanPayload.data_quality);

    return new Response(
      JSON.stringify(cleanPayload),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Data-Quality-Score': String(
            (cleanPayload.data_quality.has_metadata ? 25 : 0) +
            (cleanPayload.data_quality.has_company ? 25 : 0) +
            (cleanPayload.data_quality.technologies_normalized ? 25 : 0) +
            (cleanPayload.data_quality.contact_source !== 'none' ? 25 : 0)
          )
        } 
      }
    );

  } catch (error) {
    console.error('[get-project-detail] Unexpected error:', error);
    // Return generic error message to prevent information leakage
    return new Response(
      JSON.stringify({ 
        error: 'Failed to load project details. Please try again later.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
