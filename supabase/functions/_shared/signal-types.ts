/**
 * Signal-Driven Company Discovery - Type Definitions
 * 
 * SOLID Principles Applied:
 * - Interface Segregation: Small, focused interfaces
 * - Single Responsibility: Each type serves one purpose
 * - Open/Closed: New signals can implement SignalProvider without modification
 * 
 * @module signal-types
 */

// =============================================================================
// CORE SIGNAL INTERFACES
// =============================================================================

/**
 * Result from any signal calculation
 * All signal providers return this standardized format
 */
export interface SignalResult {
  /** Score from 0-100 */
  score: number;
  /** Confidence level 0-1 (1 = high confidence) */
  confidence: number;
  /** Human-readable signal descriptions for debugging/display */
  signals: string[];
  /** Original API response or calculation details for debugging */
  rawData?: unknown;
  /** Error message if signal calculation failed */
  error?: string;
}

/**
 * Context passed to all signal providers
 * Contains everything needed to calculate a signal
 */
export interface SignalContext {
  /** Company being evaluated */
  company: CompanyForSignal;
  /** Skills extracted from syllabus */
  syllabusSkills: string[];
  /** Domain/field of the syllabus (finance, engineering, etc.) */
  syllabusDomain: string;
  /** Job postings already fetched for this company (optional) */
  jobPostings?: JobPosting[];
  /** Apollo API key for additional API calls */
  apolloApiKey?: string;
  /** Gemini API key for AI operations */
  geminiApiKey?: string;
}

/**
 * Interface all signal providers must implement
 * Enables Open/Closed principle - add new signals without modifying orchestrator
 */
export interface SignalProvider {
  /** Unique identifier for this signal */
  readonly name: SignalName;
  /** Weight for composite scoring (0-1, all weights should sum to 1) */
  readonly weight: number;
  /** Calculate the signal score for a company */
  calculate(context: SignalContext): Promise<SignalResult>;
}

// =============================================================================
// SIGNAL NAMES & WEIGHTS
// =============================================================================

/**
 * Enumeration of all signal types
 * Used for type-safe signal identification
 */
export type SignalName = 
  | 'job_skills_match'      // Signal 1: Job-Skills semantic matching
  | 'market_intelligence'   // Signal 2: News/funding/hiring signals
  | 'department_fit'        // Signal 3: Department growth alignment
  | 'contact_quality';      // Signal 4: Decision-maker availability

/**
 * Default weights for composite scoring
 * Based on diagram: Skills most important, then market signals
 */
export const SIGNAL_WEIGHTS: Record<SignalName, number> = {
  job_skills_match: 0.35,      // 35% - Most important
  market_intelligence: 0.25,   // 25% - Funding/hiring signals
  department_fit: 0.20,        // 20% - Relevant dept growing
  contact_quality: 0.20        // 20% - Can we reach decision-makers
} as const;

// =============================================================================
// COMPOSITE SCORING
// =============================================================================

/**
 * Individual scores from all 4 signals
 */
export interface SignalScores {
  jobSkillsMatch: number;      // 0-100
  marketIntelligence: number;  // 0-100
  departmentFit: number;       // 0-100
  contactQuality: number;      // 0-100
}

/**
 * Final composite score with full breakdown
 */
export interface CompositeScore {
  /** Overall weighted score 0-100 */
  overall: number;
  /** Confidence level based on data availability */
  confidence: 'high' | 'medium' | 'low';
  /** Individual signal scores */
  components: SignalScores;
  /** Which signals were detected */
  signalsDetected: {
    hasActiveJobPostings: boolean;
    hasFundingNews: boolean;
    hasHiringNews: boolean;
    hasDepartmentGrowth: boolean;
    hasTechnologyMatch: boolean;
    hasDecisionMakers: boolean;
  };
  /** Human-readable breakdown for display */
  breakdown: string;
  /** Any errors during calculation */
  errors: string[];
}

// =============================================================================
// COMPANY DATA (subset needed for signals)
// =============================================================================

/**
 * Minimal company data needed for signal calculation
 * Avoids importing full company_profiles type
 */
export interface CompanyForSignal {
  id: string;
  name: string;
  apollo_organization_id?: string | null;
  industries?: unknown;
  departmental_head_count?: unknown;
  technologies?: unknown;
  job_postings?: unknown;
  description?: string | null;
  size?: string | null;
}

/**
 * Job posting structure from Apollo API
 */
export interface JobPosting {
  id?: string;
  title: string;
  url?: string;
  posted_at?: string;
  location?: string;
  description?: string;
}

// =============================================================================
// APOLLO API RESPONSE TYPES (for Signals 2 & 4)
// =============================================================================

/**
 * News article from Apollo News API (Signal 2)
 */
export interface ApolloNewsArticle {
  id: string;
  title: string;
  url: string;
  published_at: string;
  source?: string;
  snippet?: string;
}

/**
 * Person from Apollo People Search API (Signal 4)
 */
export interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  seniority?: string;
  departments?: string[];
  email?: string;
  linkedin_url?: string;
}

// =============================================================================
// FALLBACK CONFIGURATION
// =============================================================================

/**
 * Thresholds for graceful fallback system
 */
export interface FallbackConfig {
  /** Minimum score to include company (default: 50) */
  minScoreThreshold: number;
  /** Threshold to lower if too few results (default: 30) */
  fallbackThreshold: number;
  /** Minimum companies to return (default: 3) */
  minCompaniesToReturn: number;
  /** Maximum companies to return (default: 15) */
  maxCompaniesToReturn: number;
}

export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  minScoreThreshold: 50,
  fallbackThreshold: 30,
  minCompaniesToReturn: 3,
  maxCompaniesToReturn: 15
} as const;

// =============================================================================
// DATABASE COLUMN TYPES (for storing in company_profiles)
// =============================================================================

/**
 * Signal data to store in company_profiles table
 * Maps to new columns we'll add in Step 2
 */
export interface StorableSignalData {
  skill_match_score: number | null;
  market_signal_score: number | null;
  department_fit_score: number | null;
  contact_quality_score: number | null;
  composite_signal_score: number | null;
  signal_confidence: 'high' | 'medium' | 'low' | null;
  signal_data: CompositeScore | null;
}
