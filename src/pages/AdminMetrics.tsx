import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Database, Building2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MetricsData {
  total_ai_shells: number;
  total_employer_leads: number;
  total_synced_projects: number;
  total_failed_generations: number;
  total_generating: number;
}

const AdminMetrics = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [metrics, setMetrics] = useState<MetricsData>({
    total_ai_shells: 0,
    total_employer_leads: 0,
    total_synced_projects: 0,
    total_failed_generations: 0,
    total_generating: 0,
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You must be an admin to access this page.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading, navigate, toast]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!isAdmin) return;

      setLoading(true);
      try {
        // Fetch AI Shells count
        const { count: aiShellsCount, error: aiShellsError } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("status", "ai_shell");

        if (aiShellsError) throw aiShellsError;

        // Fetch Employer Leads count
        const { count: employerLeadsCount, error: employerLeadsError } = await supabase
          .from("employer_interest_submissions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        if (employerLeadsError) throw employerLeadsError;

        // Fetch Synced Projects count
        const { count: syncedProjectsCount, error: syncedProjectsError } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("status", "curated_live");

        if (syncedProjectsError) throw syncedProjectsError;

        // Fetch Projects Being Generated count
        const { count: generatingCount, error: generatingError } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending_generation");

        if (generatingError) throw generatingError;

        // Fetch Failed Generations count (truly failed projects only)
        const { count: failedGenerationsCount, error: failedGenerationsError } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .or("status.is.null,status.eq.failed");

        if (failedGenerationsError) throw failedGenerationsError;

        setMetrics({
          total_ai_shells: aiShellsCount || 0,
          total_employer_leads: employerLeadsCount || 0,
          total_synced_projects: syncedProjectsCount || 0,
          total_failed_generations: failedGenerationsCount || 0,
          total_generating: generatingCount || 0,
        });
      } catch (error: any) {
        console.error("Error fetching metrics:", error);
        toast({
          title: "Error",
          description: "Failed to load metrics data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [isAdmin, toast]);

  const handleRegenerateProjects = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to regenerate all AI Shell projects?\n\n` +
      `This will re-queue ${metrics.total_ai_shells} projects for regeneration with the new "wow factor" prompt.\n\n` +
      `This action cannot be undone and may take several minutes to complete.`
    );

    if (!confirmed) return;

    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-regenerate-projects');

      if (error) throw error;

      toast({
        title: "Success",
        description: data?.message || `Successfully re-queued ${data?.count || metrics.total_ai_shells} projects for regeneration.`,
      });

      // Refresh metrics after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Error regenerating projects:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const statCards = [
    {
      title: "AI Project Shells",
      value: metrics.total_ai_shells,
      description: "Ready-to-match project proposals",
      icon: Database,
      iconColor: "text-blue-500",
    },
    {
      title: "Projects Being Generated",
      value: metrics.total_generating,
      description: "Currently processing with new prompt",
      icon: RefreshCw,
      iconColor: "text-purple-500",
    },
    {
      title: "Pending Employer Leads",
      value: metrics.total_employer_leads,
      description: "Awaiting review and matching",
      icon: Building2,
      iconColor: "text-orange-500",
    },
    {
      title: "Synced Projects",
      value: metrics.total_synced_projects,
      description: "Matched and live",
      icon: CheckCircle2,
      iconColor: "text-green-500",
    },
    {
      title: "Failed Generations",
      value: metrics.total_failed_generations,
      description: "Require attention or retry",
      icon: AlertCircle,
      iconColor: "text-red-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-8 px-4">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Curation Metrics Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of the EduThree curation pipeline and employer marketplace
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={handleRegenerateProjects}
            disabled={regenerating || metrics.total_ai_shells === 0}
            className="gap-2"
          >
            {regenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate All AI Shells
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>About These Metrics</CardTitle>
              <CardDescription>
                Understanding the EduThree curation pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">AI Project Shells</h3>
                <p className="text-sm text-muted-foreground">
                  These are AI-generated project proposals ready to be matched with incoming employer interest submissions. 
                  They represent the "supply" side of our marketplace.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Projects Being Generated</h3>
                <p className="text-sm text-muted-foreground">
                  Projects currently being regenerated with the new "wow factor" prompt. 
                  These will move to "AI Project Shells" once generation completes successfully.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Pending Employer Leads</h3>
                <p className="text-sm text-muted-foreground">
                  Employer interest submissions awaiting admin review and matching to AI project shells. 
                  These represent the "demand" side of our marketplace.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Synced Projects</h3>
                <p className="text-sm text-muted-foreground">
                  Projects that have been successfully matched between an employer submission and an AI shell, 
                  and are now live in the system as curated partnerships.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Failed Generations</h3>
                <p className="text-sm text-muted-foreground">
                  Project generation attempts that encountered errors and need admin attention. 
                  These can be retried from the Admin Hub.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminMetrics;
