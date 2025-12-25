/**
 * Firecrawl Web Scraping Edge Function
 * 
 * Uses Firecrawl API to extract structured data from company websites:
 * - Career page job listings
 * - Technology stack from website
 * - Recent news/press releases
 * - Company culture signals
 * 
 * Phase 2.3 of resource utilization plan.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { verifyAuth, unauthorizedResponse } from '../_shared/auth-middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FirecrawlScrapeRequest {
  url: string;
  extractType?: 'career' | 'about' | 'technology' | 'news' | 'full';
  companyId?: string; // Optional: Store results back to company_profiles
}

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    content?: string;
    metadata?: {
      title?: string;
      description?: string;
      ogImage?: string;
      siteName?: string;
    };
    llm_extraction?: Record<string, unknown>;
  };
  error?: string;
}

interface ScrapeResult {
  success: boolean;
  url: string;
  extractType: string;
  data?: {
    jobPostings?: Array<{
      title: string;
      department?: string;
      location?: string;
      url?: string;
    }>;
    technologies?: string[];
    cultureSignals?: string[];
    companyInfo?: {
      name?: string;
      description?: string;
      mission?: string;
      values?: string[];
    };
    newsItems?: Array<{
      title: string;
      date?: string;
      summary?: string;
    }>;
    rawMarkdown?: string;
  };
  error?: string;
  processingTimeMs?: number;
}

// ============================================================================
// FIRECRAWL API
// ============================================================================

const FIRECRAWL_API_BASE = 'https://api.firecrawl.dev/v1';

async function scrapeWithFirecrawl(
  url: string,
  apiKey: string,
  extractType: string
): Promise<FirecrawlResponse> {
  console.log(`🔥 [Firecrawl] Scraping: ${url}`);
  
  // Build extraction schema based on type
  const extractionSchema = getExtractionSchema(extractType);
  
  const requestBody: Record<string, unknown> = {
    url,
    formats: ['markdown'],
  };
  
  // Add LLM extraction if we have a schema
  if (extractionSchema) {
    requestBody.formats = ['markdown', 'extract'];
    requestBody.extract = {
      schema: extractionSchema
    };
  }
  
  const response = await fetch(`${FIRECRAWL_API_BASE}/scrape`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Firecrawl API error: ${response.status} - ${errorText}`);
    return {
      success: false,
      error: `Firecrawl API error: ${response.status}`
    };
  }
  
  const data = await response.json();
  return {
    success: data.success !== false,
    data: data.data,
    error: data.error
  };
}

function getExtractionSchema(extractType: string): Record<string, unknown> | null {
  switch (extractType) {
    case 'career':
      return {
        type: 'object',
        properties: {
          jobPostings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                department: { type: 'string' },
                location: { type: 'string' },
                employmentType: { type: 'string' }
              }
            }
          },
          totalOpenPositions: { type: 'number' },
          hiringDepartments: {
            type: 'array',
            items: { type: 'string' }
          },
          benefits: {
            type: 'array',
            items: { type: 'string' }
          },
          cultureSignals: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      };
      
    case 'technology':
      return {
        type: 'object',
        properties: {
          technologies: {
            type: 'array',
            items: { type: 'string' },
            description: 'Programming languages, frameworks, tools, and platforms mentioned'
          },
          techStack: {
            type: 'object',
            properties: {
              frontend: { type: 'array', items: { type: 'string' } },
              backend: { type: 'array', items: { type: 'string' } },
              database: { type: 'array', items: { type: 'string' } },
              cloud: { type: 'array', items: { type: 'string' } },
              devops: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      };
      
    case 'about':
      return {
        type: 'object',
        properties: {
          companyName: { type: 'string' },
          description: { type: 'string' },
          mission: { type: 'string' },
          vision: { type: 'string' },
          values: {
            type: 'array',
            items: { type: 'string' }
          },
          founded: { type: 'string' },
          headquarters: { type: 'string' },
          employeeCount: { type: 'string' },
          industries: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      };
      
    case 'news':
      return {
        type: 'object',
        properties: {
          newsItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                date: { type: 'string' },
                summary: { type: 'string' },
                category: { type: 'string' }
              }
            }
          },
          pressReleases: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                date: { type: 'string' }
              }
            }
          }
        }
      };
      
    default:
      return null; // Full/raw scrape without extraction
  }
}

// ============================================================================
// POST-PROCESSING
// ============================================================================

function processCareerPageData(
  firecrawlData: FirecrawlResponse['data']
): ScrapeResult['data'] {
  const extraction = firecrawlData?.llm_extraction || {};
  
  return {
    jobPostings: (extraction.jobPostings as Array<{
      title: string;
      department?: string;
      location?: string;
    }>) || [],
    cultureSignals: (extraction.cultureSignals as string[]) || [],
    rawMarkdown: firecrawlData?.markdown
  };
}

function processTechnologyData(
  firecrawlData: FirecrawlResponse['data']
): ScrapeResult['data'] {
  const extraction = firecrawlData?.llm_extraction || {};
  
  // Combine all technologies from different sources
  const allTech = new Set<string>();
  
  if (extraction.technologies && Array.isArray(extraction.technologies)) {
    extraction.technologies.forEach((t: string) => allTech.add(t));
  }
  
  const techStack = extraction.techStack as Record<string, string[]> | undefined;
  if (techStack) {
    Object.values(techStack).forEach(techs => {
      if (Array.isArray(techs)) {
        techs.forEach(t => allTech.add(t));
      }
    });
  }
  
  return {
    technologies: Array.from(allTech),
    rawMarkdown: firecrawlData?.markdown
  };
}

function processAboutData(
  firecrawlData: FirecrawlResponse['data']
): ScrapeResult['data'] {
  const extraction = firecrawlData?.llm_extraction || {};
  
  return {
    companyInfo: {
      name: extraction.companyName as string,
      description: extraction.description as string,
      mission: extraction.mission as string,
      values: (extraction.values as string[]) || []
    },
    rawMarkdown: firecrawlData?.markdown
  };
}

function processNewsData(
  firecrawlData: FirecrawlResponse['data']
): ScrapeResult['data'] {
  const extraction = firecrawlData?.llm_extraction || {};
  
  return {
    newsItems: (extraction.newsItems as Array<{
      title: string;
      date?: string;
      summary?: string;
    }>) || [],
    rawMarkdown: firecrawlData?.markdown
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify JWT authentication
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    console.warn('[firecrawl-scrape] Auth failed:', authResult.error);
    return unauthorizedResponse(corsHeaders, authResult.error);
  }
  console.log('[firecrawl-scrape] Authenticated user:', authResult.userId);

  const startTime = Date.now();

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (!apiKey) {
      console.error('❌ FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Firecrawl API key not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { url, extractType = 'full', companyId }: FirecrawlScrapeRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔥 [Firecrawl] Starting ${extractType} scrape for: ${url}`);

    // Scrape the URL
    const firecrawlResult = await scrapeWithFirecrawl(url, apiKey, extractType);

    if (!firecrawlResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          url,
          extractType,
          error: firecrawlResult.error || 'Scraping failed'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process based on extract type
    let processedData: ScrapeResult['data'];
    
    switch (extractType) {
      case 'career':
        processedData = processCareerPageData(firecrawlResult.data);
        break;
      case 'technology':
        processedData = processTechnologyData(firecrawlResult.data);
        break;
      case 'about':
        processedData = processAboutData(firecrawlResult.data);
        break;
      case 'news':
        processedData = processNewsData(firecrawlResult.data);
        break;
      default:
        processedData = { rawMarkdown: firecrawlResult.data?.markdown };
    }

    const processingTimeMs = Date.now() - startTime;

    // Optionally store back to company profile
    if (companyId && processedData) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const updateData: Record<string, unknown> = {
        last_enriched_at: new Date().toISOString()
      };

      if (extractType === 'technology' && processedData.technologies) {
        updateData.technologies_used = processedData.technologies;
      }

      await supabase
        .from('company_profiles')
        .update(updateData)
        .eq('id', companyId);

      console.log(`✅ Updated company_profiles for ${companyId}`);
    }

    const result: ScrapeResult = {
      success: true,
      url,
      extractType,
      data: processedData,
      processingTimeMs
    };

    console.log(`✅ [Firecrawl] Scrape complete in ${processingTimeMs}ms`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [Firecrawl] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
