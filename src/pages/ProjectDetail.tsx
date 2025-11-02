import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProjectFeedback from "@/components/ProjectFeedback";
import { ProjectHeader } from "@/components/project-detail/ProjectHeader";
import { OverviewTab } from "@/components/project-detail/OverviewTab";
import { ContactTab } from "@/components/project-detail/ContactTab";
import { LogisticsTab } from "@/components/project-detail/LogisticsTab";
import { AcademicTab } from "@/components/project-detail/AcademicTab";

const ProjectDetail = () => {
  const { id } = useParams();
  const { user, loading: authLoading, requireAuth } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [forms, setForms] = useState<any>(null);
  const [courseProfile, setCourseProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requireAuth();
  }, [authLoading]);

  useEffect(() => {
    if (user && id) {
      loadProjectData();
    }
  }, [user, id]);

  const loadProjectData = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;

      const { data: formsData, error: formsError } = await supabase
        .from('project_forms')
        .select('*')
        .eq('project_id', id)
        .single();

      if (formsError) throw formsError;

      // Load course profile for LO mapping
      const { data: courseData, error: courseError } = await supabase
        .from('course_profiles')
        .select('*')
        .eq('id', projectData.course_id)
        .single();

      if (courseError) throw courseError;

      setProject(projectData);
      setForms(formsData);
      setCourseProfile(courseData);
    } catch (error: any) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project || !forms) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Project Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/projects")}>Back to Projects</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <ProjectHeader project={project} />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 p-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="logistics">Logistics</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="lo-mapping">LO Mapping</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab project={project} forms={forms} />
          </TabsContent>

          <TabsContent value="contact">
            <ContactTab forms={forms} />
          </TabsContent>

          <TabsContent value="logistics">
            <LogisticsTab forms={forms} />
          </TabsContent>

          <TabsContent value="academic">
            <AcademicTab forms={forms} />
          </TabsContent>

          <TabsContent value="lo-mapping" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Learning Outcomes Mapping</CardTitle>
                <CardDescription>How this project aligns with course learning outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Course Learning Outcomes</h3>
                    <ul className="space-y-2 mb-4">
                      {courseProfile?.outcomes && (Array.isArray(courseProfile.outcomes) ? courseProfile.outcomes : []).map((outcome: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5">LO{i + 1}</Badge>
                          <span>{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-3">Project Tasks Mapping</h3>
                    <ul className="space-y-2 mb-4">
                      {(project.tasks as string[]).map((task, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-secondary font-bold">→</span>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-3">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {forms.form3.skills.map((skill: string, i: number) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-3">Deliverables</h3>
                    <ul className="space-y-2">
                      {(project.deliverables as string[]).map((del, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary font-bold">✓</span>
                          <span>{del}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-3">Alignment Score</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${project.lo_score * 100}%` }}
                        />
                      </div>
                      <span className="text-2xl font-bold text-primary">{Math.round(project.lo_score * 100)}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      This project covers {Math.round(project.lo_score * 100)}% of the course learning outcomes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forms" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Title</p>
                    <p className="font-medium">{forms.form1.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Industry</p>
                    <Badge variant="secondary">{forms.form1.industry}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{forms.form1.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Budget</p>
                    <p className="text-lg font-bold text-primary">${forms.form1.budget.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Company Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Company</p>
                    <p className="font-medium">{forms.form2.company}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Sector</p>
                    <Badge variant="secondary">{forms.form2.sector}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Size</p>
                    <p>{forms.form2.size}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Team Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {forms.form3.skills.map((skill: string, i: number) => (
                        <Badge key={i} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Team Size</p>
                    <p className="font-medium">{forms.form3.team_size} students</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Deliverables</p>
                    <ul className="space-y-1">
                      {forms.form3.deliverables.map((d: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                    <p className="font-medium">{forms.form4.start}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">End Date</p>
                    <p className="font-medium">{forms.form4.end}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Duration</p>
                    <p className="text-lg font-bold text-primary">{forms.form4.weeks} weeks</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Type</p>
                    <Badge variant="secondary">{forms.form5.type}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Scope</p>
                    <p>{forms.form5.scope}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Location</p>
                    <p>{forms.form5.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">IP Rights</p>
                    <p>{forms.form5.ip}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Course Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Category</p>
                    <Badge variant="secondary">{forms.form6.category}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Year</p>
                    <p>{forms.form6.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Hours per Week</p>
                    <p className="font-medium">{forms.form6.hours_per_week} hrs</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="milestones" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
                <CardDescription>Key checkpoints throughout the engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-6">
                    {forms.milestones.map((milestone: any, i: number) => (
                      <div key={i} className="relative flex items-start gap-6">
                        <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {milestone.week || `W${i + 1}`}
                          </span>
                        </div>
                        <div className="flex-1 pt-3">
                          <h4 className="font-semibold mb-1">{milestone.name || `Milestone ${i + 1}`}</h4>
                          <p className="text-sm text-muted-foreground">{milestone.task || milestone.description || ''}</p>
                          {milestone.duration && (
                            <Badge variant="outline" className="mt-2">{milestone.duration}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scoring" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Learning Outcome Coverage</CardTitle>
                  <CardDescription>How well project aligns with course goals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-muted stroke-current"
                          strokeWidth="10"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                        />
                        <circle
                          className="text-primary stroke-current"
                          strokeWidth="10"
                          strokeLinecap="round"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - project.lo_score)}`}
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-primary">{Math.round(project.lo_score * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Feasibility</CardTitle>
                  <CardDescription>Project complexity and achievability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-muted stroke-current"
                          strokeWidth="10"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                        />
                        <circle
                          className="text-secondary stroke-current"
                          strokeWidth="10"
                          strokeLinecap="round"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - project.feasibility_score)}`}
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-secondary">{Math.round(project.feasibility_score * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mutual Benefit</CardTitle>
                  <CardDescription>Value for both students and partner</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-muted stroke-current"
                          strokeWidth="10"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                        />
                        <circle
                          className="text-accent stroke-current"
                          strokeWidth="10"
                          strokeLinecap="round"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - project.mutual_benefit_score)}`}
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-accent">{Math.round(project.mutual_benefit_score * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-xl">Final Score</CardTitle>
                  <CardDescription>Overall project rating</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-muted stroke-current"
                          strokeWidth="8"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                        />
                        <circle
                          className="text-primary stroke-current"
                          strokeWidth="8"
                          strokeLinecap="round"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - project.final_score)}`}
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl font-bold text-primary">{Math.round(project.final_score * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="feedback">
            <ProjectFeedback projectId={id!} onSubmitted={loadProjectData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectDetail;
