import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withApolloCircuit } from '../_shared/circuit-breaker.ts';
import { corsHeaders, createErrorResponse, createJsonResponse, createPreflightResponse } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return createPreflightResponse(req);
  }

  try {
    const { companyName } = await req.json();
    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');

    if (!APOLLO_API_KEY) {
      throw new Error('APOLLO_API_KEY not configured');
    }

    console.log(`🔍 Searching Apollo for: ${companyName}`);

    // Call Apollo's organization search API with circuit breaker protection
    const result = await withApolloCircuit(async () => {
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

      return response.json();
    });

    // Handle circuit breaker open state
    if (!result.success) {
      console.warn(`⚠️ Apollo circuit breaker: ${result.error}`);
      return createErrorResponse('Apollo API temporarily unavailable', 503, req);
    }

    const data = result.data;
    
    if (!data.organizations || data.organizations.length === 0) {
      return createJsonResponse({ success: false, message: 'Company not found in Apollo' }, 200, req);
    }

    const org = data.organizations[0];
    console.log(`✅ Found Apollo org: ${org.name} (${org.id})`);

    return createJsonResponse({
      success: true,
      company_name: org.name,
      apollo_organization_id: org.id,
      website: org.website_url || org.primary_domain,
      full_data: org
    }, 200, req);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching Apollo org ID:', error);
    return createErrorResponse(errorMessage, 500, req);
  }
});
