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

// Fetch companies using NEW Google Places API (v1)
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

  console.log(`Fetching companies near ${location.lat},${location.lng} using NEW Places API...`);

  try {
    // Step 2: Search for businesses using NEW Google Places API
    const searchResponse = await fetch(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus'
        },
        body: JSON.stringify({
          includedTypes: ['establishment'],
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: {
                latitude: location.lat,
                longitude: location.lng
              },
              radius: 5000.0
            }
          }
        })
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`Google Places API error: ${searchResponse.status} - ${errorText}`);
      return [];
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.places || searchData.places.length === 0) {
      console.log('No places found in this area');
      return [];
    }

    console.log(`Found ${searchData.places.length} places from NEW Google Places API`);

    // Map place types to industries
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
      'construction_company': 'Construction',
      'contractor': 'Construction',
      'roofing_contractor': 'Construction',
      'plumber': 'Construction',
      'electrician': 'Construction'
    };

    // Step 3: Process each place
    const companies = [];
    for (const place of searchData.places) {
      try {
        const name = place.displayName?.text || 'Unknown';
        const address = place.formattedAddress || '';
        
        // Extract zip from address
        const zipMatch = address.match(/\b\d{5}\b/);
        const zip = zipMatch ? zipMatch[0] : '';
        
        // Extract city from address
        const addressParts = address.split(',');
        const city = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() : '';

        // Determine industry from types
        let industry = 'General Business';
        if (place.types && Array.isArray(place.types)) {
          for (const type of place.types) {
            if (industryMap[type]) {
              industry = industryMap[type];
              break;
            }
          }
        }

        // Estimate company size based on ratings count
        let size = 'Small';
        const ratingCount = place.userRatingCount || 0;
        if (ratingCount > 100) size = 'Medium';
        if (ratingCount > 500) size = 'Large';

        companies.push({
          name: name,
          website: place.websiteUri || '',
          snippet: `${name} is located at ${address}. Rating: ${place.rating || 'N/A'} (${ratingCount} reviews)`,
          industry: industry,
          size: size,
          address: address,
          city: city,
          zip: zip
        });

      } catch (placeError) {
        console.error('Error processing place:', placeError);
        continue;
      }
    }

    console.log(`Processed ${companies.length} companies successfully`);
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

        // Use city and zip from company data
        const cityName = enrichedCompany.city || "Unknown";
        const zipCode = enrichedCompany.zip || targetZip;

        // Prepare company profile
        const profileToStore: Omit<CompanyProfile, 'id'> = {
          name: enrichedCompany.name,
          source: 'google_places',
          website: enrichedCompany.website || '',
          city: cityName,
          zip: zipCode,
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
