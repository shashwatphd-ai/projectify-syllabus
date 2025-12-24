// ProfessionalSignalDashboard - Evidence-based signal analysis
// Business/Academia professional format with complete data transparency

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Briefcase, 
  TrendingUp, 
  Building2, 
  UserCheck,
  Target,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Info,
  Database,
  ExternalLink
} from "lucide-react";
import { EvidenceBasedSignalCard } from "./EvidenceBasedSignalCard";
import { cn } from "@/lib/utils";

interface SignalDetectionMap {
  hasActiveJobPostings?: boolean;
  hasDecisionMakers?: boolean;
  hasDepartmentGrowth?: boolean;
  hasFundingNews?: boolean;
  hasHiringNews?: boolean;
  hasTechnologyMatch?: boolean;
}

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
  signalsDetected?: SignalDetectionMap;
}

interface ProfessionalSignalDashboardProps {
  companyName: string;
  scores: {
    skillMatch: number;
    marketIntel: number;
    departmentFit: number;
    contactQuality: number;
    composite: number;
  };
  signalData?: SignalDataRaw | null;
  confidence: string;
  matchingSkills?: string[];
  jobPostingsCount?: number;
  enrichmentLevel?: string;
}

const ENRICHMENT_LABELS: Record<string, { label: string; description: string; color: string }> = {
  fully_enriched: { 
    label: 'Complete', 
    description: 'Full API enrichment with job postings, market data, and verified contacts',
    color: 'text-green-600'
  },
  apollo_verified: { 
    label: 'Verified', 
    description: 'Apollo-verified with organization data. Job postings may be limited.',
    color: 'text-blue-600'
  },
  basic: { 
    label: 'Basic', 
    description: 'Organization found but detailed signals unavailable. Scores reflect limited data.',
    color: 'text-amber-600'
  },
};

// Data source transparency labels
const DATA_SOURCE_INFO = {
  jobPostings: { source: 'Apollo Job Postings API', note: 'Live job listings from LinkedIn/company sites' },
  skillMatch: { source: 'O*NET + Syllabus Analysis', note: 'AI-matched skills from syllabus vs. job requirements' },
  marketIntel: { source: 'Apollo News API', note: 'Funding rounds, press releases, growth signals' },
  contact: { source: 'Apollo People API', note: 'Decision-maker lookup (emails may require credits)' },
  department: { source: 'Apollo Organization API', note: 'Headcount by department when available' },
};

export function ProfessionalSignalDashboard({
  companyName,
  scores,
  signalData,
  confidence,
  matchingSkills = [],
  jobPostingsCount = 0,
  enrichmentLevel = 'basic'
}: ProfessionalSignalDashboardProps) {
  const signals = signalData?.signalsDetected || {};
  const errors = signalData?.errors || [];
  
  // Use component scores from signal_data if available, fallback to direct scores
  const componentScores = signalData?.components || {
    jobSkillsMatch: scores.skillMatch,
    marketIntelligence: scores.marketIntel,
    departmentFit: scores.departmentFit,
    contactQuality: scores.contactQuality
  };

  // Build evidence arrays for each signal with data source transparency
  const skillMatchEvidence = [
    { 
      label: "Job postings analyzed", 
      present: signals.hasActiveJobPostings || jobPostingsCount > 0,
      detail: jobPostingsCount > 0 ? `${jobPostingsCount} positions from Apollo` : 'No postings available',
      source: DATA_SOURCE_INFO.jobPostings.source
    },
    { 
      label: "Skills matched to syllabus", 
      present: matchingSkills.length > 0,
      detail: matchingSkills.length > 0 ? `${matchingSkills.length} skill overlaps` : 'No direct matches found',
      source: DATA_SOURCE_INFO.skillMatch.source
    },
    { 
      label: "Technology alignment", 
      present: signals.hasTechnologyMatch || false,
      source: 'Apollo Technology Stack'
    }
  ];

  const marketIntelEvidence = [
    { label: "Funding activity", present: signals.hasFundingNews || false, source: DATA_SOURCE_INFO.marketIntel.source },
    { label: "Hiring velocity", present: signals.hasHiringNews || jobPostingsCount >= 3, source: DATA_SOURCE_INFO.marketIntel.source },
    { label: "Department growth", present: signals.hasDepartmentGrowth || false, source: DATA_SOURCE_INFO.department.source }
  ];

  const departmentFitEvidence = [
    { label: "Technical team size", present: componentScores.departmentFit > 20, source: DATA_SOURCE_INFO.department.source },
    { label: "Growth trajectory", present: signals.hasDepartmentGrowth || false, source: DATA_SOURCE_INFO.department.source },
    { label: "Tech stack relevance", present: signals.hasTechnologyMatch || false, source: 'Apollo Technology Stack' }
  ];

  const contactQualityEvidence = [
    { label: "Decision-maker found", present: signals.hasDecisionMakers || false, source: DATA_SOURCE_INFO.contact.source },
    { label: "Email status verified", present: componentScores.contactQuality > 50, source: DATA_SOURCE_INFO.contact.source },
    { label: "Title relevance", present: componentScores.contactQuality > 30, source: DATA_SOURCE_INFO.contact.source }
  ];

  // Calculate validation percentage from actual signals
  const totalEvidencePoints = skillMatchEvidence.length + marketIntelEvidence.length + 
    departmentFitEvidence.length + contactQualityEvidence.length;
  const presentEvidence = [
    ...skillMatchEvidence, ...marketIntelEvidence, 
    ...departmentFitEvidence, ...contactQualityEvidence
  ].filter(e => e.present).length;
  const validationPercentage = Math.round((presentEvidence / totalEvidencePoints) * 100);

  const enrichmentInfo = ENRICHMENT_LABELS[enrichmentLevel] || ENRICHMENT_LABELS.basic;
  const isBasicEnrichment = enrichmentLevel === 'basic';

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'high': return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'medium': return 'text-amber-600 bg-amber-50 dark:bg-amber-950';
      default: return 'text-red-600 bg-red-50 dark:bg-red-950';
    }
  };

  const getEnrichmentColor = (level: string) => {
    switch (level) {
      case 'fully_enriched': return 'text-green-600';
      case 'apollo_verified': return 'text-blue-600';
      default: return 'text-amber-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-5 w-5 text-primary" />
                Partnership Suitability Analysis
              </CardTitle>
              <CardDescription className="mt-1">
                Quantitative assessment of {companyName} as a capstone partner
              </CardDescription>
            </div>
            <Badge className={cn("uppercase text-xs font-medium", getConfidenceColor(confidence))}>
              {confidence} Confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Composite Score - Large */}
            <div className="col-span-2 md:col-span-1 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Composite Score
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-primary tabular-nums">
                  {scores.composite}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Weighted average of all signals
              </p>
            </div>

            {/* Validation Stats */}
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Data Validation
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">{validationPercentage}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {presentEvidence} of {totalEvidencePoints} signals verified
              </p>
            </div>

            {/* Evidence Quality */}
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Evidence Quality
              </p>
              <div className="flex items-center gap-2 mt-1">
                {presentEvidence >= 8 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : presentEvidence >= 4 ? (
                  <Info className="h-5 w-5 text-amber-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {presentEvidence >= 8 ? 'Strong' : presentEvidence >= 4 ? 'Moderate' : 'Limited'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on available data points
              </p>
            </div>

            {/* Enrichment Level */}
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Data Enrichment
              </p>
              <p className={cn("text-sm font-medium", getEnrichmentColor(enrichmentLevel))}>
                {enrichmentInfo.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {enrichmentInfo.description}
              </p>
            </div>
          </div>

          {/* Basic Enrichment Warning */}
          {isBasicEnrichment && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 mb-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Limited Data Available
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    This company has basic enrichment only. Job postings, market signals, and detailed 
                    intelligence were not retrieved during discovery. Scores reflect available data 
                    and may underrepresent actual fit. Consider manual research for better assessment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Errors/Limitations Banner */}
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Data Limitations
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-0.5">
                    {errors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signal Breakdown Grid */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Signal-by-Signal Analysis
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <EvidenceBasedSignalCard
            title="Skill Match"
            score={scores.skillMatch}
            icon={Briefcase}
            colorClass="text-blue-500"
            methodology="Analyzes job postings for overlap with syllabus skills using semantic matching and keyword extraction."
            evidence={skillMatchEvidence}
            limitations={!signals.hasActiveJobPostings ? ["No recent job postings found for skill analysis"] : []}
          />

          <EvidenceBasedSignalCard
            title="Market Intelligence"
            score={scores.marketIntel}
            icon={TrendingUp}
            colorClass="text-green-500"
            methodology="Evaluates company growth signals including funding rounds, hiring velocity, and news mentions from the past 90 days."
            evidence={marketIntelEvidence}
            limitations={scores.marketIntel < 20 ? ["Limited recent market activity detected"] : []}
          />

          <EvidenceBasedSignalCard
            title="Department Fit"
            score={scores.departmentFit}
            icon={Building2}
            colorClass="text-purple-500"
            methodology="Assesses organizational structure and technical team presence based on departmental headcount and technology usage."
            evidence={departmentFitEvidence}
          />

          <EvidenceBasedSignalCard
            title="Contact Quality"
            score={scores.contactQuality}
            icon={UserCheck}
            colorClass="text-orange-500"
            methodology="Validates contact accessibility: email verification, title relevance to project scope, and decision-making authority."
            evidence={contactQualityEvidence}
          />
        </div>
      </div>

      {/* Methodology Note */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">How Scores Are Calculated</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Each signal is weighted equally (25%) in the composite score. Scores are derived from 
                verified data sources including job board APIs, company databases, and enrichment services. 
                Low scores typically indicate data gaps rather than poor fit — consider manual verification 
                for promising candidates with limited data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
