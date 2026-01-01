import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Search, Target, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectDetailProject } from "@/types/project-detail";
import type { Json } from "@/integrations/supabase/types";

interface AlgorithmTabProps {
  project: ProjectDetailProject;
}

// Type helpers for safely accessing JSON fields
interface SelectionCriteria {
  location?: string;
  industries?: string[];
}

interface CompanyConsidered {
  name?: string;
  sector?: string;
  reason?: string;
}

interface LOAlignmentDetail {
  task_mappings?: unknown[];
  deliverable_mappings?: unknown[];
  overall_coverage?: Record<string, unknown>;
  gaps?: string[];
}

interface ScoringRationale {
  lo_score?: { method?: string };
  feasibility_score?: { method?: string };
  mutual_benefit_score?: { method?: string };
}

// Safe JSON accessor
function asObject(json: Json | null | undefined): Record<string, unknown> | null {
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    return json as Record<string, unknown>;
  }
  return null;
}

function asArray(json: Json | null | undefined): unknown[] {
  if (Array.isArray(json)) return json;
  return [];
}

export const AlgorithmTab = ({ project }: AlgorithmTabProps) => {
  const [metadata, setMetadata] = useState<{
    selection_criteria: Json | null;
    companies_considered: Json | null;
    lo_alignment_detail: Json | null;
    scoring_rationale: Json | null;
    ai_model_version: string | null;
    algorithm_version: string | null;
    generation_timestamp: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetadata();
  }, [project.id]);

  const loadMetadata = async () => {
    const { data, error } = await supabase
      .from('project_metadata')
      .select('selection_criteria, companies_considered, lo_alignment_detail, scoring_rationale, ai_model_version, algorithm_version, generation_timestamp')
      .eq('project_id', project.id)
      .single();

    if (!error && data) {
      setMetadata(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="p-4">Loading algorithm details...</div>;
  }

  // Safely extract typed data from JSON fields
  const selectionCriteria = asObject(metadata?.selection_criteria) as SelectionCriteria | null;
  const companiesConsidered = asArray(metadata?.companies_considered) as CompanyConsidered[];
  const loAlignmentDetail = asObject(metadata?.lo_alignment_detail) as LOAlignmentDetail | null;
  const scoringRationale = asObject(metadata?.scoring_rationale) as ScoringRationale | null;

  return (
    <div className="space-y-6">
      {/* Step 1: Company Discovery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Step 1: Company Discovery & Selection
          </CardTitle>
          <CardDescription>How this company was identified and selected</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Search Parameters</h3>
            {selectionCriteria ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    {selectionCriteria.location ? (
                      <p className="font-medium">{selectionCriteria.location}</p>
                    ) : (
                      <p className="text-sm text-amber-600">Location not specified in syllabus - using general search</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Industries Targeted</p>
                    <div className="flex gap-1 flex-wrap">
                      {(selectionCriteria.industries ?? []).map((ind: string, i: number) => (
                        <Badge key={i} variant="secondary">{ind}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                {!selectionCriteria.location && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
                    <p className="font-semibold mb-1">ℹ️ Location Requirement</p>
                    <p>To match projects with companies near you, include city and zip code in your syllabus (e.g., "Kansas City, MO 64131"). This enables finding real companies with verified contact information within 100 miles of your location.</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Selection criteria not available</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">Companies Considered</h3>
            {companiesConsidered.length > 0 ? (
              <div className="space-y-2">
                {companiesConsidered.map((comp, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{comp.name ?? 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{comp.sector ?? ''}</p>
                      <p className="text-xs text-muted-foreground mt-1">{comp.reason ?? ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Company selection details not available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Project Proposal Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Step 2: Project Proposal Generation
          </CardTitle>
          <CardDescription>How the project scope and activities were designed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">AI Model Used</p>
              <p className="font-medium">{metadata?.ai_model_version ?? 'google/gemini-2.5-flash'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Algorithm Version</p>
              <p className="font-medium">{metadata?.algorithm_version ?? 'v1.0'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Generation Process</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Analyzed company sector, size, and business needs</li>
              <li>Mapped course learning outcomes to potential project activities</li>
              <li>Generated {project.tasks?.length ?? 0} specific tasks and {project.deliverables?.length ?? 0} deliverables</li>
              <li>Validated alignment with course requirements</li>
              <li>Estimated resource requirements and timeline</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: LO Alignment Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Step 3: Learning Outcome Alignment Verification
          </CardTitle>
          <CardDescription>Systematic verification of course outcome coverage</CardDescription>
        </CardHeader>
        <CardContent>
          {loAlignmentDetail ? (
            <div className="space-y-3">
              <p className="text-sm">
                Each project activity was mapped to specific learning outcomes using AI-powered analysis.
                The system verified that all outcomes are adequately covered.
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tasks Mapped</p>
                  <p className="text-2xl font-bold">{loAlignmentDetail.task_mappings?.length ?? 0}</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Deliverables Mapped</p>
                  <p className="text-2xl font-bold">{loAlignmentDetail.deliverable_mappings?.length ?? 0}</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Outcomes Covered</p>
                  <p className="text-2xl font-bold">
                    {Object.keys(loAlignmentDetail.overall_coverage ?? {}).length}
                  </p>
                </div>
              </div>

              {loAlignmentDetail.gaps && loAlignmentDetail.gaps.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="font-semibold mb-1">Coverage Gaps Identified</p>
                  <p className="text-sm">{loAlignmentDetail.gaps.join('; ')}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">LO alignment verification details not available for this project.</p>
          )}
        </CardContent>
      </Card>

      {/* Step 4: Scoring & Validation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Step 4: Project Scoring & Validation
          </CardTitle>
          <CardDescription>Multi-dimensional quality assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scoringRationale ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">LO Coverage</p>
                    <p className="text-2xl font-bold text-blue-600">{project.lo_score.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {scoringRationale.lo_score?.method ?? 'Based on task-outcome mapping'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Feasibility</p>
                    <p className="text-2xl font-bold text-green-600">{(project.feasibility_score ?? 0).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {scoringRationale.feasibility_score?.method ?? 'Based on duration and complexity'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mutual Benefit</p>
                    <p className="text-2xl font-bold text-purple-600">{(project.mutual_benefit_score ?? 0).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {scoringRationale.mutual_benefit_score?.method ?? 'Based on company needs alignment'}
                    </p>
                  </div>
                </div>
                
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Final Composite Score</span>
                    <span className="text-3xl font-bold text-primary">{(project.final_score ?? 0).toFixed(1)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">LO Coverage</p>
                  <p className="text-2xl font-bold">{project.lo_score.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Feasibility</p>
                  <p className="text-2xl font-bold">{(project.feasibility_score ?? 0).toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mutual Benefit</p>
                  <p className="text-2xl font-bold">{(project.mutual_benefit_score ?? 0).toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Final Score</p>
                  <p className="text-2xl font-bold text-primary">{(project.final_score ?? 0).toFixed(1)}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generation Timestamp */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground text-center">
            Generated: {metadata?.generation_timestamp 
              ? new Date(metadata.generation_timestamp).toLocaleString()
              : new Date(project.created_at).toLocaleString()
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};