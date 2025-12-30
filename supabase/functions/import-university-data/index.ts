import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders, createErrorResponse, createJsonResponse, createPreflightResponse } from '../_shared/cors.ts';

interface UniversityRow {
  'Company Name': string;
  'Company Name for Emails'?: string;
  'Account Stage'?: string;
  '# Employees'?: string;
  'Industry'?: string;
  'Website'?: string;
  'Company Linkedin Url'?: string;
  'Facebook Url'?: string;
  'Twitter Url'?: string;
  'Company Street'?: string;
  'Company City'?: string;
  'Company State'?: string;
  'Company Country'?: string;
  'Company Postal Code'?: string;
  'Company Address'?: string;
  'Keywords'?: string;
  'Company Phone'?: string;
  'Technologies'?: string;
  'Total Funding'?: string;
  'Latest Funding'?: string;
  'Latest Funding Amount'?: string;
  'Last Raised At'?: string;
  'Annual Revenue'?: string;
  'Number of Retail Locations'?: string;
  'Apollo Account Id'?: string;
  'SIC Codes'?: string;
  'NAICS Codes'?: string;
  'Short Description'?: string;
  'Founded Year'?: string;
  'Logo Url'?: string;
  'Subsidiary of'?: string;
  'Primary Intent Topic'?: string;
  'Primary Intent Score'?: string;
  'Secondary Intent Topic'?: string;
  'Secondary Intent Score'?: string;
}

// Safely convert any value to string (handles numbers from Excel)
function safeString(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim() || null;
}

function extractDomain(websiteUrl: unknown): string | null {
  if (!websiteUrl) return null;
  
  try {
    // Remove protocol and www
    let domain = String(websiteUrl)
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .toLowerCase()
      .trim();
    
    // Handle escaped URLs from Excel
    domain = domain.replace(/\\/g, '');
    
    return domain || null;
  } catch {
    return null;
  }
}

function parseNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  
  // If already a number, return it directly
  if (typeof value === 'number') {
    return isNaN(value) ? null : Math.floor(value);
  }
  
  // If string, parse it
  const num = parseInt(String(value).replace(/[^0-9-]/g, ''), 10);
  return isNaN(num) ? null : num;
}

function parseBigInt(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  
  if (typeof value === 'number') {
    return isNaN(value) ? null : Math.floor(value);
  }
  
  const num = parseInt(String(value).replace(/[^0-9-]/g, ''), 10);
  return isNaN(num) ? null : num;
}

function transformRow(row: UniversityRow) {
  const domain = extractDomain(row['Website']);
  if (!domain) return null;
  
  const name = safeString(row['Company Name']);
  if (!name) return null;
  
  const city = safeString(row['Company City']);
  const state = safeString(row['Company State']);
  
  return {
    domain,
    name,
    country: safeString(row['Company Country']) || 'United States',
    city,
    state,
    zip: safeString(row['Company Postal Code']),
    formatted_location: safeString(row['Company Address']) || `${city || ''}, ${state || ''}`.trim() || 'Unknown',
    company_name_for_emails: safeString(row['Company Name for Emails']),
    account_stage: safeString(row['Account Stage']),
    employee_count: parseNumber(row['# Employees']),
    industry: safeString(row['Industry']),
    company_linkedin_url: safeString(row['Company Linkedin Url'])?.replace(/\\/g, ''),
    facebook_url: safeString(row['Facebook Url'])?.replace(/\\/g, ''),
    twitter_url: safeString(row['Twitter Url'])?.replace(/\\/g, ''),
    company_street: safeString(row['Company Street']),
    keywords: safeString(row['Keywords']),
    company_phone: safeString(row['Company Phone']),
    technologies: safeString(row['Technologies']),
    total_funding: safeString(row['Total Funding']),
    latest_funding: safeString(row['Latest Funding']),
    latest_funding_amount: safeString(row['Latest Funding Amount']),
    last_raised_at: safeString(row['Last Raised At']),
    annual_revenue: parseBigInt(row['Annual Revenue']),
    number_of_retail_locations: parseNumber(row['Number of Retail Locations']),
    apollo_account_id: safeString(row['Apollo Account Id']),
    sic_codes: safeString(row['SIC Codes']),
    naics_codes: safeString(row['NAICS Codes']),
    short_description: safeString(row['Short Description']),
    founded_year: parseNumber(row['Founded Year']),
    logo_url: safeString(row['Logo Url'])?.replace(/\\/g, ''),
    subsidiary_of: safeString(row['Subsidiary of']),
    primary_intent_topic: safeString(row['Primary Intent Topic']),
    primary_intent_score: safeString(row['Primary Intent Score']),
    secondary_intent_topic: safeString(row['Secondary Intent Topic']),
    secondary_intent_score: safeString(row['Secondary Intent Score']),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return createPreflightResponse(req);
  }

  try {
    const { rows } = await req.json() as { rows: UniversityRow[] };

    if (!rows || !Array.isArray(rows)) {
      return createErrorResponse('Invalid request: rows array required', 400, req);
    }

    console.log(`📥 Received ${rows.length} rows for import`);

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Transform rows
    const transformedRows = rows
      .map(transformRow)
      .filter((row): row is NonNullable<typeof row> => row !== null);

    console.log(`✅ Transformed ${transformedRows.length} valid rows`);

    // Deduplicate by domain (keep last occurrence to avoid ON CONFLICT errors)
    const uniqueByDomain = new Map<string, typeof transformedRows[0]>();
    for (const row of transformedRows) {
      uniqueByDomain.set(row.domain, row);
    }
    const deduplicatedRows = Array.from(uniqueByDomain.values());
    
    console.log(`🔄 Deduplicated: ${transformedRows.length} → ${deduplicatedRows.length} unique domains`);

    // Batch upsert in chunks of 500
    const BATCH_SIZE = 500;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < deduplicatedRows.length; i += BATCH_SIZE) {
      const batch = deduplicatedRows.slice(i, i + BATCH_SIZE);
      console.log(`📦 Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(deduplicatedRows.length / BATCH_SIZE)}`);

      const { error } = await supabaseClient
        .from('university_domains')
        .upsert(batch, { 
          onConflict: 'domain',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`❌ Batch error:`, error.message);
        errorCount += batch.length;
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        successCount += batch.length;
      }
    }

    console.log(`✅ Import complete: ${successCount} success, ${errorCount} errors`);

    return createJsonResponse({
      success: true,
      totalReceived: rows.length,
      totalTransformed: transformedRows.length,
      totalDeduplicated: deduplicatedRows.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10)
    }, 200, req);

  } catch (error) {
    console.error('❌ Import error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return createErrorResponse(`Import failed: ${message}`, 500, req);
  }
});
