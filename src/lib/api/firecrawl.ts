/**
 * Firecrawl API Client
 * 
 * Frontend utilities for calling Firecrawl edge functions.
 * Used for on-demand career page validation and tech stack extraction.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ScrapeResult {
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

export interface CareerPageResult {
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

/**
 * Scrape a URL for specific content type
 */
export async function scrapeUrl(
  url: string,
  extractType: 'career' | 'about' | 'technology' | 'news' | 'full' = 'full',
  companyId?: string
): Promise<ScrapeResult> {
  const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
    body: { url, extractType, companyId }
  });

  if (error) {
    console.error('Firecrawl scrape error:', error);
    return {
      success: false,
      url,
      extractType,
      error: error.message || 'Failed to scrape URL'
    };
  }

  return data;
}

/**
 * Scrape a company's career page for job postings
 */
export async function scrapeCareerPage(
  companyId: string,
  companyName: string,
  websiteUrl: string,
  forceRefresh = false
): Promise<CareerPageResult> {
  const { data, error } = await supabase.functions.invoke('firecrawl-career-pages', {
    body: { 
      companyId, 
      companyName, 
      websiteUrl,
      forceRefresh 
    }
  });

  if (error) {
    console.error('Career page scrape error:', error);
    return {
      success: false,
      companyId,
      companyName,
      error: error.message || 'Failed to scrape career page',
      processingTimeMs: 0
    };
  }

  return data;
}

/**
 * Extract technology stack from a company website
 */
export async function extractTechStack(
  url: string,
  companyId?: string
): Promise<string[]> {
  const result = await scrapeUrl(url, 'technology', companyId);
  
  if (result.success && result.data?.technologies) {
    return result.data.technologies;
  }
  
  return [];
}

/**
 * Validate Apollo job posting data against actual career page
 */
export async function validateJobPostings(
  companyId: string,
  companyName: string,
  websiteUrl: string,
  apolloJobCount: number
): Promise<{
  validated: boolean;
  careerPageJobCount: number;
  discrepancy: number;
  confidence: 'high' | 'medium' | 'low';
}> {
  const result = await scrapeCareerPage(companyId, companyName, websiteUrl);
  
  if (!result.success || !result.data) {
    return {
      validated: false,
      careerPageJobCount: 0,
      discrepancy: apolloJobCount,
      confidence: 'low'
    };
  }
  
  const careerPageJobCount = result.data.jobCount;
  const discrepancy = Math.abs(apolloJobCount - careerPageJobCount);
  
  // Calculate confidence based on discrepancy
  let confidence: 'high' | 'medium' | 'low';
  const discrepancyPercentage = apolloJobCount > 0 
    ? discrepancy / apolloJobCount 
    : careerPageJobCount > 0 ? 1 : 0;
  
  if (discrepancyPercentage <= 0.2) {
    confidence = 'high';
  } else if (discrepancyPercentage <= 0.5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  return {
    validated: true,
    careerPageJobCount,
    discrepancy,
    confidence
  };
}
