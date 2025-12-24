// DiscoveryQualityTab - Faculty-focused signal breakdown
// Shows the 4-signal pipeline results with professional evidence-based display

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ProfessionalSignalDashboard } from "@/components/signals";
import { Info } from "lucide-react";

interface SignalDataRaw {
  breakdown?: string;
  components?: {
    contactQuality?: number;
    departmentFit?: number;
    jobSkillsMatch?: number;
    marketIntelligence?: number;
  };
  confidence?: string;
  errors?: string[];
  overall?: number;
  signalsDetected?: {
    hasActiveJobPostings?: boolean;
    hasDecisionMakers?: boolean;
    hasDepartmentGrowth?: boolean;
    hasFundingNews?: boolean;
    hasHiringNews?: boolean;
    hasTechnologyMatch?: boolean;
  };
}

interface DiscoveryQualityTabProps {
  company?: {
    skill_match_score?: number | null;
    market_signal_score?: number | null;
    department_fit_score?: number | null;
    contact_quality_score?: number | null;
    composite_signal_score?: number | null;
    signal_data?: unknown;
    job_postings?: unknown;
    matching_skills?: unknown;
    name?: string;
    discovery_source?: string | null;
    signal_confidence?: string | null;
  } | null;
  project?: {
    title?: string;
    company_name?: string;
  } | null;
  generationRun?: {
    semantic_filter_applied?: boolean;
    semantic_filter_threshold?: number;
    companies_before_filtering?: number;
    companies_after_filtering?: number;
    average_similarity_score?: number;
    signal_scores_summary?: unknown;
  } | null;
}

function parseSignalDataRaw(data: unknown): SignalDataRaw | null {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data as SignalDataRaw;
}

function parseMatchingSkills(data: unknown): string[] {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(s => typeof s === 'string');
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.filter((s: unknown) => typeof s === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function countJobPostings(data: unknown): number {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

export function DiscoveryQualityTab({ 
  company, 
  project,
}: DiscoveryQualityTabProps) {
  
  // Check if we have signal data
  const hasSignals = company && (
    company.skill_match_score !== null || 
    company.market_signal_score !== null ||
    company.department_fit_score !== null ||
    company.contact_quality_score !== null
  );

  if (!hasSignals) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No Signal Data Available</AlertTitle>
        <AlertDescription>
          This project was generated before the 4-signal discovery pipeline was implemented, 
          or the company data hasn't been enriched with signal scores yet.
        </AlertDescription>
      </Alert>
    );
  }

  const signalData = parseSignalDataRaw(company?.signal_data);
  const matchingSkills = parseMatchingSkills(company?.matching_skills);
  const jobPostingsCount = countJobPostings(company?.job_postings);
  const confidence = company?.signal_confidence || signalData?.confidence || 'medium';

  return (
    <ProfessionalSignalDashboard
      companyName={company?.name || project?.company_name || 'This company'}
      scores={{
        skillMatch: company?.skill_match_score ?? 0,
        marketIntel: company?.market_signal_score ?? 0,
        departmentFit: company?.department_fit_score ?? 0,
        contactQuality: company?.contact_quality_score ?? 0,
        composite: company?.composite_signal_score ?? 0,
      }}
      signalData={signalData}
      confidence={confidence}
      matchingSkills={matchingSkills}
      jobPostingsCount={jobPostingsCount}
    />
  );
}
