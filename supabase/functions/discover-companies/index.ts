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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { courseId, location, count = 4 } = await req.json();

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
      // APOLLO.IO INTEGRATION - Phase 1
      // ============================================
      // TODO: Add APOLLO_API_KEY secret before deployment
      // Required for: Apollo.io People Search API
      // Cost: $99/month Professional plan
      // ============================================
      
      let contactDetails = null;
      const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');
      
      if (APOLLO_API_KEY && placeDetails?.website) {
        // PRIMARY: Use Apollo.io People Search for verified contact data
        try {
          // Extract and validate domain
          const domain = new URL(placeDetails.website).hostname.replace('www.', '');
          console.log(`  🚀 Searching Apollo.io for contacts at ${discovery.name} (domain: ${domain})...`);
          
          const apolloResponse = await fetch(
            'https://api.apollo.io/v1/mixed_people/search',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': APOLLO_API_KEY
              },
              body: JSON.stringify({
                // Primary filter: organization domain
                organization_domains: [domain],
                // Prioritize decision makers who handle partnerships
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
                // Only get top result
                page: 1,
                per_page: 1
              })
            }
          );

          if (apolloResponse.ok) {
            const apolloData = await apolloResponse.json();
            
            if (apolloData.people && apolloData.people.length > 0) {
              const contact = apolloData.people[0];
              
              // CRITICAL: Verify the contact actually belongs to this organization
              const contactDomain = contact.organization?.website_url 
                ? new URL(contact.organization.website_url).hostname.replace('www.', '')
                : null;
              
              const contactOrgName = contact.organization?.name?.toLowerCase() || '';
              const searchOrgName = discovery.name.toLowerCase();
              
              // Validate: domain match OR organization name similarity
              const isDomainMatch = contactDomain === domain;
              const isNameMatch = contactOrgName.includes(searchOrgName.split(' ')[0]) || 
                                  searchOrgName.includes(contactOrgName.split(' ')[0]);
              
              if (isDomainMatch || isNameMatch) {
                // Extract comprehensive contact and organization data
                contactDetails = {
                  // Basic contact info (existing)
                  contactPerson: contact.name || null,
                  contactEmail: contact.email || null,
                  contactPhone: contact.phone_numbers?.[0]?.sanitized_number || null,
                  linkedinProfile: contact.linkedin_url || null,
                  title: contact.title || null,
                  source: 'apollo_verified',
                  
                  // New: Detailed contact fields
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
                  
                  // New: Organization enrichment fields
                  organizationLinkedinUrl: contact.organization?.linkedin_url || null,
                  organizationTwitterUrl: contact.organization?.twitter_url || null,
                  organizationFacebookUrl: contact.organization?.facebook_url || null,
                  organizationFoundedYear: contact.organization?.founded_year || null,
                  organizationLogoUrl: contact.organization?.logo_url || null,
                  organizationEmployeeCount: contact.organization?.estimated_num_employees 
                    ? `${contact.organization.estimated_num_employees}` 
                    : null,
                  organizationRevenueRange: contact.organization?.annual_revenue 
                    ? `$${contact.organization.annual_revenue}` 
                    : null,
                  organizationIndustryKeywords: contact.organization?.industry_tag_list || null,
                  
                  // Data quality tracking
                  apolloEnrichmentDate: new Date().toISOString()
                };
                
                console.log(`  ✓ Apollo.io verified contact: ${contactDetails.contactPerson} (${contactDetails.title})`);
                console.log(`    Organization: ${contact.organization?.name || 'N/A'}`);
                console.log(`    Email Status: ${contactDetails.contactEmailStatus || 'N/A'}`);
              } else {
                console.log(`  ⚠ Apollo contact organization mismatch:`);
                console.log(`    Expected: ${discovery.name} (${domain})`);
                console.log(`    Got: ${contact.organization?.name || 'N/A'} (${contactDomain || 'N/A'})`);
              }
            } else {
              console.log(`  ⚠ No contacts found in Apollo.io for ${discovery.name}`);
            }
          } else {
            const errorText = await apolloResponse.text();
            console.error(`  ⚠ Apollo.io API error (${apolloResponse.status}):`, errorText);
          }
        } catch (error) {
          console.error(`  ⚠ Apollo.io search failed for ${discovery.name}:`, error);
        }
      }
      
      // FALLBACK: Use Lovable AI if Apollo.io not configured or found nothing
      if (!contactDetails && placeDetails?.address) {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (LOVABLE_API_KEY) {
          try {
            console.log(`  🔍 Fallback: Using Lovable AI for ${discovery.name}...`);
            
            const contactPrompt = `Find the key decision-maker at "${discovery.name}" located at "${placeDetails.address}".

Search for:
- CEO, President, Owner, General Manager, or Director
- Their professional email (firstname@company.com format, not info@)
- Their LinkedIn profile URL

Focus on someone who would handle educational partnerships or hiring.

Return ONLY valid JSON (no markdown):
{
  "contactPerson": "Full Name or null",
  "contactEmail": "professional email or null", 
  "linkedinProfile": "LinkedIn URL or null"
}`;

            const contactResponse = await fetch(
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
                    { role: 'system', content: 'You are a research assistant. Return only valid JSON.' },
                    { role: 'user', content: contactPrompt }
                  ],
                  temperature: 0.1,
                }),
              }
            );

            if (contactResponse.ok) {
              const contactData = await contactResponse.json();
              const contactText = contactData.choices?.[0]?.message?.content;
              if (contactText) {
                let jsonText = contactText;
                const codeBlockMatch = contactText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (codeBlockMatch) {
                  jsonText = codeBlockMatch[1];
                }
                
                const jsonMatch = jsonText.match(/\{[\s\S]*?\}/);
                if (jsonMatch) {
                  const fallbackContact = JSON.parse(jsonMatch[0]);
                  contactDetails = {
                    ...fallbackContact,
                    source: 'ai_inferred'
                  };
                  if (contactDetails?.contactPerson && contactDetails.contactPerson !== 'null') {
                    console.log(`  ✓ AI found contact: ${contactDetails.contactPerson}`);
                  }
                }
              }
            }
          } catch (error) {
            console.error(`  ⚠ Fallback contact search failed for ${discovery.name}:`, error);
          }
        }
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
        
        // Metadata
        source: contactDetails?.source || 'google_discovery',
        inferred_needs: discovery.currentChallenges,
        technologies: null,
        open_roles: null,
        
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

    return new Response(
      JSON.stringify({ 
        success: true,
        companies: enrichedDiscoveries,
        count: enrichedDiscoveries.length
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Discovery error:', error);
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
