import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Mail, Globe, MapPin, Briefcase, ExternalLink, Star } from "lucide-react";
import { EmployerDashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentRatingDialog } from "@/components/employer/StudentRatingDialog";

interface CompanyProfile {
  id: string;
  name: string;
  website: string | null;
  sector: string | null;
  city: string | null;
  full_address: string | null;
  contact_email: string | null;
  organization_logo_url: string | null;
}

interface ProjectWithCourse {
  id: string;
  title: string;
  status: string;
  description: string | null;
  pricing_usd: number;
  duration_weeks: number;
  team_size: number;
  course_profiles: {
    title: string;
  };
}

interface StudentApplication {
  id: string;
  created_at: string;
  status: string;
  project_id: string;
  student_id: string;
  student_email: string | null;
  projects: {
    title: string;
    company_profile_id: string;
  };
}

export default function EmployerDashboard() {
  const navigate = useNavigate();
  const { user, isEmployer, loading: authLoading } = useAuth();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [projects, setProjects] = useState<ProjectWithCourse[]>([]);
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  
  // Rating dialog state
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    email: string | null;
    projectId: string;
    projectTitle: string;
  } | null>(null);

  // Redirect if not authenticated or not an employer
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?mode=signin");
    } else if (!authLoading && user && !isEmployer) {
      toast.error("Access denied. Employer role required.");
      navigate("/");
    }
  }, [authLoading, user, isEmployer, navigate]);

  useEffect(() => {
    if (user && isEmployer) {
      fetchCompanyProfile();
    }
  }, [user, isEmployer]);

  useEffect(() => {
    if (companyProfile) {
      fetchProjects();
      fetchApplications();
    }
  }, [companyProfile]);

  const fetchCompanyProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("company_profiles")
        .select("id, name, website, sector, city, full_address, contact_email, organization_logo_url")
        .eq("owner_user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.info("No company profile found. Contact support to link your company.");
      }

      setCompanyProfile(data);
    } catch (error: any) {
      console.error("Error fetching company profile:", error);
      toast.error("Failed to load company profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setProjectsLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id,
          title,
          status,
          description,
          pricing_usd,
          duration_weeks,
          team_size,
          course_profiles!inner(title)
        `)
        .eq("company_profile_id", companyProfile!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProjects(data || []);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setApplicationsLoading(true);
      
      // First, fetch applications with project data
      const { data: applicationsData, error: appsError } = await supabase
        .from("project_applications")
        .select(`
          id,
          created_at,
          status,
          project_id,
          student_id,
          projects!inner(
            title,
            company_profile_id
          )
        `)
        .eq("projects.company_profile_id", companyProfile!.id)
        .order("created_at", { ascending: false });

      if (appsError) throw appsError;

      if (!applicationsData || applicationsData.length === 0) {
        setApplications([]);
        return;
      }

      // Second, fetch student profiles for all unique student_ids
      const studentIds = [...new Set(applicationsData.map(app => app.student_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", studentIds);

      if (profilesError) throw profilesError;

      // Merge applications with student profile data
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const enrichedApplications = applicationsData.map(app => ({
        ...app,
        student_email: profilesMap.get(app.student_id)?.email || null
      }));

      setApplications(enrichedApplications);
    } catch (error: any) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load student applications");
    } finally {
      setApplicationsLoading(false);
    }
  };

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "outline";
      default:
        return "outline";
    }
  };

  const getApplicationStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Approved";
      case "pending":
        return "Pending Review";
      case "rejected":
        return "Rejected";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "curated_live":
        return "default";
      case "in_progress":
        return "secondary";
      case "completed":
        return "outline";
      case "ai_shell":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "curated_live":
        return "Live";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "ai_shell":
        return "Draft";
      default:
        return status;
    }
  };

  const handleRateStudent = (application: StudentApplication) => {
    setSelectedStudent({
      id: application.student_id,
      email: application.student_email,
      projectId: application.project_id,
      projectTitle: application.projects.title,
    });
    setRatingDialogOpen(true);
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <EmployerDashboardSkeleton />
      </>
    );
  }

  if (!companyProfile) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Employer Dashboard</h1>
          <Card>
            <CardHeader>
              <CardTitle>No Company Profile</CardTitle>
              <CardDescription>
                Your account is not linked to a company profile. Please contact support to get started.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Employer Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Welcome back, {companyProfile.name}
        </p>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Profile
              </CardTitle>
              <CardDescription>
                Your company information and details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {companyProfile.organization_logo_url && (
                <div className="flex items-center gap-4">
                  <img
                    src={companyProfile.organization_logo_url}
                    alt={`${companyProfile.name} logo`}
                    className="h-16 w-16 object-contain rounded"
                  />
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Company Name</p>
                  <p className="font-medium">{companyProfile.name}</p>
                </div>

                {companyProfile.sector && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Industry Sector</p>
                    <p className="font-medium">{companyProfile.sector}</p>
                  </div>
                )}

                {companyProfile.website && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      Website
                    </p>
                    <a
                      href={companyProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {companyProfile.website}
                    </a>
                  </div>
                )}

                {companyProfile.contact_email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Contact Email
                    </p>
                    <p className="font-medium">{companyProfile.contact_email}</p>
                  </div>
                )}

                {(companyProfile.city || companyProfile.full_address) && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location
                    </p>
                    <p className="font-medium">
                      {companyProfile.full_address || companyProfile.city}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                My Projects
              </CardTitle>
              <CardDescription>
                Student projects and partnership opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : projects.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No projects found. Projects will appear here once they're created for your company.
                </p>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold truncate">{project.title}</h4>
                            <Badge variant={getStatusColor(project.status)}>
                              {getStatusLabel(project.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Course: {project.course_profiles.title}
                          </p>
                          {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {project.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>💰 ${project.pricing_usd.toLocaleString()}</span>
                            <span>⏱️ {project.duration_weeks} weeks</span>
                            <span>👥 Team of {project.team_size}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Student Applicants</CardTitle>
              <CardDescription>
                Students interested in working with your company
              </CardDescription>
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : applications.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No student applications yet. Applications will appear here when students apply to your projects.
                </p>
              ) : (
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold truncate">
                              {application.student_email || 'Unknown Student'}
                            </h4>
                            <Badge variant={getApplicationStatusColor(application.status)}>
                              {getApplicationStatusLabel(application.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Applied to: {application.projects.title}
                          </p>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>📅 Applied {new Date(application.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {application.status === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRateStudent(application)}
                            className="gap-1"
                          >
                            <Star className="h-4 w-4" />
                            Rate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rating Dialog */}
        {selectedStudent && (
          <StudentRatingDialog
            open={ratingDialogOpen}
            onOpenChange={setRatingDialogOpen}
            studentId={selectedStudent.id}
            studentEmail={selectedStudent.email}
            projectId={selectedStudent.projectId}
            projectTitle={selectedStudent.projectTitle}
            onRated={() => {
              toast.success("Rating submitted successfully");
            }}
          />
        )}
      </main>
    </>
  );
}
