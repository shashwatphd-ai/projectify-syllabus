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
    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');

    if (!APOLLO_API_KEY) {
      throw new Error('APOLLO_API_KEY not configured');
    }

    console.log('Starting Apollo job investigation...');

    // Test multiple companies
    const companies = [
      { name: 'HubSpot', id: '5f49cce978959f0001c33e5c' },
      { name: 'Stripe', id: '5d0a0fbff6512580bf33a120' },
      { name: 'Shopify', id: '619a6c580ca13000a44ec27c' },
      { name: 'Salesforce', id: '5a9f506ea6da98d99781eff8' }
    ];

    const results = [];

    for (const company of companies) {
      console.log(`\nChecking ${company.name} (${company.id})...`);

      try {
        const jobsResponse = await fetch(`https://api.apollo.io/v1/organizations/${company.id}/job_postings`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': APOLLO_API_KEY
          }
        });

        if (!jobsResponse.ok) {
          console.log(`Failed to fetch jobs for ${company.name}: ${jobsResponse.status}`);
          continue;
        }

        const jobsData = await jobsResponse.json();
        const jobPostings = jobsData.job_postings || [];

        console.log(`Found ${jobPostings.length} job postings for ${company.name}`);

        if (jobPostings.length > 0) {
          results.push({
            company_name: company.name,
            apollo_organization_id: company.id,
            job_count: jobPostings.length,
            sample_jobs: jobPostings.slice(0, 3).map((job: any) => ({
              id: job.id,
              title: job.title,
              url: job.url,
              posted_at: job.posted_at
            }))
          });
        }
      } catch (error) {
        console.log(`Error checking ${company.name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        companies_checked: companies.length,
        companies_with_jobs: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Investigation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
