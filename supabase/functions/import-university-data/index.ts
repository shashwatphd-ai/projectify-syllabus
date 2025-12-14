import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function extractDomain(websiteUrl: string | undefined): string | null {
  if (!websiteUrl) return null;
  
  try {
    // Remove protocol and www
    let domain = websiteUrl
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

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value.replace(/[^0-9-]/g, ''), 10);
  return isNaN(num) ? null : num;
}

function parseBigInt(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value.replace(/[^0-9-]/g, ''), 10);
  return isNaN(num) ? null : num;
}

function transformRow(row: UniversityRow) {
  const domain = extractDomain(row['Website']);
  if (!domain) return null;
  
  const name = row['Company Name']?.trim();
  if (!name) return null;
  
  return {
    domain,
    name,
    country: row['Company Country']?.trim() || 'United States',
    city: row['Company City']?.trim() || null,
    state: row['Company State']?.trim() || null,
    zip: row['Company Postal Code']?.trim() || null,
    formatted_location: row['Company Address']?.trim() || `${row['Company City'] || ''}, ${row['Company State'] || ''}`.trim(),
    company_name_for_emails: row['Company Name for Emails']?.trim() || null,
    account_stage: row['Account Stage']?.trim() || null,
    employee_count: parseNumber(row['# Employees']),
    industry: row['Industry']?.trim() || null,
    company_linkedin_url: row['Company Linkedin Url']?.replace(/\\/g, '') || null,
    facebook_url: row['Facebook Url']?.replace(/\\/g, '') || null,
    twitter_url: row['Twitter Url']?.replace(/\\/g, '') || null,
    company_street: row['Company Street']?.trim() || null,
    keywords: row['Keywords']?.trim() || null,
    company_phone: row['Company Phone']?.trim() || null,
    technologies: row['Technologies']?.trim() || null,
    total_funding: row['Total Funding']?.trim() || null,
    latest_funding: row['Latest Funding']?.trim() || null,
    latest_funding_amount: row['Latest Funding Amount']?.trim() || null,
    last_raised_at: row['Last Raised At']?.trim() || null,
    annual_revenue: parseBigInt(row['Annual Revenue']),
    number_of_retail_locations: parseNumber(row['Number of Retail Locations']),
    apollo_account_id: row['Apollo Account Id']?.trim() || null,
    sic_codes: row['SIC Codes']?.trim() || null,
    naics_codes: row['NAICS Codes']?.trim() || null,
    short_description: row['Short Description']?.trim() || null,
    founded_year: parseNumber(row['Founded Year']),
    logo_url: row['Logo Url']?.replace(/\\/g, '') || null,
    subsidiary_of: row['Subsidiary of']?.trim() || null,
    primary_intent_topic: row['Primary Intent Topic']?.trim() || null,
    primary_intent_score: row['Primary Intent Score']?.trim() || null,
    secondary_intent_topic: row['Secondary Intent Topic']?.trim() || null,
    secondary_intent_score: row['Secondary Intent Score']?.trim() || null,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rows } = await req.json() as { rows: UniversityRow[] };

    if (!rows || !Array.isArray(rows)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: rows array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Batch upsert in chunks of 500
    const BATCH_SIZE = 500;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < transformedRows.length; i += BATCH_SIZE) {
      const batch = transformedRows.slice(i, i + BATCH_SIZE);
      console.log(`📦 Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(transformedRows.length / BATCH_SIZE)}`);

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

    return new Response(
      JSON.stringify({
        success: true,
        totalReceived: rows.length,
        totalTransformed: transformedRows.length,
        successCount,
        errorCount,
        errors: errors.slice(0, 10) // Only return first 10 errors
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Import error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: `Import failed: ${message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
