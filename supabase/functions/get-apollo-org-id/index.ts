import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName } = await req.json();
    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');

    if (!APOLLO_API_KEY) {
      throw new Error('APOLLO_API_KEY not configured');
    }

    console.log(`Searching Apollo for: ${companyName}`);

    // Call Apollo's organization search API
    const response = await fetch('https://api.apollo.io/v1/mixed_companies/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': APOLLO_API_KEY
      },
      body: JSON.stringify({
        q_organization_name: companyName,
        page: 1,
        per_page: 1
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Apollo API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    if (!data.organizations || data.organizations.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Company not found in Apollo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const org = data.organizations[0];

    return new Response(
      JSON.stringify({
        success: true,
        company_name: org.name,
        apollo_organization_id: org.id,
        website: org.website_url || org.primary_domain,
        full_data: org
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching Apollo org ID:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
