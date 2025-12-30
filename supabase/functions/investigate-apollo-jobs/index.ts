import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withApolloCircuit, CircuitState, getCircuitHealth } from '../_shared/circuit-breaker.ts';
import { corsHeaders, securityHeaders, createErrorResponse, createJsonResponse, createPreflightResponse } from '../_shared/cors.ts';

interface JobPosting {
  id: string;
  title: string;
  url: string;
  posted_at: string;
}

interface JobsResponse {
  job_postings?: JobPosting[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return createPreflightResponse(req);
  }

  try {
    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');

    if (!APOLLO_API_KEY) {
      throw new Error('APOLLO_API_KEY not configured');
    }

    console.log('🔍 Starting Apollo job investigation with circuit breaker...');

    // Test multiple companies
    const companies = [
      { name: 'HubSpot', id: '5f49cce978959f0001c33e5c' },
      { name: 'Stripe', id: '5d0a0fbff6512580bf33a120' },
      { name: 'Shopify', id: '619a6c580ca13000a44ec27c' },
      { name: 'Salesforce', id: '5a9f506ea6da98d99781eff8' }
    ];

    const results = [];

    for (const company of companies) {
      console.log(`\n🏢 Checking ${company.name} (${company.id})...`);

      // Wrap fetch in circuit breaker
      const result = await withApolloCircuit<JobsResponse>(async () => {
        const response = await fetch(
          `https://api.apollo.io/v1/organizations/${company.id}/job_postings`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'X-Api-Key': APOLLO_API_KEY
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Apollo API error: ${response.status}`);
        }

        return await response.json();
      });

      if (!result.success) {
        console.warn(`⚠️ Circuit breaker failure for ${company.name}: ${result.error}`);
        
        // If circuit is open, stop trying more companies
        if (result.circuitState === CircuitState.OPEN) {
          console.warn('⚡ Circuit OPEN - stopping investigation early');
          break;
        }
        continue;
      }

      const jobPostings = result.data?.job_postings || [];
      console.log(`✅ Found ${jobPostings.length} job postings for ${company.name}`);

      if (jobPostings.length > 0) {
        results.push({
          company_name: company.name,
          apollo_organization_id: company.id,
          job_count: jobPostings.length,
          sample_jobs: jobPostings.slice(0, 3).map((job) => ({
            id: job.id,
            title: job.title,
            url: job.url,
            posted_at: job.posted_at
          }))
        });
      }
    }

    // Get circuit health for diagnostics
    const circuitHealth = getCircuitHealth();

    return createJsonResponse({
      success: true,
      companies_checked: companies.length,
      companies_with_jobs: results.length,
      circuit_health: circuitHealth,
      results
    }, 200, req);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Investigation error:', error);
    return createErrorResponse(errorMessage, 500, req);
  }
});
