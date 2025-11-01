import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, Calendar, DollarSign, Users, Target, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProjectFeedback from "@/components/ProjectFeedback";

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

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {project.company_name}
              </p>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {project.sector}
            </Badge>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="text-sm text-muted-foreground">LO Coverage</p>
                    <p className="text-2xl font-bold">{Math.round(project.lo_score * 100)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="text-2xl font-bold">${project.pricing_usd.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-2xl font-bold">{project.duration_weeks} weeks</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Team Size</p>
                    <p className="text-2xl font-bold">{project.team_size} students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="lo-mapping">LO Mapping</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Tasks</CardTitle>
                <CardDescription>Core activities derived from learning outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(project.tasks as string[]).map((task, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-secondary mt-1">•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deliverables</CardTitle>
                <CardDescription>Expected outputs from the project</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(project.deliverables as string[]).map((del, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-secondary mt-1">•</span>
                      <span>{del}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Partner organization details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Company Name</h3>
                  <p>{forms.form2.company}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Sector</h3>
                  <p>{forms.form2.sector}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Company Size</h3>
                  <p>{forms.form2.size}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Project Description</h3>
                  <p className="text-muted-foreground">{forms.form1.description}</p>
                </div>
              </CardContent>
            </Card>
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
            <Card>
              <CardHeader>
                <CardTitle>Form 1: Project Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><span className="font-semibold">Title:</span> {forms.form1.title}</div>
                <div><span className="font-semibold">Industry:</span> {forms.form1.industry}</div>
                <div><span className="font-semibold">Description:</span> {forms.form1.description}</div>
                <div><span className="font-semibold">Budget:</span> ${forms.form1.budget.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form 2: Company Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><span className="font-semibold">Company:</span> {forms.form2.company}</div>
                <div><span className="font-semibold">Sector:</span> {forms.form2.sector}</div>
                <div><span className="font-semibold">Size:</span> {forms.form2.size}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form 3: Team Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-semibold">Skills:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {forms.form3.skills.map((skill: string, i: number) => (
                      <Badge key={i} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
                <div><span className="font-semibold">Team Size:</span> {forms.form3.team_size} students</div>
                <div>
                  <span className="font-semibold">Deliverables:</span>
                  <ul className="list-disc list-inside mt-2">
                    {forms.form3.deliverables.map((d: string, i: number) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form 4: Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><span className="font-semibold">Start:</span> {forms.form4.start}</div>
                <div><span className="font-semibold">End:</span> {forms.form4.end}</div>
                <div><span className="font-semibold">Duration:</span> {forms.form4.weeks} weeks</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form 5: Project Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><span className="font-semibold">Type:</span> {forms.form5.type}</div>
                <div><span className="font-semibold">Scope:</span> {forms.form5.scope}</div>
                <div><span className="font-semibold">Location:</span> {forms.form5.location}</div>
                <div><span className="font-semibold">IP Rights:</span> {forms.form5.ip}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form 6: Course Integration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><span className="font-semibold">Category:</span> {forms.form6.category}</div>
                <div><span className="font-semibold">Year:</span> {forms.form6.year}</div>
                <div><span className="font-semibold">Hours per Week:</span> {forms.form6.hours_per_week}</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="milestones" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
                <CardDescription>Key checkpoints throughout the engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {forms.milestones.map((milestone: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 pb-4 border-b last:border-0">
                      <div className="w-20 font-semibold text-primary">{milestone.week}</div>
                      <div className="flex-1">{milestone.task}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Scoring</CardTitle>
                <CardDescription>Evaluation metrics for project fit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Learning Outcome Coverage</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary"
                        style={{ width: `${project.lo_score * 100}%` }}
                      />
                    </div>
                    <span className="font-bold">{Math.round(project.lo_score * 100)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span>Feasibility</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary"
                        style={{ width: `${project.feasibility_score * 100}%` }}
                      />
                    </div>
                    <span className="font-bold">{Math.round(project.feasibility_score * 100)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span>Mutual Benefit</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary"
                        style={{ width: `${project.mutual_benefit_score * 100}%` }}
                      />
                    </div>
                    <span className="font-bold">{Math.round(project.mutual_benefit_score * 100)}%</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-semibold">Final Score</span>
                    <span className="font-bold text-primary">{Math.round(project.final_score * 100)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
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
