import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanyDiscovery {
  name: string;
  sector: string;
  location: string;
  relevanceScore: number;
  skillsNeeded: string[];
  currentChallenges: string[];
  whyRelevant: string;
  website?: string;
  estimatedSize: string;
}

/**
 * NEW INTELLIGENT APPROACH:
 * Instead of finding all companies in an area then filtering,
 * search for companies that NEED the skills from the course
 */
async function discoverCompaniesForCourse(
  courseOutcomes: string[],
  courseLevel: string,
  courseTopics: string[],
  location: string,
  count: number
): Promise<CompanyDiscovery[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const skillKeywords = courseOutcomes
    .join(' ')
    .toLowerCase()
    .match(/\b(engineering|design|analysis|optimization|development|research|testing|simulation|data|modeling|systems|process|manufacturing|materials|quality)\b/gi) || [];
  
  const uniqueSkills = [...new Set(skillKeywords)].slice(0, 5);

  const systemPrompt = `You are a market research expert. Use web search to find real companies that currently need the skills from this course. Return ONLY valid JSON array with no markdown formatting.`;

  const userPrompt = `Find ${count} companies in ${location} that currently need these skills:

COURSE LEARNING OUTCOMES:
${courseOutcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}

KEY TOPICS: ${courseTopics.join(', ')}

Search for companies that:
1. Have recent job postings for these skills
2. Are working on projects aligned with course topics
3. Have announced initiatives students could help with
4. Are in industries naturally needing these technical skills
5. Have track record of university partnerships

Look for evidence in: job postings, news articles, press releases, industry reports, company websites.

Return ONLY this JSON array (no markdown, no explanation):
[
  {
    "name": "Company Name",
    "sector": "Industry",
    "location": "City, State",
    "relevanceScore": 95,
    "skillsNeeded": ["skill 1", "skill 2"],
    "currentChallenges": ["specific challenge"],
    "whyRelevant": "Evidence of need with sources",
    "website": "https://example.com",
    "estimatedSize": "Small/Medium/Large/Enterprise"
  }
]

CRITICAL: Only include companies with REAL EVIDENCE of current need. Cite sources in whyRelevant.`;

  console.log(`🔍 Discovering companies that need: ${uniqueSkills.join(', ')}`);

  const response = await fetch(
    'https://ai.gateway.lovable.dev/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
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

  console.log(`📄 Raw discovery response (first 300 chars): ${content.substring(0, 300)}...`);

  try {
    // Remove markdown code blocks if present
    let jsonText = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    }

    // Extract JSON array
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('⚠ No JSON array found in response');
      throw new Error('Could not extract JSON array from response');
    }

    const discoveries: CompanyDiscovery[] = JSON.parse(jsonMatch[0]);
    
    console.log(`✓ Discovered ${discoveries.length} companies`);
    discoveries.forEach(d => {
      console.log(`  ✓ ${d.name} (${d.relevanceScore}%) - ${d.whyRelevant.substring(0, 80)}...`);
    });

    return discoveries;

  } catch (error) {
    console.error('❌ Failed to parse discovery JSON:', error);
    console.error('Response content:', content.substring(0, 500));
    throw new Error('Failed to parse company discovery response');
  }
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

    console.log(`🎓 Discovering companies for: ${course.title}`);
    console.log(`📍 Location: ${location}`);
    console.log(`🎯 Finding ${count} companies that need these skills...`);

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
        ai_models_used: { discovery: 'google/gemini-2.5-pro' }
      })
      .select()
      .single();

    if (runError) {
      console.error('Failed to create generation run:', runError);
      throw runError;
    }

    const generationRunId = generationRun.id;
    console.log(`📊 Generation run created: ${generationRunId}`);

    // Discover companies using Google Search
    const discoveries = await discoverCompaniesForCourse(
      outcomes,
      course.level,
      topics,
      location,
      count
    );

    // For each discovery, get Places data AND enrich with Gemini web search for contact person
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    const enrichedDiscoveries = [];

    for (const discovery of discoveries) {
      console.log(`\n📍 Looking up ${discovery.name} in Google Places...`);
      
      let placeDetails = null;
      if (GOOGLE_API_KEY) {
        try {
          const searchResponse = await fetch(
            'https://places.googleapis.com/v1/places:searchText',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_API_KEY,
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.id'
              },
              body: JSON.stringify({
                textQuery: `${discovery.name} ${location}`,
                maxResultCount: 1
              })
            }
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.places && searchData.places.length > 0) {
              const place = searchData.places[0];
              placeDetails = {
                website: place.websiteUri || discovery.website,
                phone: place.nationalPhoneNumber,
                address: place.formattedAddress,
                placeId: place.id
              };
              console.log(`  ✓ Found in Google Places: ${place.displayName?.text}`);
            }
          }
        } catch (error) {
          console.error(`  ⚠ Could not find ${discovery.name} in Google Places:`, error);
        }
      }

      // ============================================
      // APOLLO.IO ENRICHMENT - TWO-STEP VALIDATION
      // ============================================
      // STEP 1: Organization Enrich (exact domain match)
      // STEP 2: People Search (using org ID for guaranteed match)
      // CRITICAL: Only accept companies with complete org + contact data
      // ============================================
      
      let contactDetails = null;
      let shouldSkipCompany = false;
      const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');
      
      if (APOLLO_API_KEY && placeDetails?.website) {
        try {
          const domain = new URL(placeDetails.website).hostname.replace('www.', '');
          console.log(`  🚀 Step 1: Enriching organization ${discovery.name} (${domain})...`);
          
          // ====================================
          // STEP 1: ORGANIZATION ENRICH (Exact Domain Match)
          // ====================================
          const orgEnrichResponse = await fetch(
            'https://api.apollo.io/v1/organizations/enrich',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': APOLLO_API_KEY
              },
              body: JSON.stringify({ domain })
            }
          );

          if (!orgEnrichResponse.ok) {
            const errorText = await orgEnrichResponse.text();
            console.error(`  ❌ SKIPPING ${discovery.name}: Apollo Org Enrich failed (${orgEnrichResponse.status}):`, errorText);
            shouldSkipCompany = true;
          } else {
            const orgData = await orgEnrichResponse.json();
            const organization = orgData.organization;
            
            if (!organization) {
              console.log(`  ❌ SKIPPING ${discovery.name}: Not found in Apollo database`);
              shouldSkipCompany = true;
            } else {
              // Validate organization has required data
              const hasCompleteOrgData = 
                organization.name &&
                organization.linkedin_url &&
                organization.logo_url &&
                (organization.estimated_num_employees || organization.annual_revenue);
              
              if (!hasCompleteOrgData) {
                console.log(`  ❌ SKIPPING ${discovery.name}: Incomplete organization data in Apollo`);
                console.log(`    Has: name=${!!organization.name}, linkedin=${!!organization.linkedin_url}, logo=${!!organization.logo_url}, size=${!!(organization.estimated_num_employees || organization.annual_revenue)}`);
                shouldSkipCompany = true;
              } else {
                console.log(`  ✅ Organization validated: ${organization.name}`);
                console.log(`    LinkedIn: ${organization.linkedin_url}`);
                console.log(`    Employees: ${organization.estimated_num_employees || 'N/A'}`);
                console.log(`    Revenue: ${organization.annual_revenue || 'N/A'}`);
                
                // ====================================
                // STEP 2: PEOPLE SEARCH (Using Org ID)
                // ====================================
                console.log(`  🔍 Step 2: Finding decision-makers at org ID ${organization.id}...`);
                
                const peopleResponse = await fetch(
                  'https://api.apollo.io/v1/mixed_people/search',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Cache-Control': 'no-cache',
                      'X-Api-Key': APOLLO_API_KEY
                    },
                    body: JSON.stringify({
                      organization_ids: [organization.id],
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
                      page: 1,
                      per_page: 1
                    })
                  }
                );

                if (!peopleResponse.ok) {
                  const errorText = await peopleResponse.text();
                  console.error(`  ❌ SKIPPING ${discovery.name}: People search failed (${peopleResponse.status}):`, errorText);
                  shouldSkipCompany = true;
                } else {
                  const peopleData = await peopleResponse.json();
                  
                  if (!peopleData.people || peopleData.people.length === 0) {
                    console.log(`  ❌ SKIPPING ${discovery.name}: No decision-makers found in Apollo`);
                    shouldSkipCompany = true;
                  } else {
                    const contact = peopleData.people[0];
                    
                    // Validate contact has required data
                    const hasCompletePersonData = 
                      contact.name && 
                      contact.email && 
                      contact.title &&
                      contact.first_name &&
                      contact.last_name;
                    
                    if (!hasCompletePersonData) {
                      console.log(`  ❌ SKIPPING ${discovery.name}: Incomplete contact data`);
                      console.log(`    Has: name=${!!contact.name}, email=${!!contact.email}, title=${!!contact.title}`);
                      shouldSkipCompany = true;
                    } else {
                      // ====================================
                      // FETCH JOB POSTINGS & MARKET INTEL
                      // ====================================
                      let jobPostings: any[] = [];
                      let technologiesUsed: string[] = [];
                      let fundingStage: string | null = null;
                      let totalFundingUsd: number | null = null;
                      
                      try {
                        console.log(`  🔍 Fetching job postings for org ID: ${organization.id}...`);
                        
                        const jobPostingsResponse = await fetch(
                          `https://api.apollo.io/api/v1/organizations/${organization.id}/job_postings`,
                          {
                            method: 'GET',
                            headers: {
                              'Content-Type': 'application/json',
                              'Cache-Control': 'no-cache',
                              'X-Api-Key': APOLLO_API_KEY
                            }
                          }
                        );
                        
                        if (jobPostingsResponse.ok) {
                          const jobData = await jobPostingsResponse.json();
                          if (jobData.job_postings && jobData.job_postings.length > 0) {
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
                            
                            console.log(`    ✓ Found ${jobPostings.length} job postings`);
                          }
                        }
                      } catch (jobError) {
                        console.log(`    ⚠ Could not fetch job postings:`, jobError);
                      }
                      
                      // Extract technologies and funding
                      if (organization.current_technologies) {
                        technologiesUsed = organization.current_technologies;
                      }
                      if (organization.latest_funding_stage) {
                        fundingStage = organization.latest_funding_stage;
                      }
                      if (organization.total_funding) {
                        totalFundingUsd = organization.total_funding;
                      }
                      
                      // ====================================
                      // BUILD COMPLETE CONTACT DETAILS
                      // ====================================
                      contactDetails = {
                        // Contact info
                        contactPerson: contact.name,
                        contactEmail: contact.email,
                        contactPhone: contact.phone_numbers?.[0]?.sanitized_number || null,
                        linkedinProfile: contact.linkedin_url || null,
                        title: contact.title,
                        source: 'apollo_verified',
                        
                        // Detailed contact fields
                        contactFirstName: contact.first_name,
                        contactLastName: contact.last_name,
                        contactHeadline: contact.headline || null,
                        contactPhotoUrl: contact.photo_url || null,
                        contactCity: contact.city || null,
                        contactState: contact.state || null,
                        contactCountry: contact.country || null,
                        contactTwitterUrl: contact.twitter_url || null,
                        contactEmailStatus: contact.email_status || null,
                        contactEmploymentHistory: contact.employment_history || null,
                        contactPhoneNumbers: contact.phone_numbers || null,
                        
                        // Organization data (from Step 1)
                        organizationLinkedinUrl: organization.linkedin_url,
                        organizationTwitterUrl: organization.twitter_url || null,
                        organizationFacebookUrl: organization.facebook_url || null,
                        organizationFoundedYear: organization.founded_year || null,
                        organizationLogoUrl: organization.logo_url,
                        organizationEmployeeCount: organization.estimated_num_employees 
                          ? `${organization.estimated_num_employees}` 
                          : null,
                        organizationRevenueRange: organization.annual_revenue 
                          ? `$${organization.annual_revenue}` 
                          : null,
                        organizationIndustryKeywords: organization.industry_tag_list || null,
                        
                        // Market intelligence
                        jobPostings,
                        technologiesUsed,
                        fundingStage,
                        totalFundingUsd,
                        buyingIntentSignals: [],
                        
                        // Metadata
                        apolloEnrichmentDate: new Date().toISOString()
                      };
                      
                      console.log(`  ✅ COMPLETE Apollo data for ${discovery.name}`);
                      console.log(`    Contact: ${contactDetails.contactPerson} (${contactDetails.title})`);
                      console.log(`    Email: ${contactDetails.contactEmail} (${contactDetails.contactEmailStatus})`);
                      console.log(`    Org Logo: ✓`);
                      console.log(`    Org LinkedIn: ✓`);
                      console.log(`    Job Postings: ${jobPostings.length}`);
                      console.log(`    Technologies: ${technologiesUsed.length}`);
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(`  ❌ SKIPPING ${discovery.name}: Apollo enrichment failed:`, error);
          shouldSkipCompany = true;
        }
      } else if (!APOLLO_API_KEY) {
        console.log(`  ⚠️ Apollo API key not configured, cannot validate company data`);
        shouldSkipCompany = true;
      } else if (!placeDetails?.website) {
        console.log(`  ❌ SKIPPING ${discovery.name}: No website available for Apollo enrichment`);
        shouldSkipCompany = true;
      }
      
      // ====================================
      // PRIMARY FILTER: Skip if Apollo couldn't provide complete data
      // ====================================
      if (shouldSkipCompany) {
        console.log(`  ⏭️ Skipping ${discovery.name} - does not meet Apollo data quality requirements\n`);
        continue; // Skip to next company
      }
      
      // REMOVED: AI fallback (we only want Apollo-verified companies)
      // No longer using Lovable AI for contact discovery
      if (!contactDetails) {
        // This should never happen due to shouldSkipCompany check above
        console.log(`  ❌ ERROR: No contact details despite passing filter - skipping ${discovery.name}\n`);
        continue;
      }

      // Calculate data completeness score (0-100)
      const calculateCompletenessScore = (data: any): number => {
        const fields = [
          data.name, data.sector, data.website, data.full_address,
          data.contact_person, data.contact_email, data.contact_phone,
          data.contactFirstName, data.contactHeadline, data.contactPhotoUrl,
          data.organizationLinkedinUrl, data.organizationLogoUrl,
          data.organizationFoundedYear, data.contactEmploymentHistory
        ];
        const populated = fields.filter(f => f !== null && f !== undefined).length;
        return Math.round((populated / fields.length) * 100);
      };

      // Determine enrichment level
      const getEnrichmentLevel = (data: any): string => {
        if (data.apolloEnrichmentDate && data.contactEmailStatus && data.organizationLinkedinUrl) {
          return 'fully_enriched';
        } else if (data.apolloEnrichmentDate) {
          return 'apollo_verified';
        }
        return 'basic';
      };

      // Store in company_profiles table with comprehensive Apollo.io data
      const companyData = {
        name: discovery.name,
        sector: discovery.sector,
        size: discovery.estimatedSize,
        website: placeDetails?.website || discovery.website,
        full_address: placeDetails?.address || discovery.location,
        city: null,
        zip: null,
        
        // Basic contact fields
        contact_person: contactDetails?.contactPerson && contactDetails.contactPerson !== 'null' ? contactDetails.contactPerson : null,
        contact_email: contactDetails?.contactEmail && contactDetails.contactEmail !== 'null' ? contactDetails.contactEmail : null,
        contact_phone: contactDetails?.contactPhone || placeDetails?.phone || null,
        linkedin_profile: contactDetails?.linkedinProfile && contactDetails.linkedinProfile !== 'null' ? contactDetails.linkedinProfile : null,
        
        // Extended contact fields from Apollo.io
        contact_first_name: contactDetails?.contactFirstName || null,
        contact_last_name: contactDetails?.contactLastName || null,
        contact_title: contactDetails?.title || null,
        contact_headline: contactDetails?.contactHeadline || null,
        contact_photo_url: contactDetails?.contactPhotoUrl || null,
        contact_city: contactDetails?.contactCity || null,
        contact_state: contactDetails?.contactState || null,
        contact_country: contactDetails?.contactCountry || null,
        contact_twitter_url: contactDetails?.contactTwitterUrl || null,
        contact_email_status: contactDetails?.contactEmailStatus || null,
        contact_employment_history: contactDetails?.contactEmploymentHistory || null,
        contact_phone_numbers: contactDetails?.contactPhoneNumbers || null,
        
        // Organization fields from Apollo.io
        organization_linkedin_url: contactDetails?.organizationLinkedinUrl || null,
        organization_twitter_url: contactDetails?.organizationTwitterUrl || null,
        organization_facebook_url: contactDetails?.organizationFacebookUrl || null,
        organization_founded_year: contactDetails?.organizationFoundedYear || null,
        organization_logo_url: contactDetails?.organizationLogoUrl || null,
        organization_employee_count: contactDetails?.organizationEmployeeCount || null,
        organization_revenue_range: contactDetails?.organizationRevenueRange || null,
        organization_industry_keywords: contactDetails?.organizationIndustryKeywords || null,
        
        // NEW: Market Intelligence Fields
        job_postings: contactDetails?.jobPostings || [],
        job_postings_last_fetched: contactDetails?.jobPostings?.length > 0 ? new Date().toISOString() : null,
        technologies_used: contactDetails?.technologiesUsed || [],
        buying_intent_signals: contactDetails?.buyingIntentSignals || [],
        funding_stage: contactDetails?.fundingStage || null,
        total_funding_usd: contactDetails?.totalFundingUsd || null,
        
        // Metadata
        source: contactDetails?.source || 'google_discovery',
        inferred_needs: discovery.currentChallenges,
        technologies: null,
        open_roles: null,
        discovery_source: 'syllabus_generation',
        generation_run_id: generationRunId,
        
        // Data quality tracking
        apollo_enrichment_date: contactDetails?.apolloEnrichmentDate || null,
        data_enrichment_level: getEnrichmentLevel(contactDetails || {}),
        data_completeness_score: calculateCompletenessScore({
          name: discovery.name,
          sector: discovery.sector,
          website: placeDetails?.website || discovery.website,
          full_address: placeDetails?.address || discovery.location,
          contact_person: contactDetails?.contactPerson,
          contact_email: contactDetails?.contactEmail,
          contact_phone: contactDetails?.contactPhone,
          contactFirstName: contactDetails?.contactFirstName,
          contactHeadline: contactDetails?.contactHeadline,
          contactPhotoUrl: contactDetails?.contactPhotoUrl,
          organizationLinkedinUrl: contactDetails?.organizationLinkedinUrl,
          organizationLogoUrl: contactDetails?.organizationLogoUrl,
          organizationFoundedYear: contactDetails?.organizationFoundedYear,
          contactEmploymentHistory: contactDetails?.contactEmploymentHistory
        }),
        last_enriched_at: new Date().toISOString(),
        last_verified_at: contactDetails?.source === 'apollo_verified' ? new Date().toISOString() : null,
      };

      // Try to insert, or update if exists
      const { data: existingCompany } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('name', discovery.name)
        .maybeSingle();

      let companyProfileId;
      const enrichmentLevel = companyData.data_enrichment_level;
      const completenessScore = companyData.data_completeness_score;
      
      if (existingCompany) {
        const { data: updated } = await supabase
          .from('company_profiles')
          .update(companyData)
          .eq('id', existingCompany.id)
          .select('id')
          .single();
        companyProfileId = updated?.id;
        console.log(`  💾 Updated company profile: ${discovery.name}`);
        console.log(`     Enrichment: ${enrichmentLevel} | Completeness: ${completenessScore}%`);
      } else {
        const { data: inserted } = await supabase
          .from('company_profiles')
          .insert(companyData)
          .select('id')
          .single();
        companyProfileId = inserted?.id;
        console.log(`  💾 Stored new company profile: ${discovery.name}`);
        console.log(`     Enrichment: ${enrichmentLevel} | Completeness: ${completenessScore}%`);
      }

      enrichedDiscoveries.push({
        ...discovery,
        ...placeDetails,
        ...contactDetails,
        companyProfileId
      });
    }

    // ====================================
    // Update generation run with statistics
    // ====================================
    const processingTimeSeconds = (Date.now() - startTime) / 1000;
    const apolloCreditsUsed = enrichedDiscoveries.length; // 1 credit per company enriched
    
    await supabase
      .from('generation_runs')
      .update({
        companies_discovered: discoveries.length,
        companies_enriched: enrichedDiscoveries.length,
        status: 'completed',
        completed_at: new Date().toISOString(),
        processing_time_seconds: processingTimeSeconds,
        apollo_credits_used: apolloCreditsUsed
      })
      .eq('id', generationRunId);

    console.log(`\n✅ Discovery Complete:`);
    console.log(`   Discovered: ${discoveries.length} companies`);
    console.log(`   Enriched: ${enrichedDiscoveries.length} companies`);
    console.log(`   Processing Time: ${processingTimeSeconds.toFixed(2)}s`);
    console.log(`   Apollo Credits Used: ${apolloCreditsUsed}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        companies: enrichedDiscoveries,
        count: enrichedDiscoveries.length,
        generation_run_id: generationRunId,
        stats: {
          discovered: discoveries.length,
          enriched: enrichedDiscoveries.length,
          processing_time_seconds: processingTimeSeconds,
          apollo_credits_used: apolloCreditsUsed
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Discovery error:', error);
    
    // Update generation run with error status
    try {
      const { courseId } = await req.json();
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      // Find most recent in_progress run for this course
      const { data: failedRun } = await supabase
        .from('generation_runs')
        .select('id')
        .eq('course_id', courseId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (failedRun) {
        await supabase
          .from('generation_runs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('id', failedRun.id);
      }
    } catch (updateError) {
      console.error('Failed to update generation run status:', updateError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
