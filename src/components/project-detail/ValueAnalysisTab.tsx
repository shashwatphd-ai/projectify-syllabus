import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Building2, Sparkles, TrendingUp, Target, Briefcase, BookOpen, Network, Award, Users, Handshake, ChartBar, Lightbulb, Rocket, DollarSign } from "lucide-react";
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

const CircularScore = ({ score, size = "md", color = "primary" }: { score: number; size?: "sm" | "md" | "lg"; color?: string }) => {
  const sizeMap = {
    sm: { outer: 40, inner: 32, stroke: 4, text: "text-lg" },
    md: { outer: 60, inner: 48, stroke: 6, text: "text-2xl" },
    lg: { outer: 80, inner: 64, stroke: 8, text: "text-3xl" }
  };
  
  const { outer, inner, stroke, text } = sizeMap[size];
  const radius = (outer - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: outer, height: outer }}>
      <svg className="transform -rotate-90" width={outer} height={outer}>
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-muted/30"
        />
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`text-${color} transition-all duration-1000`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${text} font-bold`}>{Math.round(score)}</span>
      </div>
    </div>
  );
};

const MetricBar = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
  <div className="flex items-center gap-2">
    <Icon className={`h-3.5 w-3.5 ${color} flex-shrink-0`} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground truncate">{label}</span>
        <span className="text-xs font-medium ml-2">{Math.round(value)}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
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
                  Generate AI-powered insights for this project
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
  const overallScore = (student_value?.score + university_value?.score + industry_value?.score) / 3;

  return (
    <div className="space-y-4">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-col items-center gap-1">
              <Target className="h-5 w-5 text-primary mb-1" />
              <CircularScore score={partnershipQuality} size="sm" color="primary" />
              <span className="text-xs text-muted-foreground mt-1">Partnership</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-col items-center gap-1">
              <Sparkles className="h-5 w-5 text-green-600 mb-1" />
              <CircularScore score={synergyIndex} size="sm" color="green-600" />
              <span className="text-xs text-muted-foreground mt-1">Synergy</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-col items-center gap-1">
              <TrendingUp className="h-5 w-5 text-blue-600 mb-1" />
              <CircularScore score={overallScore} size="sm" color="blue-600" />
              <span className="text-xs text-muted-foreground mt-1">Overall</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Value Narrative - Compact */}
      {stakeholderInsights?.overall_assessment && (
        <Alert className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 py-3">
          <AlertDescription className="text-sm leading-relaxed">
            {stakeholderInsights.overall_assessment}
          </AlertDescription>
        </Alert>
      )}

      {/* Stakeholder Dashboards */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Student Dashboard */}
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm font-medium">Students</CardTitle>
              </div>
              <CircularScore score={student_value?.score || 0} size="sm" color="blue-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            <MetricBar 
              label="Career" 
              value={student_value?.career_opportunities_score || 0}
              icon={Briefcase}
              color="text-blue-500"
            />
            <MetricBar 
              label="Skills" 
              value={student_value?.skill_development_score || 0}
              icon={BookOpen}
              color="text-blue-500"
            />
            <MetricBar 
              label="Portfolio" 
              value={student_value?.portfolio_value_score || 0}
              icon={Award}
              color="text-blue-500"
            />
            <MetricBar 
              label="Network" 
              value={student_value?.networking_score || 0}
              icon={Network}
              color="text-blue-500"
            />
            {student_value?.insights && (
              <div className="pt-2 border-t mt-2">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {student_value.insights}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* University Dashboard */}
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/5 to-transparent">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm font-medium">University</CardTitle>
              </div>
              <CircularScore score={university_value?.score || 0} size="sm" color="purple-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            <MetricBar 
              label="Partnership" 
              value={university_value?.partnership_quality_score || 0}
              icon={Handshake}
              color="text-purple-500"
            />
            <MetricBar 
              label="Placements" 
              value={university_value?.placement_potential_score || 0}
              icon={Users}
              color="text-purple-500"
            />
            <MetricBar 
              label="Research" 
              value={university_value?.research_collaboration_score || 0}
              icon={Lightbulb}
              color="text-purple-500"
            />
            <MetricBar 
              label="Reputation" 
              value={university_value?.reputation_score || 0}
              icon={Award}
              color="text-purple-500"
            />
            {university_value?.insights && (
              <div className="pt-2 border-t mt-2">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {university_value.insights}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Industry Dashboard */}
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <CardTitle className="text-sm font-medium">Industry</CardTitle>
              </div>
              <CircularScore score={industry_value?.score || 0} size="sm" color="green-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            <MetricBar 
              label="ROI" 
              value={industry_value?.deliverable_roi_score || 0}
              icon={DollarSign}
              color="text-green-500"
            />
            <MetricBar 
              label="Talent" 
              value={industry_value?.talent_pipeline_score || 0}
              icon={Users}
              color="text-green-500"
            />
            <MetricBar 
              label="Innovation" 
              value={industry_value?.innovation_score || 0}
              icon={Rocket}
              color="text-green-500"
            />
            <MetricBar 
              label="Cost Efficiency" 
              value={industry_value?.cost_efficiency_score || 0}
              icon={ChartBar}
              color="text-green-500"
            />
            {industry_value?.insights && (
              <div className="pt-2 border-t mt-2">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {industry_value.insights}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Items - Compact */}
      {stakeholderInsights && (stakeholderInsights.recommendations?.length > 0 || stakeholderInsights.risks?.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {stakeholderInsights.recommendations && stakeholderInsights.recommendations.length > 0 && (
            <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-300 h-5">
                    ✓ Actions
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <ul className="space-y-1.5">
                  {stakeholderInsights.recommendations.slice(0, 3).map((rec: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span className="line-clamp-2">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {stakeholderInsights.risks && stakeholderInsights.risks.length > 0 && (
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300 h-5">
                    ⚠ Risks
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <ul className="space-y-1.5">
                  {stakeholderInsights.risks.slice(0, 3).map((risk: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
                      <span className="text-amber-600 mt-0.5">•</span>
                      <span className="line-clamp-2">{risk}</span>
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