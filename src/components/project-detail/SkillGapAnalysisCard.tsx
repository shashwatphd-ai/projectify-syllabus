import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, CheckCircle2, AlertCircle, Loader2, BookOpen, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SkillGapAnalysisCardProps {
  projectId: string;
  projectSkills: string[];
  courseOutcomes: any[];
  existingData?: any;
  onAnalyze?: () => void;
}

interface SkillGap {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  learningPath: string[];
}

interface SkillGapData {
  overall_readiness: number;
  skill_gaps: SkillGap[];
  strengths: string[];
  development_areas: string[];
  recommended_resources: { title: string; type: string; url?: string }[];
  analyzed_at: string;
}

export const SkillGapAnalysisCard = ({ 
  projectId, 
  projectSkills = [],
  courseOutcomes = [],
  existingData,
  onAnalyze 
}: SkillGapAnalysisCardProps) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SkillGapData | null>(existingData);

  const analyzeSkillGaps = async () => {
    setLoading(true);
    try {
      // Simulate skill gap analysis based on project skills and course outcomes
      // In production, this would call an edge function with O*NET/Lightcast data
      
      const skillGaps: SkillGap[] = projectSkills.slice(0, 5).map((skill, idx) => {
        const currentLevel = Math.floor(Math.random() * 40) + 30; // 30-70
        const requiredLevel = Math.floor(Math.random() * 20) + 75; // 75-95
        const gap = requiredLevel - currentLevel;
        
        return {
          skill,
          currentLevel,
          requiredLevel,
          gap,
          priority: gap > 30 ? 'high' : gap > 15 ? 'medium' : 'low',
          learningPath: [
            `Complete ${skill} fundamentals module`,
            `Practice with hands-on ${skill} projects`,
            `Apply ${skill} in capstone deliverable`
          ]
        };
      });

      const strengths = courseOutcomes
        .slice(0, 3)
        .map((o: any) => typeof o === 'string' ? o : o.description || o.outcome || 'Core competency');

      const analysisResult: SkillGapData = {
        overall_readiness: Math.round(70 + Math.random() * 20),
        skill_gaps: skillGaps.sort((a, b) => b.gap - a.gap),
        strengths,
        development_areas: skillGaps.filter(s => s.priority === 'high').map(s => s.skill),
        recommended_resources: [
          { title: "Industry Certification Prep", type: "Course" },
          { title: "Technical Skills Workshop", type: "Workshop" },
          { title: "Mentor Matching Program", type: "Mentorship" }
        ],
        analyzed_at: new Date().toISOString()
      };

      setData(analysisResult);
      
      // Store in project metadata
      const { error } = await supabase
        .from('project_metadata')
        .update({ 
          value_analysis: JSON.parse(JSON.stringify({
            skill_gap_analysis: analysisResult
          }))
        })
        .eq('project_id', projectId);

      if (error) {
        console.warn('Could not persist skill gap analysis:', error);
      }

      toast.success("Skill gap analysis complete");
      onAnalyze?.();
    } catch (error) {
      console.error('Skill gap analysis error:', error);
      toast.error("Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'medium': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'low': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!data) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Skill Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Analyze gaps between current competencies and project requirements
            </p>
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
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Skill Gap Analysis
          </CardTitle>
          <Badge variant="outline" className="bg-primary/10">
            {data.overall_readiness}% Ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Readiness */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Project Readiness</span>
            <span className="font-medium">{data.overall_readiness}%</span>
          </div>
          <Progress value={data.overall_readiness} className="h-2" />
        </div>

        {/* Skill Gaps */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Skills to Develop
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.skill_gaps.slice(0, 4).map((gap, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <Badge 
                  variant="outline" 
                  className={`text-[10px] px-1.5 py-0 ${getPriorityColor(gap.priority)}`}
                >
                  {gap.priority}
                </Badge>
                <span className="flex-1 truncate">{gap.skill}</span>
                <span className="text-muted-foreground">
                  {gap.currentLevel}% → {gap.requiredLevel}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths */}
        {data.strengths.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Current Strengths
            </p>
            <div className="flex flex-wrap gap-1">
              {data.strengths.slice(0, 3).map((strength, idx) => (
                <Badge key={idx} variant="secondary" className="text-[10px]">
                  {typeof strength === 'string' ? strength.slice(0, 30) : 'Competency'}...
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
            <BookOpen className="h-3 w-3" />
            Recommended Resources
          </p>
          <div className="flex flex-wrap gap-1">
            {data.recommended_resources.map((resource, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] gap-1">
                <TrendingUp className="h-2.5 w-2.5" />
                {resource.title}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
