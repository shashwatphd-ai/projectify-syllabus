import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Competency {
  id: string;
  skill_name: string;
  verification_source: string | null;
  employer_rating: number | null;
  created_at: string;
}

export default function MyCompetencies() {
  const { user, requireAuth } = useAuth();
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  useEffect(() => {
    if (user) {
      fetchCompetencies();
    }
  }, [user]);

  const fetchCompetencies = async () => {
    try {
      const { data, error } = await supabase
        .from("verified_competencies")
        .select("*")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompetencies(data || []);
    } catch (error) {
      console.error("Error fetching competencies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPortfolio = async () => {
    if (!user) return;

    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('portfolio-export', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      // The response is a blob (PDF file)
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `eduthree-portfolio-${user.id.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Portfolio Exported",
        description: "Your portfolio PDF has been downloaded successfully.",
      });
    } catch (error: any) {
      console.error("Error exporting portfolio:", error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export portfolio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // Group competencies by skill name
  const groupedCompetencies = competencies.reduce((acc, comp) => {
    if (!acc[comp.skill_name]) {
      acc[comp.skill_name] = [];
    }
    acc[comp.skill_name].push(comp);
    return acc;
  }, {} as Record<string, Competency[]>);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Verified Skills</h1>
            <p className="text-muted-foreground">
              Skills verified through your completed projects
            </p>
          </div>
          <Button 
            onClick={handleExportPortfolio} 
            disabled={exporting || Object.keys(groupedCompetencies).length === 0}
            className="gap-2"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export Portfolio (PDF)
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your skills...</p>
          </div>
        ) : Object.keys(groupedCompetencies).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No verified competencies yet. Complete projects to build your skills portfolio!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(groupedCompetencies).map(([skillName, comps]) => {
              const avgRating = comps
                .filter((c) => c.employer_rating)
                .reduce((sum, c) => sum + (c.employer_rating || 0), 0) / 
                comps.filter((c) => c.employer_rating).length || 0;

              return (
                <Card key={skillName} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">{skillName}</CardTitle>
                    <CardDescription>
                      Verified {comps.length} {comps.length === 1 ? "time" : "times"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {avgRating > 0 && (
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span className="font-medium">{avgRating.toFixed(1)}/5</span>
                        <span className="text-sm text-muted-foreground">Employer Rating</span>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Verified by:</p>
                      {comps.map((comp) => (
                        <Badge key={comp.id} variant="secondary" className="mr-2 mb-1">
                          {comp.verification_source || "AI Extraction"}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
