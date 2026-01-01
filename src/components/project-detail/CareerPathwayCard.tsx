import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, 
  TrendingUp, 
  Loader2, 
  ChevronRight, 
  Briefcase, 
  GraduationCap,
  DollarSign,
  Clock,
  Target,
  Lightbulb
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CareerPathwayCardProps {
  projectId: string;
  projectSkills: string[];
  sector: string;
  existingData?: CareerPathwayData | null;
  onAnalyze?: () => void;
}

interface CareerStep {
  title: string;
  level: 'entry' | 'mid' | 'senior' | 'lead';
  yearsExperience: string;
  salaryRange: string;
  skills: string[];
  isCurrentFit: boolean;
  onetCode?: string;
  growthOutlook?: string;
}

interface AlternativePathway {
  name: string;
  description?: string;
  steps: CareerStep[];
  industryMatch?: number;
}

interface CareerPathwayData {
  primary_pathway: CareerStep[];
  alternative_pathways: AlternativePathway[];
  growth_potential: number;
  time_to_senior: string;
  industry_demand?: {
    score: number;
    trend: 'growing' | 'stable' | 'declining';
    insight: string;
  };
  career_trajectory?: string[];
  analyzed_at: string;
}

export const CareerPathwayCard = ({ 
  projectId, 
  projectSkills = [],
  sector,
  existingData,
  onAnalyze 
}: CareerPathwayCardProps) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CareerPathwayData | null>(existingData);

  const generatePathway = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('career-pathway-mapper', {
        body: { projectId }
      });

      if (error) throw error;
      
      setData(result);
      toast.success("Career pathway mapped successfully");
      onAnalyze?.();
    } catch (error) {
      console.error('Career pathway error:', error);
      toast.error("Pathway generation failed");
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'entry': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
      case 'mid': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30';
      case 'senior': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30';
      case 'lead': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growing': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'stable': return <Target className="h-3 w-3 text-blue-600" />;
      default: return <TrendingUp className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (!data) {
    return (
      <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-5 w-5 text-green-600" />
            Career Pathway
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Map potential career trajectories based on project skills and industry
            </p>
            <Button 
              onClick={generatePathway} 
              disabled={loading}
              size="sm"
              variant="outline"
              className="gap-2 border-green-500/50 hover:bg-green-500/10"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing careers...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Map Career Path
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-5 w-5 text-green-600" />
            Career Pathway
          </CardTitle>
          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
            {data.growth_potential}% Growth Potential
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Career Progression */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Primary Trajectory</p>
          {data.primary_pathway.map((step, idx) => (
            <div 
              key={idx} 
              className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                step.isCurrentFit 
                  ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20' 
                  : 'bg-muted/30 border-border/30'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                step.isCurrentFit ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {step.isCurrentFit ? (
                  <GraduationCap className="h-4 w-4" />
                ) : (
                  <Briefcase className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{step.title}</p>
                  {step.growthOutlook && (
                    <Badge variant="secondary" className="text-[9px] shrink-0">
                      {step.growthOutlook}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {step.yearsExperience}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <DollarSign className="h-2.5 w-2.5" />
                    {step.salaryRange}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${getLevelColor(step.level)}`}>
                {step.level}
              </Badge>
              {idx < data.primary_pathway.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Industry Demand */}
        {data.industry_demand && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-2 text-xs">
              {getTrendIcon(data.industry_demand.trend)}
              <span className="text-muted-foreground">Industry Demand</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {data.industry_demand.score}%
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-[10px] capitalize ${
                  data.industry_demand.trend === 'growing' 
                    ? 'text-green-600 border-green-500/30' 
                    : 'text-blue-600 border-blue-500/30'
                }`}
              >
                {data.industry_demand.trend}
              </Badge>
            </div>
          </div>
        )}

        {/* Time to Senior */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
          <span className="text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Time to Senior Role
          </span>
          <Badge variant="secondary">{data.time_to_senior}</Badge>
        </div>

        {/* Career Insights */}
        {data.career_trajectory && data.career_trajectory.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Career Insights
            </p>
            <ul className="space-y-1">
              {data.career_trajectory.slice(0, 3).map((insight, idx) => (
                <li key={idx} className="text-[11px] text-muted-foreground pl-3 relative">
                  <span className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-green-500/50" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Alternative Paths */}
        {data.alternative_pathways && data.alternative_pathways.length > 0 && (
          <div className="text-xs pt-2 border-t border-border/50">
            <p className="text-muted-foreground mb-2">Alternative Career Tracks</p>
            <div className="flex flex-wrap gap-1.5">
              {data.alternative_pathways.map((path, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-[10px] cursor-help"
                  title={path.description || `${path.name} career track`}
                >
                  {path.name}
                  {path.industryMatch && (
                    <span className="ml-1 opacity-70">{path.industryMatch}%</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Regenerate button */}
        <div className="pt-2">
          <Button 
            onClick={generatePathway} 
            disabled={loading}
            size="sm"
            variant="ghost"
            className="w-full text-xs h-7"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Updating...
              </>
            ) : (
              'Refresh Analysis'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
