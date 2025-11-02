import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
}

// Mock API caller - Replace with real Bing News API or Google Places API
async function fetchCompaniesFromBing(cityZip: string): Promise<any[]> {
  // TODO: Implement real API calls with BING_API_KEY
  // const BING_API_KEY = Deno.env.get('BING_API_KEY');
  // const url = `https://api.bing.microsoft.com/v7.0/news/search?q=companies+in+${cityZip}`;
  // const response = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': BING_API_KEY } });
  
  console.log(`Fetching companies for ${cityZip}...`);
  return [
    {
      name: "Baldwin Manufacturing Co",
      website: "baldwinmfg.com",
      snippet: "Baldwin Manufacturing, based in 66006, specializes in custom metal fabrication and has been serving the region for 30 years.",
      industry: "Manufacturing",
      size: "Small",
    },
    {
      name: "Baldwin City Medical Center",
      website: "baldwinhealth.org",
      snippet: "The primary healthcare provider for Baldwin City, KS 66006, serving over 5,000 patients annually.",
      industry: "Healthcare",
      size: "Medium",
    },
    {
      name: "Prairie Tech Solutions",
      website: "prairietech.com",
      snippet: "IT consulting firm in Baldwin City providing digital transformation services to local businesses.",
      industry: "Technology",
      size: "Small",
    }
  ];
}

async function enrichCompany(company: any): Promise<any> {
  // TODO: Call real enrichment APIs (Clearbit, job boards, etc.)
  console.log(`Enriching ${company.name}...`);
  return {
    ...company,
    technologies: ["Salesforce", "QuickBooks", "Microsoft 365"],
    open_roles: ["Operations Manager", "Sales Associate", "Data Analyst"],
  };
}

// AI Analysis Step using Lovable AI Gateway
async function analyzeNeeds(enrichedCompany: any): Promise<string[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const prompt = `Analyze the following company data and return a JSON array of their top 3-5 business needs.

Data:
- Industry: ${enrichedCompany.industry}
- Snippet: ${enrichedCompany.snippet}
- Technologies: ${enrichedCompany.technologies.join(', ')}
- Open Jobs: ${enrichedCompany.open_roles.join(', ')}

Return ONLY a JSON object with a "needs" array of strings. Example: {"needs": ["e-commerce expansion", "supply chain optimization"]}`;

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
          { role: 'system', content: 'You are a business analyst. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    const parsed = JSON.parse(content);
    let needs = [];
    if (Array.isArray(parsed)) {
      needs = parsed;
    } else if (parsed.needs && Array.isArray(parsed.needs)) {
      needs = parsed.needs;
    }
    
    console.log(`Inferred needs for ${enrichedCompany.name}: ${needs.join(', ')}`);
    return needs;
  } catch (error) {
    console.error(`AI analysis failed for ${enrichedCompany.name}:`, error instanceof Error ? error.message : String(error));
    return ["general operations improvement", "sales growth", "digital transformation"];
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get parameters from request body
    const { cityZip } = await req.json();
    const targetZip = cityZip || "66006"; // Default for testing

    console.log(`Starting enrichment pipeline for ${targetZip}...`);

    // Step 1: Fetch companies from external API
    const baseCompanies = await fetchCompaniesFromBing(targetZip);
    
    let successCount = 0;
    let errorCount = 0;

    // Step 2: Process each company
    for (const company of baseCompanies) {
      try {
        // Enrich with additional data
        const enrichedCompany = await enrichCompany(company);
        
        // Analyze business needs with AI
        const inferredNeeds = await analyzeNeeds(enrichedCompany);

        // Prepare company profile
        const profileToStore: Omit<CompanyProfile, 'id'> = {
          name: enrichedCompany.name,
          source: 'bing_news',
          website: enrichedCompany.website,
          city: "Baldwin City",
          zip: targetZip,
          sector: enrichedCompany.industry,
          size: enrichedCompany.size,
          technologies: enrichedCompany.technologies,
          open_roles: enrichedCompany.open_roles,
          recent_news: enrichedCompany.snippet,
          inferred_needs: inferredNeeds,
          last_enriched_at: new Date().toISOString(),
        };

        // Step 3: UPSERT to database
        const { data, error } = await supabase
          .from('company_profiles')
          .upsert(profileToStore, { onConflict: 'name,zip' })
          .select();

        if (error) {
          console.error(`Failed to upsert ${profileToStore.name}:`, error.message);
          errorCount++;
        } else {
          console.log(`Successfully upserted ${profileToStore.name}`);
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
