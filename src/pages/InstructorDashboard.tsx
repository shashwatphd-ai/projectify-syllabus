import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { SyllabusManagement } from "@/components/syllabus/SyllabusManagement";

interface Course {
  id: string;
  title: string;
  level: string;
  weeks: number;
  hrs_per_week: number;
  location_formatted?: string;
  created_at: string;
  outcomes?: any;
}

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const { user, loading, isFaculty } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Handle auth and faculty access
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth?mode=signin");
        return;
      }

      if (!isFaculty) {
        toast.error("Access denied: Faculty role required");
        navigate("/projects");
      }
    }
  }, [user, loading, isFaculty, navigate]);

  // Fetch courses when faculty status is confirmed
  useEffect(() => {
    if (isFaculty && user) {
      fetchCourses();
    }
  }, [isFaculty, user]);

  const fetchCourses = async () => {
    try {
      setCoursesLoading(true);

      const { data: coursesData, error: coursesError } = await supabase
        .from('course_profiles')
        .select('id, title, level, weeks, hrs_per_week, location_formatted, created_at, outcomes')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error("Failed to load courses");
    } finally {
      setCoursesLoading(false);
    }
  };

  if (loading || !isFaculty || !user) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Instructor Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your syllabi and monitor project generation
            </p>
          </div>
          <Button onClick={() => navigate("/upload")}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Syllabus
          </Button>
        </div>

        {coursesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <SyllabusManagement courses={courses} onRefresh={fetchCourses} />
        )}
      </div>
    </>
  );
}
