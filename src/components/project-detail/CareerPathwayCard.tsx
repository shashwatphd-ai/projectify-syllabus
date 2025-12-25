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
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CareerPathwayCardProps {
  projectId: string;
  projectSkills: string[];
  sector: string;
  existingData?: any;
  onAnalyze?: () => void;
}

interface CareerStep {
  title: string;
  level: 'entry' | 'mid' | 'senior' | 'lead';
  yearsExperience: string;
  salaryRange: string;
  skills: string[];
  isCurrentFit: boolean;
}

interface CareerPathwayData {
  primary_pathway: CareerStep[];
  alternative_pathways: { name: string; steps: CareerStep[] }[];
  growth_potential: number;
  time_to_senior: string;
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
      // Generate career pathway based on project skills and sector
      const baseTitles = getCareerTitles(sector);
      
      const primaryPathway: CareerStep[] = baseTitles.map((title, idx) => ({
        title,
        level: (['entry', 'mid', 'senior', 'lead'] as const)[idx],
        yearsExperience: ['0-2', '2-5', '5-8', '8+'][idx],
        salaryRange: [`$${50 + idx * 25}k-${70 + idx * 25}k`][0],
        skills: projectSkills.slice(0, 3),
        isCurrentFit: idx === 0
      }));

      const pathwayResult: CareerPathwayData = {
        primary_pathway: primaryPathway,
        alternative_pathways: [
          {
            name: "Technical Specialist",
            steps: primaryPathway.slice(0, 3).map(s => ({
              ...s,
              title: `Senior ${s.title.replace('Junior ', '').replace('Lead ', '')}`
            }))
          }
        ],
        growth_potential: Math.round(75 + Math.random() * 20),
        time_to_senior: "4-6 years",
        analyzed_at: new Date().toISOString()
      };

      setData(pathwayResult);
      
      // Store in project metadata
      const { error } = await supabase
        .from('project_metadata')
        .update({ 
          value_analysis: JSON.parse(JSON.stringify({
            career_pathway: pathwayResult
          }))
        })
        .eq('project_id', projectId);

      if (error) {
        console.warn('Could not persist career pathway:', error);
      }

      toast.success("Career pathway mapped");
      onAnalyze?.();
    } catch (error) {
      console.error('Career pathway error:', error);
      toast.error("Pathway generation failed");
    } finally {
      setLoading(false);
    }
  };

  const getCareerTitles = (sector: string): string[] => {
    const sectorTitles: Record<string, string[]> = {
      'Technology': ['Junior Developer', 'Software Engineer', 'Senior Engineer', 'Tech Lead'],
      'Finance': ['Analyst', 'Senior Analyst', 'Manager', 'Director'],
      'Healthcare': ['Associate', 'Specialist', 'Senior Specialist', 'Lead'],
      'Marketing': ['Coordinator', 'Specialist', 'Manager', 'Director'],
      'default': ['Entry Level', 'Mid Level', 'Senior Level', 'Lead/Manager']
    };
    return sectorTitles[sector] || sectorTitles['default'];
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
              Map your career progression based on project skills
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
                  Mapping...
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
            {data.growth_potential}% Growth
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Career Progression */}
        <div className="space-y-2">
          {data.primary_pathway.map((step, idx) => (
            <div 
              key={idx} 
              className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                step.isCurrentFit 
                  ? 'bg-primary/10 border-primary/30' 
                  : 'bg-muted/30 border-border/30'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step.isCurrentFit ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {step.isCurrentFit ? (
                  <GraduationCap className="h-4 w-4" />
                ) : (
                  <Briefcase className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{step.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {step.yearsExperience} yrs
                  </span>
                  <span className="flex items-center gap-0.5">
                    <DollarSign className="h-2.5 w-2.5" />
                    {step.salaryRange}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] ${getLevelColor(step.level)}`}>
                {step.level}
              </Badge>
              {idx < data.primary_pathway.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              )}
            </div>
          ))}
        </div>

        {/* Time to Senior */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
          <span className="text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Time to Senior Role
          </span>
          <Badge variant="secondary">{data.time_to_senior}</Badge>
        </div>

        {/* Alternative Paths */}
        {data.alternative_pathways.length > 0 && (
          <div className="text-xs">
            <p className="text-muted-foreground mb-1">Alternative paths:</p>
            <div className="flex flex-wrap gap-1">
              {data.alternative_pathways.map((path, idx) => (
                <Badge key={idx} variant="outline" className="text-[10px]">
                  {path.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
