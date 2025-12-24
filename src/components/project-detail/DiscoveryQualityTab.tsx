// DiscoveryQualityTab - Faculty-focused signal breakdown
// Shows the 4-signal pipeline results for company matching quality

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  SignalBreakdownGrid, 
  MatchInsightsCard,
  mapCompanyToSignals,
  parseSignalData
} from "@/components/signals";
import { 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  Database
} from "lucide-react";

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

export function DiscoveryQualityTab({ 
  company, 
  project,
  generationRun 
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

  const signals = mapCompanyToSignals(company!);
  const signalData = parseSignalData(company?.signal_data);
  const confidence = company?.signal_confidence || 'medium';

  return (
    <div className="space-y-6">
      {/* Confidence Indicator */}
      <div className="flex items-center gap-4">
        <Badge 
          variant={confidence === 'high' ? 'default' : confidence === 'medium' ? 'secondary' : 'outline'}
          className="flex items-center gap-1"
        >
          {confidence === 'high' ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence Match
        </Badge>
        
        {company?.discovery_source && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Source: {company.discovery_source}
          </Badge>
        )}
      </div>

      {/* Main Signal Breakdown */}
      <SignalBreakdownGrid 
        signals={signals}
        title="Company Discovery Signals"
        description={`How ${company?.name || 'this company'} scored across our 4-signal matching pipeline`}
      />

      {/* Match Insights (Student-friendly view) */}
      <MatchInsightsCard
        companyName={company?.name || project?.company_name || 'This company'}
        signalData={company?.signal_data}
        jobPostings={company?.job_postings}
        matchingSkills={company?.matching_skills}
        skillMatchScore={company?.skill_match_score}
      />

      {/* Signal Details */}
      {signalData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              Signal Details
            </CardTitle>
            <CardDescription>
              Breakdown of what contributed to each signal score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Skill Match Details */}
              {signalData.skill_match && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Skill Match Analysis</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Method: {signalData.skill_match.method || 'Semantic embedding'}</p>
                    <p>Job postings analyzed: {signalData.skill_match.job_count || 0}</p>
                    {signalData.skill_match.matched_skills && (
                      <p>Skills matched: {signalData.skill_match.matched_skills.length}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Market Intel Details */}
              {signalData.market_intel && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Market Intelligence</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {signalData.market_intel.news_recency_days !== undefined && (
                      <p>Last news: {signalData.market_intel.news_recency_days} days ago</p>
                    )}
                    {signalData.market_intel.funding_recency_days !== undefined && (
                      <p>Last funding: {signalData.market_intel.funding_recency_days} days ago</p>
                    )}
                    <p>Recent activity: {signalData.market_intel.has_recent_activity ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              )}

              {/* Department Fit Details */}
              {signalData.department_fit && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Department Fit</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {signalData.department_fit.tech_team_size !== undefined && (
                      <p>Tech team size: {signalData.department_fit.tech_team_size}</p>
                    )}
                    {signalData.department_fit.matched_departments && (
                      <p>Matched depts: {signalData.department_fit.matched_departments.join(', ')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Quality Details */}
              {signalData.contact_quality && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Contact Quality</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Verified email: {signalData.contact_quality.has_verified_email ? 'Yes' : 'No'}</p>
                    {signalData.contact_quality.title_relevance !== undefined && (
                      <p>Title relevance: {signalData.contact_quality.title_relevance}%</p>
                    )}
                    <p>Seniority match: {signalData.contact_quality.seniority_match ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Run Stats */}
      {generationRun && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Discovery Pipeline Stats</CardTitle>
            <CardDescription>
              How this company was selected from the discovery pool
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {generationRun.companies_before_filtering && (
                <div>
                  <p className="text-2xl font-bold">{generationRun.companies_before_filtering}</p>
                  <p className="text-xs text-muted-foreground">Companies Found</p>
                </div>
              )}
              {generationRun.companies_after_filtering && (
                <div>
                  <p className="text-2xl font-bold">{generationRun.companies_after_filtering}</p>
                  <p className="text-xs text-muted-foreground">After Filtering</p>
                </div>
              )}
              {generationRun.semantic_filter_threshold && (
                <div>
                  <p className="text-2xl font-bold">{generationRun.semantic_filter_threshold}</p>
                  <p className="text-xs text-muted-foreground">Filter Threshold</p>
                </div>
              )}
              {generationRun.average_similarity_score && (
                <div>
                  <p className="text-2xl font-bold">{generationRun.average_similarity_score.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Avg Similarity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
