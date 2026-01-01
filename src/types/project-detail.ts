import type { Json } from "@/integrations/supabase/types";

// Project data from get-project-detail endpoint
export interface ProjectDetailProject {
  id: string;
  title: string;
  company_name: string;
  sector: string | null;
  tier: string | null;
  team_size: number | null;
  duration_weeks: number | null;
  pricing_usd: number | null;
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
  company_logo_url?: string | null;
  status?: string;
}

export interface ProjectDetailForms {
  form1: {
    title?: string;
    industry?: string;
    description?: string;
    budget?: number;
  } | null;
  form2: {
    company?: string;
    sector?: string;
    size?: string;
    website?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    contact_title?: string;
  } | null;
  form3: {
    skills?: string[];
    team_size?: number;
    deliverables?: string[];
  } | null;
  form4: {
    start?: string;
    end?: string;
    weeks?: number;
  } | null;
  form5: {
    type?: string;
    scope?: string;
    location?: string;
    ip?: string;
    equipment_provided?: string;
    equipment_needed?: string;
    software?: string;
    past_experience?: string;
    follow_up?: string;
  } | null;
  form6: {
    category?: string;
    year?: string;
    hours_per_week?: number;
    difficulty?: string;
    majors?: string | string[];
    faculty_expertise?: string;
    universities?: string;
    publication?: string;
  } | null;
  milestones?: Array<{
    title?: string;
    date?: string;
    description?: string;
  }> | null;
}

export interface ProjectDetailCourse {
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
}

// Raw metadata from database - uses Json for flexible fields
export interface ProjectDetailMetadataRaw {
  algorithm_version: string | null;
  ai_model_version: string | null;
  generation_timestamp: string | null;
  lo_alignment_detail: Json | null;
  lo_mapping_tasks: Json | null;
  lo_mapping_deliverables: Json | null;
  scoring_rationale: Json | null;
  companies_considered: Json | null;
  selection_criteria: Json | null;
  pricing_breakdown: Json | null;
  value_analysis: Json | null;
  stakeholder_insights: Json | null;
  synergistic_value_index?: number | null;
  partnership_quality_score?: number | null;
}

// Processed metadata with structured fields
export interface ProjectDetailMetadata {
  algorithm_version: string;
  ai_model_version: string;
  generation_timestamp: string | null;
  lo_alignment_detail: Json | null;
  lo_mapping_tasks: Json | null;
  lo_mapping_deliverables: Json | null;
  scoring_rationale: Json | null;
  companies_considered: Json | null;
  selection_criteria?: {
    location?: string;
    industries?: string[];
  } | null;
  pricing_breakdown: {
    status: 'complete' | 'legacy';
    data?: Json;
    message?: string;
    fallback_value?: number | null;
  };
  value_analysis: {
    status: 'complete' | 'not_generated';
    data?: Json;
    message?: string;
    trigger_action?: string;
  };
  stakeholder_insights: {
    status: 'complete' | 'not_generated';
    data?: Json;
    message?: string;
  };
  synergistic_value_index?: number | null;
  partnership_quality_score?: number | null;
}

export interface ProjectDetailCompany {
  id: string;
  name: string;
  website: string | null;
  sector: string | null;
  city: string | null;
  description: string | null;
  size: string | null;
  technologies_used: string[];
  job_postings: Json | null;
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
}

export interface ProjectDetailContactInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  source: 'company_profile' | 'form2';
}

export interface ProjectDetailDataQuality {
  has_company_profile: boolean;
  has_contact_info: boolean;
  has_job_postings: boolean;
  has_technologies: boolean;
  has_value_analysis: boolean;
  enrichment_level: string;
}

export interface ProjectDetailGenerationRun {
  id: string;
  created_at: string;
  status: string;
  discovery_source?: string;
  semantic_filter_applied?: boolean;
  semantic_filter_threshold?: number;
  companies_before_filtering?: number;
  companies_after_filtering?: number;
  average_similarity_score?: number;
  signal_scores_summary?: unknown;
}

// Main response type for completed projects
export interface ProjectDetailResponse {
  project: ProjectDetailProject;
  forms: ProjectDetailForms;
  course: ProjectDetailCourse;
  metadata: ProjectDetailMetadata;
  company: ProjectDetailCompany | null;
  contact_info: ProjectDetailContactInfo | null;
  data_quality: ProjectDetailDataQuality;
  generation_run?: ProjectDetailGenerationRun | null;
  generation_status?: undefined;
}

// Response type for pending/processing projects
export interface ProjectDetailPendingResponse {
  project: {
    id: string;
    title: string;
    status: string;
    company_name: string | null;
    created_at: string;
  };
  generation_status: 'pending' | 'processing';
  queue_position: string;
  attempts: number;
  forms: null;
  metadata: null;
  company: null;
  course: null;
}

// Union type for all possible responses
export type ProjectDetailData = ProjectDetailResponse | ProjectDetailPendingResponse;

// Type guard to check if response is for a pending project
export function isPendingProject(data: ProjectDetailData): data is ProjectDetailPendingResponse {
  return data.generation_status === 'pending' || data.generation_status === 'processing';
}

// Type guard to check if response is for a completed project
export function isCompletedProject(data: ProjectDetailData): data is ProjectDetailResponse {
  return !data.generation_status && data.forms !== null;
}
