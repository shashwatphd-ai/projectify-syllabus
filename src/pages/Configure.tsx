import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";

const Configure = () => {
  const { user, loading: authLoading, requireAuth } = useAuth();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const autoGenerate = searchParams.get('autoGenerate') === 'true';
  const [courseData, setCourseData] = useState<any>(null);
  const [industries, setIndustries] = useState("");
  const [companies, setCompanies] = useState("");
  const [numTeams, setNumTeams] = useState("4");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    requireAuth();
  }, [authLoading]);

  useEffect(() => {
    if (!courseId) {
      toast.error("Course data not found. Please upload a syllabus first.");
      navigate("/upload");
      return;
    }

    const loadCourse = async () => {
      try {
        const { data, error } = await supabase
          .from('course_profiles')
          .select('*')
          .eq('id', courseId)
          .single();

        if (error) throw error;
        setCourseData(data);
      } catch (error) {
        console.error('Error loading course:', error);
        toast.error('Failed to load course data');
        navigate('/upload');
      } finally {
        setDataLoading(false);
      }
    };

    loadCourse();
  }, [courseId, navigate]);

  // Auto-generate if autoGenerate param is present
  useEffect(() => {
    if (autoGenerate && courseData && !dataLoading && !loading) {
      console.log('Auto-generating projects with smart defaults...');
      // Trigger form submission after a brief moment to show the UI
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 500);
    }
  }, [autoGenerate, courseData, dataLoading, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseId) {
      toast.error("Course data not found. Please upload a syllabus first.");
      navigate("/upload");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Enrich company data if city_zip is available
      if (courseData?.city_zip) {
        toast.info("Discovering companies in your area...", { duration: 3000 });
        
        // Use the new discover-companies workflow
        const { error: discoveryError } = await supabase.functions.invoke('discover-companies', {
          body: { 
            courseId: courseId,
            location: courseData.city_zip,
            count: 4
          }
        });

        if (discoveryError) {
          console.warn('Company discovery failed, will use AI generation:', discoveryError);
          toast.warning("Couldn't discover local companies, will generate with AI", { duration: 3000 });
        } else {
          toast.success("Company data ready!", { duration: 2000 });
        }
      }

      // Step 2: Generate projects
      toast.info("Generating projects...", { duration: 3000 });
      const industriesArray = industries.split(',').map(i => i.trim()).filter(Boolean);
      const companiesArray = companies.split(',').map(c => c.trim()).filter(Boolean);

      const { data, error } = await supabase.functions.invoke('generate-projects', {
        body: {
          courseId,
          industries: industriesArray,
          companies: companiesArray,
          numTeams: parseInt(numTeams)
        }
      });

      if (error) {
        // Check if any projects were created despite the error
        const { data: existingProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('course_id', courseId);
        
        if (existingProjects && existingProjects.length > 0) {
          toast.error(
            `Created ${existingProjects.length} of ${numTeams} projects. Rate limit reached - wait 2-3 minutes and retry for remaining projects.`,
            { duration: 8000 }
          );
          navigate(`/projects?courseId=${courseId}`);
        } else {
          throw error;
        }
      } else {
        toast.success(`${data.projectIds.length} projects generated successfully!`);
        navigate(`/projects?courseId=${courseId}`);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      const errorMsg = error.message || "Failed to generate projects";
      if (errorMsg.includes('rate') || errorMsg.includes('429')) {
        toast.error("AI rate limit reached. Please wait 2-3 minutes and try again.", { duration: 6000 });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          {autoGenerate && <p className="text-muted-foreground">Preparing smart project generation...</p>}
        </div>
      </div>
    );
  }

  if (loading && autoGenerate) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center space-y-4 max-w-md">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-2xl font-semibold">Generating Intelligent Matches</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Analyzing course learning outcomes</p>
              <p>✓ Finding relevant companies in {courseData?.city_zip}</p>
              <p>✓ Matching companies to course objectives</p>
              <p className="text-xs mt-4">This may take 30-60 seconds...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Configure Project Generation</h1>
          <p className="text-muted-foreground">
            Customize industries, companies, and team settings
          </p>
        </div>

        {courseData && (
          <Card className="mb-6 bg-accent/50">
            <CardHeader>
              <CardTitle className="text-lg">Course Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Title:</strong> {courseData.title}</div>
              <div><strong>Duration:</strong> {courseData.weeks} weeks</div>
              <div><strong>Hours/Week:</strong> {courseData.hrs_per_week}</div>
              <div><strong>Learning Outcomes:</strong> {courseData.outcomes?.length || 0} identified</div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Settings className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <CardTitle>Project Preferences</CardTitle>
                <CardDescription>
                  Specify your preferred industries and companies
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="industries">Industries</Label>
                <Input
                  id="industries"
                  placeholder="Healthcare, Finance, Technology, Energy"
                  value={industries}
                  onChange={(e) => setIndustries(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Comma-separated list (optional). Leave blank for auto-detection.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companies">Specific Companies</Label>
                <Input
                  id="companies"
                  placeholder="Company A, Company B, Company C"
                  value={companies}
                  onChange={(e) => setCompanies(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Comma-separated list (optional). Leave blank for industry-based generation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numTeams">Number of Project Teams</Label>
                <Input
                  id="numTeams"
                  type="number"
                  min="1"
                  max="20"
                  value={numTeams}
                  onChange={(e) => setNumTeams(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  How many different projects to generate (1-20)
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Projects...
                  </>
                ) : (
                  "Generate Projects"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Configure;
