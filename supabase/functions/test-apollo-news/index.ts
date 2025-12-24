import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Test endpoint to verify Apollo News Articles API
 * 
 * Tests the POST /v1/news_articles/search endpoint to see if it works
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
  
  if (!apolloApiKey) {
    return new Response(JSON.stringify({ 
      error: 'APOLLO_API_KEY not configured' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Parse request body for optional test parameters
  let testOrgIds: string[] = [];
  try {
    const body = await req.json();
    testOrgIds = body.organization_ids || [];
  } catch {
    // Use default test org IDs (well-known companies)
  }

  // Default to some well-known company Apollo org IDs for testing
  // These are HubSpot, Stripe, Shopify (known Apollo IDs)
  if (testOrgIds.length === 0) {
    testOrgIds = [
      '5f5e3d5c2c7b8a001d5e7f1a', // Example - will need real IDs
    ];
  }

  const today = new Date();
  const ninetyDaysAgo = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  // Test 1: Try the documented endpoint
  console.log('🧪 Test 1: POST /v1/news_articles/search');
  try {
    const response = await fetch('https://api.apollo.io/v1/news_articles/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apolloApiKey
      },
      body: JSON.stringify({
        organization_ids: testOrgIds,
        categories: ['hires', 'investment', 'contract'],
        published_at: {
          min: ninetyDaysAgo.toISOString().split('T')[0],
          max: today.toISOString().split('T')[0]
        },
        per_page: 10
      })
    });

    const responseText = await response.text();
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    (results.tests as unknown[]).push({
      name: 'POST /v1/news_articles/search',
      status: response.status,
      statusText: response.statusText,
      success: response.ok,
      response: responseData
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response:`, responseData);

  } catch (error) {
    (results.tests as unknown[]).push({
      name: 'POST /v1/news_articles/search',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
    console.error('   Error:', error);
  }

  // Test 2: Try alternative endpoint pattern (api/v1)
  console.log('🧪 Test 2: POST /api/v1/news_articles/search (alternative)');
  try {
    const response = await fetch('https://api.apollo.io/api/v1/news_articles/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apolloApiKey
      },
      body: JSON.stringify({
        organization_ids: testOrgIds,
        per_page: 5
      })
    });

    const responseText = await response.text();
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    (results.tests as unknown[]).push({
      name: 'POST /api/v1/news_articles/search',
      status: response.status,
      statusText: response.statusText,
      success: response.ok,
      response: responseData
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

  } catch (error) {
    (results.tests as unknown[]).push({
      name: 'POST /api/v1/news_articles/search',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 3: Try organizations enrichment (known working endpoint) for comparison
  console.log('🧪 Test 3: POST /v1/organizations/enrich (control test)');
  try {
    const response = await fetch('https://api.apollo.io/v1/organizations/enrich', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apolloApiKey
      },
      body: JSON.stringify({
        domain: 'hubspot.com'
      })
    });

    const responseData = await response.json();

    (results.tests as unknown[]).push({
      name: 'POST /v1/organizations/enrich (control)',
      status: response.status,
      statusText: response.statusText,
      success: response.ok,
      hasOrganization: !!responseData.organization,
      orgId: responseData.organization?.id,
      orgName: responseData.organization?.name
    });

    console.log(`   Status: ${response.status} - Found: ${responseData.organization?.name}`);

    // If we got an org ID, try news with it
    if (responseData.organization?.id) {
      console.log('🧪 Test 4: News search with verified org ID');
      
      const newsResponse = await fetch('https://api.apollo.io/v1/news_articles/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apolloApiKey
        },
        body: JSON.stringify({
          organization_ids: [responseData.organization.id],
          per_page: 5
        })
      });

      const newsText = await newsResponse.text();
      let newsData: unknown;
      try {
        newsData = JSON.parse(newsText);
      } catch {
        newsData = newsText;
      }

      (results.tests as unknown[]).push({
        name: 'News search with HubSpot org ID',
        orgId: responseData.organization.id,
        status: newsResponse.status,
        statusText: newsResponse.statusText,
        success: newsResponse.ok,
        response: newsData
      });

      console.log(`   News Status: ${newsResponse.status}`);
    }

  } catch (error) {
    (results.tests as unknown[]).push({
      name: 'POST /v1/organizations/enrich',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Summary
  const tests = results.tests as { success: boolean; name: string }[];
  const successCount = tests.filter(t => t.success).length;
  results.summary = {
    totalTests: tests.length,
    passed: successCount,
    failed: tests.length - successCount,
    newsApiWorks: tests.some(t => t.name.includes('news') && t.success)
  };

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
