import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, TrendingUp, Loader2, AlertTriangle, Download, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { downloadCoursePdf } from "@/lib/downloadPdf";
import { toast } from "sonner";

const Projects = () => {
  const { user, loading: authLoading, requireAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId') || location.state?.courseId;
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingCourseId, setDownloadingCourseId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [appliedProjects, setAppliedProjects] = useState<Set<string>>(new Set());
  const [applyingProjectId, setApplyingProjectId] = useState<string | null>(null);

  useEffect(() => {
    requireAuth();
  }, [authLoading]);

  useEffect(() => {
    if (user) {
      checkUserRole();
      loadProjects();
    }
  }, [user, courseId]);

  const checkUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .single();
      
      if (error) throw error;
      setUserRole(data?.role || 'student');
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole('student'); // Default to student
    }
  };

  const loadProjects = async () => {
    try {
      // Check user role first
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .single();
      
      const role = roleData?.role || 'student';
      
      let query = supabase
        .from('projects')
        .select('*, course_profiles!inner(owner_id, title)');
      
      if (role === 'student') {
        // Students see all curated_live projects
        query = query.eq('status', 'curated_live');
      } else {
        // Faculty/admin see their own projects
        query = query.in('status', ['ai_shell', 'curated_live']);
        
        if (courseId) {
          query = query.eq('course_id', courseId);
        } else {
          query = query.eq('course_profiles.owner_id', user!.id);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);

      // If student, load their applications
      if (role === 'student') {
        loadStudentApplications();
      }
    } catch (error: any) {
      console.error('Load projects error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('project_applications')
        .select('project_id')
        .eq('student_id', user!.id);
      
      if (error) throw error;
      
      const appliedIds = new Set(data?.map(app => app.project_id) || []);
      setAppliedProjects(appliedIds);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const handleApplyToProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    
    if (!user) {
      toast.error('You must be logged in to apply');
      return;
    }

    setApplyingProjectId(projectId);
    
    try {
      const { error } = await supabase
        .from('project_applications')
        .insert({
          project_id: projectId,
          student_id: user.id,
          status: 'pending'
        });

      if (error) {
        // Check if it's a duplicate application error
        if (error.code === '23505') {
          toast.info('You have already applied to this project');
        } else {
          throw error;
        }
      } else {
        toast.success('Application submitted successfully!');
        // Update local state
        setAppliedProjects(prev => new Set([...prev, projectId]));
      }
    } catch (error: any) {
      console.error('Apply error:', error);
      toast.error('Failed to submit application');
    } finally {
      setApplyingProjectId(null);
    }
  };

  const handleDownloadSyllabus = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    setDownloadingCourseId(courseId);
    try {
      await downloadCoursePdf(courseId);
    } catch (error) {
      // Error is already toasted in downloadCoursePdf
    } finally {
      setDownloadingCourseId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Projects Found</CardTitle>
            <CardDescription>
              Please generate projects first by uploading a syllabus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/upload")} className="w-full">
              Upload Syllabus
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Generated Projects</h1>
            <p className="text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? "s" : ""} generated based on your course outcomes
            </p>
          </div>
          {courseId && (
            <Button
              variant="outline"
              onClick={(e) => handleDownloadSyllabus(courseId, e)}
              disabled={downloadingCourseId === courseId}
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadingCourseId === courseId ? "Downloading..." : "Download Syllabus"}
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project: any) => (
            <Card
              key={project.id}
              className="shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`, { state: { courseId } })}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                      {project.needs_review && (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Review
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {project.company_name}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{project.sector}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">LO Coverage</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-secondary" />
                      <span className="font-semibold">{Math.round(project.lo_score * 100)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-semibold">${project.pricing_usd.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tier</span>
                    <Badge variant="outline">{project.tier}</Badge>
                  </div>

                  <div className="pt-3 border-t">
                    {userRole === 'student' ? (
                      <Button 
                        variant={appliedProjects.has(project.id) ? "outline" : "default"}
                        className="w-full"
                        onClick={(e) => handleApplyToProject(project.id, e)}
                        disabled={appliedProjects.has(project.id) || applyingProjectId === project.id}
                      >
                        {applyingProjectId === project.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Applying...
                          </>
                        ) : appliedProjects.has(project.id) ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Applied
                          </>
                        ) : (
                          'Apply Now'
                        )}
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate(`/projects/${project.id}`, { state: { courseId } })}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Projects;
