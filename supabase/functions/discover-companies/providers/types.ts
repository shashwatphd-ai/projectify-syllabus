/**
 * SHARED TYPES FOR ALL DISCOVERY PROVIDERS
 * These interfaces ensure all providers return consistent data structures
 */

// Import types from shared services
import type { ExtractedSkill } from '../../_shared/skill-extraction-service.ts';
import type { StandardOccupation } from '../../_shared/occupation-provider-interface.ts';

export interface CourseContext {
  outcomes: string[];
  level: string;
  topics: string[];
  location: string; // Display format (e.g., "University Name, Country")
  searchLocation: string; // Apollo search format (e.g., "Kansas City, Missouri, United States")
  targetCount: number;

  // Phase 1+2: Intelligent matching data (optional - providers can use or ignore)
  extractedSkills?: ExtractedSkill[];          // Skills extracted from outcomes
  onetOccupations?: StandardOccupation[];      // Occupations from multi-provider coordination
  courseTitle?: string;                        // Course title for context
  socMappings?: any[];                          // SOC mapping results for industry-based search

  // User customization (from Configure page)
  targetCompanies?: string[];                   // Specific companies user wants to find
  targetIndustries?: string[];                  // Specific industries user wants to filter by
}

export interface DiscoveredCompany {
  // Basic info
  name: string;
  apollo_organization_id?: string;
  website: string;
  sector: string;
  size: string;
  
  // Company context (CRITICAL for accurate project generation)
  description?: string;              // Real company description from Apollo short_description
  seoDescription?: string;           // Fallback SEO description
  industries?: string[];             // Multi-industry classification array
  keywords?: string[];               // Company capability keywords for skill matching
  
  // Department intelligence for contact discovery
  departmentalHeadCount?: {
    engineering?: number;
    sales?: number;
    marketing?: number;
    operations?: number;
    finance?: number;
    hr?: number;
    [key: string]: number | undefined;
  };
  
  // Funding history for market intelligence
  fundingEvents?: Array<{
    funded_at?: string;
    amount?: number;
    funding_type?: string;
    investors?: string[];
  }>;
  
  // Location
  address: string;
  city: string;
  state?: string;
  zip: string;
  country?: string;
  
  // Contact information
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactTitle?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactHeadline?: string;
  contactPhotoUrl?: string;
  contactLinkedin?: string;
  contactTwitter?: string;
  contactCity?: string;
  contactState?: string;
  contactCountry?: string;
  contactEmploymentHistory?: any;
  contactPhoneNumbers?: any;
  contactEmailStatus?: string;
  
  // Organization details
  organizationLinkedin?: string;
  organizationTwitter?: string;
  organizationFacebook?: string;
  organizationLogoUrl?: string;
  organizationFoundedYear?: number;
  organizationEmployeeCount?: string;
  organizationRevenueRange?: string;
  organizationIndustryKeywords?: string[];
  
  // Market intelligence
  jobPostings?: Array<{
    id: string;
    title: string;
    url?: string;
    city?: string;
    state?: string;
    posted_at?: string;
    last_seen_at?: string;
    skills_needed?: string[];
  }>;
  technologiesUsed?: string[];
  buyingIntentSignals?: Array<{
    signal_type: string;
    confidence: string;
    details: string;
    timing: string;
  }>;
  fundingStage?: string;
  totalFundingUsd?: number;
  
  // Metadata
  discoverySource: string;
  enrichmentLevel: 'basic' | 'apollo_verified' | 'fully_enriched';
  dataCompletenessScore: number;
  lastEnrichedAt: string;
  lastVerifiedAt?: string;

  // Geographic proximity
  distanceFromSearchMiles?: number; // Distance from search location in miles
}

export interface DiscoveryResult {
  companies: DiscoveredCompany[];
  stats: {
    discovered: number;
    enriched: number;
    processingTimeSeconds: number;
    apiCreditsUsed: number;
    providerUsed: string;
  };
  // Feedback about user-specified companies (optional)
  userRequestedCompanies?: {
    requested: string[];
    found: string[];
    notFound: string[];
  };
}

/**
 * DISCOVERY PROVIDER INTERFACE
 * All providers must implement this interface
 */
export interface DiscoveryProvider {
  readonly name: string;
  readonly version: string;
  
  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean;
  
  /**
   * Discover companies based on course context
   */
  discover(context: CourseContext): Promise<DiscoveryResult>;
  
  /**
   * Get provider-specific configuration requirements
   */
  getRequiredSecrets(): string[];
  
  /**
   * Health check for provider
   */
  healthCheck(): Promise<boolean>;
}

/**
 * PROVIDER CONFIGURATION
 */
export interface ProviderConfig {
  provider: 'apollo' | 'google' | 'adzuna' | 'hybrid';
  fallbackProvider?: 'apollo' | 'google' | 'adzuna';
  maxRetries?: number;
  timeout?: number;
}
