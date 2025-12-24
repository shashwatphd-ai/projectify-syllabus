// Signal Types - Interface Segregation Principle
// Each signal type is clearly defined for type safety

export interface SignalScore {
  value: number;
  maxValue?: number;
  confidence?: 'high' | 'medium' | 'low';
}

export interface SignalBreakdownItem {
  label: string;
  value: number;
  description?: string;
  evidence?: string[];
}

export interface CompanySignals {
  skillMatch: SignalScore;
  marketIntel: SignalScore;
  departmentFit: SignalScore;
  contactQuality: SignalScore;
  composite: SignalScore;
}

export interface SignalData {
  skill_match?: {
    score: number;
    matched_skills?: string[];
    job_count?: number;
    method?: string;
  };
  market_intel?: {
    score: number;
    news_recency_days?: number;
    funding_recency_days?: number;
    has_recent_activity?: boolean;
  };
  department_fit?: {
    score: number;
    matched_departments?: string[];
    tech_team_size?: number;
  };
  contact_quality?: {
    score: number;
    has_verified_email?: boolean;
    title_relevance?: number;
    seniority_match?: boolean;
  };
}

export interface JobPosting {
  id: string;
  title: string;
  url?: string;
  description?: string;
}

// Mapper function - Single Responsibility Principle
export function mapCompanyToSignals(company: {
  skill_match_score?: number | null;
  market_signal_score?: number | null;
  department_fit_score?: number | null;
  contact_quality_score?: number | null;
  composite_signal_score?: number | null;
  signal_data?: SignalData | null;
}): CompanySignals {
  return {
    skillMatch: { 
      value: company.skill_match_score ?? 0,
      confidence: getConfidence(company.skill_match_score)
    },
    marketIntel: { 
      value: company.market_signal_score ?? 0,
      confidence: getConfidence(company.market_signal_score)
    },
    departmentFit: { 
      value: company.department_fit_score ?? 0,
      confidence: getConfidence(company.department_fit_score)
    },
    contactQuality: { 
      value: company.contact_quality_score ?? 0,
      confidence: getConfidence(company.contact_quality_score)
    },
    composite: { 
      value: company.composite_signal_score ?? 0,
      confidence: getConfidence(company.composite_signal_score)
    },
  };
}

function getConfidence(score: number | null | undefined): 'high' | 'medium' | 'low' {
  if (!score || score < 30) return 'low';
  if (score < 60) return 'medium';
  return 'high';
}

export function parseSignalData(data: unknown): SignalData | null {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data as SignalData;
}

export function parseJobPostings(data: unknown): JobPosting[] {
  if (!data) return [];
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  if (!Array.isArray(parsed)) return [];
  return parsed.map((j: Record<string, unknown>) => ({
    id: String(j.id || ''),
    title: String(j.title || 'Unknown Role'),
    url: j.url ? String(j.url) : undefined,
    description: j.description ? String(j.description) : undefined
  }));
}
