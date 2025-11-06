/**
 * EDUTHREE SYSTEM DATA CONTRACT
 * This is the single source of truth for company profile data.
 * 
 * CONTRACT RULES:
 * 1. All Providers MUST produce this interface
 * 2. Database MUST store this structure
 * 3. Consumers MUST expect this structure
 * 4. NO modifications without system-wide update
 */

export interface CleanCompanyProfile {
  // ===== IDENTITY =====
  name: string;
  website: string; // UNIQUE identifier for upserts
  
  // ===== LOCATION =====
  full_address: string;
  city: string;
  state?: string;
  zip: string;
  country?: string;

  // ===== FIRMOGRAPHICS =====
  sector: string;
  size: string; // Normalized range: "1-50", "51-200", "201-500", etc.
  organization_linkedin_url?: string;
  organization_twitter_url?: string;
  organization_facebook_url?: string;
  organization_logo_url?: string;
  organization_founded_year?: number;
  organization_employee_count?: string; // Raw count or range
  organization_revenue_range?: string;
  organization_industry_keywords?: string[];

  // ===== CONTACT PERSON =====
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_title?: string;
  contact_headline?: string;
  contact_photo_url?: string;
  contact_city?: string;
  contact_state?: string;
  contact_country?: string;
  contact_email_status?: string;
  contact_employment_history?: any;
  contact_phone_numbers?: any;
  linkedin_profile?: string; // Contact's LinkedIn
  contact_twitter_url?: string;

  // ===== MARKET INTELLIGENCE (CRITICAL FIX) =====
  // MUST be simple array of strings (normalized by provider)
  technologies_used: string[]; // ["React", "AWS", "Salesforce"]
  
  // MUST be array of job objects
  job_postings: Array<{
    id: string;
    title: string;
    url?: string;
    city?: string;
    state?: string;
    posted_at?: string;
    last_seen_at?: string;
    skills_needed?: string[];
  }>;
  
  buying_intent_signals?: Array<{
    signal_type: string;
    confidence: string;
    details: string;
    timing: string;
  }>;
  funding_stage?: string;
  total_funding_usd?: number;
  job_postings_last_fetched?: string | null;

  // ===== METADATA =====
  source: string; // "apollo_discovery", "google_discovery"
  discovery_source: string;
  generation_run_id: string;
  apollo_enrichment_date?: string;
  data_enrichment_level: 'basic' | 'apollo_verified' | 'fully_enriched';
  data_completeness_score: number;
  last_enriched_at: string;
  last_verified_at?: string;
}
