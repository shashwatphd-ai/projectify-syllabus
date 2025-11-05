import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Building2, Sparkles, TrendingUp, Users, Lightbulb, AlertTriangle, Target, CheckCircle2, ArrowRight } from "lucide-react";
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

  const { student_value, university_value, industry_value, synergistic_value } = valueAnalysis;

  return (
    <div className="space-y-6">
      {/* Overall Assessment */}
      {stakeholderInsights?.overall_assessment && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Partnership Value Proposition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{stakeholderInsights.overall_assessment}</p>
          </CardContent>
        </Card>
      )}

      {/* Partnership Quality & Synergy Index */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Partnership Quality</CardTitle>
            <CardDescription>Strategic fit and long-term potential</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
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
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - partnershipQuality / 100)}`}
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold">{Math.round(partnershipQuality)}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {partnershipQuality >= 80 ? 'Exceptional Partnership' : 
               partnershipQuality >= 60 ? 'Strong Partnership' : 
               partnershipQuality >= 40 ? 'Good Partnership' : 'Exploratory Partnership'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Synergistic Value Index</CardTitle>
            <CardDescription>Multiplicative benefits from collaboration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
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
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - synergyIndex / 100)}`}
                    className="text-green-500 transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold">{Math.round(synergyIndex)}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {synergyIndex >= 80 ? 'Transformative Synergy' : 
               synergyIndex >= 60 ? 'Strong Synergy' : 
               synergyIndex >= 40 ? 'Moderate Synergy' : 'Basic Synergy'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stakeholder Value Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Student Value */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5" />
              Student Value
            </CardTitle>
            <CardDescription>
              Score: {Math.round(student_value?.score || 0)}/100
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Career Opportunities</span>
                <span className="font-medium">{Math.round(student_value?.career_opportunities_score || 0)}</span>
              </div>
              <Progress value={student_value?.career_opportunities_score || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Skill Development</span>
                <span className="font-medium">{Math.round(student_value?.skill_development_score || 0)}</span>
              </div>
              <Progress value={student_value?.skill_development_score || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Portfolio Value</span>
                <span className="font-medium">{Math.round(student_value?.portfolio_value_score || 0)}</span>
              </div>
              <Progress value={student_value?.portfolio_value_score || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Networking</span>
                <span className="font-medium">{Math.round(student_value?.networking_score || 0)}</span>
              </div>
              <Progress value={student_value?.networking_score || 0} className="h-2" />
            </div>

            {student_value?.key_benefits && student_value.key_benefits.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Key Benefits:</p>
                <ul className="space-y-1">
                  {student_value.key_benefits.map((benefit: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {student_value?.insights && (
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  {student_value.insights}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* University Value */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              University Value
            </CardTitle>
            <CardDescription>
              Score: {Math.round(university_value?.score || 0)}/100
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Partnership Quality</span>
                <span className="font-medium">{Math.round(university_value?.partnership_quality_score || 0)}</span>
              </div>
              <Progress value={university_value?.partnership_quality_score || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Placement Potential</span>
                <span className="font-medium">{Math.round(university_value?.placement_potential_score || 0)}</span>
              </div>
              <Progress value={university_value?.placement_potential_score || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Research Collaboration</span>
                <span className="font-medium">{Math.round(university_value?.research_collaboration_score || 0)}</span>
              </div>
              <Progress value={university_value?.research_collaboration_score || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reputation Impact</span>
                <span className="font-medium">{Math.round(university_value?.reputation_score || 0)}</span>
              </div>
              <Progress value={university_value?.reputation_score || 0} className="h-2" />
            </div>

            {university_value?.key_benefits && university_value.key_benefits.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Key Benefits:</p>
                <ul className="space-y-1">
                  {university_value.key_benefits.map((benefit: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {university_value?.insights && (
              <Alert className="bg-purple-500/10 border-purple-500/20">
                <Lightbulb className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-sm">
                  {university_value.insights}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Industry Value */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Industry Value
            </CardTitle>
            <CardDescription>
              Score: {Math.round(industry_value?.score || 0)}/100
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deliverable ROI</span>
                <span className="font-medium">{Math.round(industry_value?.deliverable_roi_score || 0)}</span>
              </div>
              <Progress value={industry_value?.deliverable_roi_score || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Talent Pipeline</span>
                <span className="font-medium">{Math.round(industry_value?.talent_pipeline_score || 0)}</span>
              </div>
              <Progress value={industry_value?.talent_pipeline_score || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Innovation Infusion</span>
                <span className="font-medium">{Math.round(industry_value?.innovation_score || 0)}</span>
              </div>
              <Progress value={industry_value?.innovation_score || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost Efficiency</span>
                <span className="font-medium">{Math.round(industry_value?.cost_efficiency_score || 0)}</span>
              </div>
              <Progress value={industry_value?.cost_efficiency_score || 0} className="h-2" />
            </div>

            {industry_value?.key_benefits && industry_value.key_benefits.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Key Benefits:</p>
                <ul className="space-y-1">
                  {industry_value.key_benefits.map((benefit: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {industry_value?.insights && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <Lightbulb className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm">
                  {industry_value.insights}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Synergistic Value Details */}
      {synergistic_value && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Synergistic Value Creation
            </CardTitle>
            <CardDescription>How collaboration creates multiplicative benefits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Knowledge Transfer Multiplier</span>
                  <span className="font-medium">{synergistic_value.knowledge_transfer_multiplier?.toFixed(1)}×</span>
                </div>
                <Progress value={synergistic_value.knowledge_transfer_multiplier * 20} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Innovation Potential</span>
                  <span className="font-medium">{Math.round(synergistic_value.innovation_potential_score || 0)}</span>
                </div>
                <Progress value={synergistic_value.innovation_potential_score || 0} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Long-term Partnership</span>
                  <span className="font-medium">{Math.round(synergistic_value.long_term_partnership_score || 0)}</span>
                </div>
                <Progress value={synergistic_value.long_term_partnership_score || 0} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ecosystem Impact</span>
                  <span className="font-medium">{Math.round(synergistic_value.ecosystem_impact_score || 0)}</span>
                </div>
                <Progress value={synergistic_value.ecosystem_impact_score || 0} className="h-2" />
              </div>
            </div>

            {synergistic_value.key_synergies && synergistic_value.key_synergies.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Key Synergies:</p>
                <div className="space-y-2">
                  {synergistic_value.key_synergies.map((synergy: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm bg-amber-500/10 rounded-lg p-3">
                      <ArrowRight className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span>{synergy}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {synergistic_value.insights && (
              <Alert className="bg-amber-500/10 border-amber-500/20">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm">
                  {synergistic_value.insights}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Faculty Recommendations & Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Opportunity Highlights */}
        {stakeholderInsights?.opportunity_highlights && stakeholderInsights.opportunity_highlights.length > 0 && (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Opportunity Highlights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {stakeholderInsights.opportunity_highlights.map((opp: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Risk Factors */}
        {stakeholderInsights?.risk_factors && stakeholderInsights.risk_factors.length > 0 && (
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5" />
                Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {stakeholderInsights.risk_factors.map((risk: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Faculty Recommendations */}
      {stakeholderInsights?.faculty_recommendations && stakeholderInsights.faculty_recommendations.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Faculty Recommendations
            </CardTitle>
            <CardDescription>Actionable steps to maximize project success</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {stakeholderInsights.faculty_recommendations.map((rec: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm bg-background rounded-lg p-3 border">
                  <Badge variant="outline" className="mt-0.5 flex-shrink-0">{i + 1}</Badge>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
