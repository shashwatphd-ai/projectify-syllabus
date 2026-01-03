import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, createErrorResponse, createJsonResponse, createPreflightResponse } from '../_shared/cors.ts';

/**
 * Apollo Job Investigation Endpoint
 * 
 * Phase 0: Diagnostic tool to test BOTH Apollo API variants
 * and determine which endpoint/response format is correct.
 */

interface JobPosting {
  id: string;
  title: string;
  url: string;
  posted_at: string;
}

interface DiagnosticResult {
  endpoint: string;
  status: number;
  success: boolean;
  topLevelKeys: string[];
  jobCount: number;
  fieldUsed: 'job_postings' | 'organization_job_postings' | 'none';
  sampleJobs: JobPosting[];
  error?: string;
}

// Test companies with known job postings
const TEST_COMPANIES = [
  { name: 'HubSpot', id: '5f49cce978959f0001c33e5c' },
  { name: 'Stripe', id: '5d0a0fbff6512580bf33a120' },
  { name: 'Shopify', id: '619a6c580ca13000a44ec27c' },
  { name: 'Salesforce', id: '5a9f506ea6da98d99781eff8' }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return createPreflightResponse(req);
  }

  try {
    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');

    if (!APOLLO_API_KEY) {
      throw new Error('APOLLO_API_KEY not configured');
    }

    // Parse request body for optional parameters
    let mode = 'diagnostic'; // 'diagnostic' | 'single'
    let organizationId: string | undefined;
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        mode = body.mode || 'diagnostic';
        organizationId = body.organizationId;
      } catch {
        // No body or invalid JSON, use defaults
      }
    }

    console.log('🔍 Starting Apollo Job Investigation...');
    console.log(`   Mode: ${mode}`);
    
    // The two endpoint variants we need to test
    const ENDPOINTS = [
      { path: '/api/v1', description: 'With /api prefix' },
      { path: '/v1', description: 'Without /api prefix' }
    ];

    const results: any[] = [];

    // If single mode with organizationId, just test that one
    const companiesToTest = organizationId 
      ? [{ name: 'Custom', id: organizationId }]
      : TEST_COMPANIES.slice(0, 2); // Test first 2 for speed

    for (const company of companiesToTest) {
      console.log(`\n🏢 Testing ${company.name} (${company.id})...`);
      
      const companyResults: DiagnosticResult[] = [];

      for (const endpoint of ENDPOINTS) {
        const url = `https://api.apollo.io${endpoint.path}/organizations/${company.id}/job_postings?page=1&per_page=25`;
        console.log(`   📡 Trying: ${url}`);

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'X-Api-Key': APOLLO_API_KEY
            }
          });

          const status = response.status;
          console.log(`      Status: ${status}`);

          if (!response.ok) {
            companyResults.push({
              endpoint: endpoint.path,
              status,
              success: false,
              topLevelKeys: [],
              jobCount: 0,
              fieldUsed: 'none',
              sampleJobs: [],
              error: `HTTP ${status}: ${response.statusText}`
            });
            continue;
          }

          const data = await response.json();
          const topLevelKeys = Object.keys(data);
          console.log(`      Top-level keys: ${topLevelKeys.join(', ')}`);

          // Try BOTH field names
          let jobPostings: any[] = [];
          let fieldUsed: 'job_postings' | 'organization_job_postings' | 'none' = 'none';

          if (data.job_postings && Array.isArray(data.job_postings)) {
            jobPostings = data.job_postings;
            fieldUsed = 'job_postings';
            console.log(`      ✅ Found ${jobPostings.length} jobs in 'job_postings'`);
          } else if (data.organization_job_postings && Array.isArray(data.organization_job_postings)) {
            jobPostings = data.organization_job_postings;
            fieldUsed = 'organization_job_postings';
            console.log(`      ✅ Found ${jobPostings.length} jobs in 'organization_job_postings'`);
          } else {
            console.log(`      ⚠️ No job array found in either field`);
          }

          companyResults.push({
            endpoint: endpoint.path,
            status,
            success: true,
            topLevelKeys,
            jobCount: jobPostings.length,
            fieldUsed,
            sampleJobs: jobPostings.slice(0, 3).map((job: any) => ({
              id: job.id,
              title: job.title,
              url: job.url,
              posted_at: job.posted_at
            }))
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`      ❌ Error: ${errorMessage}`);
          companyResults.push({
            endpoint: endpoint.path,
            status: 0,
            success: false,
            topLevelKeys: [],
            jobCount: 0,
            fieldUsed: 'none',
            sampleJobs: [],
            error: errorMessage
          });
        }
      }

      results.push({
        company_name: company.name,
        apollo_organization_id: company.id,
        endpoint_tests: companyResults
      });
    }

    // Analyze results to determine the correct configuration
    let recommendation = 'UNKNOWN';
    let workingEndpoint: string | null = null;
    let workingField: string | null = null;

    for (const result of results) {
      for (const test of result.endpoint_tests) {
        if (test.success && test.jobCount > 0) {
          workingEndpoint = test.endpoint;
          workingField = test.fieldUsed;
          recommendation = `Use endpoint: ${workingEndpoint}, field: ${workingField}`;
          break;
        }
      }
      if (workingEndpoint) break;
    }

    // Check if all succeeded but with 0 jobs
    const allSucceededNoJobs = results.every(r => 
      r.endpoint_tests.every((t: DiagnosticResult) => t.success && t.jobCount === 0)
    );

    if (allSucceededNoJobs) {
      recommendation = 'API calls succeed but return 0 jobs. This could be: (1) Companies genuinely have no jobs, (2) Apollo plan doesn\'t include job data, (3) Rate limit/permission issue';
    }

    // Check for permission issues
    const hasPermissionIssues = results.some(r =>
      r.endpoint_tests.some((t: DiagnosticResult) => t.status === 401 || t.status === 402 || t.status === 403)
    );

    if (hasPermissionIssues) {
      recommendation = 'PERMISSION_ERROR: Apollo API key may not have access to job postings endpoint';
    }

    console.log('\n📊 Investigation Complete');
    console.log(`   Recommendation: ${recommendation}`);

    return createJsonResponse({
      success: true,
      investigation_mode: mode,
      companies_tested: results.length,
      recommendation,
      working_configuration: workingEndpoint ? {
        endpoint: workingEndpoint,
        field: workingField
      } : null,
      has_permission_issues: hasPermissionIssues,
      all_succeeded_no_jobs: allSucceededNoJobs,
      results
    }, 200, req);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Investigation error:', error);
    return createErrorResponse(errorMessage, 500, req);
  }
});
