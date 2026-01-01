import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Star, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  generation_run_id: string;
  course_id: string;
  course_title: string;
  total_projects: number;
  rated_projects: number;
  avg_rating: number;
  avg_lo_score: number;
  avg_final_score: number;
  high_rated_count: number;
  low_rated_count: number;
  needs_review_count: number;
  all_rating_tags: string[];
}

export function ProjectAnalytics({ courseId }: { courseId?: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [courseId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('project_feedback_analytics')
        .select('generation_run_id, course_id, course_title, total_projects, rated_projects, avg_rating, avg_lo_score, avg_final_score, high_rated_count, low_rated_count, needs_review_count, all_rating_tags')
        .order('generation_run_id', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAnalytics(data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (analytics.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No analytics data available. Rate some projects to see insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {analytics.map((data) => {
        const ratingPercentage = data.total_projects > 0 
          ? Math.round((data.rated_projects / data.total_projects) * 100)
          : 0;

        return (
          <Card key={data.generation_run_id}>
            <CardHeader>
              <CardTitle className="text-lg">{data.course_title}</CardTitle>
              <CardDescription>
                Generation Run: {data.generation_run_id.substring(0, 8)}...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Projects */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Projects</p>
                  <p className="text-2xl font-bold">{data.total_projects}</p>
                </div>

                {/* Rated Projects */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Rated</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{data.rated_projects}</p>
                    <span className="text-sm text-muted-foreground">
                      ({ratingPercentage}%)
                    </span>
                  </div>
                </div>

                {/* Average Rating */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <div className="flex items-center gap-1">
                    <p className="text-2xl font-bold">
                      {data.avg_rating ? data.avg_rating.toFixed(1) : 'N/A'}
                    </p>
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  </div>
                </div>

                {/* Average LO Score */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Avg LO Score</p>
                  <div className="flex items-center gap-1">
                    <p className="text-2xl font-bold">
                      {data.avg_lo_score ? Math.round(data.avg_lo_score * 100) : 0}%
                    </p>
                    <TrendingUp className="h-5 w-5 text-secondary" />
                  </div>
                </div>
              </div>

              {/* Quality Breakdown */}
              <div className="mt-4 flex flex-wrap gap-2">
                {data.high_rated_count > 0 && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {data.high_rated_count} High Quality (4-5★)
                  </Badge>
                )}
                {data.low_rated_count > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {data.low_rated_count} Low Quality (1-2★)
                  </Badge>
                )}
                {data.needs_review_count > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {data.needs_review_count} Need Review
                  </Badge>
                )}
              </div>

              {/* Common Tags */}
              {data.all_rating_tags && data.all_rating_tags.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Common Issues:</p>
                  <div className="flex flex-wrap gap-1">
                    {data.all_rating_tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
