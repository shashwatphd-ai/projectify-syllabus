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

// Geocode city/zip to lat/lng using Google Geocoding API
async function geocodeLocation(cityZip: string): Promise<{ lat: number; lng: number } | null> {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!GOOGLE_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY not set');
    return null;
  }

  try {
    console.log(`Geocoding ${cityZip} using Google Geocoding API...`);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityZip)}&key=${GOOGLE_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Geocoding API HTTP error: ${response.status} - ${errorText}`);
      throw new Error(`Google Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Geocoding API response status: ${data.status}`);
    
    if (data.status === 'REQUEST_DENIED') {
      console.error(`Geocoding API request denied. Error: ${data.error_message || 'No error message'}`);
      console.error('Make sure Geocoding API is enabled in Google Cloud Console');
      return null;
    }
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log(`✓ Geocoded ${cityZip} to ${location.lat}, ${location.lng}`);
      return {
        lat: location.lat,
        lng: location.lng
      };
    }
    console.log(`Geocoding failed with status: ${data.status}, message: ${data.error_message || 'none'}`);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Validate and normalize address using Google Address Validation API
async function validateAddress(address: string): Promise<{
  formattedAddress: string;
  city: string;
  zip: string;
} | null> {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!GOOGLE_API_KEY || !address) return null;

  try {
    console.log(`Validating address: ${address}`);
    const response = await fetch(
      `https://addressvalidation.googleapis.com/v1:validateAddress?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: {
            addressLines: [address]
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Address Validation API HTTP error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.result?.address) {
      console.log('No validated address returned');
      return null;
    }

    const validatedAddr = data.result.address;
    const postalAddress = validatedAddr.postalAddress;
    
    // Extract formatted address
    const formattedAddress = validatedAddr.formattedAddress || address;
    
    // Extract city and zip from postal address
    const city = postalAddress?.locality || '';
    const zip = postalAddress?.postalCode || '';
    
    console.log(`✓ Address validated: ${formattedAddress}, City: ${city}, Zip: ${zip}`);
    return {
      formattedAddress,
      city,
      zip
    };
  } catch (error) {
    console.error(`Address validation error:`, error);
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
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.nationalPhoneNumber,places.internationalPhoneNumber'
        },
        body: JSON.stringify({
          includedTypes: [
            'accounting',
            'bank',
            'hospital',
            'insurance_agency',
            'lawyer',
            'real_estate_agency',
            'restaurant',
            'store',
            'shopping_mall',
            'university',
            'school',
            'travel_agency',
            'pharmacy',
            'doctor',
            'dentist',
            'veterinary_care',
            'car_dealer',
            'car_repair',
            'electronics_store',
            'furniture_store',
            'hardware_store',
            'home_goods_store'
          ],
          maxResultCount: 15,
          locationRestriction: {
            circle: {
              center: {
                latitude: location.lat,
                longitude: location.lng
              },
              radius: 40000.0  // ~25 miles in meters
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
        const rawAddress = place.formattedAddress || '';
        
        // Validate and normalize address with Google Address Validation API
        const validatedAddr = await validateAddress(rawAddress);
        
        let address = rawAddress;
        let city = '';
        let zip = '';
        
        if (validatedAddr) {
          // Use validated data
          address = validatedAddr.formattedAddress;
          city = validatedAddr.city;
          zip = validatedAddr.zip;
        } else {
          // Fallback to manual extraction
          const zipMatch = rawAddress.match(/\b\d{5}\b/);
          zip = zipMatch ? zipMatch[0] : '';
          
          const addressParts = rawAddress.split(',').map((p: string) => p.trim());
          city = addressParts.length > 1 ? addressParts[1] : '';
        }

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
          placeId: place.id,
          website: place.websiteUri || null,
          snippet: `${name} is located at ${address}. Rating: ${place.rating || 'N/A'} (${ratingCount} reviews)`,
          industry: industry,
          size: size,
          address: address,
          city: city,
          zip: zip,
          phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null
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
  console.log(`Enriching ${company.name}...`);
  
  // Use phone from Google Places API (no scraping needed)
  const contactPhone = company.phone || null;
  const fullAddress = company.address || null;
  
  // DO NOT scrape websites or use fake fallback data
  // Contact info must come from verified sources only
  
  // Infer technologies based on industry
  const techMap: { [key: string]: string[] } = {
    'Healthcare': ['Epic', 'Cerner', 'MEDITECH', 'Salesforce Health Cloud'],
    'Food & Beverage': ['Toast POS', 'Square', 'Aloha', 'OpenTable'],
    'Education': ['Canvas LMS', 'Blackboard', 'Google Workspace', 'Zoom'],
    'Finance': ['QuickBooks', 'SAP', 'Bloomberg Terminal', 'Salesforce'],
    'Retail': ['Shopify', 'Square', 'Lightspeed', 'SAP Commerce'],
    'Real Estate': ['MLS', 'Zillow Premier Agent', 'Dotloop', 'Matterport'],
    'Legal Services': ['Clio', 'MyCase', 'LexisNexis', 'Westlaw'],
    'Automotive': ['CDK Global', 'Reynolds and Reynolds', 'Dealertrack'],
    'Construction': ['Procore', 'Buildertrend', 'CoConstruct', 'PlanGrid']
  };
  
  const technologies = techMap[company.industry] || ['Microsoft 365', 'QuickBooks', 'Salesforce'];
  
  // Infer roles based on industry and size
  const roleMap: { [key: string]: string[] } = {
    'Healthcare': ['Medical Assistant', 'Health Data Analyst', 'Patient Care Coordinator'],
    'Food & Beverage': ['Restaurant Manager', 'Marketing Coordinator', 'Operations Analyst'],
    'Education': ['Instructional Designer', 'Student Services Coordinator', 'Data Analyst'],
    'Finance': ['Financial Analyst', 'Compliance Officer', 'Client Relations Manager'],
    'Retail': ['Store Manager', 'E-commerce Specialist', 'Inventory Analyst'],
    'Real Estate': ['Real Estate Agent', 'Property Manager', 'Marketing Specialist'],
    'Legal Services': ['Paralegal', 'Legal Assistant', 'Office Manager'],
    'Automotive': ['Service Advisor', 'Sales Manager', 'Parts Manager'],
    'Construction': ['Project Manager', 'Estimator', 'Safety Coordinator']
  };
  
  const open_roles = roleMap[company.industry] || ['Operations Manager', 'Business Analyst', 'Marketing Coordinator'];
  
  return {
    ...company,
    technologies,
    open_roles,
    contactEmail: null, // Email not available from Google Places API
    contactPhone,
    contactPerson: null, // Contact person not available from public APIs
    fullAddress
  };
}

// Enrich company with Google Knowledge Graph API
async function enrichWithKnowledgeGraph(companyName: string): Promise<{
  description?: string;
  website?: string;
  detailedDescription?: string;
} | null> {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!GOOGLE_API_KEY) return null;

  try {
    console.log(`Fetching Knowledge Graph data for ${companyName}...`);
    const response = await fetch(
      `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(companyName)}&key=${GOOGLE_API_KEY}&limit=1&indent=True`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log(`Knowledge Graph API returned ${response.status} for ${companyName}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.itemListElement || data.itemListElement.length === 0) {
      console.log(`No Knowledge Graph entry found for ${companyName}`);
      return null;
    }

    const entity = data.itemListElement[0].result;
    
    // Extract available data
    const kgData: any = {};
    
    if (entity.description) {
      kgData.description = entity.description;
    }
    
    if (entity.detailedDescription?.articleBody) {
      kgData.detailedDescription = entity.detailedDescription.articleBody;
    }
    
    if (entity.url) {
      kgData.website = entity.url;
    }
    
    console.log(`✓ Knowledge Graph enrichment successful for ${companyName}`);
    return kgData;
  } catch (error) {
    console.error(`Knowledge Graph API error for ${companyName}:`, error);
    return null;
  }
}

// Fetch Google reviews for a place
async function fetchGoogleReviews(placeId: string): Promise<string[]> {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!GOOGLE_API_KEY) return [];
  
  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'reviews'
        }
      }
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch reviews for ${placeId}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const reviews = data.reviews || [];
    
    // Extract review texts, limit to most recent 10
    return reviews.slice(0, 10).map((review: any) => review.text?.text || '').filter((text: string) => text.length > 0);
  } catch (error) {
    console.error(`Error fetching reviews: ${error}`);
    return [];
  }
}

// AI Analysis Step using Lovable AI Gateway with Google Reviews
async function analyzeNeeds(enrichedCompany: any, reviews: string[] = []): Promise<string[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const reviewsText = reviews.length > 0 
    ? `\n\nCustomer Reviews (analyze for pain points):\n${reviews.slice(0, 5).map((r, i) => `${i + 1}. "${r}"`).join('\n')}`
    : '';
  
  const prompt = `Analyze the following company data${reviews.length > 0 ? ' and customer reviews' : ''} to identify their top 3-5 specific business needs or challenges that students could help solve through educational projects.

Company Data:
- Name: ${enrichedCompany.name}
- Industry: ${enrichedCompany.industry}
- Size: ${enrichedCompany.size}
- Snippet: ${enrichedCompany.snippet}
- Technologies: ${enrichedCompany.technologies.join(', ')}
- Open Roles: ${enrichedCompany.open_roles.join(', ')}${reviewsText}

Return ONLY raw JSON (no markdown, no code blocks, no backticks):
{"needs": ["specific need 1", "specific need 2", "specific need 3"]}`;

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
          { role: 'system', content: 'You are a business analyst. Return ONLY valid JSON with no markdown formatting.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Log raw response for debugging
    console.log(`Raw AI response for ${enrichedCompany.name} (first 200 chars): ${content.substring(0, 200)}`);
    
    // Strip markdown code blocks if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Try multiple JSON extraction methods
    let parsed;
    let needs = [];
    
    try {
      // Method 1: Direct parse
      parsed = JSON.parse(content);
    } catch (directParseError) {
      // Method 2: Extract JSON array/object from text
      const jsonMatch = content.match(/\{[^}]*"needs"[^}]*\}|\[[^\]]*\]/);
      if (jsonMatch) {
        console.log(`Extracted JSON via regex for ${enrichedCompany.name}`);
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`No valid JSON found in response: ${content.substring(0, 100)}`);
      }
    }
    
    // Extract needs array from parsed data
    if (Array.isArray(parsed)) {
      needs = parsed;
    } else if (parsed.needs && Array.isArray(parsed.needs)) {
      needs = parsed.needs;
    } else {
      console.error(`Unexpected JSON structure for ${enrichedCompany.name}:`, parsed);
      throw new Error('Parsed JSON does not contain needs array');
    }
    
    // Validate needs are specific (not generic fallback)
    if (needs.length > 0 && !needs.some((n: string) => n.toLowerCase().includes('general') || n.toLowerCase().includes('improve'))) {
      console.log(`✓ Extracted ${needs.length} specific needs for ${enrichedCompany.name}`);
    } else {
      console.log(`⚠ Needs may be generic for ${enrichedCompany.name}: ${needs.join(', ')}`);
    }
    
    return needs;
  } catch (error) {
    console.error(`❌ AI analysis failed for ${enrichedCompany.name}:`, error instanceof Error ? error.message : String(error));
    console.error(`Falling back to generic needs for ${enrichedCompany.name}`);
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
        
        // Enrich with Knowledge Graph data (verified official info)
        const kgData = await enrichWithKnowledgeGraph(enrichedCompany.name);
        if (kgData) {
          // Prefer Knowledge Graph data over Places API data
          if (kgData.website) enrichedCompany.website = kgData.website;
          if (kgData.detailedDescription) {
            enrichedCompany.snippet = kgData.detailedDescription;
          } else if (kgData.description) {
            enrichedCompany.snippet = `${kgData.description}. ${enrichedCompany.snippet}`;
          }
        }
        
        // Fetch Google reviews if placeId is available
        let reviews: string[] = [];
        if (company.placeId) {
          reviews = await fetchGoogleReviews(company.placeId);
          console.log(`Fetched ${reviews.length} reviews for ${enrichedCompany.name}`);
        }
        
        // Analyze business needs with AI (including reviews)
        const inferredNeeds = await analyzeNeeds(enrichedCompany, reviews);

        // Use city and zip from company data
        const cityName = enrichedCompany.city || "Unknown";
        const zipCode = enrichedCompany.zip || targetZip;

        // Prepare company profile with contact info
        const profileToStore: any = {
          name: enrichedCompany.name,
          source: 'google_places',
          website: enrichedCompany.website,
          city: cityName,
          zip: zipCode,
          sector: enrichedCompany.industry,
          size: enrichedCompany.size,
          technologies: enrichedCompany.technologies,
          open_roles: enrichedCompany.open_roles,
          recent_news: enrichedCompany.snippet,
          inferred_needs: inferredNeeds,
          last_enriched_at: new Date().toISOString(),
          contact_email: enrichedCompany.contactEmail,
          contact_phone: enrichedCompany.contactPhone,
          contact_person: enrichedCompany.contactPerson,
          full_address: enrichedCompany.fullAddress
        };

        // Log what we're storing
        console.log(`📦 Storing for ${profileToStore.name}: needs=${JSON.stringify(inferredNeeds)}`);

        // Step 3: UPSERT to database
        const { data, error } = await supabase
          .from('company_profiles')
          .upsert(profileToStore, { onConflict: 'name,zip' })
          .select();

        if (error) {
          console.error(`❌ Failed to upsert ${profileToStore.name}:`, error.message);
          errorCount++;
        } else {
          // Verify what was actually stored
          const storedNeeds = data?.[0]?.inferred_needs;
          if (JSON.stringify(storedNeeds) === JSON.stringify(inferredNeeds)) {
            console.log(`✓ Successfully stored ${profileToStore.name} with ${inferredNeeds.length} needs`);
          } else {
            console.error(`⚠ Mismatch in stored needs for ${profileToStore.name}!`);
            console.error(`  Expected: ${JSON.stringify(inferredNeeds)}`);
            console.error(`  Got: ${JSON.stringify(storedNeeds)}`);
          }
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
