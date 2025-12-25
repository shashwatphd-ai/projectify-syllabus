import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  Zap,
  GraduationCap,
  Briefcase,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SkillGapAnalysisCardProps {
  projectId: string;
  projectSkills?: string[];
  courseOutcomes?: unknown[];
  existingData?: SkillGapData | null;
  onAnalyze?: () => void;
}

interface SkillAnalysis {
  skill: string;
  source: 'course' | 'project' | 'job_posting';
  coverage: 'covered' | 'will_learn' | 'gap';
  importance: 'critical' | 'important' | 'nice_to_have';
  jobMentions: number;
}

interface SkillGapData {
  overallCoverage: number;
  skillsAlreadyHave: SkillAnalysis[];
  skillsWillLearn: SkillAnalysis[];
  skillGaps: SkillAnalysis[];
  topJobRequirements: string[];
  learningOpportunities: string[];
  careerReadiness: string;
  confidence: number;
  analyzedAt: string;
}

const ImportanceBadge = ({ importance }: { importance: string }) => {
  const styles: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200',
    important: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200',
    nice_to_have: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200'
  };
  
  const labels: Record<string, string> = {
    critical: 'Critical',
    important: 'Important',
    nice_to_have: 'Optional'
  };
  
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${styles[importance] || styles.nice_to_have}`}>
      {labels[importance] || importance}
    </Badge>
  );
};

export const SkillGapAnalysisCard = ({ 
  projectId, 
  existingData,
  onAnalyze 
}: SkillGapAnalysisCardProps) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SkillGapData | null>(existingData || null);

  const analyzeSkillGaps = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('skill-gap-analyzer', {
        body: { projectId }
      });

      if (error) throw error;
      
      if (result?.success && result?.data) {
        setData(result.data);
        toast.success("Skill gap analysis complete");
        onAnalyze?.();
      } else {
        throw new Error(result?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Skill gap analysis error:', error);
      toast.error("Analysis failed - please try again");
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Skill Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Discover Learning Opportunities</p>
              <p className="text-xs text-muted-foreground mt-1">
                Compare your skills against real job requirements
              </p>
            </div>
            <Button 
              onClick={analyzeSkillGaps} 
              disabled={loading}
              size="sm"
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Analyze Skills
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-background overflow-hidden">
      <CardHeader className="pb-3 border-b border-blue-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Skill Gap Analysis
          </CardTitle>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
            {Math.round(data.confidence * 100)}% Confidence
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-5">
        {/* Overall Coverage */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Skill Coverage</span>
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {data.overallCoverage}%
            </span>
          </div>
          <Progress value={data.overallCoverage} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">{data.careerReadiness}</p>
        </div>

        {/* Skills Already Have */}
        {data.skillsAlreadyHave.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              Skills You Already Have ({data.skillsAlreadyHave.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.skillsAlreadyHave.slice(0, 6).map((skill, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-xs"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {skill.skill}
                </Badge>
              ))}
              {data.skillsAlreadyHave.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{data.skillsAlreadyHave.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Skills Will Learn */}
        {data.skillsWillLearn.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
              Skills You'll Gain From This Project ({data.skillsWillLearn.length})
            </div>
            <div className="space-y-1.5">
              {data.skillsWillLearn.slice(0, 5).map((skill, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between bg-blue-500/5 rounded-lg px-3 py-2 border border-blue-500/20"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 text-blue-600" />
                    <span className="text-sm capitalize">{skill.skill}</span>
                  </div>
                  <ImportanceBadge importance={skill.importance} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skill Gaps */}
        {data.skillGaps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              Additional Skills to Develop ({data.skillGaps.length})
            </div>
            <div className="space-y-1.5">
              {data.skillGaps.slice(0, 4).map((skill, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between bg-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/20"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3 w-3 text-amber-600" />
                    <span className="text-sm capitalize">{skill.skill}</span>
                    {skill.jobMentions > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        ({skill.jobMentions} jobs)
                      </span>
                    )}
                  </div>
                  <ImportanceBadge importance={skill.importance} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Job Requirements */}
        {data.topJobRequirements.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Top Skills Employers Want
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.topJobRequirements.map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs capitalize">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recalculate Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={analyzeSkillGaps}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Target className="h-4 w-4 mr-2" />
          )}
          Recalculate
        </Button>
      </CardContent>
    </Card>
  );
};
