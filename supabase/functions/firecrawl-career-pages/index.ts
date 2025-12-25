/**
 * Firecrawl Career Pages Scraper
 * 
 * Specialized edge function for scraping company career pages.
 * Validates and enriches company hiring signals from Apollo with real data.
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

interface CareerPageRequest {
  companyId: string;        // company_profiles.id
  companyName: string;
  websiteUrl: string;
  forceRefresh?: boolean;   // Bypass cache
}

interface CareerPageResult {
  success: boolean;
  companyId: string;
  companyName: string;
  data?: {
    careerPageUrl: string;
    jobCount: number;
    jobPostings: Array<{
      title: string;
      department?: string;
      location?: string;
      employmentType?: string;
    }>;
    hiringDepartments: string[];
    isActivelyHiring: boolean;
    hiringVelocitySignal: 'high' | 'medium' | 'low' | 'none';
    benefits?: string[];
    cultureKeywords?: string[];
    techStack?: string[];
    lastScrapedAt: string;
  };
  error?: string;
  cached?: boolean;
  processingTimeMs: number;
}

// Common career page URL patterns
const CAREER_PAGE_PATHS = [
  '/careers',
  '/jobs',
  '/careers/',
  '/jobs/',
  '/join-us',
  '/work-with-us',
  '/opportunities',
  '/career',
  '/employment'
];

// ============================================================================
// CAREER PAGE DISCOVERY
// ============================================================================

async function findCareerPageUrl(
  baseUrl: string,
  apiKey: string
): Promise<string | null> {
  // Normalize URL
  const url = new URL(baseUrl);
  const baseHost = `${url.protocol}//${url.hostname}`;
  
  console.log(`🔍 Searching for career page on ${baseHost}`);
  
  // Try common paths
  for (const path of CAREER_PAGE_PATHS) {
    const careerUrl = `${baseHost}${path}`;
    
    try {
      const response = await fetch(careerUrl, {
        method: 'HEAD',
        redirect: 'follow'
      });
      
      if (response.ok) {
        console.log(`✅ Found career page: ${careerUrl}`);
        return careerUrl;
      }
    } catch {
      // Path doesn't exist, continue
    }
  }
  
  // Fallback: scrape homepage and look for career link
  console.log(`   Career page not found via common paths, scraping homepage...`);
  
  try {
    const response = await fetch(`https://api.firecrawl.dev/v1/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: baseHost,
        formats: ['links'],
        onlyMainContent: false
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const links = data.data?.links || [];
      
      // Look for career-related links
      const careerLink = links.find((link: string) => 
        /career|jobs|join|hiring|opportunities/i.test(link)
      );
      
      if (careerLink) {
        console.log(`✅ Found career link in homepage: ${careerLink}`);
        return careerLink;
      }
    }
  } catch (error) {
    console.warn(`   Failed to scrape homepage for links:`, error);
  }
  
  console.log(`   ⚠️ No career page found for ${baseHost}`);
  return null;
}

// ============================================================================
// CAREER PAGE SCRAPING
// ============================================================================

async function scrapeCareerPage(
  careerUrl: string,
  apiKey: string
): Promise<{
  jobPostings: Array<{
    title: string;
    department?: string;
    location?: string;
    employmentType?: string;
  }>;
  benefits?: string[];
  cultureKeywords?: string[];
  techStack?: string[];
}> {
  console.log(`🔥 Scraping career page: ${careerUrl}`);
  
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: careerUrl,
      formats: ['markdown', 'extract'],
      extract: {
        schema: {
          type: 'object',
          properties: {
            jobPostings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Job title' },
                  department: { type: 'string', description: 'Department or team' },
                  location: { type: 'string', description: 'Job location' },
                  employmentType: { type: 'string', description: 'Full-time, Part-time, Contract, etc.' }
                },
                required: ['title']
              },
              description: 'List of all job openings on this page'
            },
            benefits: {
              type: 'array',
              items: { type: 'string' },
              description: 'Employee benefits mentioned (healthcare, PTO, etc.)'
            },
            cultureKeywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords describing company culture (innovative, collaborative, etc.)'
            },
            techStack: {
              type: 'array',
              items: { type: 'string' },
              description: 'Technologies, programming languages, and tools mentioned'
            }
          }
        }
      }
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firecrawl scrape failed: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  const extraction = data.data?.llm_extraction || {};
  
  return {
    jobPostings: extraction.jobPostings || [],
    benefits: extraction.benefits || [],
    cultureKeywords: extraction.cultureKeywords || [],
    techStack: extraction.techStack || []
  };
}

// ============================================================================
// SIGNAL CALCULATION
// ============================================================================

function calculateHiringVelocity(
  jobCount: number
): 'high' | 'medium' | 'low' | 'none' {
  if (jobCount >= 20) return 'high';
  if (jobCount >= 10) return 'medium';
  if (jobCount >= 1) return 'low';
  return 'none';
}

function extractHiringDepartments(
  jobPostings: Array<{ department?: string }>
): string[] {
  const departments = new Set<string>();
  
  for (const job of jobPostings) {
    if (job.department) {
      departments.add(job.department);
    }
  }
  
  return Array.from(departments);
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
    console.warn('[firecrawl-career-pages] Auth failed:', authResult.error);
    return unauthorizedResponse(corsHeaders, authResult.error);
  }
  console.log('[firecrawl-career-pages] Authenticated user:', authResult.userId);

  const startTime = Date.now();

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Firecrawl API key not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      companyId, 
      companyName, 
      websiteUrl, 
      forceRefresh = false 
    }: CareerPageRequest = await req.json();

    if (!companyId || !websiteUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'companyId and websiteUrl are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`\n🏢 [Career Scraper] Processing: ${companyName}`);
    console.log(`   Website: ${websiteUrl}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check cache (unless force refresh)
    if (!forceRefresh) {
      const { data: existing } = await supabase
        .from('company_profiles')
        .select('job_postings_last_fetched, job_postings')
        .eq('id', companyId)
        .single();
      
      if (existing?.job_postings_last_fetched) {
        const lastFetched = new Date(existing.job_postings_last_fetched);
        const hoursSinceLastFetch = (Date.now() - lastFetched.getTime()) / (1000 * 60 * 60);
        
        // Use cache if less than 24 hours old
        if (hoursSinceLastFetch < 24) {
          console.log(`   📦 Using cached data (${hoursSinceLastFetch.toFixed(1)}h old)`);
          
          const cachedJobs = typeof existing.job_postings === 'string' 
            ? JSON.parse(existing.job_postings)
            : existing.job_postings || [];
          
          const result: CareerPageResult = {
            success: true,
            companyId,
            companyName,
            cached: true,
            data: {
              careerPageUrl: websiteUrl,
              jobCount: cachedJobs.length,
              jobPostings: cachedJobs.slice(0, 25),
              hiringDepartments: extractHiringDepartments(cachedJobs),
              isActivelyHiring: cachedJobs.length > 0,
              hiringVelocitySignal: calculateHiringVelocity(cachedJobs.length),
              lastScrapedAt: existing.job_postings_last_fetched
            },
            processingTimeMs: Date.now() - startTime
          };
          
          return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Find career page URL
    const careerPageUrl = await findCareerPageUrl(websiteUrl, apiKey);
    
    if (!careerPageUrl) {
      const result: CareerPageResult = {
        success: true,
        companyId,
        companyName,
        data: {
          careerPageUrl: websiteUrl,
          jobCount: 0,
          jobPostings: [],
          hiringDepartments: [],
          isActivelyHiring: false,
          hiringVelocitySignal: 'none',
          lastScrapedAt: new Date().toISOString()
        },
        processingTimeMs: Date.now() - startTime
      };
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Scrape the career page
    const scrapeResult = await scrapeCareerPage(careerPageUrl, apiKey);
    
    const jobCount = scrapeResult.jobPostings.length;
    const hiringDepartments = extractHiringDepartments(scrapeResult.jobPostings);
    const hiringVelocity = calculateHiringVelocity(jobCount);
    
    console.log(`   📊 Found ${jobCount} jobs across ${hiringDepartments.length} departments`);
    console.log(`   🚀 Hiring velocity: ${hiringVelocity}`);

    // Update company profile with fresh data
    const updateData: Record<string, unknown> = {
      job_postings: scrapeResult.jobPostings.slice(0, 25), // Store top 25
      job_postings_last_fetched: new Date().toISOString(),
      last_enriched_at: new Date().toISOString()
    };

    if (scrapeResult.techStack && scrapeResult.techStack.length > 0) {
      updateData.technologies_used = scrapeResult.techStack;
    }

    await supabase
      .from('company_profiles')
      .update(updateData)
      .eq('id', companyId);

    console.log(`   ✅ Updated company_profiles`);

    const result: CareerPageResult = {
      success: true,
      companyId,
      companyName,
      data: {
        careerPageUrl,
        jobCount,
        jobPostings: scrapeResult.jobPostings.slice(0, 25),
        hiringDepartments,
        isActivelyHiring: jobCount > 0,
        hiringVelocitySignal: hiringVelocity,
        benefits: scrapeResult.benefits,
        cultureKeywords: scrapeResult.cultureKeywords,
        techStack: scrapeResult.techStack,
        lastScrapedAt: new Date().toISOString()
      },
      processingTimeMs: Date.now() - startTime
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [Career Scraper] Error:', error);
    
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
