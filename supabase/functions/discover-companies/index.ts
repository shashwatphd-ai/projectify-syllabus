import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApolloSearchFilters {
  organization_locations: string[];
  q_organization_keyword_tags: string[];
  q_organization_job_titles: string[];
  organization_num_employees_ranges?: string[];
  organization_num_jobs_range?: { min?: number; max?: number };
  currently_using_any_of_technology_uids?: string[];
  revenue_range?: { min?: number; max?: number };
  latest_funding_date_range?: { min?: string; max?: string };
}

interface ApolloOrganization {
  id: string;
  name: string;
  website_url: string;
  linkedin_url: string;
  logo_url: string;
  primary_domain: string;
  estimated_num_employees?: number;
  annual_revenue?: string;
  industry?: string;
  keywords?: string[];
  founded_year?: number;
  phone_number?: string;
  primary_phone?: { number?: string };
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  current_technologies?: string[];
  latest_funding_stage?: string;
  total_funding?: number;
  latest_funding_stage_cd?: string;
  industry_tag_list?: string[];
  twitter_url?: string;
  facebook_url?: string;
}

/**
 * APOLLO-FIRST ARCHITECTURE:
 * Use AI to analyze syllabus and generate deterministic Apollo search filters
 */
async function generateApolloFilters(
  courseOutcomes: string[],
  courseLevel: string,
  courseTopics: string[],
  location: string
): Promise<ApolloSearchFilters> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const systemPrompt = `You are an AI that analyzes course syllabi and generates Apollo.io search filters to find highly relevant companies.

Apollo.io Organization Search Filters:
- organization_locations: ["city", "state", "country"] - Company HQ locations
- q_organization_keyword_tags: ["industry1", "industry2"] - Industry keywords
- q_organization_job_titles: ["Software Engineer", "Data Analyst"] - Active job titles matching course skills
- organization_num_employees_ranges: ["1,50", "51,200", "201,500"] - Company sizes
- organization_num_jobs_range: {min: 5} - Minimum number of active job postings (hiring velocity)
- currently_using_any_of_technology_uids: ["salesforce", "python", "aws"] - Technologies used
- latest_funding_date_range: {min: "2023-01-01"} - Recent funding (buying intent)

Return ONLY valid JSON with these filters. Be specific and deterministic.`;

  const userPrompt = `Analyze this course and generate Apollo search filters to find 50+ relevant companies within 50 miles of ${location}.

COURSE DETAILS:
Level: ${courseLevel}
Topics: ${courseTopics.join(', ')}

LEARNING OUTCOMES:
${courseOutcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Generate filters that will find companies:
1. Located in or near ${location}
2. Actively hiring for roles requiring these skills (check q_organization_job_titles)
3. In industries aligned with course topics
4. With recent hiring activity (organization_num_jobs_range min: 3)
5. Appropriate company sizes for student projects (prefer 10-500 employees)

Return JSON:
{
  "organization_locations": ["${location}"],
  "q_organization_keyword_tags": ["industry keywords based on topics"],
  "q_organization_job_titles": ["specific job titles matching course skills"],
  "organization_num_employees_ranges": ["10,50", "51,200", "201,500"],
  "organization_num_jobs_range": {"min": 3},
  "currently_using_any_of_technology_uids": ["relevant technologies if applicable"]
}`;

  console.log(`🤖 Generating Apollo filters for ${courseLevel} course in ${location}...`);

  const response = await fetch(
    'https://ai.gateway.lovable.dev/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) throw new Error('No content from Lovable AI');

  console.log(`📄 AI Filter Response: ${content.substring(0, 200)}...`);

  try {
    let jsonText = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from response');
    }

    const filters: ApolloSearchFilters = JSON.parse(jsonMatch[0]);
    
    console.log(`✓ Generated Apollo Filters:`);
    console.log(`  Locations: ${filters.organization_locations.join(', ')}`);
    console.log(`  Industries: ${filters.q_organization_keyword_tags.join(', ')}`);
    console.log(`  Job Titles: ${filters.q_organization_job_titles.join(', ')}`);
    console.log(`  Min Jobs: ${filters.organization_num_jobs_range?.min || 'N/A'}`);

    return filters;

  } catch (error) {
    console.error('❌ Failed to parse filter JSON:', error);
    throw new Error('Failed to parse Apollo filter generation response');
  }
}

/**
 * Search Apollo.io for organizations matching the generated filters
 */
async function searchApolloOrganizations(
  filters: ApolloSearchFilters,
  maxResults: number = 50
): Promise<ApolloOrganization[]> {
  const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');
  if (!APOLLO_API_KEY) throw new Error('APOLLO_API_KEY not configured');

  console.log(`🔍 Searching Apollo.io for up to ${maxResults} organizations...`);

  const response = await fetch(
    'https://api.apollo.io/v1/mixed_companies/search',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': APOLLO_API_KEY
      },
      body: JSON.stringify({
        ...filters,
        page: 1,
        per_page: Math.min(maxResults, 100) // Apollo max is 100 per page
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apollo Organization Search failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const organizations: ApolloOrganization[] = data.organizations || [];
  
  console.log(`✓ Found ${organizations.length} organizations in Apollo`);
  organizations.slice(0, 5).forEach(org => {
    console.log(`  • ${org.name} - ${org.city}, ${org.state} (${org.estimated_num_employees || 'N/A'} employees)`);
  });

  return organizations;
}

/**
 * Enrich a single organization with decision-maker contacts and market intelligence
 */
async function enrichOrganization(org: ApolloOrganization, apolloApiKey: string) {
  console.log(`  🔍 Enriching ${org.name}...`);

  // ====================================
  // STEP 1: Find Decision-Maker Contacts
  // ====================================
  const peopleResponse = await fetch(
    'https://api.apollo.io/v1/mixed_people/search',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apolloApiKey
      },
      body: JSON.stringify({
        organization_ids: [org.id],
        person_titles: [
          'Director of Partnerships',
          'VP of Partnerships',
          'Director of Operations',
          'COO',
          'President',
          'CEO',
          'Owner',
          'General Manager'
        ],
        person_seniorities: ['c_suite', 'vp', 'director', 'owner'],
        reveal_personal_emails: true,
        reveal_phone_number: true,
        page: 1,
        per_page: 1
      })
    }
  );

  if (!peopleResponse.ok) {
    console.log(`  ❌ People search failed for ${org.name}`);
    return null;
  }

  const peopleData = await peopleResponse.json();
  if (!peopleData.people || peopleData.people.length === 0) {
    console.log(`  ❌ No decision-makers found for ${org.name}`);
    return null;
  }

  const contact = peopleData.people[0];
  
  if (!contact.email || !contact.name) {
    console.log(`  ❌ Incomplete contact data for ${org.name}`);
    return null;
  }

  console.log(`  ✅ Contact: ${contact.name} (${contact.title})`);

  // ====================================
  // STEP 2: Fetch Job Postings
  // ====================================
  let jobPostings: any[] = [];
  try {
    const jobResponse = await fetch(
      `https://api.apollo.io/api/v1/organizations/${org.id}/job_postings`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': apolloApiKey
        }
      }
    );

    if (jobResponse.ok) {
      const jobData = await jobResponse.json();
      if (jobData.job_postings) {
        jobPostings = jobData.job_postings.map((jp: any) => ({
          id: jp.id,
          title: jp.title,
          url: jp.url,
          city: jp.city,
          state: jp.state,
          posted_at: jp.posted_at,
          last_seen_at: jp.last_seen_at,
          skills_needed: jp.tags || []
        })).slice(0, 10);
        console.log(`  ✓ Found ${jobPostings.length} job postings`);
      }
    }
  } catch (error) {
    console.log(`  ⚠ Could not fetch job postings:`, error);
  }

  // ====================================
  // STEP 3: Calculate Buying Intent Signals
  // ====================================
  const buyingIntentSignals = [];

  // Recent funding signal
  if (org.latest_funding_stage && ['Series A', 'Series B', 'Series C', 'Series C+'].includes(org.latest_funding_stage)) {
    const fundingDate = org.latest_funding_stage_cd || new Date().toISOString();
    const monthsSinceFunding = (Date.now() - new Date(fundingDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSinceFunding < 12) {
      buyingIntentSignals.push({
        signal_type: 'recent_funding',
        confidence: 'high',
        details: `Raised ${org.latest_funding_stage} within last ${Math.round(monthsSinceFunding)} months`,
        timing: 'immediate'
      });
    }
  }

  // Hiring velocity signal
  if (jobPostings.length >= 5) {
    buyingIntentSignals.push({
      signal_type: 'hiring_velocity',
      confidence: jobPostings.length >= 10 ? 'high' : 'medium',
      details: `${jobPostings.length} active job openings indicate rapid growth`,
      timing: 'immediate'
    });
  }

  // Technology adoption signal
  const techCount = org.current_technologies?.length || 0;
  if (techCount >= 10) {
    buyingIntentSignals.push({
      signal_type: 'technology_adoption',
      confidence: 'medium',
      details: `Using ${techCount} technologies suggests need for specialized expertise`,
      timing: 'near_term'
    });
  }

  console.log(`  📊 ${buyingIntentSignals.length} buying intent signals identified`);

  return {
    org,
    contact,
    jobPostings,
    buyingIntentSignals
  };
}

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

    // Get course data
    const { data: course, error: courseError } = await supabase
      .from('course_profiles')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    const outcomes = course.outcomes || [];
    const topics = course.artifacts?.topics || [];

    console.log(`🎓 Apollo-First Discovery for: ${course.title}`);
    console.log(`📍 Location: ${location}`);
    console.log(`🎯 Target: ${count} high-quality companies`);

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
        ai_models_used: { discovery: 'apollo_search', filter_generation: 'google/gemini-2.5-flash' }
      })
      .select()
      .single();

    if (runError) {
      console.error('Failed to create generation run:', runError);
      throw runError;
    }

    const generationRunId = generationRun.id;
    console.log(`📊 Generation run created: ${generationRunId}`);

    // ====================================
    // Step 2: Generate Apollo Search Filters
    // ====================================
    console.log(`\n🤖 Using AI to generate Apollo search filters...`);
    const apolloFilters = await generateApolloFilters(
      outcomes,
      course.level,
      topics,
      location
    );

    // ====================================
    // Step 3: Search Apollo for Organizations
    // ====================================
    console.log(`\n🔍 Searching Apollo.io with deterministic filters...`);
    const apolloOrganizations = await searchApolloOrganizations(
      apolloFilters,
      count * 3 // Get 3x the requested count for better selection
    );

    if (apolloOrganizations.length === 0) {
      throw new Error('No companies found in Apollo matching the search criteria');
    }

    // ====================================
    // Step 4: Enrich Each Organization
    // ====================================
    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');
    if (!APOLLO_API_KEY) throw new Error('APOLLO_API_KEY not configured');

    const enrichedCompanies = [];
    let processedCount = 0;

    for (const org of apolloOrganizations) {
      // Stop if we have enough companies
      if (enrichedCompanies.length >= count) {
        console.log(`\n✅ Reached target of ${count} companies`);
        break;
      }

      processedCount++;
      console.log(`\n[${processedCount}/${apolloOrganizations.length}] ${org.name}`);

      const enrichedData = await enrichOrganization(org, APOLLO_API_KEY);
      
      if (!enrichedData) {
        console.log(`  ⏭️ Skipping ${org.name} - incomplete data`);
        continue;
      }

      // ====================================
      // Store in company_profiles table
      // ====================================
      const companyData = {
        name: org.name,
        sector: org.industry || 'Unknown',
        size: org.estimated_num_employees ? `${org.estimated_num_employees}` : 'Unknown',
        website: org.website_url,
        full_address: `${org.street_address || ''}, ${org.city || ''}, ${org.state || ''} ${org.postal_code || ''}`.trim(),
        city: org.city,
        zip: org.postal_code,
        
        // Contact fields
        contact_person: enrichedData.contact.name,
        contact_email: enrichedData.contact.email,
        contact_phone: enrichedData.contact.phone_numbers?.[0]?.sanitized_number || org.primary_phone?.number || null,
        contact_first_name: enrichedData.contact.first_name,
        contact_last_name: enrichedData.contact.last_name,
        contact_title: enrichedData.contact.title,
        contact_headline: enrichedData.contact.headline,
        contact_photo_url: enrichedData.contact.photo_url,
        contact_city: enrichedData.contact.city,
        contact_state: enrichedData.contact.state,
        contact_country: enrichedData.contact.country,
        contact_email_status: enrichedData.contact.email_status,
        contact_employment_history: enrichedData.contact.employment_history,
        contact_phone_numbers: enrichedData.contact.phone_numbers,
        linkedin_profile: enrichedData.contact.linkedin_url,
        contact_twitter_url: enrichedData.contact.twitter_url,
        
        // Organization fields
        organization_linkedin_url: org.linkedin_url,
        organization_twitter_url: org.twitter_url,
        organization_facebook_url: org.facebook_url,
        organization_founded_year: org.founded_year,
        organization_logo_url: org.logo_url,
        organization_employee_count: org.estimated_num_employees ? `${org.estimated_num_employees}` : null,
        organization_revenue_range: org.annual_revenue ? `$${org.annual_revenue}` : null,
        organization_industry_keywords: org.industry_tag_list,
        
        // Market intelligence
        job_postings: enrichedData.jobPostings,
        job_postings_last_fetched: enrichedData.jobPostings.length > 0 ? new Date().toISOString() : null,
        technologies_used: org.current_technologies || [],
        buying_intent_signals: enrichedData.buyingIntentSignals,
        funding_stage: org.latest_funding_stage,
        total_funding_usd: org.total_funding,
        
        // Metadata
        source: 'apollo_discovery',
        discovery_source: 'syllabus_generation',
        generation_run_id: generationRunId,
        apollo_enrichment_date: new Date().toISOString(),
        data_enrichment_level: 'fully_enriched',
        data_completeness_score: 95, // Apollo data is comprehensive
        last_enriched_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString()
      };

      // UPSERT using website as unique identifier
      const { data: existingCompany } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('website', org.website_url)
        .maybeSingle();

      if (existingCompany) {
        await supabase
          .from('company_profiles')
          .update(companyData)
          .eq('id', existingCompany.id);
        console.log(`  💾 Updated: ${org.name}`);
      } else {
        await supabase
          .from('company_profiles')
          .insert(companyData);
        console.log(`  💾 Stored: ${org.name}`);
      }

      enrichedCompanies.push(enrichedData);

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // ====================================
    // Update generation run
    // ====================================
    const processingTimeSeconds = (Date.now() - startTime) / 1000;
    
    await supabase
      .from('generation_runs')
      .update({
        companies_discovered: apolloOrganizations.length,
        companies_enriched: enrichedCompanies.length,
        status: 'completed',
        completed_at: new Date().toISOString(),
        processing_time_seconds: processingTimeSeconds,
        apollo_credits_used: enrichedCompanies.length * 2 // Org search + People search
      })
      .eq('id', generationRunId);

    console.log(`\n✅ Apollo-First Discovery Complete:`);
    console.log(`   Found: ${apolloOrganizations.length} organizations`);
    console.log(`   Enriched: ${enrichedCompanies.length} companies`);
    console.log(`   Time: ${processingTimeSeconds.toFixed(2)}s`);

    return new Response(
      JSON.stringify({
        success: true,
        companies: enrichedCompanies,
        count: enrichedCompanies.length,
        generation_run_id: generationRunId,
        stats: {
          discovered: apolloOrganizations.length,
          enriched: enrichedCompanies.length,
          processing_time_seconds: processingTimeSeconds
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Discovery error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
