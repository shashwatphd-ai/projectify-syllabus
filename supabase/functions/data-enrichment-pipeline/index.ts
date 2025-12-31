import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { verifyAuth, unauthorizedResponse } from '../_shared/auth-middleware.ts';
import { withRetry } from '../_shared/retry-utils.ts';
import { 
  API_TIMEOUT_MS,
  ENRICHMENT_TIMEOUT_MS,
  fetchWithTimeout,
  isTimeoutError 
} from '../_shared/timeout-config.ts';

import { corsHeaders, securityHeaders } from '../_shared/cors.ts';

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
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_person?: string | null;
  full_address?: string | null;
  linkedin_profile?: string | null;
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
    
    const data = await withRetry(
      async () => {
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
          const error = new Error(`Google Geocoding API HTTP error: ${response.status} - ${errorText}`);
          (error as any).status = response.status;
          throw error;
        }
        
        return await response.json();
      },
      {
        maxRetries: 2,
        baseDelayMs: 500,
        operationName: `Geocoding ${cityZip}`,
      }
    );
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
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.types,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.nationalPhoneNumber,places.internationalPhoneNumber,places.currentOpeningHours,places.regularOpeningHours,places.editorialSummary,places.location,places.internationalPhoneNumber,places.priceLevel,places.userRatingCount,places.photos'
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

        // Debug logging for contact data
        const phoneNumber = place.nationalPhoneNumber || place.internationalPhoneNumber || null;
        console.log(`  ${name}: Phone=${phoneNumber || 'NOT AVAILABLE'}, Address=${address.substring(0, 50)}...`);
        
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
          phone: phoneNumber
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
  
  // Debug: Log what we received from Google Places
  console.log(`  Phone from API: ${company.phone || 'NOT PROVIDED'}`);
  console.log(`  Address from API: ${company.address || 'NOT PROVIDED'}`);
  console.log(`  Website from API: ${company.website || 'NOT PROVIDED'}`);
  
  // Check for missing critical data
  let contactPhone = company.phone || null;
  let fullAddress = company.address || null;
  let website = company.website || null;
  let contactPerson = null;
  let contactEmail = null;
  let linkedinProfile = null;
  
  const hasCriticalDataGaps = !contactPhone || !website || !contactPerson;
  
  // If critical data is missing, use Google AI Studio web search as fallback
  if (hasCriticalDataGaps) {
    console.log(`  ⚠️ Critical data missing for ${company.name}, using Google AI Studio web search...`);
    const webSearchData = await enrichWithGeminiWebSearch(company.name, company.address, {
      needsPhone: !contactPhone,
      needsWebsite: !website,
      needsContact: true  // Always search for contact person
    });
    
    if (webSearchData) {
      if (webSearchData.phone && !contactPhone) {
        contactPhone = webSearchData.phone;
        console.log(`  ✓ Found phone: ${contactPhone}`);
      }
      if (webSearchData.website && !website) {
        website = webSearchData.website;
        console.log(`  ✓ Found website: ${website}`);
      }
      if (webSearchData.contactPerson) {
        contactPerson = webSearchData.contactPerson;
      }
      if (webSearchData.contactEmail) {
        contactEmail = webSearchData.contactEmail;
      }
      if (webSearchData.linkedinProfile) {
        linkedinProfile = webSearchData.linkedinProfile;
      }
    }
  }
  
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
    contactEmail,
    contactPhone,
    contactPerson,
    fullAddress,
    website,
    linkedinProfile  // Add LinkedIn profile to returned data
  };
}

// NEW: Use Google Search grounding to find company's current needs and contact info
async function enrichWithGeminiWebSearch(
  companyName: string, 
  address: string,
  needs: { needsPhone?: boolean; needsWebsite?: boolean; needsContact?: boolean }
): Promise<{ phone?: string; website?: string; contactPerson?: string; contactEmail?: string; linkedinProfile?: string; currentChallenges?: string[] } | null> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY not set, skipping web search enrichment');
    return null;
  }

  try {
    const prompt = `Search the web for "${companyName}" located at "${address}". Find:

1. CONTACT INFORMATION:
   - Official website URL
   - Business phone number  
   - Key decision-maker for partnerships (Owner/CEO/Director/Manager with hiring authority)
   - Their professional email (name@company.com format, not info@)
   - Their LinkedIn profile URL

2. CURRENT BUSINESS CHALLENGES (from recent news, press releases, job postings, company reports):
   - What problems are they actively trying to solve?
   - What skills are they hiring for?
   - What projects or initiatives are they working on?
   - What industry trends are affecting them?

Focus on verifiable, recent information. For contacts, prioritize people who would discuss educational partnerships or hiring.

Return ONLY valid JSON:
{
  "phone": "phone or null",
  "website": "website or null",
  "contactPerson": "Full Name or null",
  "contactEmail": "professional email or null",
  "linkedinProfile": "LinkedIn URL or null",
  "currentChallenges": ["specific challenge 1", "specific challenge 2", "specific challenge 3"]
}

CRITICAL RULES:
- Only return information you can verify from official sources (company website, LinkedIn, business directories, recent news)
- For contact person, prefer: Owner > General Manager > Director > Department Head
- Email should be a direct professional email (firstname@company.com), not generic (info@, contact@)
- LinkedIn must be the person's actual profile URL
- For challenges, prioritize recent information (last 6 months) from news, job postings, press releases
- Return null for any field you cannot reliably find
- No fabrication or guessing`;

    console.log(`  🔍 Google AI Studio search: enriching ${companyName} with web search (contact info + market intelligence)`);

    // Use Google AI Studio API with web search grounding - with retry logic
    const data = await withRetry(
      async () => {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }],
              tools: [{
                googleSearch: {}  // Enable web search grounding
              }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
              }
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`Google AI Studio error: ${response.status} - ${errorText}`);
          (error as any).status = response.status;
          throw error;
        }

        return await response.json();
      },
      {
        maxRetries: 2,
        baseDelayMs: 1000,
        operationName: `Gemini web search for ${companyName}`,
      }
    );

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      console.log('No content returned from Google AI Studio');
      return null;
    }

    console.log(`  📄 Raw response snippet: ${content.substring(0, 200)}...`);

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('Could not extract JSON from response');
      return null;
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    
    // Build result object with clean data
    const result: any = {};
    
    if (extractedData.phone && extractedData.phone !== 'null') {
      result.phone = extractedData.phone;
    }
    
    if (extractedData.website && extractedData.website !== 'null') {
      result.website = extractedData.website;
    }
    
    if (extractedData.contactPerson && extractedData.contactPerson !== 'null') {
      result.contactPerson = extractedData.contactPerson;
      console.log(`  ✓ Found contact person: ${result.contactPerson}`);
    }
    
    if (extractedData.contactEmail && extractedData.contactEmail !== 'null') {
      result.contactEmail = extractedData.contactEmail;
      console.log(`  ✓ Found contact email: ${result.contactEmail}`);
    }
    
    if (extractedData.linkedinProfile && extractedData.linkedinProfile !== 'null') {
      result.linkedinProfile = extractedData.linkedinProfile;
      console.log(`  ✓ Found LinkedIn: ${result.linkedinProfile}`);
    }
    
    if (extractedData.currentChallenges && Array.isArray(extractedData.currentChallenges) && extractedData.currentChallenges.length > 0) {
      result.currentChallenges = extractedData.currentChallenges;
      console.log(`  ✓ Found ${result.currentChallenges.length} current challenges`);
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.error(`Google AI Studio web search error for ${companyName}:`, error);
    return null;
  }
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

  // Verify JWT authentication
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    console.warn('[data-enrichment-pipeline] Auth failed:', authResult.error);
    return unauthorizedResponse(corsHeaders, authResult.error);
  }
  console.log('[data-enrichment-pipeline] Authenticated user:', authResult.userId);

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get parameters from request body
    const { cityZip } = await req.json();
    
    // Input validation
    if (!cityZip || typeof cityZip !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid cityZip parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const sanitizedCityZip = cityZip.trim().slice(0, 100);
    
    // Validate format (US zip or city name)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    const cityRegex = /^[a-zA-Z\s,.-]+$/;
    
    if (!zipRegex.test(sanitizedCityZip) && !cityRegex.test(sanitizedCityZip)) {
      return new Response(
        JSON.stringify({ error: 'Invalid cityZip format. Must be a valid US zip code or city name.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const targetZip = sanitizedCityZip;

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
          full_address: enrichedCompany.fullAddress,
          linkedin_profile: enrichedCompany.linkedinProfile
        };

        // Log what we're storing including contact info
        console.log(`📦 Storing ${profileToStore.name}:`);
        console.log(`   Phone: ${profileToStore.contact_phone || 'NULL'}`);
        console.log(`   Address: ${profileToStore.full_address || 'NULL'}`);
        console.log(`   Contact: ${profileToStore.contact_person || 'NULL'}`);
        console.log(`   Email: ${profileToStore.contact_email || 'NULL'}`);
        console.log(`   LinkedIn: ${profileToStore.linkedin_profile || 'NULL'}`);
        console.log(`   Needs: ${JSON.stringify(inferredNeeds)}`);

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
    // Return generic error message to prevent information leakage
    return new Response(
      JSON.stringify({ 
        error: 'Data enrichment failed. Please try again later.' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
