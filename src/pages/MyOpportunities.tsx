import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, ExternalLink, Loader2 } from "lucide-react";

interface JobMatch {
  id: string;
  apollo_job_title: string;
  apollo_company_name: string;
  apollo_job_url: string;
  apollo_job_payload: any;
  created_at: string;
  status: string;
}

export default function MyOpportunities() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchJobMatches();
    }
  }, [user]);

  const fetchJobMatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("job_matches")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setJobMatches(data || []);
    } catch (error: any) {
      console.error("Error fetching job matches:", error);
      toast({
        title: "Error",
        description: "Failed to load job opportunities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Job Opportunities</h1>
          <p className="text-muted-foreground">
            Opportunities matched to your verified skills and completed projects
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : jobMatches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No job opportunities yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Complete projects to build your verified skills portfolio. We'll automatically match you with relevant job openings.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobMatches.map((match) => (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Briefcase className="h-6 w-6 text-primary" />
                    <Badge variant={match.status === "notified" ? "default" : "secondary"}>
                      {match.status === "notified" ? "Employer Notified" : "New Match"}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-2">{match.apollo_job_title}</CardTitle>
                  <CardDescription className="text-lg font-medium">
                    {match.apollo_company_name}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {match.apollo_job_payload?.location && (
                    <div className="text-sm text-muted-foreground">
                      📍 {match.apollo_job_payload.location}
                    </div>
                  )}
                  
                  {match.apollo_job_payload?.matched_skills && match.apollo_job_payload.matched_skills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Matched Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {match.apollo_job_payload.matched_skills.map((skill: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="bg-primary/5">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {match.apollo_job_url && (
                    <Button 
                      className="w-full mt-4" 
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
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
