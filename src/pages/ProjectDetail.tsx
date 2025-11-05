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
import { EnhancedOverviewTab } from "@/components/project-detail/EnhancedOverviewTab";
import { EnhancedMarketIntelligenceTab } from "@/components/project-detail/EnhancedMarketIntelligenceTab";
import { PartnershipContactTab } from "@/components/project-detail/PartnershipContactTab";
import { AcademicAlignmentTab } from "@/components/project-detail/AcademicAlignmentTab";
import { ProjectValidationTab } from "@/components/project-detail/ProjectValidationTab";
import { ValueAnalysisTab } from "@/components/project-detail/ValueAnalysisTab";
import { Navigation } from "@/components/Navigation";
import { useProjectAnalytics } from "@/hooks/useProjectAnalytics";

const ProjectDetail = () => {
  const { id } = useParams();
  const { user, loading: authLoading, requireAuth } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [forms, setForms] = useState<any>(null);
  const [courseProfile, setCourseProfile] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Track analytics with enrichment data
  useProjectAnalytics(id || '', project?.title || '', companyProfile);

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

      // Load project metadata
      const { data: metadataData, error: metadataError } = await supabase
        .from('project_metadata')
        .select('*')
        .eq('project_id', id)
        .maybeSingle();

      // Load company profile if available
      let companyData = null;
      if (projectData.company_profile_id) {
        const { data: companyProfileData } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('id', projectData.company_profile_id)
          .single();
        companyData = companyProfileData;
      }

      setProject(projectData);
      setForms(formsData);
      setCourseProfile(courseData);
      setMetadata(metadataData);
      setCompanyProfile(companyData);
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
            <CardDescription>The project you're looking for doesn't exist or you don't have access to it.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <ProjectHeader project={project} />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 p-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="value-analysis">Value Proposition</TabsTrigger>
            <TabsTrigger value="market-insights">Market Intelligence</TabsTrigger>
            <TabsTrigger value="partnership">Partnership & Contact</TabsTrigger>
            <TabsTrigger value="academic">Academic Alignment</TabsTrigger>
            <TabsTrigger value="validation">Project Validation</TabsTrigger>
            <TabsTrigger value="feedback">Review & Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <EnhancedOverviewTab project={project} forms={forms} metadata={metadata} />
          </TabsContent>

          <TabsContent value="value-analysis">
            <ValueAnalysisTab 
              valueAnalysis={metadata?.value_analysis}
              stakeholderInsights={metadata?.stakeholder_insights}
              synergyIndex={metadata?.synergistic_value_index || 0}
              partnershipQuality={metadata?.partnership_quality_score || 0}
              projectId={id!}
              companyProfile={companyProfile}
              project={project}
              courseProfile={courseProfile}
              onAnalysisComplete={loadProjectData}
            />
          </TabsContent>

          <TabsContent value="market-insights">
            <EnhancedMarketIntelligenceTab 
              companyProfile={companyProfile}
              projectMetadata={metadata}
              project={project}
              courseProfile={courseProfile}
            />
          </TabsContent>

          <TabsContent value="partnership">
            <PartnershipContactTab 
              forms={forms} 
              companyProfile={companyProfile}
              projectId={id!}
              projectTitle={project.title}
              onDataRefresh={loadProjectData}
            />
          </TabsContent>

          <TabsContent value="academic">
            <AcademicAlignmentTab 
              project={project}
              courseProfile={courseProfile}
              forms={forms}
              metadata={metadata}
            />
          </TabsContent>

          <TabsContent value="validation">
            <ProjectValidationTab 
              metadata={metadata}
              project={project}
              course={courseProfile}
            />
          </TabsContent>

          <TabsContent value="feedback">
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm font-medium flex items-center gap-2">
                  <span className="text-primary">📝 Final Step:</span>
                  Review and provide feedback on this project proposal
                </p>
              </div>
              <ProjectFeedback projectId={id!} onSubmitted={loadProjectData} />
            </div>
          </TabsContent>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Title</p>
                    <p className="font-medium">{forms.form1?.title || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Industry</p>
                    <Badge variant="secondary">{forms.form1?.industry || 'N/A'}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{forms.form1?.description || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Budget</p>
                    <p className="text-lg font-bold text-primary">${forms.form1?.budget?.toLocaleString() || '0'}</p>
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
                    <p className="font-medium">{forms.form2?.company || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Sector</p>
                    <Badge variant="secondary">{forms.form2?.sector || 'N/A'}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Size</p>
                    <p>{forms.form2?.size || 'N/A'}</p>
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
                      {forms.form3?.skills?.map((skill: string, i: number) => (
                        <Badge key={i} variant="outline">{skill}</Badge>
                      )) || <span className="text-sm text-muted-foreground">N/A</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Team Size</p>
                    <p className="font-medium">{forms.form3?.team_size || 'N/A'} students</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Deliverables</p>
                    <ul className="space-y-1">
                      {forms.form3?.deliverables?.map((d: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{d}</span>
                        </li>
                      )) || <span className="text-sm text-muted-foreground">N/A</span>}
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
                    <p className="font-medium">{forms.form4?.start || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">End Date</p>
                    <p className="font-medium">{forms.form4?.end || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Duration</p>
                    <p className="text-lg font-bold text-primary">{forms.form4?.weeks || 'N/A'} weeks</p>
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
                    <Badge variant="secondary">{forms.form5?.type || 'N/A'}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Scope</p>
                    <p>{forms.form5?.scope || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Location</p>
                    <p>{forms.form5?.location || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">IP Rights</p>
                    <p>{forms.form5?.ip || 'N/A'}</p>
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
                    <Badge variant="secondary">{forms.form6?.category || 'N/A'}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Year</p>
                    <p>{forms.form6?.year || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Hours per Week</p>
                    <p className="font-medium">{forms.form6?.hours_per_week || 'N/A'} hrs</p>
                  </div>
                </CardContent>
              </Card>
            </div>
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

          <TabsContent value="algorithm">
            <AlgorithmTab project={project} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectDetail;
