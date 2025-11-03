import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanyProfile {
  id?: string;
  name: string;
  source: string;
  website: string;
  city: string;
  zip: string;
  sector: string;
  size: string;
  technologies: string[];
  open_roles: string[];
  recent_news: string;
  inferred_needs: string[];
  last_enriched_at: string;
}

// Geocode city/zip to lat/lng using OpenStreetMap Nominatim
async function geocodeLocation(cityZip: string): Promise<{ lat: number; lng: number } | null> {
  try {
    console.log(`Geocoding ${cityZip} using OpenStreetMap...`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityZip)}&limit=1`,
      {
        headers: {
          'User-Agent': 'ProjectGeneratorApp/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Fetch companies using Google Places API
async function fetchCompaniesFromGoogle(cityZip: string): Promise<any[]> {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!GOOGLE_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY not set');
    return [];
  }

  // Step 1: Geocode the location
  const location = await geocodeLocation(cityZip);
  if (!location) {
    console.error(`Could not geocode ${cityZip}`);
    return [];
  }

  console.log(`Fetching companies near ${location.lat},${location.lng}...`);

  try {
    // Step 2: Search for businesses using Google Places Nearby Search
    const searchResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=5000&type=establishment&key=${GOOGLE_API_KEY}`
    );

    if (!searchResponse.ok) {
      throw new Error(`Google Places API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', searchData.status, searchData.error_message);
      return [];
    }

    if (!searchData.results || searchData.results.length === 0) {
      console.log('No places found in this area');
      return [];
    }

    // Step 3: Get details for each place (limit to first 10)
    const companies = [];
    for (const place of searchData.results.slice(0, 10)) {
      try {
        const detailsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,website,formatted_address,types,business_status,rating,user_ratings_total&key=${GOOGLE_API_KEY}`
        );

        if (!detailsResponse.ok) continue;

        const detailsData = await detailsResponse.json();
        
        if (detailsData.status !== 'OK') continue;

        const details = detailsData.result;

        // Map Google place types to industries
        const industryMap: { [key: string]: string } = {
          'restaurant': 'Food & Beverage',
          'store': 'Retail',
          'hospital': 'Healthcare',
          'school': 'Education',
          'bank': 'Finance',
          'accounting': 'Finance',
          'lawyer': 'Legal Services',
          'real_estate_agency': 'Real Estate',
          'car_dealer': 'Automotive',
          'gym': 'Health & Fitness',
          'beauty_salon': 'Personal Services',
          'lodging': 'Hospitality',
          'electronics_store': 'Technology',
          'clothing_store': 'Retail',
          'furniture_store': 'Retail',
          'home_goods_store': 'Retail',
        };

        let industry = 'General Business';
        for (const type of details.types || []) {
          if (industryMap[type]) {
            industry = industryMap[type];
            break;
          }
        }

        // Estimate company size based on ratings count
        let size = 'Small';
        if (details.user_ratings_total > 100) size = 'Medium';
        if (details.user_ratings_total > 500) size = 'Large';

        companies.push({
          name: details.name,
          website: details.website || '',
          snippet: `${details.name} is located at ${details.formatted_address}. Rating: ${details.rating || 'N/A'} (${details.user_ratings_total || 0} reviews)`,
          industry: industry,
          size: size,
          address: details.formatted_address
        });

        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (detailError) {
        console.error('Error fetching place details:', detailError);
        continue;
      }
    }

    console.log(`Found ${companies.length} companies from Google Places`);
    return companies;
  } catch (error) {
    console.error('Error fetching from Google Places:', error);
    return [];
  }
}

async function enrichCompany(company: any): Promise<any> {
  // TODO: Call real enrichment APIs (Clearbit, job boards, etc.)
  console.log(`Enriching ${company.name}...`);
  return {
    ...company,
    technologies: ["Salesforce", "QuickBooks", "Microsoft 365"],
    open_roles: ["Operations Manager", "Sales Associate", "Data Analyst"],
  };
}

// AI Analysis Step using Lovable AI Gateway
async function analyzeNeeds(enrichedCompany: any): Promise<string[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const prompt = `Analyze the following company data and return a JSON array of their top 3-5 business needs.

Data:
- Industry: ${enrichedCompany.industry}
- Snippet: ${enrichedCompany.snippet}
- Technologies: ${enrichedCompany.technologies.join(', ')}
- Open Jobs: ${enrichedCompany.open_roles.join(', ')}

Return ONLY a JSON object with a "needs" array of strings. Example: {"needs": ["e-commerce expansion", "supply chain optimization"]}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a business analyst. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    const parsed = JSON.parse(content);
    let needs = [];
    if (Array.isArray(parsed)) {
      needs = parsed;
    } else if (parsed.needs && Array.isArray(parsed.needs)) {
      needs = parsed.needs;
    }
    
    console.log(`Inferred needs for ${enrichedCompany.name}: ${needs.join(', ')}`);
    return needs;
  } catch (error) {
    console.error(`AI analysis failed for ${enrichedCompany.name}:`, error instanceof Error ? error.message : String(error));
    return ["general operations improvement", "sales growth", "digital transformation"];
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get parameters from request body
    const { cityZip } = await req.json();
    const targetZip = cityZip || "66006"; // Default for testing

    console.log(`Starting enrichment pipeline for ${targetZip}...`);

    // Step 1: Fetch companies from Google Places API
    const baseCompanies = await fetchCompaniesFromGoogle(targetZip);
    
    let successCount = 0;
    let errorCount = 0;

    // Step 2: Process each company
    for (const company of baseCompanies) {
      try {
        // Enrich with additional data
        const enrichedCompany = await enrichCompany(company);
        
        // Analyze business needs with AI
        const inferredNeeds = await analyzeNeeds(enrichedCompany);

        // Extract city from address if available
        const cityName = enrichedCompany.address 
          ? enrichedCompany.address.split(',')[1]?.trim() || "Unknown"
          : "Unknown";

        // Prepare company profile
        const profileToStore: Omit<CompanyProfile, 'id'> = {
          name: enrichedCompany.name,
          source: 'google_places',
          website: enrichedCompany.website || '',
          city: cityName,
          zip: targetZip,
          sector: enrichedCompany.industry,
          size: enrichedCompany.size,
          technologies: enrichedCompany.technologies,
          open_roles: enrichedCompany.open_roles,
          recent_news: enrichedCompany.snippet,
          inferred_needs: inferredNeeds,
          last_enriched_at: new Date().toISOString(),
        };

        // Step 3: UPSERT to database
        const { data, error } = await supabase
          .from('company_profiles')
          .upsert(profileToStore, { onConflict: 'name,zip' })
          .select();

        if (error) {
          console.error(`Failed to upsert ${profileToStore.name}:`, error.message);
          errorCount++;
        } else {
          console.log(`Successfully upserted ${profileToStore.name}`);
          successCount++;
        }
      } catch (companyError) {
        console.error(`Error processing company ${company.name}:`, companyError);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Enrichment complete for ${targetZip}`,
        success: successCount,
        errors: errorCount,
        total: baseCompanies.length
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Pipeline error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
