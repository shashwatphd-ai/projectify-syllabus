import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Building2, Sparkles, TrendingUp, Target, CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnalyzeValueButton } from "./AnalyzeValueButton";

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
                  This project was generated before AI-powered value analysis was implemented.
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
        
        <Card>
          <CardHeader>
            <CardTitle>What You'll Get</CardTitle>
            <CardDescription>AI-powered stakeholder value intelligence</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Student Value Analysis</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Career opportunities, skill development, portfolio value, networking potential
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">University Value Analysis</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Partnership quality, placement potential, research collaboration, reputation impact
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Industry Value Analysis</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Deliverable ROI, talent pipeline access, innovation infusion, cost efficiency
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">Synergistic Value</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Knowledge transfer multipliers, long-term partnership potential, ecosystem impact
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student_value, university_value, industry_value } = valueAnalysis;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500/10 border-green-500/30";
    if (score >= 60) return "bg-blue-500/10 border-blue-500/30";
    if (score >= 40) return "bg-amber-500/10 border-amber-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  const overallScore = (student_value?.score + university_value?.score + industry_value?.score) / 3;

  return (
    <div className="space-y-6">
      {/* Hero Section - Partnership Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Partnership Quality Score */}
        <Card className={`${getScoreBg(partnershipQuality)}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Partnership Quality</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${getScoreColor(partnershipQuality)}`}>
                    {Math.round(partnershipQuality)}
                  </span>
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
              </div>
              <Target className={`h-10 w-10 ${getScoreColor(partnershipQuality)} opacity-50`} />
            </div>
          </CardContent>
        </Card>

        {/* Synergy Index */}
        <Card className={`${getScoreBg(synergyIndex)}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Synergy Index</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${getScoreColor(synergyIndex)}`}>
                    {Math.round(synergyIndex)}
                  </span>
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
              </div>
              <Sparkles className={`h-10 w-10 ${getScoreColor(synergyIndex)} opacity-50`} />
            </div>
          </CardContent>
        </Card>

        {/* Overall Value */}
        <Card className={`${getScoreBg(overallScore)}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Overall Value</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                    {Math.round(overallScore)}
                  </span>
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
              </div>
              <TrendingUp className={`h-10 w-10 ${getScoreColor(overallScore)} opacity-50`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Value Narrative */}
      {stakeholderInsights?.overall_assessment && (
        <Alert className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
          <Sparkles className="h-5 w-5" />
          <AlertDescription className="text-base leading-relaxed">
            {stakeholderInsights.overall_assessment}
          </AlertDescription>
        </Alert>
      )}

      {/* Stakeholder Value - Compact Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Student Value */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Students</CardTitle>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                {Math.round(student_value?.score || 0)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Career</span>
                <span className="font-medium">{Math.round(student_value?.career_opportunities_score || 0)}</span>
              </div>
              <Progress value={student_value?.career_opportunities_score || 0} className="h-1.5" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Skills</span>
                <span className="font-medium">{Math.round(student_value?.skill_development_score || 0)}</span>
              </div>
              <Progress value={student_value?.skill_development_score || 0} className="h-1.5" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Portfolio</span>
                <span className="font-medium">{Math.round(student_value?.portfolio_value_score || 0)}</span>
              </div>
              <Progress value={student_value?.portfolio_value_score || 0} className="h-1.5" />
            </div>

            {student_value?.insights && (
              <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t">
                {student_value.insights}
              </p>
            )}
          </CardContent>
        </Card>

        {/* University Value */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">University</CardTitle>
              </div>
              <Badge variant="outline" className="text-purple-600 border-purple-300">
                {Math.round(university_value?.score || 0)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Partnership</span>
                <span className="font-medium">{Math.round(university_value?.partnership_quality_score || 0)}</span>
              </div>
              <Progress value={university_value?.partnership_quality_score || 0} className="h-1.5" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Placements</span>
                <span className="font-medium">{Math.round(university_value?.placement_potential_score || 0)}</span>
              </div>
              <Progress value={university_value?.placement_potential_score || 0} className="h-1.5" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Research</span>
                <span className="font-medium">{Math.round(university_value?.research_collaboration_score || 0)}</span>
              </div>
              <Progress value={university_value?.research_collaboration_score || 0} className="h-1.5" />
            </div>

            {university_value?.insights && (
              <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t">
                {university_value.insights}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Industry Value */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg">Industry</CardTitle>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-300">
                {Math.round(industry_value?.score || 0)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">ROI</span>
                <span className="font-medium">{Math.round(industry_value?.deliverable_roi_score || 0)}</span>
              </div>
              <Progress value={industry_value?.deliverable_roi_score || 0} className="h-1.5" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Talent</span>
                <span className="font-medium">{Math.round(industry_value?.talent_pipeline_score || 0)}</span>
              </div>
              <Progress value={industry_value?.talent_pipeline_score || 0} className="h-1.5" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Innovation</span>
                <span className="font-medium">{Math.round(industry_value?.innovation_score || 0)}</span>
              </div>
              <Progress value={industry_value?.innovation_score || 0} className="h-1.5" />
            </div>

            {industry_value?.insights && (
              <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t">
                {industry_value.insights}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Intelligence - Compact Two Column */}
      {stakeholderInsights && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recommendations */}
          {stakeholderInsights.recommendations && stakeholderInsights.recommendations.length > 0 && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Key Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {stakeholderInsights.recommendations.slice(0, 3).map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Risks */}
          {stakeholderInsights.risks && stakeholderInsights.risks.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Watch Out For
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {stakeholderInsights.risks.slice(0, 3).map((risk: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground leading-relaxed">{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};