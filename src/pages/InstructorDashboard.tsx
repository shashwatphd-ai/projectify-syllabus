import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SyllabusManagement } from "@/components/syllabus/SyllabusManagement";
import { usePaginatedCourses, type Course } from "@/hooks/usePaginatedCourses";

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const { user, loading, isFaculty } = useAuth();

  // Paginated courses query
  const {
    data: coursesData,
    isLoading: coursesLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchCourses,
  } = usePaginatedCourses({
    userId: user?.id,
    enabled: isFaculty && !!user,
  });

  // Flatten paginated courses
  const courses = useMemo(() => {
    return coursesData?.pages.flatMap((page) => page.courses) ?? [];
  }, [coursesData]);

  const totalCount = coursesData?.pages[0]?.totalCount ?? 0;

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
          <>
            <SyllabusManagement courses={courses} onRefresh={() => { refetchCourses(); }} />
            
            {/* Load More Button */}
            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load More Syllabi (${courses.length} of ${totalCount})`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
