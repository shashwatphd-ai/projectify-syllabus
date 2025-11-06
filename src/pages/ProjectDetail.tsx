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
import { AlgorithmTab } from "@/components/project-detail/AlgorithmTab";
import { LearningOutcomeAlignment } from "@/components/project-detail/LearningOutcomeAlignment";
import { TimelineTab } from "@/components/project-detail/TimelineTab";
import { VerificationTab } from "@/components/project-detail/VerificationTab";
import { MarketInsightsTab } from "@/components/project-detail/MarketInsightsTab";
import { ValueAnalysisTab } from "@/components/project-detail/ValueAnalysisTab";
import { Navigation } from "@/components/Navigation";
import { useProjectAnalytics } from "@/hooks/useProjectAnalytics";

const ProjectDetail = () => {
  const { id } = useParams();
  const { user, loading: authLoading, requireAuth } = useAuth();
  const navigate = useNavigate();
  
  // ============================================================================
  // UNIFIED STATE: Single source of truth from get-project-detail endpoint
  // ============================================================================
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Track analytics with enrichment data
  useProjectAnalytics(
    id || '', 
    data?.project?.title || '', 
    data?.company || null
  );

  useEffect(() => {
    requireAuth();
  }, [authLoading]);

  useEffect(() => {
    if (user && id) {
      loadProjectData();
    }
  }, [user, id]);

  /**
   * SINGLE DATA FETCH: Replaces 5 sequential queries
   * Uses the verified get-project-detail endpoint for guaranteed clean data
   */
  const loadProjectData = async () => {
    try {
      setLoading(true);
      
      // Single call to unified endpoint
      const { data: response, error } = await supabase.functions.invoke('get-project-detail', {
        body: { projectId: id }
      });

      if (error) {
        console.error('[ProjectDetail] Endpoint error:', error);
        throw error;
      }

      if (!response) {
        throw new Error('No data returned from endpoint');
      }

      console.log('[ProjectDetail] Received clean data:', {
        dataQuality: response.data_quality,
        pricingStatus: response.metadata?.pricing_breakdown?.status,
        valueAnalysisStatus: response.metadata?.value_analysis?.status,
        technologiesNormalized: response.data_quality?.technologies_normalized
      });

      // Set unified data state
      setData(response);
      
    } catch (error: any) {
      console.error('[ProjectDetail] Load error:', error);
      // Keep data as null to trigger "Not Found" UI
      setData(null);
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

  if (!data || !data.project || !data.forms) {
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

  // Extract data for easier access (backward compatibility with existing components)
  const { project, forms, course, metadata, company, contact_info } = data;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <ProjectHeader project={project} />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 p-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="value-analysis">Value Analysis</TabsTrigger>
            <TabsTrigger value="market-insights">Market Intelligence</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="logistics">Logistics</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="lo-mapping">LO Alignment</TabsTrigger>
            <TabsTrigger value="feedback">Review & Feedback</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
            <TabsTrigger value="forms">All Forms</TabsTrigger>
            <TabsTrigger value="algorithm">Algorithm</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab project={project} forms={forms} metadata={metadata} />
          </TabsContent>

          <TabsContent value="value-analysis">
            <ValueAnalysisTab 
              valueAnalysis={metadata?.value_analysis}
              stakeholderInsights={metadata?.stakeholder_insights}
              synergyIndex={metadata?.synergistic_value_index || 0}
              partnershipQuality={metadata?.partnership_quality_score || 0}
              projectId={id!}
              companyProfile={company}
              project={project}
              courseProfile={course}
              onAnalysisComplete={loadProjectData}
            />
          </TabsContent>

          <TabsContent value="market-insights">
            <MarketInsightsTab 
              companyProfile={company}
              projectMetadata={metadata}
              project={project}
              courseProfile={course}
            />
          </TabsContent>

          <TabsContent value="contact">
            <ContactTab 
              forms={forms} 
              companyProfile={company}
              contactInfo={contact_info}
              projectId={id!}
              projectTitle={project.title}
              onDataRefresh={loadProjectData}
            />
          </TabsContent>

          <TabsContent value="timeline">
            <TimelineTab project={project} forms={forms} />
          </TabsContent>

          <TabsContent value="logistics">
            <LogisticsTab forms={forms} />
          </TabsContent>

          <TabsContent value="academic">
            <AcademicTab forms={forms} />
          </TabsContent>

          <TabsContent value="lo-mapping" className="space-y-6">
            <LearningOutcomeAlignment project={project} courseProfile={course} />
          </TabsContent>

          <TabsContent value="feedback">
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm font-medium flex items-center gap-2">
                  <span className="text-primary">📝 Step 7 of 9:</span>
                  Review and provide feedback on this project proposal
                </p>
              </div>
              <ProjectFeedback projectId={id!} onSubmitted={loadProjectData} />
            </div>
          </TabsContent>

          <TabsContent value="verification" className="space-y-6">
            <VerificationTab metadata={metadata} project={project} course={course} />
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
