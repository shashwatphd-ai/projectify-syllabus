import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudentDashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { 
  GraduationCap, 
  Briefcase, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  FileCheck
} from "lucide-react";
import { RecommendedProjects } from "@/components/student/RecommendedProjects";

interface DashboardMetrics {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  matchedJobs: number;
  verifiedCompetencies: number;
  availableProjects: number;
}

export default function StudentDashboard() {
  const { user, isStudent, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !isStudent) {
      navigate("/");
    }
  }, [isStudent, authLoading, navigate]);

  useEffect(() => {
    if (user && isStudent) {
      fetchDashboardData();
    }
  }, [user, isStudent]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Parallel queries - all execute simultaneously for 4x faster load
      const [
        applicationsResult,
        jobCountResult,
        compCountResult,
        projectCountResult
      ] = await Promise.all([
        supabase
          .from("project_applications")
          .select("*, projects(title, company_name)")
          .eq("student_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("job_matches")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user!.id)
          .eq("status", "new"),
        supabase
          .from("verified_competencies")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user!.id),
        supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("status", "curated_live")
      ]);

      // Handle errors from any query
      const errors = [
        applicationsResult.error,
        jobCountResult.error,
        compCountResult.error,
        projectCountResult.error
      ].filter(Boolean);
      
      if (errors.length > 0) {
        console.error("Dashboard query errors:", errors);
      }

      const applications = applicationsResult.data;
      const jobCount = jobCountResult.count ?? 0;
      const compCount = compCountResult.count ?? 0;
      const projectCount = projectCountResult.count ?? 0;

      const pending = applications?.filter(a => a.status === "pending").length || 0;
      const approved = applications?.filter(a => a.status === "approved").length || 0;

      setMetrics({
        totalApplications: applications?.length || 0,
        pendingApplications: pending,
        approvedApplications: approved,
        matchedJobs: jobCount,
        verifiedCompetencies: compCount,
        availableProjects: projectCount,
      });

      setRecentApplications(applications || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <StudentDashboardSkeleton />
      </div>
    );
  }

  const statCards = [
    {
      title: "My Applications",
      value: metrics?.totalApplications || 0,
      description: `${metrics?.pendingApplications || 0} pending review`,
      icon: FileCheck,
      color: "text-blue-500",
    },
    {
      title: "Approved Projects",
      value: metrics?.approvedApplications || 0,
      description: "Active partnerships",
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      title: "Job Matches",
      value: metrics?.matchedJobs || 0,
      description: "New opportunities",
      icon: Briefcase,
      color: "text-purple-500",
    },
    {
      title: "Verified Skills",
      value: metrics?.verifiedCompetencies || 0,
      description: "Competencies earned",
      icon: GraduationCap,
      color: "text-orange-500",
    },
    {
      title: "Available Projects",
      value: metrics?.availableProjects || 0,
      description: "Ready to apply",
      icon: TrendingUp,
      color: "text-cyan-500",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "pending": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "rejected": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Track your project applications, competencies, and career opportunities
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions & Recent Applications */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with your next step</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate("/projects")}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Browse Available Projects
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate("/my-competencies")}
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                View My Competencies
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate("/my-opportunities")}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Explore Job Matches
              </Button>
            </CardContent>
          </Card>

          {/* Recent Applications */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>Your latest project applications</CardDescription>
            </CardHeader>
            <CardContent>
              {recentApplications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No applications yet. Start by browsing available projects!
                </p>
              ) : (
                <div className="space-y-3">
                  {recentApplications.map((app) => (
                    <div key={app.id} className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {app.projects?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {app.projects?.company_name}
                        </p>
                      </div>
                      <Badge variant="outline" className={getStatusColor(app.status)}>
                        {app.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                        {app.status === "approved" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {app.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recommended Projects Section */}
        <div className="mb-8">
          <RecommendedProjects />
        </div>
      </div>
    </div>
  );
}
