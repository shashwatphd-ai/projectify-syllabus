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
          console.log(`  🚀 Searching Apollo.io for contacts at ${discovery.name}...`);
          
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
                organization_domains: [new URL(placeDetails.website).hostname.replace('www.', '')],
                person_titles: [
                  'CEO', 'President', 'Owner', 'Founder',
                  'COO', 'General Manager', 'Director',
                  'VP', 'Head of Operations', 'Managing Director'
                ],
                person_seniorities: ['owner', 'c_suite', 'vp', 'director'],
                page: 1,
                per_page: 3
              })
            }
          );

          if (apolloResponse.ok) {
            const apolloData = await apolloResponse.json();
            
            if (apolloData.people && apolloData.people.length > 0) {
              const contact = apolloData.people[0]; // Take highest-ranking person
              
              contactDetails = {
                contactPerson: contact.name || null,
                contactEmail: contact.email || null,
                contactPhone: contact.phone_numbers?.[0]?.sanitized_number || null,
                linkedinProfile: contact.linkedin_url || null,
                title: contact.title || null,
                source: 'apollo_verified'
              };
              
              console.log(`  ✓ Apollo.io verified contact: ${contactDetails.contactPerson} (${contactDetails.title})`);
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

      // Store in company_profiles table
      const companyData = {
        name: discovery.name,
        sector: discovery.sector,
        size: discovery.estimatedSize,
        website: placeDetails?.website || discovery.website,
        full_address: placeDetails?.address || discovery.location,
        contact_phone: contactDetails?.contactPhone || placeDetails?.phone || null,
        contact_person: contactDetails?.contactPerson && contactDetails.contactPerson !== 'null' ? contactDetails.contactPerson : null,
        contact_email: contactDetails?.contactEmail && contactDetails.contactEmail !== 'null' ? contactDetails.contactEmail : null,
        linkedin_profile: contactDetails?.linkedinProfile && contactDetails.linkedinProfile !== 'null' ? contactDetails.linkedinProfile : null,
        inferred_needs: discovery.currentChallenges,
        source: contactDetails?.source || 'google_discovery', // Track data source: apollo_verified, ai_inferred, or google_discovery
        last_enriched_at: new Date().toISOString(),
      };

      // Try to insert, or update if exists
      const { data: existingCompany } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('name', discovery.name)
        .maybeSingle();

      let companyProfileId;
      if (existingCompany) {
        const { data: updated } = await supabase
          .from('company_profiles')
          .update(companyData)
          .eq('id', existingCompany.id)
          .select('id')
          .single();
        companyProfileId = updated?.id;
        console.log(`  💾 Updated company profile: ${discovery.name}`);
      } else {
        const { data: inserted } = await supabase
          .from('company_profiles')
          .insert(companyData)
          .select('id')
          .single();
        companyProfileId = inserted?.id;
        console.log(`  💾 Stored new company profile: ${discovery.name}`);
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
