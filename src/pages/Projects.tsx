import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, TrendingUp, Loader2, AlertTriangle, Download, CheckCircle, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { downloadCoursePdf } from "@/lib/downloadPdf";
import { toast } from "sonner";
import { ProjectFeedbackDialog } from "@/components/ProjectFeedbackDialog";

const Projects = () => {
  const { user, loading: authLoading, requireAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId') || location.state?.courseId;
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingCourseId, setDownloadingCourseId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'faculty' | 'admin' | 'employer' | null>(null);
  const [appliedProjects, setAppliedProjects] = useState<Set<string>>(new Set());
  const [applyingProjectId, setApplyingProjectId] = useState<string | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedProjectForFeedback, setSelectedProjectForFeedback] = useState<any>(null);

  useEffect(() => {
    requireAuth();
  }, [authLoading]);

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (user && userRole) {
      loadProjects();
      if (userRole === 'student') {
        loadStudentApplications();
      }
    }
  }, [user, userRole, courseId]);

  const checkUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id);
      
      if (error) {
        console.error('Error checking user role:', error);
        setUserRole('student');
        return;
      }
      
      if (data && data.length > 0) {
        // Extract all roles and prioritize: admin > faculty > employer > student
        const roles = data.map(r => r.role);
        
        if (roles.includes('admin')) {
          setUserRole('admin');
        } else if (roles.includes('faculty') || roles.includes('pending_faculty')) {
          setUserRole('faculty');
        } else if (roles.includes('employer')) {
          setUserRole('employer');
        } else {
          setUserRole('student');
        }
      } else {
        setUserRole('student');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole('student');
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);

      if (userRole === 'student') {
        // Students see only curated_live projects
        const { data, error } = await supabase
          .from('projects')
          .select('*, course_profiles(owner_id, title)')
          .eq('status', 'curated_live')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);

      } else if (userRole === 'faculty') {
        // Faculty see all projects from courses they own (all statuses)
        let query = supabase
          .from('projects')
          .select('*, course_profiles!inner(owner_id, title)')
          .eq('course_profiles.owner_id', user!.id);

        if (courseId) {
          query = query.eq('course_id', courseId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);

      } else if (userRole === 'admin') {
        // Admins see all projects (all statuses)
        let query = supabase
          .from('projects')
          .select('*, course_profiles(owner_id, title)');

        if (courseId) {
          query = query.eq('course_id', courseId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);

      } else if (userRole === 'employer') {
        // Employers see only their company's live projects
        const { data: companyData } = await supabase
          .from('company_profiles')
          .select('id')
          .eq('owner_user_id', user!.id)
          .maybeSingle();

        if (companyData) {
          const { data, error } = await supabase
            .from('projects')
            .select('*, course_profiles(owner_id, title)')
            .eq('company_profile_id', companyData.id)
            .in('status', ['curated_live', 'in_progress', 'completed'])
            .order('created_at', { ascending: false });

          if (error) throw error;
          setProjects(data || []);
        } else {
          setProjects([]);
        }
      }
    } catch (error: any) {
      console.error('Load projects error:', error);
      toast.error('Failed to load projects');
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

  const handleRateProject = (project: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    setSelectedProjectForFeedback(project);
    setFeedbackDialogOpen(true);
  };

  const handleFeedbackSuccess = () => {
    loadProjects(); // Reload to show updated rating
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
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      {project.company_logo_url ? (
                        <img 
                          src={project.company_logo_url} 
                          alt={`${project.company_name} logo`}
                          className="h-10 w-10 object-contain rounded flex-shrink-0"
                        />
                      ) : (
                        <Briefcase className="h-10 w-10 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg leading-tight truncate">{project.company_name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{project.sector}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base leading-snug">{project.title}</CardTitle>
                      {project.needs_review && (
                        <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Review
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">LO Coverage</span>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-secondary" />
                      <span className="font-semibold text-sm">{Math.round(project.lo_score * 100)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-semibold text-sm">${project.pricing_usd.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tier</span>
                    <Badge variant="outline" className="text-xs py-0">{project.tier}</Badge>
                  </div>

                  <div className="pt-3 border-t space-y-2">
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
                    ) : (userRole === 'faculty' || userRole === 'admin') ? (
                      <>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => navigate(`/projects/${project.id}`, { state: { courseId } })}
                          >
                            View Details
                          </Button>
                          <Button 
                            variant={project.faculty_rating ? "secondary" : "default"}
                            size="icon"
                            onClick={(e) => handleRateProject(project, e)}
                            title={project.faculty_rating ? `Rated ${project.faculty_rating}★` : "Rate this project"}
                          >
                            <Star className={`h-4 w-4 ${project.faculty_rating ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                          </Button>
                        </div>
                        {project.faculty_rating && (
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <span>Your rating:</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`h-3 w-3 ${star <= project.faculty_rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
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

      {/* PHASE 2: Feedback Dialog */}
      {selectedProjectForFeedback && (
        <ProjectFeedbackDialog
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
          projectId={selectedProjectForFeedback.id}
          projectTitle={selectedProjectForFeedback.title}
          currentRating={selectedProjectForFeedback.faculty_rating}
          currentFeedback={selectedProjectForFeedback.faculty_feedback}
          currentTags={selectedProjectForFeedback.rating_tags}
          onSuccess={handleFeedbackSuccess}
        />
      )}
    </div>
  );
};

export default Projects;
