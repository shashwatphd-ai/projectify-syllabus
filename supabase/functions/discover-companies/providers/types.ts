/**
 * SHARED TYPES FOR ALL DISCOVERY PROVIDERS
 * These interfaces ensure all providers return consistent data structures
 */

export interface CourseContext {
  outcomes: string[];
  level: string;
  topics: string[];
  location: string;
  targetCount: number;
}

export interface DiscoveredCompany {
  // Basic info
  name: string;
  apollo_organization_id?: string;
  website: string;
  sector: string;
  size: string;
  
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
  provider: 'apollo' | 'google' | 'hybrid';
  fallbackProvider?: 'apollo' | 'google';
  maxRetries?: number;
  timeout?: number;
}
