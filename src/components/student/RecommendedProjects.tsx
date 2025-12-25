import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Sparkles, ArrowRight, Target } from "lucide-react";

interface ProjectRecommendation {
  project_id: string;
  title: string;
  company_name: string;
  company_logo_url: string | null;
  sector: string;
  description: string | null;
  match_score: number;
  matched_skills: string[];
  project_skills: string[];
}

interface RecommendedProjectsProps {
  onApply?: (projectId: string) => void;
  appliedProjects?: Set<string>;
}

export function RecommendedProjects({ onApply, appliedProjects = new Set() }: RecommendedProjectsProps) {
  const [recommendations, setRecommendations] = useState<ProjectRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to see recommendations');
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('student-project-matcher', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (fnError) {
        console.error('Function error:', fnError);
        setError('Failed to load recommendations');
        return;
      }

      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getMatchBadgeColor = (score: number) => {
    if (score >= 75) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recommended For You
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recommended For You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recommended For You
          </CardTitle>
          <CardDescription>
            Projects matched to your verified skills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-center">
            <Target className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Complete projects to build your skill profile and get personalized recommendations.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/projects')}
            >
              Browse All Projects
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Recommended For You
            </CardTitle>
            <CardDescription>
              Projects matched to your verified skills
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.slice(0, 5).map((rec) => (
          <div 
            key={rec.project_id}
            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => navigate(`/projects/${rec.project_id}`)}
          >
            <div className="flex-shrink-0">
              {rec.company_logo_url ? (
                <img 
                  src={rec.company_logo_url} 
                  alt={rec.company_name}
                  className="h-10 w-10 rounded object-contain"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{rec.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {rec.company_name} · {rec.sector}
                  </p>
                </div>
                <Badge className={getMatchBadgeColor(rec.match_score)}>
                  {rec.match_score}% match
                </Badge>
              </div>
              
              {rec.matched_skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {rec.matched_skills.slice(0, 3).map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {rec.matched_skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{rec.matched_skills.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
