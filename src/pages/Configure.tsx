import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";

const Configure = () => {
  const location = useLocation();
  const courseData = location.state?.courseData;
  const [industries, setIndustries] = useState("");
  const [companies, setCompanies] = useState("");
  const [numTeams, setNumTeams] = useState("4");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseData) {
      toast.error("Course data not found. Please upload a syllabus first.");
      navigate("/upload");
      return;
    }

    setLoading(true);

    // TODO: Call edge function to generate projects
    setTimeout(() => {
      toast.success("Projects generated successfully!");
      navigate("/projects", {
        state: {
          projects: [
            // Mock data - will be replaced with actual generated projects
            {
              id: "1",
              title: "Healthcare Efficiency Analysis",
              company: "Metro Health Partners",
              sector: "Healthcare",
              lo_score: 0.85,
            },
          ],
        },
      });
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
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
