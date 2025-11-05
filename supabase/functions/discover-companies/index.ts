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
      // APOLLO.IO ENRICHMENT - PRIMARY FILTER
      // ============================================
      // CRITICAL: Only accept companies where Apollo provides:
      //   ✅ Complete organization data (LinkedIn, logo, employees, revenue)
      //   ✅ Verified contact person (name, email, title)
      // If Apollo can't provide both, SKIP this company entirely
      // ============================================
      
      let contactDetails = null;
      let shouldSkipCompany = false;
      const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');
      
      if (APOLLO_API_KEY && placeDetails?.website) {
        try {
          const domain = new URL(placeDetails.website).hostname.replace('www.', '');
          console.log(`  🚀 Apollo.io enrichment for ${discovery.name} (${domain})...`);
          
          let apolloOrgId = null;
          let apolloOrgData = null;
          
          // STRATEGY 1: Organization Search by domain (most accurate)
          console.log(`    Step 1: Searching organizations by domain...`);
          const orgSearchResponse = await fetch(
            'https://api.apollo.io/v1/organizations/search',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': APOLLO_API_KEY
              },
              body: JSON.stringify({
                organization_domains: [domain],
                page: 1,
                per_page: 1
              })
            }
          );

          if (orgSearchResponse.ok) {
            const orgData = await orgSearchResponse.json();
            if (orgData.organizations && orgData.organizations.length > 0) {
              apolloOrgData = orgData.organizations[0];
              apolloOrgId = apolloOrgData.id;
              console.log(`    ✓ Org found: ${apolloOrgData.name} (ID: ${apolloOrgId})`);
            }
          }
          
          // STRATEGY 2: If no org found by domain, try name search
          if (!apolloOrgId) {
            console.log(`    Step 2: Trying organization name search...`);
            const nameSearchResponse = await fetch(
              'https://api.apollo.io/v1/organizations/search',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache',
                  'X-Api-Key': APOLLO_API_KEY
                },
                body: JSON.stringify({
                  q_organization_name: discovery.name,
                  page: 1,
                  per_page: 3
                })
              }
            );
            
            if (nameSearchResponse.ok) {
              const nameData = await nameSearchResponse.json();
              if (nameData.organizations && nameData.organizations.length > 0) {
                // Find best name match
                for (const org of nameData.organizations) {
                  const orgName = org.name?.toLowerCase() || '';
                  const searchName = discovery.name.toLowerCase();
                  const similarity = orgName.includes(searchName) || searchName.includes(orgName);
                  
                  if (similarity) {
                    apolloOrgData = org;
                    apolloOrgId = org.id;
                    console.log(`    ✓ Org found by name: ${org.name} (ID: ${apolloOrgId})`);
                    break;
                  }
                }
              }
            }
          }

          // STRATEGY 3: People search with flexible filters
          let peopleSearchResults = [];
          
          if (apolloOrgId) {
            // Search within specific organization
            console.log(`    Step 3: Searching people in org ${apolloOrgId}...`);
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
                  organization_ids: [apolloOrgId],
                  person_titles: [
                    'Director of Partnerships', 'VP of Partnerships', 
                    'Director of Operations', 'COO', 'President', 
                    'CEO', 'Owner', 'General Manager'
                  ],
                  person_seniorities: ['c_suite', 'vp', 'director', 'owner'],
                  page: 1,
                  per_page: 10
                })
              }
            );
            
            if (peopleResponse.ok) {
              const peopleData = await peopleResponse.json();
              peopleSearchResults = peopleData.people || [];
              console.log(`    ✓ Found ${peopleSearchResults.length} contacts in organization`);
            }
          }
          
          // STRATEGY 4: Fallback to domain-based people search if no org-specific results
          if (peopleSearchResults.length === 0) {
            console.log(`    Step 4: Fallback domain-based people search...`);
            const fallbackResponse = await fetch(
              'https://api.apollo.io/v1/mixed_people/search',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache',
                  'X-Api-Key': APOLLO_API_KEY
                },
                body: JSON.stringify({
                  organization_domains: [domain],
                  person_titles: [
                    'Director of Partnerships', 'VP of Partnerships', 
                    'Director of Operations', 'COO', 'President', 
                    'CEO', 'Owner', 'General Manager', 
                    'VP', 'Director', 'Manager'  // Broader search
                  ],
                  page: 1,
                  per_page: 10
                })
              }
            );
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              peopleSearchResults = fallbackData.people || [];
              console.log(`    ✓ Fallback found ${peopleSearchResults.length} contacts`);
            }
          }

          // VALIDATE & SELECT BEST CONTACT
          let contact = null;
          
          if (peopleSearchResults.length > 0) {
            // Score and rank contacts by relevance
            const scoredContacts = peopleSearchResults.map((person: any) => {
              let score = 0;
              const personOrgName = person.organization?.name?.toLowerCase() || '';
              const searchName = discovery.name.toLowerCase();
              
              // Domain match = highest priority
              const personDomain = person.organization?.website_url 
                ? new URL(person.organization.website_url).hostname.replace('www.', '')
                : null;
              if (personDomain === domain) score += 100;
              
              // Organization name match
              const nameWords = searchName.split(/[\s&,.-]+/).filter((w: string) => w.length > 2);
              for (const word of nameWords) {
                if (personOrgName.includes(word)) score += 20;
              }
              
              // Exact org match
              if (apolloOrgId && person.organization?.id === apolloOrgId) score += 50;
              
              // Title relevance
              const title = person.title?.toLowerCase() || '';
              if (title.includes('partnership')) score += 30;
              if (title.includes('ceo') || title.includes('president')) score += 25;
              if (title.includes('director') || title.includes('vp')) score += 15;
              
              // Data completeness
              if (person.email) score += 10;
              if (person.phone_numbers?.length) score += 5;
              if (person.linkedin_url) score += 5;
              
              return { person, score };
            }).sort((a: any, b: any) => b.score - a.score);
            
            // Select best contact (score > 50 means reasonable match)
            if (scoredContacts[0].score > 50) {
              contact = scoredContacts[0].person;
              console.log(`    ✅ Selected contact: ${contact.name} (score: ${scoredContacts[0].score})`);
              console.log(`       Organization: ${contact.organization?.name || 'N/A'}`);
              console.log(`       Title: ${contact.title || 'N/A'}`);
            } else {
              console.log(`    ⚠️ Best match score too low (${scoredContacts[0].score}) - skipping`);
              shouldSkipCompany = true;
            }
          } else {
            console.log(`    ❌ No contacts found via any search strategy`);
            shouldSkipCompany = true;
          }
          
          if (contact && !shouldSkipCompany) {
            // VALIDATE DATA COMPLETENESS
            const hasCompletePersonData = 
              contact.name && 
              contact.email && 
              contact.title &&
              contact.first_name &&
              contact.last_name;
            
            const hasCompleteOrgData = 
              contact.organization?.name &&
              contact.organization?.linkedin_url &&
              contact.organization?.logo_url &&
              (contact.organization?.estimated_num_employees || contact.organization?.annual_revenue);
            
            if (!hasCompletePersonData || !hasCompleteOrgData) {
              console.log(`    ⚠️ Incomplete data - Person: ${hasCompletePersonData}, Org: ${hasCompleteOrgData}`);
              // Don't skip - collect what we have
            }
            
            // MARKET INTELLIGENCE: Fetch job postings and technologies
            let jobPostings: any[] = [];
            let technologiesUsed: string[] = [];
            let fundingStage: string | null = null;
            let totalFundingUsd: number | null = null;
            let buyingIntentSignals: any[] = [];
            
            const finalOrgId = apolloOrgId || contact.organization?.id;
            
            if (finalOrgId) {
              try {
                console.log(`    📊 Fetching market intelligence for org ${finalOrgId}...`);
                
                // Fetch job postings
                const jobPostingsResponse = await fetch(
                  `https://api.apollo.io/api/v1/organizations/${finalOrgId}/job_postings`,
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
                    })).slice(0, 20); // Increased from 10 to 20
                    
                    console.log(`    ✓ Found ${jobPostings.length} job postings`);
                  }
                }
              } catch (jobError) {
                console.error(`    ⚠️ Error fetching market intelligence:`, jobError);
              }
            }
            
            // Extract ALL available data from Apollo
            if (apolloOrgData) {
              technologiesUsed = apolloOrgData.current_technologies || [];
              fundingStage = apolloOrgData.latest_funding_stage || null;
              totalFundingUsd = apolloOrgData.total_funding || null;
            } else if (contact.organization) {
              technologiesUsed = contact.organization.current_technologies || [];
              fundingStage = contact.organization.latest_funding_stage || null;
              totalFundingUsd = contact.organization.total_funding || null;
            }
            
            console.log(`    📈 Market data: ${jobPostings.length} jobs, ${technologiesUsed.length} technologies`);
            
            
            // Store ALL Apollo.io data (more comprehensive than before)
            contactDetails = {
              // Basic contact info
              contactPerson: contact.name || null,
              contactEmail: contact.email || null,
              contactPhone: contact.phone_numbers?.[0]?.sanitized_number || null,
              linkedinProfile: contact.linkedin_url || null,
              title: contact.title || null,
              source: 'apollo_verified',
              
              // Detailed contact fields
              contactFirstName: contact.first_name || null,
              contactLastName: contact.last_name || null,
              contactHeadline: contact.headline || null,
              contactPhotoUrl: contact.photo_url || null,
              contactCity: contact.city || null,
              contactState: contact.state || null,
              contactCountry: contact.country || null,
              contactTwitterUrl: contact.twitter_url || null,
              contactEmailStatus: contact.email_status || null,
              contactEmploymentHistory: contact.employment_history || null,
              contactPhoneNumbers: contact.phone_numbers || null,
              
              // Organization enrichment (use apolloOrgData if available, fallback to contact.organization)
              organizationLinkedinUrl: (apolloOrgData?.linkedin_url || contact.organization?.linkedin_url) || null,
              organizationTwitterUrl: (apolloOrgData?.twitter_url || contact.organization?.twitter_url) || null,
              organizationFacebookUrl: (apolloOrgData?.facebook_url || contact.organization?.facebook_url) || null,
              organizationFoundedYear: (apolloOrgData?.founded_year || contact.organization?.founded_year) || null,
              organizationLogoUrl: (apolloOrgData?.logo_url || contact.organization?.logo_url) || null,
              organizationEmployeeCount: (apolloOrgData?.estimated_num_employees || contact.organization?.estimated_num_employees)
                ? `${apolloOrgData?.estimated_num_employees || contact.organization?.estimated_num_employees}` 
                : null,
              organizationRevenueRange: (apolloOrgData?.annual_revenue || contact.organization?.annual_revenue)
                ? `$${apolloOrgData?.annual_revenue || contact.organization?.annual_revenue}` 
                : null,
              organizationIndustryKeywords: (apolloOrgData?.industry_tag_list || contact.organization?.industry_tag_list) || null,
              
              // Market Intelligence (ENHANCED - collecting more data)
              jobPostings: jobPostings,
              technologiesUsed: technologiesUsed,
              fundingStage: fundingStage,
              totalFundingUsd: totalFundingUsd,
              buyingIntentSignals: buyingIntentSignals,
              
              // Additional organization data from apolloOrgData
              organizationDescription: apolloOrgData?.description || contact.organization?.description || null,
              organizationPhone: apolloOrgData?.phone || contact.organization?.phone || null,
              organizationIndustry: apolloOrgData?.industry || contact.organization?.industry || null,
              organizationSubIndustry: apolloOrgData?.sub_industry || contact.organization?.sub_industry || null,
              organizationKeywords: apolloOrgData?.keywords || contact.organization?.keywords || null,
              
              // Data quality tracking
              apolloEnrichmentDate: new Date().toISOString(),
              apolloOrgId: finalOrgId
            };
            
            console.log(`  ✅ ENRICHED: ${contactDetails.contactPerson} at ${contact.organization?.name || apolloOrgData?.name || discovery.name}`);
            console.log(`     Email: ${contactDetails.contactEmail || 'N/A'} (${contactDetails.contactEmailStatus || 'unknown'})`);
            console.log(`     Data: ${jobPostings.length} jobs, ${technologiesUsed.length} tech, funding: ${fundingStage || 'N/A'}`);
          }
        } catch (error) {
          console.error(`  ❌ Apollo.io error for ${discovery.name}:`, error);
          shouldSkipCompany = true;
        }
      } else if (!APOLLO_API_KEY) {
        console.log(`  ⚠️ Apollo API key not configured`);
        shouldSkipCompany = true;
      } else if (!placeDetails?.website) {
        console.log(`  ❌ No website available for Apollo enrichment`);
        shouldSkipCompany = true;
      }
      
      // Skip if Apollo couldn't provide data
      if (shouldSkipCompany || !contactDetails) {
        console.log(`  ⏭️ Skipping ${discovery.name}\n`);
        continue;
      }

      // Calculate data completeness score
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
