import { OverviewTab } from "./OverviewTab";
import { ValueAnalysisTab } from "./ValueAnalysisTab";
import { MarketInsightsTab } from "./MarketInsightsTab";
import { ContactTab } from "./ContactTab";
import { TimelineTab } from "./TimelineTab";
import { LogisticsTab } from "./LogisticsTab";
import { AcademicTab } from "./AcademicTab";
import { LearningOutcomeAlignment } from "./LearningOutcomeAlignment";
import { VerificationTab } from "./VerificationTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PrintableProjectViewProps {
  data: any;
}

export const PrintableProjectView = ({ data }: PrintableProjectViewProps) => {
  const { project, forms, course, metadata, company, contact_info } = data;

  return (
    <div className="print-document bg-background p-8 space-y-8">
      {/* Document Header */}
      <div className="print-section border-b pb-6">
        <div className="flex items-start gap-4">
          {project.company_logo_url && (
            <img 
              src={project.company_logo_url} 
              alt={project.company_name} 
              className="w-16 h-16 object-contain rounded"
            />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
            <p className="text-lg text-muted-foreground">{project.company_name}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary">{project.sector}</Badge>
              {project.tier && <Badge variant="outline">{project.tier}</Badge>}
              <Badge variant="outline">Match: {Math.round((project.final_score || 0) * 100)}%</Badge>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Duration:</span>
            <span className="ml-2 font-medium">{project.duration_weeks} weeks</span>
          </div>
          <div>
            <span className="text-muted-foreground">Team Size:</span>
            <span className="ml-2 font-medium">{project.team_size} students</span>
          </div>
          <div>
            <span className="text-muted-foreground">Budget:</span>
            <span className="ml-2 font-medium">${project.pricing_usd?.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">LO Coverage:</span>
            <span className="ml-2 font-medium">{Math.round((project.lo_score || 0) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Section 1: Overview */}
      <div className="print-section">
        <h2 className="text-xl font-semibold mb-4 text-foreground border-b pb-2">Project Overview</h2>
        <OverviewTab project={project} forms={forms} metadata={metadata} />
      </div>

      {/* Section 2: Value Analysis */}
      <div className="print-section">
        <h2 className="text-xl font-semibold mb-4 text-foreground border-b pb-2">Value Analysis</h2>
        <ValueAnalysisTab
          valueAnalysis={metadata?.value_analysis}
          stakeholderInsights={metadata?.stakeholder_insights}
          synergyIndex={metadata?.synergistic_value_index}
          partnershipQuality={metadata?.partnership_quality_score}
          projectId={project?.id}
          companyProfile={company}
          project={project}
          courseProfile={course}
          onAnalysisComplete={() => {}}
        />
      </div>

      {/* Section 3: Market Intelligence */}
      <div className="print-section">
        <h2 className="text-xl font-semibold mb-4 text-foreground border-b pb-2">Market Intelligence</h2>
        <MarketInsightsTab 
          companyProfile={company}
          projectMetadata={metadata}
          project={project}
          courseProfile={course}
        />
      </div>

      {/* Section 4: Company & Contact */}
      <div className="print-section">
        <h2 className="text-xl font-semibold mb-4 text-foreground border-b pb-2">Company & Contact Information</h2>
        <ContactTab 
          forms={forms} 
          companyProfile={company}
          contactInfo={contact_info}
          projectId={project.id}
          projectTitle={project.title}
          onDataRefresh={() => {}}
        />
      </div>

      {/* Section 5: Timeline */}
      <div className="print-section">
        <h2 className="text-xl font-semibold mb-4 text-foreground border-b pb-2">Timeline & Milestones</h2>
        <TimelineTab project={project} forms={forms} />
      </div>

      {/* Section 6: Logistics */}
      <div className="print-section">
        <h2 className="text-xl font-semibold mb-4 text-foreground border-b pb-2">Project Logistics</h2>
        <LogisticsTab forms={forms} />
      </div>

      {/* Section 7: Academic Requirements */}
      <div className="print-section">
        <h2 className="text-xl font-semibold mb-4 text-foreground border-b pb-2">Academic Requirements</h2>
        <AcademicTab forms={forms} />
      </div>

      {/* Section 8: Learning Outcome Alignment */}
      <div className="print-section">
        <h2 className="text-xl font-semibold mb-4 text-foreground border-b pb-2">Learning Outcome Alignment</h2>
        <LearningOutcomeAlignment 
          project={project} 
          courseProfile={course} 
          loAlignmentDetail={metadata?.lo_alignment_detail}
        />
      </div>

      {/* Section 9: Verification */}
      <div className="print-section">
        <h2 className="text-xl font-semibold mb-4 text-foreground border-b pb-2">Verification Status</h2>
        <VerificationTab metadata={metadata} project={project} course={course} />
      </div>

      {/* Section 10: Scoring Summary */}
      <div className="print-section">
        <h2 className="text-xl font-semibold mb-4 text-foreground border-b pb-2">Scoring Summary</h2>
        <Card>
          <CardHeader>
            <CardTitle>Project Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {Math.round((project.final_score || 0) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Final Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {Math.round((project.lo_score || 0) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">LO Alignment</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {Math.round((project.feasibility_score || 0) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Feasibility</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {Math.round((project.mutual_benefit_score || 0) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Mutual Benefit</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="print-section border-t pt-4 text-center text-sm text-muted-foreground">
        <p>Generated by EduThree • {new Date().toLocaleDateString()}</p>
        {course?.title && <p>Course: {course.title}</p>}
      </div>
    </div>
  );
};
