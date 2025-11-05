import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    console.log('🌍 Starting location detection for:', email);

    // Extract domain from email (e.g., user@university.edu -> university.edu)
    const domain = email.split('@')[1];
    
    if (!domain) {
      console.log('❌ No domain found in email');
      return new Response(
        JSON.stringify({ error: 'Could not extract domain from email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔎 Extracting location from domain:', domain);

    // Use Nominatim to search for the university/organization
    const searchQuery = domain.split('.')[0]; // e.g., "university" from "university.edu"
    
    const searchResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + ' university')}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'EduThree-LocationDetection/1.0'
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
          error: 'Could not find location for your institution',
          city: '',
          state: '',
          zip: ''
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const location = searchData[0];
    console.log('✅ Found initial location:', location.display_name);
    
    // Get detailed address with reverse geocoding
    const reverseResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lon}`,
      {
        headers: {
          'User-Agent': 'EduThree-LocationDetection/1.0'
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
          zip: ''
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const city = reverseData.address.city || reverseData.address.town || reverseData.address.village || '';
    const state = reverseData.address.state || '';
    const postcode = reverseData.address.postcode || '';
    
    if (!city || !postcode) {
      console.log('⚠️ Missing city or postcode in address');
      return new Response(
        JSON.stringify({ 
          error: 'Could not determine complete address',
          city: city || '',
          state: state || '',
          zip: postcode || ''
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const detectedLocation = `${city}, ${state} ${postcode}`;
    console.log('📍 Location detected:', detectedLocation);

    return new Response(
      JSON.stringify({
        success: true,
        location: detectedLocation,
        city,
        state,
        zip: postcode
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
