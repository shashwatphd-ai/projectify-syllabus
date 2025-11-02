import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Target, Search, FileText, Users } from "lucide-react";

export const AlgorithmTab = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Generation Algorithm</CardTitle>
          <CardDescription>
            The workflow and methodology used to identify, draft, and verify this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Algorithm Overview */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Algorithm for Matching and Drafting Projects
            </h3>
            
            <div className="space-y-6 pl-4 border-l-2 border-primary/20">
              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">Step 1</Badge>
                  <div>
                    <h4 className="font-semibold mb-2">Establish Course Context</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Extracted learning outcomes and course description from syllabus</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Emphasized understanding strategic-management concepts, analyzing external and internal environments</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Compared strategic alternatives and applied insights to decisions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Noted 3-month project timeline for appropriate scoping</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">Step 2</Badge>
                  <div>
                    <h4 className="font-semibold mb-2">Define Search Parameters</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Identified geographical focus and target location</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Targeted diverse range of industries to mirror company sizes and challenges</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Used search tools to scan regional business news and market reports</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Identified growth sectors and strategic opportunities</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">Step 3</Badge>
                  <div>
                    <h4 className="font-semibold mb-2">Select Potential Companies and Challenges</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Compiled list of notable area companies based on local presence</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Considered economic significance and known strategic transitions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Identified plausible strategic challenges (digital disruption, regulatory changes, competition)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Evaluated diversification opportunities and international expansion potential</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">Step 4</Badge>
                  <div>
                    <h4 className="font-semibold mb-2">Draft Project Descriptions</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Framed each challenge as semester-long project requiring strategic analysis</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Involved external environment analysis (market trends, competitors, regulations)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Required assessment of internal resources and capabilities</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Presented multiple strategic alternatives (business-level, corporate-level, international)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Culminated in actionable recommendations for the company</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">Step 5</Badge>
                  <div>
                    <h4 className="font-semibold mb-2">Populate Industry Project Creation Forms (Forms 1-6)</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Entered all required fields across six standardized forms</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Chose recommended team sizes (typically 3–5 students)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Set start and end dates spanning 12–13 weeks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Established reasonable time expectations (6-12 hours per week)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Workflow */}
          <div className="border-t pt-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Workflow for Verifying Learning Outcome Alignment
            </h3>
            
            <div className="space-y-6 pl-4 border-l-2 border-secondary/20">
              {/* Verification Step 1 */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">Step 1</Badge>
                  <div>
                    <h4 className="font-semibold mb-2">Extract Learning Outcomes</h4>
                    <p className="text-sm text-muted-foreground">
                      Extracted explicit learning outcomes from syllabus, including defining strategic-management concepts,
                      analyzing external and internal environmental factors, comparing strategies, and applying knowledge
                      to make strategic management decisions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Step 2 */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">Step 2</Badge>
                  <div>
                    <h4 className="font-semibold mb-2">Create an Alignment Rubric</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Developed rubric mapping each learning outcome to project activities:
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-secondary mt-1">→</span>
                        <span>External analysis ↔ market/industry research, regulatory/policy review</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-secondary mt-1">→</span>
                        <span>Internal analysis ↔ capabilities audit, resource assessment</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-secondary mt-1">→</span>
                        <span>Strategy comparison ↔ developing and evaluating alternative strategies</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-secondary mt-1">→</span>
                        <span>Application ↔ producing final recommendations and strategic plans</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Verification Step 3 */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">Step 3</Badge>
                  <div>
                    <h4 className="font-semibold mb-2">Evaluate Each Project</h4>
                    <p className="text-sm text-muted-foreground">
                      Assessed whether project scope required students to perform both external and internal analyses,
                      consider multiple strategic options, and produce actionable recommendations. Verified that at least
                      one project element corresponded to each learning outcome.
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Step 4 */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">Step 4</Badge>
                  <div>
                    <h4 className="font-semibold mb-2">Ensure Feasibility and Educational Value</h4>
                    <p className="text-sm text-muted-foreground">
                      Confirmed strategic questions were complex enough to challenge students but manageable within
                      three months. Ensured required skills matched the level of junior/senior/graduate business students
                      and that projects would allow practice of strategic frameworks taught in the course.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="border-t pt-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Value Proposition
            </h3>
            <div className="bg-muted/30 rounded-lg p-6 space-y-4">
              <p className="text-sm leading-relaxed">
                This two-part process—<strong>first</strong> selecting realistic local companies and framing projects
                through a strategic-management lens, <strong>then</strong> systematically verifying that each project
                engaged all course learning outcomes—ensures each project is both <strong>academically rigorous</strong> and
                <strong> practically valuable</strong> to the participating companies and students.
              </p>
              <div className="flex items-start gap-3 mt-4">
                <Users className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-semibold">Stakeholder Benefits</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span><strong>Students:</strong> Apply theoretical concepts to real business challenges</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span><strong>Faculty:</strong> Ready-to-use projects aligned with learning outcomes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span><strong>Companies:</strong> Actionable strategic insights at modest investment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span><strong>Community:</strong> Strengthened university-industry partnerships</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};