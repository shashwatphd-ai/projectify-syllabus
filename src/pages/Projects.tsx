import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Briefcase, TrendingUp } from "lucide-react";

const Projects = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const projects = location.state?.projects || [];

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
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/upload")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Upload
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Generated Projects</h1>
          <p className="text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""} generated based on your course outcomes
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project: any) => (
            <Card
              key={project.id}
              className="shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`, { state: { project } })}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{project.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {project.company}
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

                  <div className="pt-3 border-t">
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
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
