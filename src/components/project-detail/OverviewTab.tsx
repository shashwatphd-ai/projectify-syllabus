import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Package, Lightbulb, DollarSign } from "lucide-react";

// Props receive complex nested data from get-project-detail endpoint
// Using 'any' is intentional here due to the dynamic nature of the data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface OverviewTabProps {
  project: any;
  forms: any;
  metadata?: any;
}

export const OverviewTab = ({ project, forms, metadata }: OverviewTabProps) => {
  const form1 = forms.form1 || {};
  const form3 = forms.form3 || {};
  
  // Extract match intelligence if available
  const matchAnalysis = metadata?.match_analysis;

  return (
    <div className="space-y-6">
      {/* Match Intelligence Card - Shows WHY this partnership is excellent */}
      {matchAnalysis && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎯 Match Intelligence
              <Badge variant="default" className="ml-auto text-lg">
                {matchAnalysis.relevance_score}% Match
              </Badge>
            </CardTitle>
            <CardDescription>AI-powered relevance analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Why This Partnership is Excellent:</p>
                <p className="text-muted-foreground leading-relaxed">
                  {matchAnalysis.match_reasoning}
                </p>
              </div>
              {matchAnalysis.intelligence_factors?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Intelligence Factors:</p>
                  <div className="flex flex-wrap gap-2">
                    {matchAnalysis.intelligence_factors.map((factor: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    
      {form1.description && (
        <Card>
          <CardHeader>
            <CardTitle>Project Description</CardTitle>
            <CardDescription>Overview and context</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{form1.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Budget & Market Signals Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Project Investment & Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main Budget Display */}
            <div className="text-center p-6 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Total Project Budget</p>
              <p className="text-4xl font-bold text-primary">
                ${project.pricing_usd.toLocaleString()}
              </p>
            </div>
            
            {/* Quick Market Signals */}
            {metadata?.market_signals_used && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Market Intelligence Applied</p>
                <div className="grid grid-cols-2 gap-2">
                  {metadata.market_signals_used.job_postings_matched > 0 && (
                    <Badge variant="secondary" className="justify-center">
                      🔥 {metadata.market_signals_used.job_postings_matched} Job Postings
                    </Badge>
                  )}
                  {metadata.market_signals_used.funding_stage && (
                    <Badge variant="secondary" className="justify-center">
                      💰 {metadata.market_signals_used.funding_stage}
                    </Badge>
                  )}
                  {metadata.market_signals_used.technologies_aligned?.length > 0 && (
                    <Badge variant="secondary" className="justify-center">
                      ⚙️ {metadata.market_signals_used.technologies_aligned.length} Tech Matches
                    </Badge>
                  )}
                  {metadata.market_signals_used.hiring_urgency && (
                    <Badge variant="secondary" className="justify-center">
                      📈 {metadata.market_signals_used.hiring_urgency} Hiring
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {/* ROI Preview */}
            {metadata?.estimated_roi?.roi_multiplier && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
                <p className="text-sm text-muted-foreground">Estimated ROI</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {metadata.estimated_roi.roi_multiplier}× Value Multiplier
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ${metadata.estimated_roi.total_estimated_value?.toLocaleString()} total value
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {form3.learning_objectives && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Learning Objectives
            </CardTitle>
            <CardDescription>What students will learn from this project</CardDescription>
          </CardHeader>
          <CardContent>
            {typeof form3.learning_objectives === 'string' ? (
              <p className="text-muted-foreground">{form3.learning_objectives}</p>
            ) : (
              <ul className="space-y-2">
                {(form3.learning_objectives || []).map((objective: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-secondary mt-1">•</span>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Project Tasks
          </CardTitle>
          <CardDescription>Key activities and responsibilities</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {(project.tasks as string[]).map((task, i) => (
              <li key={i} className="flex items-start gap-3 group">
                <span className="text-primary font-semibold min-w-[32px] text-lg mt-0.5">
                  {i + 1}.
                </span>
                <span className="leading-relaxed text-foreground flex-1">{task}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Deliverables
          </CardTitle>
          <CardDescription>Expected project outputs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(project.deliverables as string[]).map((deliverable, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm font-medium">
                  {deliverable}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {form3.skills && (
        <Card>
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
            <CardDescription>Technical and domain expertise needed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {form3.skills.map((skill: string, i: number) => (
                <Badge key={i} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
