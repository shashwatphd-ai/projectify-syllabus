import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Building2, Sparkles, TrendingUp, Target, Briefcase, Users, Award, DollarSign, ArrowUpRight, TrendingDown } from "lucide-react";
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

const ScoreGrade = ({ score }: { score: number }) => {
  if (score >= 85) return <Badge className="bg-green-500/10 text-green-700 border-green-300">Exceptional</Badge>;
  if (score >= 70) return <Badge className="bg-blue-500/10 text-blue-700 border-blue-300">Strong</Badge>;
  if (score >= 55) return <Badge className="bg-amber-500/10 text-amber-700 border-amber-300">Good</Badge>;
  return <Badge className="bg-gray-500/10 text-gray-700 border-gray-300">Moderate</Badge>;
};

const ValueMetric = ({ value, label, trend }: { value: string; label: string; trend?: "up" | "down" }) => (
  <div className="flex items-baseline gap-1.5">
    <span className="text-2xl font-bold text-foreground">{value}</span>
    {trend && (
      trend === "up" ? 
        <ArrowUpRight className="h-4 w-4 text-green-600" /> : 
        <TrendingDown className="h-4 w-4 text-red-600" />
    )}
    <span className="text-xs text-muted-foreground ml-1">{label}</span>
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
  
  // Calculate real-world metrics from scores
  const getStudentMetrics = (sv: any) => {
    const careerScore = sv?.career_opportunities_score || 0;
    const skillScore = sv?.skill_development_score || 0;
    const portfolioScore = sv?.portfolio_value_score || 0;
    
    return {
      jobReadiness: Math.round(careerScore),
      skillsGained: Math.ceil(skillScore / 20), // Estimate skills
      careerBoost: careerScore >= 80 ? "High" : careerScore >= 60 ? "Medium" : "Entry",
      industryExposure: portfolioScore >= 75 ? "Premium" : portfolioScore >= 50 ? "Solid" : "Basic"
    };
  };

  const getUniversityMetrics = (uv: any) => {
    const placementScore = uv?.placement_potential_score || 0;
    const partnershipScore = uv?.partnership_quality_score || 0;
    const reputationScore = uv?.reputation_score || 0;
    
    return {
      placementLikelihood: Math.round(placementScore),
      partnershipTier: partnershipScore >= 80 ? "Strategic" : partnershipScore >= 60 ? "Valuable" : "Emerging",
      brandImpact: reputationScore >= 75 ? "High" : reputationScore >= 50 ? "Medium" : "Low",
      industryAlignment: Math.round((partnershipScore + reputationScore) / 2)
    };
  };

  const getIndustryMetrics = (iv: any) => {
    const roiScore = iv?.deliverable_roi_score || 0;
    const talentScore = iv?.talent_pipeline_score || 0;
    const innovationScore = iv?.innovation_score || 0;
    
    return {
      roiPotential: roiScore >= 80 ? "Excellent" : roiScore >= 60 ? "Good" : "Fair",
      talentAccess: Math.round(talentScore),
      innovationValue: innovationScore >= 75 ? "High" : innovationScore >= 50 ? "Medium" : "Low",
      costEfficiency: Math.round((roiScore + (100 - iv?.cost_efficiency_score || 0)) / 2)
    };
  };

  const studentMetrics = getStudentMetrics(student_value);
  const universityMetrics = getUniversityMetrics(university_value);
  const industryMetrics = getIndustryMetrics(industry_value);

  return (
    <div className="space-y-4">
      {/* Partnership Overview Banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Partnership Value Assessment</h3>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {stakeholderInsights?.overall_assessment || "AI-powered analysis of synergistic value creation across all stakeholders"}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{Math.round(partnershipQuality)}</div>
                <div className="text-xs text-muted-foreground">Quality Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{Math.round(synergyIndex)}</div>
                <div className="text-xs text-muted-foreground">Synergy Index</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stakeholder Value Propositions */}
      <div className="grid gap-4 md:grid-cols-3">
        
        {/* STUDENT VALUE PROPOSITION */}
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/5 via-blue-500/3 to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-base">For Students</CardTitle>
              </div>
              <ScoreGrade score={student_value?.score || 0} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {student_value?.insights || "Transform your academic journey into career momentum"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key Impact Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-muted-foreground">Career Ready</span>
                </div>
                <ValueMetric value={`${studentMetrics.jobReadiness}%`} label="prepared" trend="up" />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-muted-foreground">Skills</span>
                </div>
                <ValueMetric value={`${studentMetrics.skillsGained}+`} label="new skills" />
              </div>
            </div>

            {/* Value Statement */}
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">{studentMetrics.careerBoost} career impact</span> with direct industry exposure
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">{studentMetrics.industryExposure} portfolio</span> quality for future opportunities
                </p>
              </div>
            </div>

            {/* Bottom action hint */}
            {student_value?.key_benefits && student_value.key_benefits.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-blue-600 mb-1">Why This Matters:</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {student_value.key_benefits[0]}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* UNIVERSITY VALUE PROPOSITION */}
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/5 via-purple-500/3 to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-base">For University</CardTitle>
              </div>
              <ScoreGrade score={university_value?.score || 0} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {university_value?.insights || "Strengthen academic-industry bridge with measurable outcomes"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key Impact Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-xs font-medium text-muted-foreground">Placement</span>
                </div>
                <ValueMetric value={`${universityMetrics.placementLikelihood}%`} label="potential" trend="up" />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-xs font-medium text-muted-foreground">Industry Tie</span>
                </div>
                <ValueMetric value={`${universityMetrics.industryAlignment}%`} label="aligned" />
              </div>
            </div>

            {/* Value Statement */}
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">{universityMetrics.partnershipTier} partnership</span> tier with industry leader
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">{universityMetrics.brandImpact} reputation boost</span> through collaboration
                </p>
              </div>
            </div>

            {/* Bottom action hint */}
            {university_value?.key_benefits && university_value.key_benefits.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-purple-600 mb-1">Strategic Value:</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {university_value.key_benefits[0]}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* INDUSTRY VALUE PROPOSITION */}
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/5 via-green-500/3 to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-base">For Industry</CardTitle>
              </div>
              <ScoreGrade score={industry_value?.score || 0} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {industry_value?.insights || "Access fresh talent and innovative solutions at scale"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key Impact Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs font-medium text-muted-foreground">ROI</span>
                </div>
                <ValueMetric value={industryMetrics.roiPotential} label="return" trend="up" />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs font-medium text-muted-foreground">Talent Pool</span>
                </div>
                <ValueMetric value={`${industryMetrics.talentAccess}%`} label="access" />
              </div>
            </div>

            {/* Value Statement */}
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">{industryMetrics.innovationValue} innovation value</span> from academic collaboration
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">{industryMetrics.costEfficiency}% cost efficient</span> compared to traditional hiring
                </p>
              </div>
            </div>

            {/* Bottom action hint */}
            {industry_value?.key_benefits && industry_value.key_benefits.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-green-600 mb-1">Business Impact:</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {industry_value.key_benefits[0]}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Intelligence */}
      {stakeholderInsights && (stakeholderInsights.recommendations?.length > 0 || stakeholderInsights.risks?.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {stakeholderInsights.recommendations && stakeholderInsights.recommendations.length > 0 && (
            <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Next Steps to Maximize Value
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stakeholderInsights.recommendations.slice(0, 3).map((rec: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5 h-5 px-1.5 text-xs bg-green-500/10 text-green-700 border-green-300">
                      {i + 1}
                    </Badge>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">{rec}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {stakeholderInsights.risks && stakeholderInsights.risks.length > 0 && (
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Considerations & Mitigations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stakeholderInsights.risks.slice(0, 3).map((risk: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5 h-5 px-1.5 text-xs bg-amber-500/10 text-amber-700 border-amber-300">
                      !
                    </Badge>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">{risk}</p>
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