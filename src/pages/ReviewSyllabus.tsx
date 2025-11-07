import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { SyllabusReview } from "@/components/SyllabusReview";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ReviewSyllabus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [rawText, setRawText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const courseId = searchParams.get('courseId');
  const parsedDataParam = searchParams.get('parsed');
  const rawTextParam = searchParams.get('rawText');

  useEffect(() => {
    if (!courseId) {
      navigate('/upload');
      return;
    }

    const loadCourse = async () => {
      try {
        setError(null);
        const { data, error } = await supabase
          .from('course_profiles')
          .select('*')
          .eq('id', courseId)
          .single();

        if (error) throw error;
        
        if (!data) {
          throw new Error('Course not found');
        }
        
        setCourse(data);

        // Get parsed data from URL or construct from DB
        if (parsedDataParam) {
          setParsedData(JSON.parse(decodeURIComponent(parsedDataParam)));
        } else {
          setParsedData({
            title: data.title,
            level: data.level,
            weeks: data.weeks,
            hrs_per_week: data.hrs_per_week,
            outcomes: data.outcomes,
            artifacts: data.artifacts,
            schedule: data.schedule || []
          });
        }

        if (rawTextParam) {
          setRawText(decodeURIComponent(rawTextParam));
        }
      } catch (error: any) {
        console.error('Error loading course:', error);
        const errorMessage = error.message || 'Failed to load course data';
        setError(errorMessage);
        
        // Only navigate away if it's a critical error after retries
        if (retryCount >= 2) {
          toast.error('Unable to load course data. Please try uploading again.');
          setTimeout(() => navigate('/upload'), 2000);
        } else {
          toast.error('Connection issue. Retrying...');
        }
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId, parsedDataParam, rawTextParam, navigate, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setLoading(true);
  };

  const handleContinue = () => {
    // Auto-navigate to configure with minimal friction
    navigate(`/configure?courseId=${courseId}`);
  };

  const handleSkipToGenerate = () => {
    // Quick path: Skip to generation with defaults
    navigate(`/configure?courseId=${courseId}&autoGenerate=true`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading course data...</p>
            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground">Retry attempt {retryCount}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>{error}</p>
              {retryCount < 2 && (
                <Button onClick={handleRetry} variant="outline" size="sm">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Review Syllabus</h1>
            <p className="text-muted-foreground mt-2">
              Verify the extracted information before generating projects
            </p>
          </div>

          {parsedData && (
            <SyllabusReview 
              courseId={courseId!} 
              parsedData={parsedData}
              rawText={rawText}
            />
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Review looks good? Generate projects with smart defaults, or customize settings first.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleContinue} variant="outline" size="lg">
                Customize Settings
              </Button>
              <Button onClick={handleSkipToGenerate} size="lg">
                Generate Projects Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
