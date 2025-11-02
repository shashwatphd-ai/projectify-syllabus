import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LearningOutcomeAlignmentProps {
  project: any;
  courseProfile: any;
}

export const LearningOutcomeAlignment = ({ project, courseProfile }: LearningOutcomeAlignmentProps) => {
  // Sample alignment data - would be generated dynamically in production
  const alignmentExamples = [
    {
      activity: "External Environment Analysis",
      description: "Students examine the market landscape, competitors, regulations, and international factors",
      outcomes: ["LO2: Analyze external environmental factors"]
    },
    {
      activity: "Internal Resource Assessment",
      description: "Review company's capabilities, resources, organizational structure, and competitive advantages",
      outcomes: ["LO3: Analyze internal environmental factors"]
    },
    {
      activity: "Strategy Comparison",
      description: "Compare strategic options such as partnerships, acquisitions, diversification, or market focus",
      outcomes: ["LO1: Define strategic concepts", "LO4: Compare business-level and corporate-level strategies"]
    },
    {
      activity: "Strategic Recommendations",
      description: "Craft actionable recommendations and strategic plans based on analysis",
      outcomes: ["LO5: Apply knowledge to make strategic decisions"]
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Learning Outcome Alignment Report</CardTitle>
          <CardDescription>
            Comprehensive mapping of how this project addresses course learning outcomes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Course LO Summary */}
          <div>
            <h3 className="font-semibold mb-3">Course Learning Outcomes</h3>
            <div className="space-y-2">
              {courseProfile?.outcomes && (Array.isArray(courseProfile.outcomes) ? courseProfile.outcomes : []).map((outcome: string, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Badge variant="outline" className="mt-0.5">LO{i + 1}</Badge>
                  <span className="text-sm">{outcome}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alignment Breakdown */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Project Activity Alignment</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Activity</TableHead>
                  <TableHead>Description & Implementation</TableHead>
                  <TableHead className="w-[250px]">Learning Outcomes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alignmentExamples.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.activity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {item.outcomes.map((outcome, j) => (
                          <Badge key={j} variant="secondary" className="mr-1 mb-1 text-xs">
                            {outcome.split(':')[0]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Detailed Alignment Text */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Detailed Alignment Explanation</h3>
            <div className="bg-muted/20 rounded-lg p-6 space-y-4 text-sm leading-relaxed">
              <p>
                <strong>External Analysis (LO2):</strong> Students examine the market landscape by mapping competitors, 
                emergent technologies, and regulatory factors. This directly applies outcome 2 by requiring analysis of 
                external environmental factors including international considerations.
              </p>
              <p>
                <strong>Internal Assessment (LO3):</strong> Evaluating the company's resources, capabilities, organizational 
                structure, and competitive advantages satisfies outcome 3 by engaging students in analyzing internal 
                environmental factors.
              </p>
              <p>
                <strong>Strategy Development (LO1, LO4):</strong> Comparing strategic options such as partnerships, 
                acquisitions, market diversification, or focus strategies addresses both outcome 1 (defining strategic 
                concepts like competitive advantage) and outcome 4 (comparing business-level versus corporate-level strategies).
              </p>
              <p>
                <strong>Strategic Recommendations (LO5):</strong> Delivering a strategic plan with actionable recommendations 
                demonstrates application of knowledge to make informed strategic management decisions, fulfilling outcome 5.
              </p>
              <p className="pt-4 border-t">
                <strong>Summary:</strong> The project is intentionally structured to ensure students practice <strong>all 
                learning outcomes</strong>—from understanding key strategic concepts to conducting environmental and resource 
                analyses, comparing strategic options, and making informed recommendations.
              </p>
            </div>
          </div>

          {/* Rubric Scoring */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Alignment Score Breakdown</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {courseProfile?.outcomes && (Array.isArray(courseProfile.outcomes) ? courseProfile.outcomes : []).map((_: string, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                    <span className="text-sm font-medium">LO{i + 1} Coverage</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${85 + (i * 3)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-primary min-w-[40px] text-right">
                        {85 + (i * 3)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="text-6xl font-bold text-primary">
                    {Math.round(project.lo_score * 100)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Overall LO Alignment</p>
                  <Badge variant="default" className="mt-2">
                    {project.lo_score >= 0.9 ? "Excellent" : project.lo_score >= 0.75 ? "Strong" : "Good"} Alignment
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};