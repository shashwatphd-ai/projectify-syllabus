import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, TrendingUp, Loader2, AlertTriangle, Download, CheckCircle, Star, ChevronRight, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { downloadCoursePdf } from "@/lib/downloadPdf";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectFeedbackDialog } from "@/components/ProjectFeedbackDialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const getQualityBorder = (similarity: number) => {
  if (similarity >= 0.80) return 'border-l-4 border-l-green-500';
  if (similarity >= 0.70) return 'border-l-4 border-l-yellow-500';
  return 'border-l-4 border-l-red-400';
};

const getQualityBadge = (similarity: number) => {
  if (similarity >= 0.85) return { text: 'A+', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
  if (similarity >= 0.80) return { text: 'A', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
  if (similarity >= 0.75) return { text: 'B+', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
  if (similarity >= 0.70) return { text: 'B', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
  return { text: 'C', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
};

const Projects = () => {
  const { user, isStudent, isFaculty, isAdmin, isEmployer, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('course') || searchParams.get('courseId') || location.state?.courseId;
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(initialCourseId);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingCourseId, setDownloadingCourseId] = useState<string | null>(null);
  const [appliedProjects, setAppliedProjects] = useState<Set<string>>(new Set());
  const [applyingProjectId, setApplyingProjectId] = useState<string | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedProjectForFeedback, setSelectedProjectForFeedback] = useState<any>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?mode=signin");
    }
  }, [authLoading, user, navigate]);

  // Load courses for faculty/admin filter dropdown
  useEffect(() => {
    if (user && !authLoading && (isFaculty || isAdmin)) {
      loadCourses();
    }
  }, [user, authLoading, isFaculty, isAdmin]);

  useEffect(() => {
    if (user && !authLoading) {
      loadProjects();
      if (isStudent) {
        loadStudentApplications();
      }
    }
  }, [user, authLoading, isStudent, isFaculty, isAdmin, isEmployer, selectedCourseId]);

  const loadCourses = async () => {
    if (!user) return;
    try {
      let query = supabase.from('course_profiles').select('id, title');
      if (isFaculty && !isAdmin) {
        query = query.eq('owner_id', user.id);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const handleCourseChange = (value: string) => {
    const newCourseId = value === 'all' ? undefined : value;
    setSelectedCourseId(newCourseId);
    // Update URL without full navigation
    if (newCourseId) {
      navigate(`/projects?course=${newCourseId}`, { replace: true });
    } else {
      navigate('/projects', { replace: true });
    }
  };

  const loadProjects = async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (isStudent) {
        // Students see only curated_live projects
        const { data, error } = await supabase
          .from('projects')
          .select('*, course_profiles(owner_id, title)')
        // .eq('status', 'curated_live')
        // .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);

      } else if (isFaculty && !isAdmin) {
        // Faculty see all projects from courses they own (all statuses)
        let query = supabase
          .from('projects')
          .select('*, course_profiles!inner(owner_id, title)')
          .eq('course_profiles.owner_id', user.id);

        if (selectedCourseId) {
          query = query.eq('course_id', selectedCourseId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);

      } else if (isAdmin) {
        // Admins see all projects (all statuses)
        let query = supabase
          .from('projects')
          .select('*, course_profiles(owner_id, title)');

        if (selectedCourseId) {
          query = query.eq('course_id', selectedCourseId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);

      } else if (isEmployer) {
        // Employers see only their company's live projects
        const { data: companyData } = await supabase
          .from('company_profiles')
          .select('id')
          .eq('owner_user_id', user.id)
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
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('project_applications')
        .select('project_id')
        .eq('student_id', user.id);

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
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (projects.length === 0) {
    return (
      <>
        <Header />
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
      </>
    );
  }

  const selectedCourseName = courses.find(c => c.id === selectedCourseId)?.title;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            {selectedCourseId && selectedCourseName ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/projects">All Projects</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedCourseName}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>All Projects</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {selectedCourseName ? `${selectedCourseName} Projects` : "Generated Projects"}
            </h1>
            <p className="text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? "s" : ""} generated based on your course outcomes
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(isFaculty || isAdmin) && courses.length > 0 && (
              <Select value={selectedCourseId || 'all'} onValueChange={handleCourseChange}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filter by course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedCourseId && (
              <Button
                variant="outline"
                onClick={(e) => handleDownloadSyllabus(selectedCourseId, e)}
                disabled={downloadingCourseId === selectedCourseId}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloadingCourseId === selectedCourseId ? "Downloading..." : "Download Syllabus"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project: any) => (
            <Card
              key={project.id}
              className={`shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow cursor-pointer ${project.similarity_score ? getQualityBorder(project.similarity_score) : ''}`}
              onClick={() => navigate(`/projects/${project.id}`, { state: { courseId: selectedCourseId } })}
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

                  {/* Quality Badge */}
                  {project.similarity_score && (
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`${getQualityBadge(project.similarity_score).color} font-semibold`}>
                        {getQualityBadge(project.similarity_score).text}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(project.similarity_score * 100)}% match
                      </span>
                    </div>
                  )}
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
                    {isStudent ? (
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
                    ) : (isFaculty || isAdmin) ? (
                      <>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => navigate(`/projects/${project.id}`, { state: { courseId: selectedCourseId } })}
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
                        onClick={() => navigate(`/projects/${project.id}`, { state: { courseId: selectedCourseId } })}
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
