import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ExternalLink, Loader2, Search, X } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface JobMatch {
  id: string;
  apollo_job_title: string | null;
  apollo_company_name: string | null;
  apollo_job_url: string | null;
  apollo_job_payload: Json | null;
  created_at: string | null;
  status: string | null;
}

interface AuthUser {
  id: string;
  email?: string;
}

export default function MyOpportunities() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth?mode=signin");
      } else {
        setUser(user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth?mode=signin");
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
  }, [user, searchQuery, statusFilter]);

  const fetchJobMatches = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("job_matches")
        .select("*")
        .eq("student_id", user.id);

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply search filter (searches both title and company)
      if (searchQuery.trim()) {
        query = query.or(
          `apollo_job_title.ilike.%${searchQuery}%,apollo_company_name.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query.order("created_at", { ascending: false });

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

        {/* Filter Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by job title or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_notification">New Match</SelectItem>
                    <SelectItem value="notified">Employer Notified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(searchQuery || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="w-fit"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

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
                  {match.apollo_job_payload && typeof match.apollo_job_payload === 'object' && !Array.isArray(match.apollo_job_payload) && 'location' in match.apollo_job_payload && (
                    <div className="text-sm text-muted-foreground">
                      📍 {String(match.apollo_job_payload.location)}
                    </div>
                  )}
                  
                  {match.apollo_job_payload && typeof match.apollo_job_payload === 'object' && !Array.isArray(match.apollo_job_payload) && 'matched_skills' in match.apollo_job_payload && Array.isArray(match.apollo_job_payload.matched_skills) && match.apollo_job_payload.matched_skills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Matched Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {(match.apollo_job_payload.matched_skills as string[]).map((skill: string, idx: number) => (
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
