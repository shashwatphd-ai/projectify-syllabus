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
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectDetail;
