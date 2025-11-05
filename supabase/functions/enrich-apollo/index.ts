import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Apollo.io Enrichment Maximization Function
 * 
 * This function enriches company profiles with Apollo.io data to maximize contact
 * and organization information. It uses Apollo's Person & Organization APIs.
 * 
 * Usage: POST /enrich-apollo
 * Body: { companyProfileId: string } or { companyProfileIds: string[] }
 */

interface ApolloPersonEnrichment {
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  headline?: string;
  photo_url?: string;
  city?: string;
  state?: string;
  country?: string;
  email?: string;
  email_status?: string;
  twitter_url?: string;
  linkedin_url?: string;
  employment_history?: Array<{
    title: string;
    organization_name: string;
    start_date?: string;
    end_date?: string;
  }>;
  phone_numbers?: Array<{
    raw_number: string;
    sanitized_number?: string;
    type?: string;
  }>;
}

interface ApolloOrganizationEnrichment {
  name?: string;
  website_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  founded_year?: number;
  logo_url?: string;
  employee_count?: string;
  estimated_num_employees?: number;
  industry?: string;
  keywords?: string[];
  annual_revenue?: string;
}

// Enrich a person using Apollo.io API
async function enrichPersonWithApollo(
  name: string,
  organizationDomain?: string
): Promise<ApolloPersonEnrichment | null> {
  const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');
  if (!APOLLO_API_KEY) {
    console.error('❌ APOLLO_API_KEY not configured');
    return null;
  }

  try {
    console.log(`🔍 Apollo Person Enrichment for: ${name} at ${organizationDomain || 'unknown domain'}`);
    
    const payload: any = {
      api_key: APOLLO_API_KEY,
    };

    // Parse name into first/last
    const nameParts = name.trim().split(' ');
    if (nameParts.length >= 2) {
      payload.first_name = nameParts[0];
      payload.last_name = nameParts.slice(1).join(' ');
    } else {
      payload.first_name = name;
    }

    if (organizationDomain) {
      payload.organization_domain = organizationDomain;
    }

    const response = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Apollo Person API error ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data.person) {
      console.log('⚠️ No person match found in Apollo');
      return null;
    }

    const person = data.person;
    console.log(`✅ Apollo Person found: ${person.name} (${person.title})`);

    return {
      first_name: person.first_name,
      last_name: person.last_name,
      name: person.name,
      title: person.title,
      headline: person.headline,
      photo_url: person.photo_url,
      city: person.city,
      state: person.state,
      country: person.country,
      email: person.email,
      email_status: person.email_status,
      twitter_url: person.twitter_url,
      linkedin_url: person.linkedin_url,
      employment_history: person.employment_history,
      phone_numbers: person.phone_numbers
    };
  } catch (error) {
    console.error('❌ Apollo Person enrichment error:', error);
    return null;
  }
}

// Enrich an organization using Apollo.io API
async function enrichOrganizationWithApollo(
  domain: string
): Promise<ApolloOrganizationEnrichment | null> {
  const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');
  if (!APOLLO_API_KEY) {
    console.error('❌ APOLLO_API_KEY not configured');
    return null;
  }

  try {
    console.log(`🔍 Apollo Organization Enrichment for domain: ${domain}`);
    
    const response = await fetch('https://api.apollo.io/v1/organizations/enrich', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        api_key: APOLLO_API_KEY,
        domain: domain
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Apollo Organization API error ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data.organization) {
      console.log('⚠️ No organization match found in Apollo');
      return null;
    }

    const org = data.organization;
    console.log(`✅ Apollo Organization found: ${org.name} (${org.estimated_num_employees} employees)`);

    return {
      name: org.name,
      website_url: org.website_url,
      linkedin_url: org.linkedin_url,
      twitter_url: org.twitter_url,
      facebook_url: org.facebook_url,
      founded_year: org.founded_year,
      logo_url: org.logo_url,
      employee_count: org.employee_count,
      estimated_num_employees: org.estimated_num_employees,
      industry: org.industry,
      keywords: org.keywords,
      annual_revenue: org.annual_revenue
    };
  } catch (error) {
    console.error('❌ Apollo Organization enrichment error:', error);
    return null;
  }
}

// Calculate data completeness score (0-100)
function calculateCompletenessScore(profile: any): number {
  const fields = [
    // Contact fields (40 points)
    profile.contact_first_name ? 5 : 0,
    profile.contact_last_name ? 5 : 0,
    profile.contact_email ? 10 : 0,
    profile.contact_phone ? 5 : 0,
    profile.contact_title ? 5 : 0,
    profile.contact_headline ? 5 : 0,
    profile.contact_photo_url ? 5 : 0,
    
    // Organization fields (40 points)
    profile.organization_linkedin_url ? 10 : 0,
    profile.organization_logo_url ? 10 : 0,
    profile.organization_employee_count ? 5 : 0,
    profile.organization_revenue_range ? 10 : 0,
    profile.organization_founded_year ? 5 : 0,
    
    // Basic fields (20 points)
    profile.website ? 5 : 0,
    profile.full_address ? 5 : 0,
    profile.sector ? 5 : 0,
    profile.inferred_needs?.length > 0 ? 5 : 0,
  ];

  return Math.min(100, fields.reduce((sum, val) => sum + val, 0));
}

// Extract domain from website URL
function extractDomain(website: string): string | null {
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    return url.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { companyProfileId, companyProfileIds } = await req.json();
    
    const idsToEnrich = companyProfileId 
      ? [companyProfileId] 
      : (companyProfileIds || []);

    if (idsToEnrich.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No company profile IDs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚀 Starting Apollo enrichment for ${idsToEnrich.length} company profiles`);

    const results = {
      enriched: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[]
    };

    for (const profileId of idsToEnrich) {
      try {
        // Fetch company profile
        const { data: profile, error: fetchError } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        if (fetchError || !profile) {
          console.error(`❌ Failed to fetch profile ${profileId}:`, fetchError);
          results.failed++;
          continue;
        }

        console.log(`\n📊 Enriching: ${profile.name}`);

        // Skip if already fully enriched within last 7 days
        if (profile.data_enrichment_level === 'fully_enriched' && profile.apollo_enrichment_date) {
          const daysSinceEnrichment = (Date.now() - new Date(profile.apollo_enrichment_date).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceEnrichment < 7) {
            console.log(`⏭️ Skipping ${profile.name} - recently enriched`);
            results.skipped++;
            continue;
          }
        }

        const updates: any = {
          apollo_enrichment_date: new Date().toISOString(),
          last_verified_at: new Date().toISOString()
        };

        // Step 1: Enrich Organization
        if (profile.website) {
          const domain = extractDomain(profile.website);
          if (domain) {
            const orgData = await enrichOrganizationWithApollo(domain);
            if (orgData) {
              updates.organization_linkedin_url = orgData.linkedin_url || profile.organization_linkedin_url;
              updates.organization_twitter_url = orgData.twitter_url || profile.organization_twitter_url;
              updates.organization_facebook_url = orgData.facebook_url || profile.organization_facebook_url;
              updates.organization_founded_year = orgData.founded_year || profile.organization_founded_year;
              updates.organization_logo_url = orgData.logo_url || profile.organization_logo_url;
              
              // Employee count formatting
              if (orgData.estimated_num_employees) {
                const count = orgData.estimated_num_employees;
                updates.organization_employee_count = count < 50 ? '1-50' :
                  count < 200 ? '51-200' :
                  count < 500 ? '201-500' :
                  count < 1000 ? '501-1000' :
                  count < 5000 ? '1001-5000' : '5000+';
              }

              // Revenue formatting
              if (orgData.annual_revenue) {
                updates.organization_revenue_range = orgData.annual_revenue;
              }

              // Industry keywords
              if (orgData.keywords && orgData.keywords.length > 0) {
                updates.organization_industry_keywords = orgData.keywords;
              }
            }
          }
        }

        // Step 2: Enrich Contact Person
        if (profile.contact_person && profile.website) {
          const domain = extractDomain(profile.website);
          if (domain) {
            const personData = await enrichPersonWithApollo(profile.contact_person, domain);
            if (personData) {
              updates.contact_first_name = personData.first_name || profile.contact_first_name;
              updates.contact_last_name = personData.last_name || profile.contact_last_name;
              updates.contact_title = personData.title || profile.contact_title;
              updates.contact_headline = personData.headline || profile.contact_headline;
              updates.contact_photo_url = personData.photo_url || profile.contact_photo_url;
              updates.contact_city = personData.city || profile.contact_city;
              updates.contact_state = personData.state || profile.contact_state;
              updates.contact_country = personData.country || profile.contact_country;
              updates.contact_twitter_url = personData.twitter_url || profile.contact_twitter_url;
              
              // Email enrichment
              if (personData.email && !profile.contact_email) {
                updates.contact_email = personData.email;
                updates.contact_email_status = personData.email_status;
              }

              // LinkedIn enrichment
              if (personData.linkedin_url && !profile.linkedin_profile) {
                updates.linkedin_profile = personData.linkedin_url;
              }

              // Phone numbers
              if (personData.phone_numbers && personData.phone_numbers.length > 0) {
                updates.contact_phone_numbers = personData.phone_numbers;
                if (!profile.contact_phone) {
                  updates.contact_phone = personData.phone_numbers[0].raw_number;
                }
              }

              // Employment history
              if (personData.employment_history && personData.employment_history.length > 0) {
                updates.contact_employment_history = personData.employment_history;
              }
            }
          }
        }

        // Calculate enrichment level and completeness
        const enrichedProfile = { ...profile, ...updates };
        updates.data_completeness_score = calculateCompletenessScore(enrichedProfile);
        
        // Determine enrichment level
        if (updates.data_completeness_score >= 80) {
          updates.data_enrichment_level = 'fully_enriched';
        } else if (updates.data_completeness_score >= 40) {
          updates.data_enrichment_level = 'apollo_verified';
        } else {
          updates.data_enrichment_level = 'basic';
        }

        // Update the profile
        const { error: updateError } = await supabase
          .from('company_profiles')
          .update(updates)
          .eq('id', profileId);

        if (updateError) {
          console.error(`❌ Failed to update profile ${profileId}:`, updateError);
          results.failed++;
        } else {
          console.log(`✅ Successfully enriched ${profile.name} (${updates.data_completeness_score}% complete, ${updates.data_enrichment_level})`);
          results.enriched++;
          results.details.push({
            id: profileId,
            name: profile.name,
            completeness: updates.data_completeness_score,
            level: updates.data_enrichment_level
          });
        }

        // Rate limiting: 100 requests per minute for Apollo API
        await new Promise(resolve => setTimeout(resolve, 650));

      } catch (error) {
        console.error(`❌ Error enriching profile ${profileId}:`, error);
        results.failed++;
      }
    }

    console.log(`\n📈 Apollo Enrichment Complete:
      ✅ Enriched: ${results.enriched}
      ⏭️ Skipped: ${results.skipped}
      ❌ Failed: ${results.failed}
    `);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Enriched ${results.enriched} of ${idsToEnrich.length} profiles`,
        ...results
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Apollo enrichment function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
