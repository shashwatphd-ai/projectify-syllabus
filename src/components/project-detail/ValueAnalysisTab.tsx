import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Building2, Sparkles, TrendingUp, Target, AlertTriangle, Lightbulb, Briefcase, Users, Rocket, Award, CheckCircle2, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnalyzeValueButton } from "./AnalyzeValueButton";
import { StakeholderValueCard } from "./StakeholderValueCard";
import { Progress } from "@/components/ui/progress";

interface ValueAnalysisTabProps {
  valueAnalysis: any;
  stakeholderInsights: any;
  synergyIndex: number;
  partnershipQuality: number;
  projectId: string;
  companyProfile: any;
  project: any;
  courseProfile: any;
  onAnalysisComplete: () => void;
}

const CircularScore = ({ score, label }: { score: number; label: string }) => {
  const getColor = (s: number) => {
    if (s >= 80) return "text-green-600 dark:text-green-400";
    if (s >= 65) return "text-blue-600 dark:text-blue-400";
    if (s >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-muted-foreground";
  };

  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg className="w-20 h-20 -rotate-90">
          <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted/20" />
          <circle 
            cx="40" 
            cy="40" 
            r="32" 
            stroke="currentColor" 
            strokeWidth="6" 
            fill="none" 
            className={getColor(score)}
            strokeDasharray={`${(score / 100) * 201} 201`}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute text-2xl font-bold ${getColor(score)}`}>{Math.round(score)}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2 font-medium">{label}</p>
    </div>
  );
};

export const ValueAnalysisTab = ({ 
  valueAnalysis, 
  stakeholderInsights, 
  synergyIndex,
  partnershipQuality,
  projectId,
  companyProfile,
  project,
  courseProfile,
  onAnalysisComplete
}: ValueAnalysisTabProps) => {
  
  const hasAnalysis = valueAnalysis && Object.keys(valueAnalysis).length > 0;

  if (!hasAnalysis) {
    return (
      <div className="space-y-4">
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="text-center py-8 space-y-4">
              <Sparkles className="h-12 w-12 mx-auto mb-3 text-amber-600 opacity-50" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">Value Analysis Unavailable</p>
                <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                  Generate AI-powered contextual insights for this project
                </p>
              </div>
              {companyProfile && (
                <div className="flex justify-center pt-2">
                  <AnalyzeValueButton
                    projectId={projectId}
                    companyProfile={companyProfile}
                    project={project}
                    courseProfile={courseProfile}
                    onAnalysisComplete={onAnalysisComplete}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student_value, university_value, industry_value, problem_validation } = valueAnalysis;

  return (
    <div className="space-y-5">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/30">
          <CardContent className="pt-6 pb-6 flex items-center justify-center">
            <CircularScore score={partnershipQuality} label="Partnership Quality" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/30 to-background border-accent/50">
          <CardContent className="pt-6 pb-6 flex items-center justify-center">
            <CircularScore score={synergyIndex} label="Synergy Index" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-secondary/10 to-background border-secondary/30">
          <CardContent className="pt-6 pb-6 flex items-center justify-center">
            <CircularScore 
              score={problem_validation?.alignment_score || ((partnershipQuality + synergyIndex) / 2)} 
              label="Overall Value" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Problem Validation Section */}
      {problem_validation && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Validated Company Challenges</CardTitle>
              <Badge variant="outline" className="ml-auto">
                {Math.round(problem_validation.alignment_score)}% Match
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Evidence Trail:</span> {problem_validation.evidence_trail}
              </p>
            </div>
            <div className="grid gap-2">
              {problem_validation.validated_challenges.map((challenge: string, i: number) => (
                <div key={i} className="flex items-start gap-2 bg-background/50 rounded-lg p-2.5 border border-border/50">
                  <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm leading-relaxed">{challenge}</p>
                </div>
              ))}
            </div>
            <Alert className="bg-primary/5 border-primary/20">
              <AlertDescription className="text-xs leading-relaxed">
                {stakeholderInsights?.overall_assessment}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Stakeholder Value Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <StakeholderValueCard
          title="For Students"
          icon={GraduationCap}
          color="text-blue-600 dark:text-blue-400"
          bgGradient="bg-gradient-to-br from-blue-500/5 to-background"
          borderColor="border-l-blue-500"
          score={student_value?.score || 0}
          metrics={[
            { label: "Career", value: student_value?.career_opportunities_score || 0, icon: Briefcase },
            { label: "Skills", value: student_value?.skill_development_score || 0, icon: Award },
            { label: "Portfolio", value: student_value?.portfolio_value_score || 0, icon: Rocket },
            { label: "Network", value: student_value?.networking_score || 0, icon: Users }
          ]}
          insight={student_value?.insights || ""}
          benefits={student_value?.key_benefits || []}
        />

        <StakeholderValueCard
          title="For University"
          icon={Building2}
          color="text-purple-600 dark:text-purple-400"
          bgGradient="bg-gradient-to-br from-purple-500/5 to-background"
          borderColor="border-l-purple-500"
          score={university_value?.score || 0}
          metrics={[
            { label: "Partnership", value: university_value?.partnership_quality_score || 0, icon: CheckCircle2 },
            { label: "Placement", value: university_value?.placement_potential_score || 0, icon: TrendingUp },
            { label: "Research", value: university_value?.research_collaboration_score || 0, icon: Sparkles },
            { label: "Reputation", value: university_value?.reputation_score || 0, icon: Award }
          ]}
          insight={university_value?.insights || ""}
          benefits={university_value?.key_benefits || []}
        />

        <StakeholderValueCard
          title="For Industry"
          icon={TrendingUp}
          color="text-green-600 dark:text-green-400"
          bgGradient="bg-gradient-to-br from-green-500/5 to-background"
          borderColor="border-l-green-500"
          score={industry_value?.score || 0}
          metrics={[
            { label: "ROI", value: industry_value?.deliverable_roi_score || 0, icon: TrendingUp },
            { label: "Talent", value: industry_value?.talent_pipeline_score || 0, icon: Users },
            { label: "Innovation", value: industry_value?.innovation_score || 0, icon: Sparkles },
            { label: "Efficiency", value: industry_value?.cost_efficiency_score || 0, icon: CheckCircle2 }
          ]}
          insight={industry_value?.insights || ""}
          benefits={industry_value?.key_benefits || []}
        />
      </div>

      {/* Action Intelligence */}
      {stakeholderInsights && (
        <div className="grid gap-4 md:grid-cols-2">
          {stakeholderInsights.recommendations && stakeholderInsights.recommendations.length > 0 && (
            <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-green-600" />
                  Key Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stakeholderInsights.recommendations.map((rec: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Badge variant="outline" className="mt-0.5 h-5 w-5 flex items-center justify-center p-0 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 flex-shrink-0">
                      {i + 1}
                    </Badge>
                    <p className="text-muted-foreground leading-relaxed">{rec}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {stakeholderInsights.risks && stakeholderInsights.risks.length > 0 && (
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Watch Out For
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stakeholderInsights.risks.map((risk: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground leading-relaxed">{risk}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};