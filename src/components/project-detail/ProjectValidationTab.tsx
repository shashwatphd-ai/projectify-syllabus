import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ProjectValidationTabProps {
  metadata?: any;
  project: any;
  course: any;
}

export const ProjectValidationTab = ({ metadata, project, course }: ProjectValidationTabProps) => {
  const verification = metadata?.verification || {};
  const algorithm = metadata?.algorithm_metadata || {};

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return <AlertCircle className="h-5 w-5 text-gray-400" />;
    return status ? 
      <CheckCircle2 className="h-5 w-5 text-green-500" /> : 
      <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = (status: boolean | undefined) => {
    if (status === undefined) return <Badge variant="outline">Unknown</Badge>;
    return status ? 
      <Badge variant="default">Pass</Badge> : 
      <Badge variant="destructive">Review</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Overall Match Score */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Overall Match Score</CardTitle>
          <CardDescription>Composite quality assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - project.final_score)}`}
                  className="text-primary transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold">{Math.round(project.final_score * 100)}%</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Final Project Score</p>
          </div>

          {/* Score Breakdown */}
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4 bg-secondary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">LO Coverage</p>
              <p className="text-2xl font-bold text-primary">{Math.round(project.lo_score * 100)}%</p>
            </div>
            <div className="text-center p-4 bg-secondary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Feasibility</p>
              <p className="text-2xl font-bold text-primary">{Math.round(project.feasibility_score * 100)}%</p>
            </div>
            <div className="text-center p-4 bg-secondary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Value Score</p>
              <p className="text-2xl font-bold text-primary">{Math.round(project.value_score * 100)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Verification Checks</CardTitle>
          <CardDescription>Automated validation of project quality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
              <div className="flex items-center gap-3">
                {getStatusIcon(verification.lo_alignment_sufficient)}
                <div>
                  <p className="font-medium">Learning Outcome Alignment</p>
                  <p className="text-sm text-muted-foreground">
                    {verification.lo_alignment_sufficient 
                      ? 'Project activities adequately cover course learning outcomes'
                      : 'Some learning outcomes may not be sufficiently addressed'}
                  </p>
                </div>
              </div>
              {getStatusBadge(verification.lo_alignment_sufficient)}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
              <div className="flex items-center gap-3">
                {getStatusIcon(verification.feasibility_appropriate)}
                <div>
                  <p className="font-medium">Feasibility Assessment</p>
                  <p className="text-sm text-muted-foreground">
                    {verification.feasibility_appropriate
                      ? 'Project scope and complexity are appropriate for student level'
                      : 'Project complexity may need adjustment'}
                  </p>
                </div>
              </div>
              {getStatusBadge(verification.feasibility_appropriate)}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
              <div className="flex items-center gap-3">
                {getStatusIcon(verification.mutual_benefit_exists)}
                <div>
                  <p className="font-medium">Mutual Benefit</p>
                  <p className="text-sm text-muted-foreground">
                    {verification.mutual_benefit_exists
                      ? 'Project creates value for students, university, and industry partner'
                      : 'Balance of stakeholder benefits needs review'}
                  </p>
                </div>
              </div>
              {getStatusBadge(verification.mutual_benefit_exists)}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
              <div className="flex items-center gap-3">
                {getStatusIcon(verification.timeline_realistic)}
                <div>
                  <p className="font-medium">Timeline Realism</p>
                  <p className="text-sm text-muted-foreground">
                    {verification.timeline_realistic
                      ? 'Project timeline is achievable within course duration'
                      : 'Timeline may need adjustment for successful completion'}
                  </p>
                </div>
              </div>
              {getStatusBadge(verification.timeline_realistic)}
            </div>
          </div>

          {verification.overall_recommendation && (
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
              <p className="font-medium mb-2">Overall Recommendation</p>
              <p className="text-sm text-muted-foreground">{verification.overall_recommendation}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Algorithm Details (Collapsible) */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="hover:bg-secondary/10 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Algorithm Details</CardTitle>
                  <CardDescription>Technical transparency and generation metadata</CardDescription>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Generation Process */}
              {algorithm.discovery_process && (
                <div>
                  <h3 className="font-semibold mb-2">Company Discovery Process</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-secondary/10 rounded">
                      <span className="text-muted-foreground">Method:</span>
                      <Badge variant="outline">{algorithm.discovery_process.method || 'N/A'}</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-secondary/10 rounded">
                      <span className="text-muted-foreground">Data Sources:</span>
                      <span className="font-medium">{algorithm.discovery_process.sources?.join(', ') || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Model Used */}
              {algorithm.ai_model && (
                <div>
                  <h3 className="font-semibold mb-2">AI Model Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-secondary/10 rounded">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-medium">{algorithm.ai_model}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-secondary/10 rounded">
                      <span className="text-muted-foreground">Version:</span>
                      <span className="font-medium">{algorithm.model_version || 'Latest'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Selection Criteria */}
              {algorithm.selection_criteria && (
                <div>
                  <h3 className="font-semibold mb-2">Selection Criteria</h3>
                  <ul className="space-y-1 text-sm">
                    {(typeof algorithm.selection_criteria === 'string' 
                      ? [algorithm.selection_criteria] 
                      : algorithm.selection_criteria
                    ).map((criterion: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 p-2 bg-secondary/10 rounded">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Generation Timestamp */}
              {project.created_at && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Generated: {new Date(project.created_at).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};