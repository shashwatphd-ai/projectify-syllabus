import type { Json } from "@/integrations/supabase/types";

// ============================================================================
// Shared types for project-detail components
// ============================================================================

// Form data structures
export interface ProjectForm1 {
  title?: string;
  industry?: string;
  description?: string;
  budget?: number;
}

export interface ProjectForm2 {
  company?: string;
  sector?: string;
  size?: string;
  website?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_title?: string;
}

export interface ProjectForm3 {
  skills?: string[];
  team_size?: number;
  deliverables?: string[];
  learning_objectives?: string | string[];
}

export interface ProjectForm4 {
  start?: string;
  end?: string;
  weeks?: number;
}

export interface ProjectForm5 {
  type?: string;
  scope?: string;
  location?: string;
  ip?: string;
}

export interface ProjectForm6 {
  category?: string;
  year?: string;
  hours_per_week?: number;
}

export interface ProjectForms {
  form1: ProjectForm1 | null;
  form2: ProjectForm2 | null;
  form3: ProjectForm3 | null;
  form4: ProjectForm4 | null;
  form5: ProjectForm5 | null;
  form6: ProjectForm6 | null;
  milestones?: Array<{
    title?: string;
    date?: string;
    description?: string;
  }> | null;
}

// Project data
export interface ProjectData {
  id: string;
  title: string;
  company_name: string;
  sector: string | null;
  tier: string | null;
  team_size: number | null;
  duration_weeks: number | null;
  pricing_usd: number;
  tasks: string[] | null;
  deliverables: string[] | null;
  skills?: string[] | null;
  lo_score: number;
  feasibility_score: number | null;
  mutual_benefit_score: number | null;
  final_score: number | null;
  needs_review: boolean | null;
  created_at: string;
  course_id: string | null;
  generation_run_id: string | null;
  company_profile_id: string | null;
  status?: string;
}

// Company profile data
export interface CompanyProfile {
  id: string;
  name: string;
  website: string | null;
  sector: string | null;
  city: string | null;
  description: string | null;
  size: string | null;
  technologies_used: string[];
  job_postings: JobPosting[] | null;
  composite_signal_score: number | null;
  skill_match_score: number | null;
  department_fit_score: number | null;
  contact_quality_score: number | null;
  market_signal_score: number | null;
  linkedin_profile: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_title: string | null;
  funding_stage: string | null;
  total_funding_usd: number | null;
  organization_revenue_range: string | null;
  organization_founded_year: number | null;
  organization_industry_keywords: string[] | null;
  recent_news: string | null;
  buying_intent_signals: BuyingIntentSignal[] | null;
}

export interface JobPosting {
  title: string;
  city?: string;
  state?: string;
  posted_at?: string;
  url?: string;
  skills_needed?: string[];
}

export interface BuyingIntentSignal {
  signal_type?: string;
  confidence?: string;
  details?: string;
  timing?: string;
}

// Course profile data
export interface CourseProfile {
  id: string;
  title: string;
  level: string;
  city_zip: string | null;
  outcomes: Json;
  artifacts: Json;
  schedule: Json | null;
  hrs_per_week: number;
  weeks: number;
  owner_id: string;
  location_city?: string | null;
  location_formatted?: string | null;
  subject?: string;
}

// Metadata structures
export interface MatchAnalysis {
  relevance_score: number;
  match_reasoning: string;
  intelligence_factors?: string[];
}

export interface MarketSignalsUsed {
  job_postings_matched?: number;
  funding_stage?: string;
  technologies_aligned?: string[];
  hiring_urgency?: string;
  needs_identified?: number;
}

export interface EstimatedROI {
  roi_multiplier?: number;
  total_estimated_value?: number;
  estimated_budget?: number;
  deliverable_value?: number;
  talent_pipeline_value?: number;
  strategic_value?: number;
  knowledge_transfer_value?: number;
}

export interface PricingBreakdown {
  base_calculation?: {
    hours: number;
    rate_per_hour: number;
    materials: number;
    subtotal: number;
  };
  multipliers_applied?: PricingMultiplier[];
}

export interface PricingMultiplier {
  factor: string;
  multiplier: number;
  level?: string;
  stage?: string;
  rationale?: string;
}

export interface ProjectMetadata {
  match_analysis?: MatchAnalysis;
  market_signals_used?: MarketSignalsUsed;
  estimated_roi?: EstimatedROI;
  pricing_breakdown?: PricingBreakdown;
  market_alignment_score?: number;
  lo_alignment_detail?: Json | null;
  algorithm_version?: string;
  ai_model_version?: string;
  generation_timestamp?: string | null;
  value_analysis?: ValueAnalysisWrapper;
  stakeholder_insights?: StakeholderInsightsWrapper;
  synergistic_value_index?: number;
  partnership_quality_score?: number;
}

// Value Analysis types
export interface ValueAnalysisWrapper {
  status: 'complete' | 'not_generated';
  data?: ValueAnalysisData;
  message?: string;
}

export interface StakeholderInsightsWrapper {
  status: 'complete' | 'not_generated';
  data?: StakeholderInsights;
  message?: string;
}

export interface ValueAnalysisData {
  student_value?: StakeholderValue;
  university_value?: StakeholderValue;
  industry_value?: StakeholderValue;
  problem_validation?: ProblemValidation;
  generated_at?: string;
  salary_roi?: unknown;
  skill_gap_analysis?: unknown;
  career_pathway?: unknown;
}

export interface StakeholderValue {
  score: number;
  career_opportunities_score?: number;
  skill_development_score?: number;
  portfolio_value_score?: number;
  networking_score?: number;
  partnership_quality_score?: number;
  placement_potential_score?: number;
  research_collaboration_score?: number;
  reputation_score?: number;
  deliverable_roi_score?: number;
  talent_pipeline_score?: number;
  innovation_score?: number;
  cost_efficiency_score?: number;
  insights?: string;
  evidence_summary?: string;
  key_benefits?: string[];
}

export interface ProblemValidation {
  alignment_score: number;
  evidence_trail: string;
  validated_challenges: string[];
}

export interface StakeholderInsights {
  overall_assessment?: string;
  recommendations?: string[];
  risks?: string[];
}
