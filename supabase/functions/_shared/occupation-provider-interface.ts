/**
 * Occupation Provider Interface
 *
 * Abstract interface for pluggable occupation mapping providers.
 * Supports ESCO, Skills-ML, O*NET, and future providers.
 *
 * Part of P0-4 Phase 2: Multi-provider occupation mapping
 */

import { ExtractedSkill } from './skill-extraction-service.ts';

/**
 * Standardized occupation format used across all providers
 */
export interface StandardOccupation {
  code: string;              // Provider-specific code (SOC for O*NET, ESCO URI, etc.)
  title: string;             // Occupation title
  description: string;       // Brief description
  matchScore: number;        // 0.0 to 1.0 - how well it matches extracted skills
  skills: StandardSkill[];   // Skills for this occupation
  dwas: StandardDWA[];       // Detailed work activities
  tools: string[];           // Physical and software tools
  technologies: string[];    // Technologies and platforms (e.g., "Python", "AWS", "React")
  tasks: string[];           // Common tasks
  provider: string;          // 'onet', 'esco', 'skills-ml'
  confidence: number;        // 0.0 to 1.0 - provider's confidence in mapping
}

/**
 * Standardized skill format
 */
export interface StandardSkill {
  id: string;
  name: string;
  description: string;
  category?: string;         // 'technical', 'soft', 'domain', etc.
  importance?: number;       // 0-100 or 0.0-1.0 (normalized by provider)
  level?: number;            // Proficiency level (provider-specific scale)
}

/**
 * Standardized detailed work activity
 */
export interface StandardDWA {
  id: string;
  name: string;
  description: string;
  importance?: number;       // 0-100 or 0.0-1.0
  level?: number;
}

/**
 * Result from occupation mapping
 */
export interface OccupationMappingResult {
  occupations: StandardOccupation[];
  totalMapped: number;
  unmappedSkills: string[];  // Skills that couldn't be mapped
  provider: string;          // Provider name
  apiCalls: number;          // API calls made (for monitoring)
  cacheHits: number;         // Cache hits (for performance)
  processingTimeMs: number;  // Time taken
  metadata?: Record<string, any>; // Provider-specific metadata
}

/**
 * Abstract occupation provider interface
 */
export interface OccupationProvider {
  /**
   * Provider name (e.g., 'onet', 'esco', 'skills-ml')
   */
  readonly name: string;

  /**
   * Provider version
   */
  readonly version: string;

  /**
   * Check if provider is properly configured
   * (e.g., API credentials set, dependencies available)
   */
  isConfigured(): boolean;

  /**
   * Health check - verify provider is accessible
   */
  healthCheck(): Promise<boolean>;

  /**
   * Map extracted skills to occupations
   */
  mapSkillsToOccupations(
    skills: ExtractedSkill[]
  ): Promise<OccupationMappingResult>;

  /**
   * Get detailed information for a specific occupation
   */
  getOccupationDetails?(code: string): Promise<StandardOccupation | null>;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  enabled: boolean;
  priority: number;          // Higher = higher priority in coordination
  maxOccupations?: number;   // Max occupations to return
  timeout?: number;          // Request timeout in ms
  apiKey?: string;           // API key if required
  credentials?: Record<string, string>; // Other credentials
}

/**
 * Multi-provider configuration
 */
export interface MultiProviderConfig {
  providers: {
    esco?: ProviderConfig;
    skillsml?: ProviderConfig;
    onet?: ProviderConfig;
  };
  coordinationStrategy: 'union' | 'intersection' | 'weighted';
  minProviders?: number;     // Minimum providers that must succeed
  fallbackOrder?: string[];  // Fallback order if preferred providers fail
}
