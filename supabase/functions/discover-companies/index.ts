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
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  // Build search query based on what companies would need these skills
  const skillKeywords = courseOutcomes
    .join(' ')
    .toLowerCase()
    .match(/\b(engineering|design|analysis|optimization|development|research|testing|simulation|data|modeling|systems|process|manufacturing|materials|quality)\b/gi) || [];
  
  const uniqueSkills = [...new Set(skillKeywords)].slice(0, 5);

  const prompt = `You are a market research expert. Use Google Search to find real companies in ${location} that currently need the skills taught in this ${courseLevel} course.

COURSE LEARNING OUTCOMES:
${courseOutcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}

KEY TOPICS COVERED:
${courseTopics.join(', ')}

YOUR TASK:
Search the web for companies in ${location} that:
1. Have recent job postings for roles requiring these skills
2. Are working on projects that align with course topics  
3. Have announced initiatives/challenges that students could help with
4. Are in industries that naturally need these technical skills
5. Have a track record of university partnerships or hiring recent graduates

Look for evidence in:
- Job postings (Indeed, LinkedIn, company careers pages)
- Recent news articles about company projects/challenges
- Press releases about new initiatives
- Industry reports about companies in this region
- Company websites describing current work

Return ${count} companies with the STRONGEST need for these skills right now.

Return ONLY valid JSON array:
[
  {
    "name": "Company Name",
    "sector": "Industry",
    "location": "City, State",
    "relevanceScore": 95,
    "skillsNeeded": ["specific skill 1", "specific skill 2", "specific skill 3"],
    "currentChallenges": ["challenge they're facing that students could help with"],
    "whyRelevant": "Specific evidence of why they need these skills (cite job postings, news, initiatives)",
    "website": "https://example.com",
    "estimatedSize": "Small/Medium/Large/Enterprise"
  }
]

CRITICAL: Only return companies where you found REAL EVIDENCE of current need (job posting, news article, initiative).
DO NOT make up generic needs. Cite your sources in whyRelevant.`;

  console.log(`🔍 Discovering companies that need: ${uniqueSkills.join(', ')}`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        tools: [{
          googleSearch: {}  // Enable web search grounding
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) throw new Error('No content from Gemini');

  console.log(`📄 Raw discovery response (first 300 chars): ${content.substring(0, 300)}...`);

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Could not extract JSON from response');

  const discoveries: CompanyDiscovery[] = JSON.parse(jsonMatch[0]);
  
  discoveries.forEach(d => {
    console.log(`  ✓ ${d.name} (${d.relevanceScore}%) - ${d.whyRelevant.substring(0, 80)}...`);
  });

  return discoveries;
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

      // Now enrich with Gemini web search for contact person details
      let contactDetails = null;
      const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
      if (GEMINI_API_KEY && placeDetails?.address) {
        try {
          console.log(`  🔍 Finding contact person for ${discovery.name}...`);
          
          const contactPrompt = `Find the key decision-maker at "${discovery.name}" located at "${placeDetails.address}".

Search for:
- CEO, President, Owner, General Manager, or Director
- Their professional email (firstname@company.com format, not info@)
- Their LinkedIn profile URL

Focus on someone who would handle educational partnerships or hiring.

Return ONLY valid JSON:
{
  "contactPerson": "Full Name or null",
  "contactEmail": "professional email or null", 
  "linkedinProfile": "LinkedIn URL or null"
}`;

          const contactResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: contactPrompt }] }],
                tools: [{ googleSearch: {} }],
                generationConfig: { temperature: 0.1 }
              }),
            }
          );

          if (contactResponse.ok) {
            const contactData = await contactResponse.json();
            const contactText = contactData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (contactText) {
              const jsonMatch = contactText.match(/\{[\s\S]*?\}/);
              if (jsonMatch) {
                contactDetails = JSON.parse(jsonMatch[0]);
                if (contactDetails?.contactPerson && contactDetails.contactPerson !== 'null') {
                  console.log(`  ✓ Found contact: ${contactDetails.contactPerson}`);
                }
              }
            }
          }
        } catch (error) {
          console.error(`  ⚠ Could not find contact for ${discovery.name}:`, error);
        }
      }

      // Store in company_profiles table
      const companyData = {
        name: discovery.name,
        sector: discovery.sector,
        size: discovery.estimatedSize,
        website: placeDetails?.website || discovery.website,
        full_address: placeDetails?.address || discovery.location,
        contact_phone: placeDetails?.phone,
        contact_person: contactDetails?.contactPerson && contactDetails.contactPerson !== 'null' ? contactDetails.contactPerson : null,
        contact_email: contactDetails?.contactEmail && contactDetails.contactEmail !== 'null' ? contactDetails.contactEmail : null,
        linkedin_profile: contactDetails?.linkedinProfile && contactDetails.linkedinProfile !== 'null' ? contactDetails.linkedinProfile : null,
        inferred_needs: discovery.currentChallenges,
        source: 'google_discovery',
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
