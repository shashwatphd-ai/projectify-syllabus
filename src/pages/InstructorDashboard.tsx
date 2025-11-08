import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CourseMetrics {
  id: string;
  title: string;
  pending_shells: number;
  live_projects: number;
  in_progress: number;
  created_at: string;
}

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [courses, setCourses] = useState<CourseMetrics[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [isFaculty, setIsFaculty] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkFacultyStatus();
    }
  }, [user]);

  useEffect(() => {
    if (isFaculty) {
      fetchCoursesWithMetrics();
    }
  }, [isFaculty]);

  const checkFacultyStatus = async () => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .in('role', ['faculty', 'admin'])
        .maybeSingle();
      
      if (!data) {
        toast.error("Access denied: Faculty role required");
        navigate("/projects");
        return;
      }
      
      setIsFaculty(true);
    } catch (error) {
      console.error('Faculty check error:', error);
      navigate("/projects");
    }
  };

  const fetchCoursesWithMetrics = async () => {
    try {
      setCoursesLoading(true);

      // Fetch courses owned by the current user
      const { data: coursesData, error: coursesError } = await supabase
        .from('course_profiles')
        .select('id, title, created_at')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      if (!coursesData || coursesData.length === 0) {
        setCourses([]);
        return;
      }

      // Fetch project counts for each course
      const coursesWithMetrics = await Promise.all(
        coursesData.map(async (course) => {
          const { data: projectsData } = await supabase
            .from('projects')
            .select('status')
            .eq('course_id', course.id);

          const pending_shells = projectsData?.filter(p => p.status === 'ai_shell').length || 0;
          const live_projects = projectsData?.filter(p => p.status === 'curated_live').length || 0;
          const in_progress = projectsData?.filter(p => p.status === 'in_progress').length || 0;

          return {
            id: course.id,
            title: course.title,
            pending_shells,
            live_projects,
            in_progress,
            created_at: course.created_at
          };
        })
      );

      setCourses(coursesWithMetrics);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error("Failed to load courses");
    } finally {
      setCoursesLoading(false);
    }
  };

  if (loading || !isFaculty) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Instructor Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your courses and monitor project curation status
          </p>
        </div>

        {coursesLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Courses Yet</CardTitle>
              <CardDescription>
                Upload your first syllabus to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/upload")}>
                Upload Syllabus
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <BookOpen className="h-8 w-8 text-primary mb-2" />
                  </div>
                  <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  <CardDescription>
                    Created {new Date(course.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-muted-foreground">Pending Shells</span>
                      </div>
                      <Badge variant="outline">{course.pending_shells}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">Live Projects</span>
                      </div>
                      <Badge variant="outline">{course.live_projects}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-muted-foreground">In Progress</span>
                      </div>
                      <Badge variant="outline">{course.in_progress}</Badge>
                    </div>

                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={() => navigate(`/projects?course=${course.id}`)}
                    >
                      View Projects
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
