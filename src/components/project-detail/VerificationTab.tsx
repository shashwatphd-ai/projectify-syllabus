import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertCircle, TrendingUp, Target, Users, Calendar } from "lucide-react";

interface VerificationTabProps {
  metadata: any;
  project: any;
  course: any;
}

export function VerificationTab({ metadata, project, course }: VerificationTabProps) {
  // Calculate verification scores from the actual data structure
  const outcomeMappings = metadata?.lo_alignment_detail?.outcome_mappings || [];
  const avgLoScore = outcomeMappings.length > 0 
    ? outcomeMappings.reduce((sum: number, item: any) => sum + (item.coverage_percentage || 0), 0) / outcomeMappings.length 
    : project.lo_score * 100 || 0;
  
  const feasibilityScore = (project.feasibility_score || 0) * 100;
  const mutualBenefitScore = (project.mutual_benefit_score || 0) * 100;
  
  const overallScore = (avgLoScore + feasibilityScore + mutualBenefitScore) / 3;
  
  // Verification checks
  const checks = [
    {
      name: "Learning Outcomes Alignment",
      score: avgLoScore,
      status: avgLoScore >= 70 ? "pass" : avgLoScore >= 50 ? "warning" : "fail",
      details: `${outcomeMappings.length} outcomes mapped with ${avgLoScore.toFixed(0)}% average alignment`
    },
    {
      name: "Project Feasibility",
      score: feasibilityScore,
      status: feasibilityScore >= 70 ? "pass" : feasibilityScore >= 50 ? "warning" : "fail",
      details: `Assessed based on ${project.duration_weeks} weeks timeline and ${project.team_size} team members`
    },
    {
      name: "Mutual Benefit Score",
      score: mutualBenefitScore,
      status: mutualBenefitScore >= 70 ? "pass" : mutualBenefitScore >= 50 ? "warning" : "fail",
      details: "Company needs align with deliverables and student learning"
    },
    {
      name: "Timeline Match",
      score: project.duration_weeks === course.weeks ? 100 : Math.max(0, 100 - Math.abs(project.duration_weeks - course.weeks) * 10),
      status: project.duration_weeks === course.weeks ? "pass" : Math.abs(project.duration_weeks - course.weeks) <= 2 ? "warning" : "fail",
      details: `Project: ${project.duration_weeks} weeks vs Course: ${course.weeks} weeks`
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "warning": return <AlertCircle className="h-5 w-5 text-warning" />;
      case "fail": return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pass": return <Badge className="bg-success/10 text-success border-success/20">Verified</Badge>;
      case "warning": return <Badge className="bg-warning/10 text-warning border-warning/20">Review</Badge>;
      case "fail": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Issue</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Overall Match Score
            </span>
            <Badge variant="outline" className="text-lg px-4 py-1">
              {overallScore.toFixed(0)}%
            </Badge>
          </CardTitle>
          <CardDescription>
            Composite score based on alignment, feasibility, and mutual benefit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={overallScore} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {overallScore >= 70 
              ? "✓ Strong match - This project meets verification criteria" 
              : overallScore >= 50 
              ? "⚠ Moderate match - Consider adjustments" 
              : "✗ Weak match - Significant improvements needed"}
          </p>
        </CardContent>
      </Card>

      {/* Verification Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Verification Checks
          </CardTitle>
          <CardDescription>
            Automated validation of project-course compatibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {checks.map((check, idx) => (
            <div key={idx} className="space-y-2 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <p className="font-semibold">{check.name}</p>
                    <p className="text-sm text-muted-foreground">{check.details}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(check.status)}
                  <span className="text-sm font-mono">{check.score.toFixed(0)}%</span>
                </div>
              </div>
              <Progress value={check.score} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Learning Outcome Mapping Details */}
      {outcomeMappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Detailed Learning Outcome Alignment
            </CardTitle>
            <CardDescription>
              How project deliverables map to course learning outcomes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {outcomeMappings.map((item: any, idx: number) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.outcome_id}: {item.outcome_text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.explanation}</p>
                  </div>
                  <Badge variant={item.coverage_percentage >= 70 ? "default" : "outline"}>
                    {item.coverage_percentage}%
                  </Badge>
                </div>
                <Progress value={item.coverage_percentage} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Metadata Information */}
      {metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Generation Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Algorithm Version</p>
                <p className="font-semibold">{metadata.algorithm_version || 'v1.0'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">AI Model</p>
                <p className="font-semibold">{metadata.ai_model_version || 'Gemini 2.5 Flash'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Generated At</p>
                <p className="font-semibold">
                  {metadata.generation_timestamp 
                    ? new Date(metadata.generation_timestamp).toLocaleString() 
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Companies Considered</p>
                <p className="font-semibold">{metadata.companies_considered?.length || 0}</p>
              </div>
            </div>
            
            {metadata.selection_criteria && (
              <div className="pt-3 border-t">
                <p className="text-muted-foreground mb-2">Selection Criteria</p>
                <div className="space-y-1">
                  {Object.entries(metadata.selection_criteria).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-xs">{JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
