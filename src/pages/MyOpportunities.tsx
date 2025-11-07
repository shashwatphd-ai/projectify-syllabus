import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Briefcase, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";

interface JobMatch {
  id: string;
  apollo_job_title: string;
  apollo_company_name: string;
  apollo_job_url: string;
  apollo_job_payload: any;
  status: string;
  created_at: string;
}

const MyOpportunities = () => {
  const { user, loading: authLoading, requireAuth } = useAuth();
  const navigate = useNavigate();
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requireAuth();
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;

    const fetchJobMatches = async () => {
      try {
        const { data, error } = await supabase
          .from("job_matches")
          .select("*")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setJobMatches(data || []);
      } catch (error) {
        console.error("Error fetching job matches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobMatches();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            My Job Opportunities
          </h1>
          <p className="text-muted-foreground">
            Jobs matched to your verified skills and competencies
          </p>
        </div>

        {jobMatches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No job matches yet
              </h3>
              <p className="text-muted-foreground">
                Complete your projects to build verified competencies and unlock job matches.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobMatches.map((match) => {
              const matchedSkills = match.apollo_job_payload?.matched_skills || [];
              
              return (
                <Card key={match.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {match.apollo_job_title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {match.apollo_company_name}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {match.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {matchedSkills.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-foreground mb-2">
                          Matched Skills:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {matchedSkills.map((skill: string, idx: number) => (
                            <Badge key={idx} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button 
                      className="w-full" 
                      asChild
                    >
                      <a 
                        href={match.apollo_job_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2"
                      >
                        Apply Now
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOpportunities;
