import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🌍 Starting global location detection for:', email);

    // Extract domain from email (e.g., user@university.edu -> university.edu)
    const domain = email.split('@')[1];
    
    if (!domain) {
      console.log('❌ No domain found in email');
      return new Response(
        JSON.stringify({ error: 'Could not extract domain from email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔎 Step 1: Checking university_domains database for domain:', domain);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // PHASE 2 - STEP 1: Check local university_domains database first (fastest)
    const { data: universityData, error: dbError } = await supabaseClient
      .from('university_domains')
      .select('formatted_location, city, state, zip, country, name')
      .eq('domain', domain)
      .maybeSingle();

    if (universityData) {
      console.log('✅ Found in database:', universityData.name);
      
      // CACHE COMPLETENESS VALIDATION - Check if we have precise city/state data
      const isCacheComplete = universityData.city && universityData.state;
      
      if (!isCacheComplete) {
        console.log('⚠️ Cached data is INCOMPLETE (missing city/state), re-geocoding...');
        // Fall through to University Domains API + Geocoding path
      } else {
        // Use complete cached data
        // SIMPLIFIED: Apollo expects "City, State" format, not "City, State, Country"
        const searchParts = [
          universityData.city,
          universityData.state
        ].filter(Boolean);
        const searchLocation = searchParts.length > 0 ? searchParts.join(', ') : universityData.country;

        console.log(`✅ Using complete cached data: "${searchLocation}" (simplified for Apollo)`);
        
        return new Response(
          JSON.stringify({
            success: true,
            location: universityData.formatted_location, // Display format
            searchLocation: searchLocation, // Apollo format
            city: universityData.city || '',
            state: universityData.state || '',
            zip: universityData.zip || '',
            country: universityData.country,
            source: 'database_complete'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    console.log('⚠️ Not in database, trying University Domains API...');

    // PHASE 2 - STEP 2: Try free University Domains API (backup)
    try {
      const uniApiResponse = await fetch(
        'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json',
        { headers: { 'User-Agent': 'EduThree-LocationDetection/2.0' } }
      );

      if (uniApiResponse.ok) {
        const universities = await uniApiResponse.json();
        const match = universities.find((uni: any) => 
          uni.domains && uni.domains.includes(domain)
        );

        if (match) {
          console.log('✅ Found in University Domains API:', match.name);
          
          // PHASE 3: Map full country names for Apollo (not ISO codes)
          const countryCodeMap: Record<string, string> = {
            'IN': 'India',
            'US': 'United States',
            'GB': 'United Kingdom',
            'CA': 'Canada',
            'AU': 'Australia',
            'DE': 'Germany',
            'FR': 'France',
            'JP': 'Japan',
            'CN': 'China',
            'SG': 'Singapore',
            'AE': 'United Arab Emirates',
            'NL': 'Netherlands',
            'SE': 'Sweden',
            'CH': 'Switzerland',
            'ES': 'Spain',
            'IT': 'Italy',
            'BR': 'Brazil',
            'MX': 'Mexico',
            'KR': 'South Korea',
            'IL': 'Israel'
          };
          
          const isoCode = match['alpha_two_code'] || match.country;
          const fullCountryName = countryCodeMap[isoCode] || match.country;
          
          // ENHANCEMENT: Geocode the university name to get city/state
          console.log('🔍 Step 2a: Geocoding university name for precise location...');
          let city = '';
          let state = '';
          let zip = '';
          
          try {
            const geoSearchResponse = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(match.name)}&format=json&limit=1`,
              {
                headers: {
                  'User-Agent': 'EduThree-LocationDetection/2.0'
                }
              }
            );

            if (geoSearchResponse.ok) {
              const geoSearchData = await geoSearchResponse.json();
              
              if (geoSearchData && geoSearchData.length > 0) {
                const geoLocation = geoSearchData[0];
                console.log('✅ Geocoded:', geoLocation.display_name);
                
                // Get detailed address with reverse geocoding
                const reverseResponse = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${geoLocation.lat}&lon=${geoLocation.lon}`,
                  {
                    headers: {
                      'User-Agent': 'EduThree-LocationDetection/2.0'
                    }
                  }
                );

                if (reverseResponse.ok) {
                  const reverseData = await reverseResponse.json();
                  
                  if (reverseData.address) {
                    city = reverseData.address.city || reverseData.address.town || reverseData.address.village || '';
                    state = reverseData.address.state || '';
                    zip = reverseData.address.postcode || '';
                    
                    console.log(`  📍 Extracted: City="${city}", State="${state}", Zip="${zip}"`);
                  }
                }
              }
            }
          } catch (geoError) {
            console.warn('⚠️ Geocoding failed, using country-only fallback:', geoError);
          }
          
          // Construct display and search locations
          const formatted = `${match.name}, ${fullCountryName}`;

          // Build Apollo search location - SIMPLIFIED: "City, State" not "City, State, Country"
          const searchParts = [city, state].filter(Boolean);
          const searchLocation = searchParts.length > 0 ? searchParts.join(', ') : fullCountryName;

          console.log(`  📍 Location Format - Display: "${formatted}", Apollo Search: "${searchLocation}" (simplified)`);
          
          // Cache this result with full location data for future lookups (UPSERT to update existing entries)
          await supabaseClient
            .from('university_domains')
            .upsert({
              domain,
              name: match.name,
              country: isoCode,
              city: city || null,
              state: state || null,
              zip: zip || null,
              formatted_location: formatted
            }, { onConflict: 'domain' })
            .select()
            .single();
          
          console.log('✅ Cached complete location data (UPSERT)');;

          return new Response(
            JSON.stringify({
              success: true,
              location: formatted,
              searchLocation: searchLocation, // Apollo format with city, state, country
              city: city,
              state: state,
              zip: zip,
              country: isoCode,
              source: 'api_cached'
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    } catch (apiError) {
      console.warn('⚠️ University Domains API failed:', apiError);
    }

    console.log('⚠️ Not in API, falling back to Nominatim geocoding...');

    // PHASE 2 - STEP 3: Fall back to Nominatim geocoding (slowest, least accurate)
    const searchQuery = domain.split('.')[0];
    
    const searchResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + ' university')}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'EduThree-LocationDetection/2.0'
        }
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Nominatim search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData || searchData.length === 0) {
      console.log('❌ No location results found for domain');
      return new Response(
        JSON.stringify({ 
          error: 'Could not find location for your institution. Please enter manually.',
          city: '',
          state: '',
          zip: '',
          country: '',
          source: 'failed'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const location = searchData[0];
    console.log('✅ Found location via Nominatim:', location.display_name);
    
    // Get detailed address with reverse geocoding
    const reverseResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lon}`,
      {
        headers: {
          'User-Agent': 'EduThree-LocationDetection/2.0'
        }
      }
    );

    if (!reverseResponse.ok) {
      throw new Error(`Nominatim reverse geocoding failed: ${reverseResponse.status}`);
    }

    const reverseData = await reverseResponse.json();
    
    if (!reverseData.address) {
      console.log('⚠️ No address data in reverse geocoding response');
      return new Response(
        JSON.stringify({ 
          error: 'Could not determine complete address',
          city: '',
          state: '',
          zip: '',
          country: '',
          source: 'failed'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const city = reverseData.address.city || reverseData.address.town || reverseData.address.village || '';
    const state = reverseData.address.state || '';
    const postcode = reverseData.address.postcode || '';
    const country = reverseData.address.country_code?.toUpperCase() || 'US';
    
    if (!city) {
      console.log('⚠️ Missing city in address');
      return new Response(
        JSON.stringify({ 
          error: 'Could not determine complete address. Please enter manually.',
          city: '',
          state: '',
          zip: '',
          country: '',
          source: 'failed'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const detectedLocation = state 
      ? `${city}, ${state} ${postcode}` 
      : `${city}, ${postcode}`;
    
    // PHASE 3: Map country codes to full names for Apollo
    const countryCodeMap: Record<string, string> = {
      'IN': 'India',
      'US': 'United States',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'JP': 'Japan',
      'CN': 'China',
      'SG': 'Singapore',
      'AE': 'United Arab Emirates',
      'NL': 'Netherlands',
      'SE': 'Sweden',
      'CH': 'Switzerland',
      'ES': 'Spain',
      'IT': 'Italy',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'KR': 'South Korea',
      'IL': 'Israel'
    };
    
    const fullCountryName = countryCodeMap[country] || country;

    // Create Apollo-friendly search location - SIMPLIFIED: "City, State" not "City, State, Country"
    const searchParts = [city, state].filter(Boolean);
    const searchLocation = searchParts.length > 0 ? searchParts.join(', ') : fullCountryName;

    console.log('📍 Location detected via Nominatim:', detectedLocation);
    console.log('🔍 Apollo search format (simplified):', searchLocation);
    console.log(`  🌍 Country conversion: ${country} → ${fullCountryName} (not included in Apollo search)`);

    return new Response(
      JSON.stringify({
        success: true,
        location: detectedLocation, // Display format
        searchLocation: searchLocation, // Apollo format
        city,
        state,
        zip: postcode,
        country,
        source: 'nominatim'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Location detection error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: `Failed to detect location: ${message}`,
        city: '',
        state: '',
        zip: ''
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
