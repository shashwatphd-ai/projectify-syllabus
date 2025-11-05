import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Building2, Sparkles, TrendingUp, Target, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
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

const ScoreIndicator = ({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) => {
  const getColor = (s: number) => {
    if (s >= 80) return "text-green-600 bg-green-500/10 border-green-500/30";
    if (s >= 65) return "text-blue-600 bg-blue-500/10 border-blue-500/30";
    if (s >= 50) return "text-amber-600 bg-amber-500/10 border-amber-500/30";
    return "text-red-600 bg-red-500/10 border-red-500/30";
  };

  const sizeMap = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl"
  };

  return (
    <div className={`inline-flex items-center justify-center rounded-lg border-2 ${getColor(score)} px-4 py-2`}>
      <span className={`${sizeMap[size]} font-bold`}>{Math.round(score)}</span>
    </div>
  );
};

const BenefitItem = ({ text, icon: Icon, color }: { text: string; icon: any; color: string }) => (
  <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
    <Icon className={`h-4 w-4 ${color} mt-0.5 flex-shrink-0`} />
    <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
  </div>
);

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

  const { student_value, university_value, industry_value } = valueAnalysis;

  return (
    <div className="space-y-5">
      {/* Partnership Overview */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/30">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Partnership Value</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {stakeholderInsights?.overall_assessment}
              </p>
            </div>
            <div className="flex gap-6 justify-center md:justify-end">
              <div className="text-center">
                <ScoreIndicator score={partnershipQuality} size="md" />
                <p className="text-xs text-muted-foreground mt-2">Quality</p>
              </div>
              <div className="text-center">
                <ScoreIndicator score={synergyIndex} size="md" />
                <p className="text-xs text-muted-foreground mt-2">Synergy</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stakeholder Value Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        
        {/* STUDENT VALUE */}
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/5 to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-base">For Students</CardTitle>
              </div>
              <ScoreIndicator score={student_value?.score || 0} size="sm" />
            </div>
            <Alert className="bg-blue-500/5 border-blue-500/20 py-2">
              <AlertDescription className="text-xs leading-relaxed">
                {student_value?.insights}
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent className="space-y-3">
            {student_value?.key_benefits && student_value.key_benefits.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Key Benefits:</p>
                {student_value.key_benefits.slice(0, 3).map((benefit: string, i: number) => (
                  <BenefitItem 
                    key={i}
                    text={benefit}
                    icon={CheckCircle2}
                    color="text-blue-600"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* UNIVERSITY VALUE */}
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/5 to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-base">For University</CardTitle>
              </div>
              <ScoreIndicator score={university_value?.score || 0} size="sm" />
            </div>
            <Alert className="bg-purple-500/5 border-purple-500/20 py-2">
              <AlertDescription className="text-xs leading-relaxed">
                {university_value?.insights}
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent className="space-y-3">
            {university_value?.key_benefits && university_value.key_benefits.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">Strategic Value:</p>
                {university_value.key_benefits.slice(0, 3).map((benefit: string, i: number) => (
                  <BenefitItem 
                    key={i}
                    text={benefit}
                    icon={CheckCircle2}
                    color="text-purple-600"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* INDUSTRY VALUE */}
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/5 to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-base">For Industry</CardTitle>
              </div>
              <ScoreIndicator score={industry_value?.score || 0} size="sm" />
            </div>
            <Alert className="bg-green-500/5 border-green-500/20 py-2">
              <AlertDescription className="text-xs leading-relaxed">
                {industry_value?.insights}
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent className="space-y-3">
            {industry_value?.key_benefits && industry_value.key_benefits.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Business Impact:</p>
                {industry_value.key_benefits.slice(0, 3).map((benefit: string, i: number) => (
                  <BenefitItem 
                    key={i}
                    text={benefit}
                    icon={CheckCircle2}
                    color="text-green-600"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Intelligence */}
      {stakeholderInsights && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recommendations */}
          {stakeholderInsights.recommendations && stakeholderInsights.recommendations.length > 0 && (
            <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-green-600" />
                  Faculty Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stakeholderInsights.recommendations.slice(0, 5).map((rec: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs bg-green-500/10 text-green-700 border-green-300 flex-shrink-0">
                      {i + 1}
                    </Badge>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">{rec}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Risks */}
          {stakeholderInsights.risks && stakeholderInsights.risks.length > 0 && (
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Risk Considerations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stakeholderInsights.risks.slice(0, 5).map((risk: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">{risk}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Opportunities */}
          {stakeholderInsights.opportunity_highlights && stakeholderInsights.opportunity_highlights.length > 0 && (
            <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-background md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Opportunity Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2">
                  {stakeholderInsights.opportunity_highlights.map((opp: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed flex-1">{opp}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};