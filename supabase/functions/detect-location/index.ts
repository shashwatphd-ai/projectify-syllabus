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
      
      // Create Apollo-friendly search location (city, state, country)
      const searchParts = [
        universityData.city,
        universityData.state,
        universityData.country
      ].filter(Boolean);
      const searchLocation = searchParts.join(', ');
      
      return new Response(
        JSON.stringify({
          success: true,
          location: universityData.formatted_location, // Display format
          searchLocation: searchLocation, // Apollo format
          city: universityData.city || '',
          state: universityData.state || '',
          zip: universityData.zip || '',
          country: universityData.country,
          source: 'database'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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
          
          // Cache this result for future lookups
          const formatted = `${match.name}, ${match.country}`;
          const searchLocation = match.country; // Only country available from API
          
          await supabaseClient
            .from('university_domains')
            .insert({
              domain,
              name: match.name,
              country: match['alpha_two_code'] || match.country,
              formatted_location: formatted
            })
            .select()
            .single();

          return new Response(
            JSON.stringify({
              success: true,
              location: formatted,
              searchLocation: searchLocation, // Apollo format (just country for now)
              city: '',
              state: '',
              zip: '',
              country: match['alpha_two_code'] || match.country,
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
    
    // Create Apollo-friendly search location
    const searchParts = [city, state, country].filter(Boolean);
    const searchLocation = searchParts.join(', ');
    
    console.log('📍 Location detected via Nominatim:', detectedLocation);
    console.log('🔍 Apollo search format:', searchLocation);

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
